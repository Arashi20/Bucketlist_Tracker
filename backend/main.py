import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db
from routers import items, visited_countries, trips
from routers import auth as auth_router
from auth import get_current_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


# The interactive API docs are only exposed when explicitly enabled.
docs_enabled = os.getenv("ENABLE_API_DOCS", "0").lower() in ("1", "true", "yes", "on")

app = FastAPI(
    title="Bucketlist API",
    lifespan=lifespan,
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)

cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for name, value in SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    return response


# ── API routes (all under /api) ───────────────────────────────────────────────

# Public
app.include_router(auth_router.router, prefix="/api")

# Protected
protected = {"dependencies": [Depends(get_current_user)]}
app.include_router(items.router,             prefix="/api", **protected)
app.include_router(visited_countries.router, prefix="/api", **protected)
app.include_router(trips.router,             prefix="/api", **protected)


# ── Serve Vite build in production ───────────────────────────────────────────

dist_dir = (Path(__file__).parent.parent / "frontend" / "dist").resolve()

if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Resolve and confirm the file is inside dist/, so encoded "../"
        # segments cannot read files elsewhere on the server.
        target = (dist_dir / full_path).resolve()
        if target.is_relative_to(dist_dir) and target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(dist_dir / "index.html"))
