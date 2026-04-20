from fastapi import APIRouter

from src.api.v1.routes import (
    accounts,
    auth,
    generator,
    health,
    playlists,
    reviews,
    shares,
    syncs,
    transfers,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(playlists.router, prefix="/playlists", tags=["playlists"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["transfers"])
api_router.include_router(
    shares.share_creation_router, prefix="/transfers", tags=["shares"]
)
api_router.include_router(syncs.router, prefix="/syncs", tags=["syncs"])
api_router.include_router(shares.router, prefix="/shares", tags=["shares"])
api_router.include_router(generator.router, prefix="/generator", tags=["generator"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
