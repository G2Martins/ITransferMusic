"""Runner que executa uma sincronizacao individual e o scan periodico."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.integrations.registry import get_provider_client
from src.models.sync import (
    PlaylistSyncDocument,
    SyncFrequency,
    SyncMethod,
    SyncStatus,
)
from src.services.account_service import AccountService, LinkedAccountNotFoundError

logger = logging.getLogger(__name__)


def _is_due(sync: PlaylistSyncDocument, now: datetime) -> bool:
    """Decide se a sync deve rodar agora.

    - status precisa ser ACTIVE
    - hora:minuto atual (UTC) precisa estar dentro da janela de 15 min
      a partir do horario agendado
    - last_synced_at precisa ser pelo menos intervalo inteiro atras
    """
    if sync.status != SyncStatus.ACTIVE:
        return False

    # Janela: se agendado para 13:20, roda quando now >= 13:20 e < 13:35
    scheduled = now.replace(hour=sync.run_hour, minute=sync.run_minute, second=0, microsecond=0)
    delta = (now - scheduled).total_seconds()
    if delta < 0 or delta >= 15 * 60:
        return False

    interval = timedelta(days=1 if sync.frequency == SyncFrequency.DAILY else 7)
    last = sync.last_synced_at
    if last is None:
        return True
    if last.tzinfo is None:
        last = last.replace(tzinfo=UTC)
    return (now - last) >= interval - timedelta(hours=1)


async def run_sync(db: AsyncIOMotorDatabase, sync: PlaylistSyncDocument) -> None:
    """Executa a propagacao de tracks da origem para o destino."""
    collection = db["playlist_syncs"]
    accounts = AccountService(db)
    user_id = str(sync.user_id)

    try:
        src_auth = await accounts.get_auth(user_id, sync.source_provider)
        tgt_auth = await accounts.get_auth(user_id, sync.target_provider)
    except LinkedAccountNotFoundError as exc:
        await collection.update_one(
            {"_id": sync.id},
            {
                "$set": {
                    "status": SyncStatus.ERROR.value,
                    "last_error": str(exc),
                    "updated_at": datetime.now(UTC),
                }
            },
        )
        return

    src_client = get_provider_client(sync.source_provider)
    tgt_client = get_provider_client(sync.target_provider)

    try:
        source_tracks = await src_client.get_playlist_tracks(
            sync.source_playlist_id, src_auth
        )
        target_tracks = await tgt_client.get_playlist_tracks(
            sync.target_playlist_id, tgt_auth
        )

        target_ids = {t.id for t in target_tracks}
        # Tracks que faltam no destino: precisam ser buscados via search_track
        missing = [t for t in source_tracks if t.id not in target_ids]

        matched_ids: list[str] = []
        for t in missing:
            query = f"{t.name} {t.artist}".strip()
            found = await tgt_client.search_track(query, tgt_auth)
            if found and found.id not in target_ids:
                matched_ids.append(found.id)
                target_ids.add(found.id)

        if matched_ids:
            await tgt_client.add_tracks_to_playlist(
                sync.target_playlist_id, matched_ids, tgt_auth
            )

        removed = 0
        if sync.method == SyncMethod.MIRROR:
            # Para espelhar, remove o que existe no destino mas nao na origem.
            # Atencao: o match aqui e por id do provedor, que nao existe cross-
            # provedor. Em sync cross-provider so implementamos add_only bem.
            source_ids_same_provider = (
                {t.id for t in source_tracks}
                if sync.source_provider == sync.target_provider
                else None
            )
            if source_ids_same_provider is not None:
                to_remove = [
                    t.id for t in target_tracks if t.id not in source_ids_same_provider
                ]
                if to_remove:
                    try:
                        await tgt_client.remove_tracks_from_playlist(
                            sync.target_playlist_id, to_remove, tgt_auth
                        )
                        removed = len(to_remove)
                    except NotImplementedError:
                        logger.warning(
                            "Remove tracks nao suportado para provedor %s",
                            sync.target_provider,
                        )

        await collection.update_one(
            {"_id": sync.id},
            {
                "$set": {
                    "last_synced_at": datetime.now(UTC),
                    "last_error": None,
                    "tracks_added_last_run": len(matched_ids),
                    "status": SyncStatus.ACTIVE.value,
                    "updated_at": datetime.now(UTC),
                }
            },
        )
        logger.info(
            "Sync %s concluida: +%d, -%d (metodo=%s)",
            sync.id,
            len(matched_ids),
            removed,
            sync.method,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Sync %s falhou", sync.id)
        await collection.update_one(
            {"_id": sync.id},
            {
                "$set": {
                    "last_error": str(exc)[:500],
                    "status": SyncStatus.ERROR.value,
                    "updated_at": datetime.now(UTC),
                }
            },
        )


async def scan_and_run_due_syncs(db: AsyncIOMotorDatabase) -> None:
    """Escaneia todas as syncs ativas e dispara as que estao na janela."""
    now = datetime.now(UTC)
    cursor = db["playlist_syncs"].find({"status": SyncStatus.ACTIVE.value})
    count = 0
    async for raw in cursor:
        try:
            sync = PlaylistSyncDocument.model_validate(raw)
        except Exception:  # noqa: BLE001
            continue
        if _is_due(sync, now):
            count += 1
            await run_sync(db, sync)
    if count:
        logger.info("scan_and_run_due_syncs: %d sync(s) disparada(s)", count)


async def run_sync_by_id(db: AsyncIOMotorDatabase, user_id: str, sync_id: str) -> None:
    """Executa uma sync especifica imediatamente (chamada manual)."""
    if not ObjectId.is_valid(sync_id):
        return
    raw = await db["playlist_syncs"].find_one(
        {"_id": ObjectId(sync_id), "user_id": ObjectId(user_id)}
    )
    if not raw:
        return
    sync = PlaylistSyncDocument.model_validate(raw)
    await run_sync(db, sync)
