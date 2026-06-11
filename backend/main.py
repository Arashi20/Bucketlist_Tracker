import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db
from routers import items, visited_countries, trips
from routers import auth as auth_router
from auth import get_current_user

app = FastAPI(title="Bucketlist API")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await init_db()


# ── API routes (all under /api) ───────────────────────────────────────────────

# Public
app.include_router(auth_router.router, prefix="/api")

# Protected
protected = {"dependencies": [Depends(get_current_user)]}
app.include_router(items.router,             prefix="/api", **protected)
app.include_router(visited_countries.router, prefix="/api", **protected)
app.include_router(trips.router,             prefix="/api", **protected)


# ── Serve Vite build in production ───────────────────────────────────────────

dist_dir = Path(__file__).parent.parent / "frontend" / "dist"

if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target = dist_dir / full_path
        if target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(dist_dir / "index.html"))
