from fastapi import APIRouter, HTTPException, status

from src.dependencies import CurrentUserId, PlaylistTransferServiceDep
from src.models.common import Provider
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track
from src.services.account_service import LinkedAccountNotFoundError

router = APIRouter()


@router.get("/{provider}", response_model=list[PlaylistSummary])
async def list_user_playlists(
    provider: Provider,
    user_id: CurrentUserId,
    service: PlaylistTransferServiceDep,
) -> list[PlaylistSummary]:
    try:
        return await service.list_user_playlists(user_id, provider)
    except LinkedAccountNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(exc)
        ) from exc


@router.get("/{provider}/{playlist_id}/tracks", response_model=list[Track])
async def get_playlist_tracks(
    provider: Provider,
    playlist_id: str,
    user_id: CurrentUserId,
    service: PlaylistTransferServiceDep,
) -> list[Track]:
    try:
        return await service.get_playlist_tracks(user_id, provider, playlist_id)
    except LinkedAccountNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(exc)
        ) from exc
