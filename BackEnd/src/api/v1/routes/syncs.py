from fastapi import APIRouter, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Annotated

from fastapi import Depends

from src.core.db import get_database
from src.dependencies import CurrentUserId
from src.models.sync import PlaylistSyncDocument
from src.schemas.sync import (
    PlaylistSyncCreate,
    PlaylistSyncResponse,
    PlaylistSyncToggle,
)
from src.services.sync_runner import run_sync_by_id
from src.services.sync_service import SyncNotFoundError, SyncService


def _get_service(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> SyncService:
    return SyncService(db)


SyncServiceDep = Annotated[SyncService, Depends(_get_service)]

router = APIRouter()


def _to_response(doc: PlaylistSyncDocument) -> PlaylistSyncResponse:
    return PlaylistSyncResponse(
        id=str(doc.id),
        source_provider=doc.source_provider,
        source_playlist_id=doc.source_playlist_id,
        source_playlist_name=doc.source_playlist_name,
        target_provider=doc.target_provider,
        target_playlist_id=doc.target_playlist_id,
        target_playlist_name=doc.target_playlist_name,
        frequency=doc.frequency,
        run_hour=doc.run_hour,
        run_minute=doc.run_minute,
        method=doc.method,
        status=doc.status,
        last_synced_at=doc.last_synced_at,
        last_error=doc.last_error,
        tracks_added_last_run=doc.tracks_added_last_run,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.post(
    "",
    response_model=PlaylistSyncResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_sync(
    payload: PlaylistSyncCreate,
    user_id: CurrentUserId,
    service: SyncServiceDep,
) -> PlaylistSyncResponse:
    try:
        doc = await service.create(user_id, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return _to_response(doc)


@router.get("", response_model=list[PlaylistSyncResponse])
async def list_syncs(
    user_id: CurrentUserId,
    service: SyncServiceDep,
) -> list[PlaylistSyncResponse]:
    docs = await service.list_for_user(user_id)
    return [_to_response(d) for d in docs]


@router.patch("/{sync_id}", response_model=PlaylistSyncResponse)
async def toggle_sync(
    sync_id: str,
    payload: PlaylistSyncToggle,
    user_id: CurrentUserId,
    service: SyncServiceDep,
) -> PlaylistSyncResponse:
    try:
        doc = await service.set_status(user_id, sync_id, payload.status)
    except SyncNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    return _to_response(doc)


@router.delete("/{sync_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sync(
    sync_id: str,
    user_id: CurrentUserId,
    service: SyncServiceDep,
) -> None:
    await service.delete(user_id, sync_id)


@router.post("/{sync_id}/run", status_code=status.HTTP_202_ACCEPTED)
async def run_sync_now(
    sync_id: str,
    user_id: CurrentUserId,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> dict[str, str]:
    """Dispara a execucao da sync imediatamente (ad-hoc)."""
    await run_sync_by_id(db, user_id, sync_id)
    return {"status": "ok"}
