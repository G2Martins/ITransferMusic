from fastapi import APIRouter, HTTPException, status

from src.dependencies import AccountServiceDep, CurrentUserId
from src.integrations.registry import get_provider_client
from src.schemas.generator import (
    GeneratorRequest,
    GeneratorResponse,
    GeneratorSaveRequest,
    GeneratorSaveResponse,
)
from src.services.account_service import LinkedAccountNotFoundError
from src.services.generator_service import GeneratorAuthError, generate_tracks

router = APIRouter()


@router.post("/tracks", response_model=GeneratorResponse)
async def generate(
    payload: GeneratorRequest,
    user_id: CurrentUserId,
    accounts: AccountServiceDep,
) -> GeneratorResponse:
    try:
        auth = await accounts.get_auth(user_id, payload.source_provider)
    except LinkedAccountNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    async def _generate(current_auth):
        return await generate_tracks(
            source_provider=payload.source_provider,
            auth=current_auth,
            prompt=payload.prompt,
            genres=payload.genres,
            moods=payload.moods,
            count=payload.count,
            exclude_track_ids=payload.exclude_track_ids,
        )

    try:
        tracks, used = await _generate(auth)
    except GeneratorAuthError:
        # Token foi rejeitado. Tenta um force_refresh e repete uma unica vez.
        refreshed = await accounts.force_refresh(user_id, payload.source_provider)
        if refreshed is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=(
                    f"Token do {payload.source_provider.value} foi rejeitado e "
                    "nao pudemos renova-lo. Revincule a conta em Configuracoes."
                ),
            )
        try:
            tracks, used = await _generate(refreshed)
        except GeneratorAuthError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
            ) from exc

    if not tracks and not payload.exclude_track_ids:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"Nenhuma faixa retornada pelo {payload.source_provider.value}. "
                "Verifique os logs do backend. Possiveis causas: token invalido, "
                "filtros muito restritivos ou quota da API esgotada."
            ),
        )

    return GeneratorResponse(tracks=tracks, used_queries=used)


@router.post(
    "/save",
    response_model=GeneratorSaveResponse,
    status_code=status.HTTP_201_CREATED,
)
async def save_generated(
    payload: GeneratorSaveRequest,
    user_id: CurrentUserId,
    accounts: AccountServiceDep,
) -> GeneratorSaveResponse:
    try:
        auth = await accounts.get_auth(user_id, payload.target_provider)
    except LinkedAccountNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    client = get_provider_client(payload.target_provider)

    matched_ids: list[str] = []
    seen_ids: set[str] = set()
    for t in payload.tracks:
        name = (t.get("name") or "").strip()
        artist = (t.get("artist") or "").strip()
        if not name:
            continue
        query = f"{name} {artist}".strip()
        try:
            found = await client.search_track(query, auth)
        except Exception:  # noqa: BLE001
            continue
        if found and found.id not in seen_ids:
            matched_ids.append(found.id)
            seen_ids.add(found.id)

    try:
        playlist_id = await client.create_playlist(
            name=payload.playlist_name,
            description=payload.playlist_description,
            track_ids=matched_ids,
            auth=auth,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
    return GeneratorSaveResponse(
        playlist_id=playlist_id,
        matched_count=len(matched_ids),
        total_count=len(payload.tracks),
    )
