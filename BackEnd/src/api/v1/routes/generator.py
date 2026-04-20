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
from src.services.generator_service import generate_tracks

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

    tracks, used = await generate_tracks(
        source_provider=payload.source_provider,
        auth=auth,
        prompt=payload.prompt,
        genres=payload.genres,
        moods=payload.moods,
        count=payload.count,
        exclude_track_ids=payload.exclude_track_ids,
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
        if found:
            matched_ids.append(found.id)

    playlist_id = await client.create_playlist(
        name=payload.playlist_name,
        description=payload.playlist_description,
        track_ids=matched_ids,
        auth=auth,
    )
    return GeneratorSaveResponse(
        playlist_id=playlist_id,
        matched_count=len(matched_ids),
        total_count=len(payload.tracks),
    )
