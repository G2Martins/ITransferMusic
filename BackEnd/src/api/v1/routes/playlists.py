import logging

import httpx
from fastapi import APIRouter, HTTPException, status

from src.dependencies import CurrentUserId, PlaylistTransferServiceDep
from src.models.common import Provider
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track
from src.services.account_service import LinkedAccountNotFoundError

router = APIRouter()
logger = logging.getLogger(__name__)


def _provider_http_error(exc: httpx.HTTPStatusError, provider: Provider) -> HTTPException:
    """Converte erro do provedor externo em HTTPException com mensagem util."""
    code = exc.response.status_code
    try:
        body = exc.response.json()
    except Exception:  # noqa: BLE001
        body = {"raw": exc.response.text}

    provider_msg = (
        body.get("error", {}).get("message")
        if isinstance(body.get("error"), dict)
        else body.get("error_description") or body.get("message")
    )
    logger.warning(
        "Erro do provedor %s (%s): %s", provider.value, code, body
    )

    if code in (401, 403):
        hint = (
            f"Spotify retornou {code}. Motivo: {provider_msg or 'sem detalhes'}. "
            "Clique em 'Mudar de conta' para reautorizar com os escopos atuais "
            "e confirme que sua conta esta como 'Test user' no Spotify Developer Dashboard."
        )
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=hint
        )
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"{provider.value} retornou {code}: {provider_msg or 'falha externa'}",
    )


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
    except httpx.HTTPStatusError as exc:
        raise _provider_http_error(exc, provider) from exc
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
    except httpx.HTTPStatusError as exc:
        raise _provider_http_error(exc, provider) from exc
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(exc)
        ) from exc
