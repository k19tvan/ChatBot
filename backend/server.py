import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import httpx
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

# Add parent and current dir to sys.path to allow running from any working directory
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(project_root))

try:
    from .config import (
        API_KEY,
        APP_TITLE,
        BASE_URL,
        DEFAULT_MODEL,
        HOST,
        PORT,
        MAX_SESSION_TOKENS,
        MAX_RESPONSE_TOKENS,
        SESSION_EXPIRE_HOURS,
    )
    from .graph import ChatState, build_chat_graph
    from .database import (
        authenticate_user,
        create_session,
        create_user,
        delete_session,
        delete_user_by_id,
        delete_user_conversation,
        get_all_users,
        get_user_conversations,
        get_user_from_session,
        save_user_conversation,
        update_user_role,
        update_user_status,
    )
except (ImportError, ValueError):
    from config import (
        API_KEY,
        APP_TITLE,
        BASE_URL,
        DEFAULT_MODEL,
        HOST,
        PORT,
        MAX_SESSION_TOKENS,
        MAX_RESPONSE_TOKENS,
        SESSION_EXPIRE_HOURS,
    )
    from graph import ChatState, build_chat_graph
    from database import (
        authenticate_user,
        create_session,
        create_user,
        delete_session,
        delete_user_by_id,
        delete_user_conversation,
        get_all_users,
        get_user_conversations,
        get_user_from_session,
        save_user_conversation,
        update_user_role,
        update_user_status,
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("chatbot_backend")

# Initialize LangGraph state graph
chat_graph = build_chat_graph()

app = FastAPI(title=APP_TITLE)

# Security and CORS middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Request / Response Schemas
class MessageItem(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content")

class ChatRequest(BaseModel):
    messages: List[MessageItem]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 4096
    system_prompt: Optional[str] = None


class TokenStatsRequest(BaseModel):
    messages: List[Dict[str, Any]] = []
    system_prompt: Optional[str] = None


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "vllm-langgraph-chatbot", "vllm_base_url": BASE_URL}


@app.get("/api/config")
async def get_config():
    """Returns runtime configuration without leaking secret keys."""
    return {
        "app_title": APP_TITLE,
        "default_model": DEFAULT_MODEL,
        "base_url": BASE_URL,
        "max_session_tokens": MAX_SESSION_TOKENS,
        "max_response_tokens": MAX_RESPONSE_TOKENS,
    }


@app.post("/api/token-stats")
async def token_stats_endpoint(body: TokenStatsRequest):
    """Calculates breakdown of tokens used in the current conversation session."""
    prompt_tokens = 0
    completion_tokens = 0
    system_tokens = 0

    if body.system_prompt and body.system_prompt.strip():
        system_tokens = max(1, len(body.system_prompt.strip()) // 3) + 4

    for msg in body.messages:
        role = msg.get("role", "")
        content = msg.get("content", "") or ""
        cost = max(1, len(content) // 3) + 4 if content else 0
        if role == "user":
            prompt_tokens += cost
        elif role == "assistant":
            completion_tokens += cost
        elif role == "system":
            system_tokens += cost

    total_tokens = prompt_tokens + completion_tokens + system_tokens
    max_session = MAX_SESSION_TOKENS
    max_response = MAX_RESPONSE_TOKENS
    is_exceeded = total_tokens >= max_session if max_session > 0 else False
    remaining = max(0, max_session - total_tokens) if max_session > 0 else 4096
    percent = min(100.0, round((total_tokens / max_session * 100), 1)) if max_session > 0 else 0

    return {
        "total": total_tokens,
        "total_tokens": total_tokens,
        "prompt": prompt_tokens,
        "completion": completion_tokens,
        "system": system_tokens,
        "max_session_tokens": max_session,
        "max_response_tokens": max_response,
        "remaining_tokens": remaining,
        "percent_used": percent,
        "message_count": len(body.messages),
        "is_exceeded": is_exceeded,
    }


@app.get("/api/models")
async def get_models():
    """Proxies to vLLM's /v1/models endpoint to retrieve available models."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"Authorization": f"Bearer {API_KEY}"} if API_KEY != "EMPTY" else {}
            resp = await client.get(f"{BASE_URL}/models", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                if not models:
                    models = [DEFAULT_MODEL]
                return {"models": models}
    except Exception as e:
        logger.warning(f"Could not fetch models from vLLM: {e}. Falling back to default.")

    return {"models": [DEFAULT_MODEL]}


@app.post("/api/chat")
async def chat_stream(request: Request, body: ChatRequest):
    """
    Executes LangGraph agent and streams response tokens via Server-Sent Events (SSE).
    Enforces hard MAX_SESSION_TOKENS: stops generation and notifies exceeded limit.
    """
    model_name = body.model or DEFAULT_MODEL
    temperature = max(0.0, min(2.0, float(body.temperature or 0.7)))

    req_tokens = body.max_tokens or MAX_RESPONSE_TOKENS or 2048
    max_tokens = max(req_tokens, MAX_RESPONSE_TOKENS or 2048)

    # 1. Count input session tokens
    input_tokens = 0
    if body.system_prompt and body.system_prompt.strip():
        input_tokens += max(1, len(body.system_prompt.strip()) // 3) + 4
    for msg in body.messages:
        content = msg.content or ""
        input_tokens += max(1, len(content) // 3) + 4 if content else 0

    # 2. Check if already exceeded before invoking model
    if MAX_SESSION_TOKENS and input_tokens >= MAX_SESSION_TOKENS:
        async def exceed_generator():
            yield {
                "event": "exceeded",
                "data": json.dumps({
                    "status": "exceeded",
                    "total_tokens": input_tokens,
                    "max_session_tokens": MAX_SESSION_TOKENS,
                    "message": f"Session token limit reached ({input_tokens}/{MAX_SESSION_TOKENS} tokens). Please click Reset Session to continue."
                }),
            }
        return EventSourceResponse(exceed_generator())

    lc_messages: List[BaseMessage] = []
    for msg in body.messages:
        role = msg.role.lower().strip()
        if role == "user":
            lc_messages.append(HumanMessage(content=msg.content))
        elif role == "assistant":
            lc_messages.append(AIMessage(content=msg.content))
        elif role == "system":
            lc_messages.append(SystemMessage(content=msg.content))

    if not lc_messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")

    state_input: ChatState = {
        "messages": lc_messages,
        "model": model_name,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "system_prompt": body.system_prompt,
    }

    async def event_generator():
        generated_text = ""
        try:
            async for event in chat_graph.astream_events(state_input, version="v2"):
                if await request.is_disconnected():
                    logger.info("Client disconnected. LangGraph execution aborted.")
                    break

                kind = event.get("event")
                if kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        generated_text += chunk.content
                        yield {
                            "event": "token",
                            "data": json.dumps({"token": chunk.content}),
                        }

                        # Check if generated tokens pass session limit using cumulative text (matching frontend formula)
                        generated_tokens = max(1, len(generated_text) // 3) + 4
                        total_session_tokens = input_tokens + generated_tokens
                        if MAX_SESSION_TOKENS and total_session_tokens >= MAX_SESSION_TOKENS:
                            logger.warning(
                                f"Session token limit reached during generation ({total_session_tokens}/{MAX_SESSION_TOKENS}). Stopping."
                            )
                            yield {
                                "event": "exceeded",
                                "data": json.dumps({
                                    "status": "exceeded",
                                    "total_tokens": total_session_tokens,
                                    "max_session_tokens": MAX_SESSION_TOKENS,
                                    "message": f"Session token limit reached ({total_session_tokens}/{MAX_SESSION_TOKENS} tokens). Please click Reset Session to continue."
                                }),
                            }
                            return

            yield {
                "event": "done",
                "data": json.dumps({"status": "completed"}),
            }
        except asyncio.CancelledError:
            logger.info("Stream cancelled by client.")
        except Exception as e:
            err_msg = str(e)
            if "Session token limit exceeded" in err_msg:
                yield {
                    "event": "exceeded",
                    "data": json.dumps({
                        "status": "exceeded",
                        "total_tokens": input_tokens,
                        "max_session_tokens": MAX_SESSION_TOKENS,
                        "message": err_msg
                    }),
                }
            else:
                logger.exception(f"Error during LangGraph streaming: {e}")
                yield {
                    "event": "error",
                    "data": json.dumps({"error": err_msg}),
                }

    return EventSourceResponse(event_generator())


# Auth & Session Schemas
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class ConversationPayload(BaseModel):
    id: str
    title: str
    messages: List[Dict[str, Any]]


class UpdateStatusRequest(BaseModel):
    status: str = Field(..., description="'approved', 'pending', or 'rejected'")


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., description="'admin' or 'user'")


def extract_token_from_request(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.cookies.get("chat_session")


def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    token = extract_token_from_request(request)
    if not token:
        return None
    return get_user_from_session(token)


def require_admin_user(request: Request) -> Dict[str, Any]:
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user


@app.post("/api/auth/register")
async def register_endpoint(body: RegisterRequest, response: Response):
    try:
        user = create_user(body.username, body.password)
        # If user is approved (e.g. first user / admin), issue token immediately
        if user.get("status") == "approved":
            token = create_session(user["id"])
            response.set_cookie(
                key="chat_session",
                value=token,
                max_age=SESSION_EXPIRE_HOURS * 3600,
                httponly=True,
                samesite="lax",
            )
            return {
                "status": "ok",
                "user": user,
                "token": token,
                "requiresApproval": False,
                "message": "Account created successfully!"
            }

        # Otherwise user is pending admin approval
        return {
            "status": "pending_approval",
            "user": user,
            "token": None,
            "requiresApproval": True,
            "message": "Registration successful! Your account is pending administrator approval before you can log in."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login")
async def login_endpoint(body: LoginRequest, response: Response):
    user = authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    user_status = user.get("status", "approved")
    if user_status == "pending":
        raise HTTPException(
            status_code=403,
            detail="Your account is pending administrator approval. Please wait for an admin to approve your request."
        )
    if user_status == "rejected":
        raise HTTPException(
            status_code=403,
            detail="Your account registration was rejected by an administrator."
        )

    token = create_session(user["id"])
    response.set_cookie(
        key="chat_session",
        value=token,
        max_age=SESSION_EXPIRE_HOURS * 3600,
        httponly=True,
        samesite="lax",
    )
    return {"status": "ok", "user": user, "token": token}


# --- Admin Endpoints ---

@app.get("/api/admin/users")
async def admin_list_users_endpoint(request: Request):
    """Lists all users and statistics. Admin only."""
    require_admin_user(request)
    users = get_all_users()
    pending_count = sum(1 for u in users if u.get("status") == "pending")
    return {
        "status": "ok",
        "users": users,
        "total": len(users),
        "pendingCount": pending_count
    }


@app.post("/api/admin/users/{user_id}/status")
async def admin_update_user_status_endpoint(request: Request, user_id: str, body: UpdateStatusRequest):
    """Approves, sets pending, or rejects a user. Admin only."""
    admin = require_admin_user(request)
    try:
        updated = update_user_status(user_id, body.status)
        if not updated:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "ok", "userId": user_id, "newStatus": body.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/admin/users/{user_id}/role")
async def admin_update_user_role_endpoint(request: Request, user_id: str, body: UpdateRoleRequest):
    """Promotes or demotes user role between 'admin' and 'user'. Admin only."""
    admin = require_admin_user(request)
    if admin["id"] == user_id and body.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote your own admin account")
    try:
        updated = update_user_role(user_id, body.role)
        if not updated:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "ok", "userId": user_id, "newRole": body.role}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/admin/users/{user_id}")
async def admin_delete_user_endpoint(request: Request, user_id: str):
    """Deletes a user account. Admin only."""
    admin = require_admin_user(request)
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    deleted = delete_user_by_id(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "deleted": True, "userId": user_id}


@app.post("/api/auth/logout")
async def logout_endpoint(request: Request, response: Response):
    token = extract_token_from_request(request)
    if token:
        delete_session(token)
    response.delete_cookie(key="chat_session")
    return {"status": "ok"}


@app.get("/api/auth/me")
async def me_endpoint(request: Request):
    user = get_current_user_optional(request)
    if not user:
        return {"authenticated": False, "user": None}
    return {"authenticated": True, "user": user}


@app.get("/api/conversations")
async def list_conversations_endpoint(request: Request):
    user = get_current_user_optional(request)
    if not user:
        return {"conversations": []}
    convs = get_user_conversations(user["id"])
    return {"conversations": convs}


@app.post("/api/conversations")
async def save_conversation_endpoint(request: Request, body: ConversationPayload):
    user = get_current_user_optional(request)
    if not user:
        return {"status": "ok", "saved": False, "note": "Guest mode - saved in localStorage"}
    saved = save_user_conversation(user["id"], body.id, body.title, body.messages)
    return {"status": "ok", "saved": True, "conversation": saved}


@app.delete("/api/conversations/{conv_id}")
async def delete_conversation_endpoint(request: Request, conv_id: str):
    user = get_current_user_optional(request)
    if user:
        delete_user_conversation(user["id"], conv_id)
    return {"status": "ok"}


# Serve Frontend Static Assets
frontend_dist = (project_root / "frontend" / "dist").resolve()
if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        safe_path = (frontend_dist / full_path.lstrip("/")).resolve()
        dist_str = str(frontend_dist)
        if full_path and str(safe_path).startswith(dist_str + os.path.sep) and safe_path.is_file():
            return FileResponse(str(safe_path))
        return FileResponse(str(frontend_dist / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT, reload=False, access_log=True)

