from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status

from src.dependencies import AccountServiceDep, CurrentUserId, DbDep
from src.integrations.registry import get_provider_client
from src.models.common import Provider
from src.models.transfer import TransferDocument, TransferStatus, TransferTrackResult
from src.schemas.generator import (
    GeneratorRequest,
    GeneratorResponse,
    GeneratorSaveRequest,
    GeneratorSaveResponse,
)
from src.services.account_service import LinkedAccountNotFoundError
from src.services.generator_service import GeneratorAuthError, generate_tracks

router = APIRouter()

# Marca d'agua padrao aplicada a playlists geradas (alinhado ao fluxo de transfer).
_WATERMARK_SUFFIX = " By ITransferMusic"
_WATERMARK_DESCRIPTION = (
    "This playlist was created by https://www.ITransferMusic.com that lets you "
    "transfer your playlist to any music platform such as Spotify, YouTube Music, "
    "Apple Music, Deezer etc."
)
_SPOTIFY_WRITE_SCOPES = ("playlist-modify-private", "playlist-modify-public")
_GENERATOR_SOURCE_SENTINEL = "__generator__"


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
    db: DbDep,
) -> GeneratorSaveResponse:
    try:
        auth = await accounts.get_auth(user_id, payload.target_provider)
    except LinkedAccountNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    # Checagem preventiva de escopo: Spotify rejeita a criacao com 403 se o
    # token foi concedido antes de adicionarmos os escopos de escrita.
    # Melhor falhar cedo com mensagem acionavel do que passar pelo search_track
    # de cada faixa so para quebrar no create_playlist.
    if payload.target_provider == Provider.SPOTIFY:
        scope = (await accounts.get_scope(user_id, payload.target_provider)) or ""
        scope_set = set(scope.split())
        missing = [s for s in _SPOTIFY_WRITE_SCOPES if s not in scope_set]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Seu token do Spotify nao tem permissao para criar playlists "
                    f"(escopos ausentes: {', '.join(missing)}). Desvincule a conta "
                    "em Configuracoes e vincule novamente para conceder as novas "
                    "permissoes."
                ),
            )

    client = get_provider_client(payload.target_provider)

    matched_ids: list[str] = []
    seen_ids: set[str] = set()
    sample_image_url: str | None = None
    for t in payload.tracks:
        name = (t.get("name") or "").strip()
        artist = (t.get("artist") or "").strip()
        if not name:
            continue
        if not sample_image_url:
            sample_image_url = t.get("image_url") or None
        query = f"{name} {artist}".strip()
        try:
            found = await client.search_track(query, auth)
        except Exception:  # noqa: BLE001
            continue
        if found and found.id not in seen_ids:
            matched_ids.append(found.id)
            seen_ids.add(found.id)

    # Aplica marca d'agua no titulo e descricao, replicando o fluxo de transfer.
    base_name = payload.playlist_name.strip() or "Minha Playlist Gerada"
    watermarked_name = (
        base_name
        if base_name.endswith(_WATERMARK_SUFFIX)
        else f"{base_name}{_WATERMARK_SUFFIX}"
    )
    user_desc = (payload.playlist_description or "").strip()
    watermarked_desc = (
        f"{user_desc} | {_WATERMARK_DESCRIPTION}" if user_desc else _WATERMARK_DESCRIPTION
    )

    try:
        playlist_id = await client.create_playlist(
            name=watermarked_name,
            description=watermarked_desc,
            track_ids=matched_ids,
            auth=auth,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc

    # Persiste a playlist gerada como um "transfer" sintetico para aparecer no
    # dashboard. source_playlist_id recebe sentinel pois nao ha playlist origem.
    total_tracks = sum(1 for t in payload.tracks if (t.get("name") or "").strip())
    results: list[TransferTrackResult] = []
    for t in payload.tracks:
        name = (t.get("name") or "").strip()
        if not name:
            continue
        results.append(
            TransferTrackResult(
                source_track_id=t.get("id") or name,
                source_name=name,
                source_artist=(t.get("artist") or "").strip(),
                source_album=t.get("album") or None,
                image_url=t.get("image_url") or None,
                matched_target_id=None,
                matched=True,  # faixas foram selecionadas pelo usuario
            )
        )

    if total_tracks == 0:
        synthetic_status = TransferStatus.FAILED
    elif len(matched_ids) == total_tracks:
        synthetic_status = TransferStatus.COMPLETED
    elif len(matched_ids) == 0:
        synthetic_status = TransferStatus.FAILED
    else:
        synthetic_status = TransferStatus.PARTIAL

    transfer = TransferDocument(
        user_id=ObjectId(user_id),
        source_provider=payload.target_provider,
        target_provider=payload.target_provider,
        source_playlist_id=_GENERATOR_SOURCE_SENTINEL,
        source_playlist_name="Gerador ITransferMusic",
        source_playlist_image_url=sample_image_url,
        target_playlist_id=playlist_id,
        target_playlist_name=watermarked_name,
        target_playlist_description=watermarked_desc,
        apply_watermark=True,
        status=synthetic_status,
        total_tracks=total_tracks,
        matched_tracks=len(matched_ids),
        results=results,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await db["transfers"].insert_one(transfer.to_mongo())

    return GeneratorSaveResponse(
        playlist_id=playlist_id,
        matched_count=len(matched_ids),
        total_count=len(payload.tracks),
    )
