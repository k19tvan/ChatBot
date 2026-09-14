"""
SQLite Database and Authentication Manager.
Provides thread-safe connections, WAL mode, PBKDF2 password hashing with per-user salt,
session token management, and user-scoped conversation persistence.
"""
import contextlib
import hashlib
import hmac
import json
import logging
import secrets
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    from .config import SESSION_EXPIRE_HOURS, SQLITE_DB_PATH
except (ImportError, ValueError):
    from config import SESSION_EXPIRE_HOURS, SQLITE_DB_PATH

logger = logging.getLogger("chatbot_backend.database")


def get_connection() -> sqlite3.Connection:
    """Returns an initialized SQLite connection with row factories and WAL mode."""
    SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(SQLITE_DB_PATH), check_same_thread=False, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


@contextlib.contextmanager
def db_session():
    """Context manager ensuring transactions commit or roll back automatically."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """
    Hashes a password with PBKDF2-HMAC-SHA256 and 100,000 rounds using a per-user salt.
    """
    if not salt:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000,
    ).hex()
    return pw_hash, salt


def verify_password(password: str, salt: str, stored_hash: str) -> bool:
    """Verifies password using constant-time comparison to prevent timing attacks."""
    computed_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(computed_hash, stored_hash)


def init_db():
    """Creates the SQLite tables and indices if they do not already exist, and migrates columns."""
    SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_session() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'approved',
                role TEXT NOT NULL DEFAULT 'user',
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                messages_json TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
            CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
            CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
            """
        )

        # Migration: Add status & role columns if upgrading existing database
        cursor = conn.execute("PRAGMA table_info(users);")
        existing_cols = {row["name"] for row in cursor.fetchall()}
        if "status" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';")
        if "role" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';")

        # Guarantee 'antv' or first registered user is admin and approved
        conn.execute("UPDATE users SET role = 'admin', status = 'approved' WHERE username = 'antv';")
        # Ensure any existing users are approved
        conn.execute("UPDATE users SET status = 'approved' WHERE status IS NULL OR status = '';")

    logger.info(f"SQLite database initialized at {SQLITE_DB_PATH}")


def create_user(username: str, password: str) -> Dict[str, Any]:
    """Registers a new user. First user or admin username becomes admin; others start as pending."""
    clean_username = username.strip()
    if len(clean_username) < 3:
        raise ValueError("Username must be at least 3 characters long")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long")

    pw_hash, salt = hash_password(password)
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = int(time.time())

    with db_session() as conn:
        cursor = conn.execute("SELECT COUNT(*) AS count FROM users")
        user_count = cursor.fetchone()["count"]

        # First account or antv gets admin + approved
        is_first = (user_count == 0) or (clean_username.lower() == "antv")
        role = "admin" if is_first else "user"
        status = "approved" if is_first else "pending"

        try:
            conn.execute(
                "INSERT INTO users (id, username, password_hash, salt, status, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user_id, clean_username, pw_hash, salt, status, role, now),
            )
            return {
                "id": user_id,
                "username": clean_username,
                "status": status,
                "role": role,
                "created_at": now
            }
        except sqlite3.IntegrityError:
            raise ValueError(f"Username '{clean_username}' is already taken")


