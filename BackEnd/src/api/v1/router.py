from fastapi import APIRouter

from src.api.v1.routes import accounts, auth, health, playlists, syncs, transfers

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(playlists.router, prefix="/playlists", tags=["playlists"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["transfers"])
api_router.include_router(syncs.router, prefix="/syncs", tags=["syncs"])
