"""
Main backend server entry point using Uvicorn.
Serves the FastAPI application with LangGraph chat streaming and static frontend assets.
"""
import argparse
import sys
from pathlib import Path

# Ensure project root and backend dir are in sys.path
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

try:
    from backend.config import HOST, PORT
    from backend.server import app
except (ImportError, ValueError):
    from config import HOST, PORT
    from server import app

import uvicorn


def run_server(host: str = None, port: int = None, reload: bool = False, workers: int = 1):
    target_host = host or HOST
    target_port = port or PORT
    print(f"Starting server on http://{target_host}:{target_port} ...")
    uvicorn.run(
        "backend.server:app",
        host=target_host,
        port=target_port,
        reload=reload,
        workers=workers,
        access_log=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start FastAPI + LangGraph Chatbot server")
    parser.add_argument("--host", type=str, default=HOST, help=f"Host interface to bind (default: {HOST})")
    parser.add_argument("--port", type=int, default=PORT, help=f"Port number to bind (default: {PORT})")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload on code changes")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker processes")
    args = parser.parse_args()

    run_server(host=args.host, port=args.port, reload=args.reload, workers=args.workers)