def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticates credentials and returns user dict if valid, else None."""
    clean_username = username.strip()
    with db_session() as conn:
        cursor = conn.execute(
            "SELECT id, username, password_hash, salt, status, role, created_at FROM users WHERE username = ?",
            (clean_username,),
        )
        row = cursor.fetchone()
        if not row:
            return None

        if verify_password(password, row["salt"], row["password_hash"]):
            return {
                "id": row["id"],
                "username": row["username"],
                "status": row["status"] if "status" in row.keys() else "approved",
                "role": row["role"] if "role" in row.keys() else "user",
                "created_at": row["created_at"],
            }
    return None


def create_session(user_id: str, expire_hours: int = SESSION_EXPIRE_HOURS) -> str:
    """Generates a cryptographically secure 64-char random session token."""
    token = secrets.token_hex(32)
    now = int(time.time())
    expires_at = now + (expire_hours * 3600)

    with db_session() as conn:
        # Clean up any already expired sessions
        conn.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (token, user_id, expires_at, now),
        )
    return token


def get_user_from_session(token: str) -> Optional[Dict[str, Any]]:
    """Retrieves user associated with an active, unexpired session token."""
    if not token:
        return None
    now = int(time.time())
    with db_session() as conn:
        cursor = conn.execute(
            """
            SELECT u.id, u.username, u.status, u.role, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
            """,
            (token, now),
        )
        row = cursor.fetchone()
        if row:
            return {
                "id": row["id"],
                "username": row["username"],
                "status": row["status"] if "status" in row.keys() else "approved",
                "role": row["role"] if "role" in row.keys() else "user",
                "created_at": row["created_at"]
            }
    return None


def get_all_users() -> List[Dict[str, Any]]:
    """Returns all users ordered by creation date (newest first)."""
    with db_session() as conn:
        cursor = conn.execute(
            "SELECT id, username, status, role, created_at FROM users ORDER BY created_at DESC"
        )
        return [
            {
                "id": r["id"],
                "username": r["username"],
                "status": r["status"] if "status" in r.keys() else "approved",
                "role": r["role"] if "role" in r.keys() else "user",
                "createdAt": r["created_at"] * 1000,
            }
            for r in cursor.fetchall()
        ]


def update_user_status(user_id: str, status: str) -> bool:
    """Updates user approval status ('approved', 'pending', 'rejected')."""
    if status not in ("approved", "pending", "rejected"):
        raise ValueError(f"Invalid status: {status}")
    with db_session() as conn:
        cursor = conn.execute("UPDATE users SET status = ? WHERE id = ?", (status, user_id))
        return cursor.rowcount > 0


def update_user_role(user_id: str, role: str) -> bool:
    """Updates user role ('admin', 'user')."""
    if role not in ("admin", "user"):
        raise ValueError(f"Invalid role: {role}")
    with db_session() as conn:
        cursor = conn.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
        return cursor.rowcount > 0


def delete_user_by_id(user_id: str) -> bool:
    """Deletes a user and cascades deletion to sessions and conversations."""
    with db_session() as conn:
        cursor = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        return cursor.rowcount > 0


def delete_session(token: str):
    """Logs out by deleting the session token."""
    if not token:
        return
    with db_session() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def get_user_conversations(user_id: str) -> List[Dict[str, Any]]:
    """Fetches all conversations belonging to the given user."""
    with db_session() as conn:
        cursor = conn.execute(
            """
            SELECT id, title, messages_json, created_at, updated_at
            FROM conversations
            WHERE user_id = ?
            ORDER BY updated_at DESC
            """,
            (user_id,),
        )
        results = []
        for row in cursor.fetchall():
            try:
                messages = json.loads(row["messages_json"])
            except Exception:
                messages = []
            results.append(
                {
                    "id": row["id"],
                    "title": row["title"],
                    "messages": messages,
                    "createdAt": row["created_at"] * 1000,
                    "updatedAt": row["updated_at"] * 1000,
                }
            )
        return results


def save_user_conversation(
    user_id: str,
    conv_id: str,
    title: str,
    messages: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Upserts a conversation record belonging to user_id."""
    now = int(time.time())
    messages_json = json.dumps(messages, ensure_ascii=False)

    with db_session() as conn:
        cursor = conn.execute(
            "SELECT created_at FROM conversations WHERE id = ? AND user_id = ?",
            (conv_id, user_id),
        )
        existing = cursor.fetchone()
        created_at = existing["created_at"] if existing else now

        conn.execute(
            """
            INSERT INTO conversations (id, user_id, title, messages_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                messages_json = excluded.messages_json,
                updated_at = excluded.updated_at
            WHERE conversations.user_id = excluded.user_id
            """,
            (conv_id, user_id, title, messages_json, created_at, now),
        )

    return {
        "id": conv_id,
        "title": title,
        "messages": messages,
        "createdAt": created_at * 1000,
        "updatedAt": now * 1000,
    }


def delete_user_conversation(user_id: str, conv_id: str) -> bool:
    """Deletes a conversation ensuring it belongs to user_id."""
    with db_session() as conn:
        cursor = conn.execute(
            "DELETE FROM conversations WHERE id = ? AND user_id = ?",
            (conv_id, user_id),
        )
        return cursor.rowcount > 0


# Automatically run schema initialization on module load
init_db()
