"""
Root server entry point forwarding to the modular backend package.
"""
from backend.server import app, HOST, PORT

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.server:app", host=HOST, port=PORT, reload=False, access_log=True)
