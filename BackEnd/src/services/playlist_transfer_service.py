from datetime import UTC, datetime

import httpx
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.integrations.base import ProviderAuth
from src.integrations.registry import get_provider_client
from src.models.common import Provider
from src.models.transfer import TransferDocument, TransferStatus, TransferTrackResult
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track
from src.schemas.transfer import PlaylistTransferCreate
from src.services.account_service import AccountService


class PlaylistTransferService:
    """Orquestra a transferencia de playlists entre provedores.

    - `create_transfer` cria o job com status PENDING e retorna imediatamente.
    - `execute_transfer` (roda em background) faz o trabalho: busca tracks,
      faz matching no destino e cria a playlist. Atualiza status/metricas.
    """

    def __init__(self, db: AsyncIOMotorDatabase, accounts: AccountService) -> None:
        self._transfers = db["transfers"]
        self._accounts = accounts

    async def list_user_playlists(
        self, user_id: str, provider: Provider
    ) -> list[PlaylistSummary]:
        auth = await self._accounts.get_auth(user_id, provider)
        client = get_provider_client(provider)
        try:
            return await client.list_user_playlists(auth)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in (401, 403):
                fresh = await self._accounts.force_refresh(user_id, provider)
                if fresh:
                    return await client.list_user_playlists(fresh)
            raise

    async def get_playlist_tracks(
        self, user_id: str, provider: Provider, playlist_id: str
    ) -> list[Track]:
        auth = await self._accounts.get_auth(user_id, provider)
        client = get_provider_client(provider)
        try:
            return await client.get_playlist_tracks(playlist_id, auth)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in (401, 403):
                fresh = await self._accounts.force_refresh(user_id, provider)
                if fresh:
                    return await client.get_playlist_tracks(playlist_id, fresh)
            raise

    async def create_transfer(
        self, user_id: str, payload: PlaylistTransferCreate
    ) -> TransferDocument:
        if payload.source_provider == payload.target_provider:
            raise ValueError("Origem e destino nao podem ser iguais")

        transfer = TransferDocument(
            user_id=ObjectId(user_id),
            source_provider=payload.source_provider,
            target_provider=payload.target_provider,
            source_playlist_id=payload.source_playlist_id,
            source_playlist_name=payload.source_playlist_name,
            target_playlist_name=payload.target_playlist_name,
            target_playlist_description=payload.target_playlist_description,
            selected_track_ids=payload.selected_track_ids,
            apply_watermark=payload.apply_watermark,
            status=TransferStatus.PENDING,
        )
        result = await self._transfers.insert_one(transfer.to_mongo())
        transfer.id = result.inserted_id
        return transfer

    async def execute_transfer(self, user_id: str, transfer_id: str) -> None:
        if not ObjectId.is_valid(transfer_id):
            return
        raw = await self._transfers.find_one(
            {"_id": ObjectId(transfer_id), "user_id": ObjectId(user_id)}
        )
        if not raw:
            return

        transfer = TransferDocument.model_validate(raw)
        await self._mark_running(transfer)

        try:
            source_auth = await self._accounts.get_auth(user_id, transfer.source_provider)
            target_auth = await self._accounts.get_auth(user_id, transfer.target_provider)

            source_client = get_provider_client(transfer.source_provider)
            target_client = get_provider_client(transfer.target_provider)

            try:
                source_tracks = await source_client.get_playlist_tracks(
                    transfer.source_playlist_id, source_auth
                )
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code in (401, 403):
                    fresh = await self._accounts.force_refresh(
                        user_id, transfer.source_provider
                    )
                    if fresh:
                        source_auth = fresh
                        source_tracks = await source_client.get_playlist_tracks(
                            transfer.source_playlist_id, source_auth
                        )
                    else:
                        raise
                else:
                    raise
            if transfer.selected_track_ids:
                wanted = set(transfer.selected_track_ids)
                source_tracks = [t for t in source_tracks if t.id in wanted]
            transfer.total_tracks = len(source_tracks)

            matched_ids: list[str] = []
            for track in source_tracks:
                query = f"{track.name} {track.artist}".strip()
                found = await target_client.search_track(query, target_auth)
                transfer.results.append(
                    TransferTrackResult(
                        source_track_id=track.id,
                        source_name=track.name,
                        source_artist=track.artist,
                        matched_target_id=found.id if found else None,
                        matched=found is not None,
                    )
                )
                if found:
                    matched_ids.append(found.id)

            transfer.matched_tracks = len(matched_ids)

            # Marca d'agua opcional no titulo e descricao
            if transfer.apply_watermark:
                watermarked_name = f"{transfer.target_playlist_name} By ITransferMusic"
                watermarked_desc = (
                    (transfer.target_playlist_description + " | ")
                    if transfer.target_playlist_description
                    else ""
                ) + (
                    "This playlist was created by https://www.ITransferMusic.com "
                    "that lets you transfer your playlist to any music platform such as "
                    "Spotify, YouTube Music, Apple Music, Deezer etc."
                )
            else:
                watermarked_name = transfer.target_playlist_name
                watermarked_desc = transfer.target_playlist_description or ""

            target_playlist_id = await target_client.create_playlist(
                name=watermarked_name,
                description=watermarked_desc,
                track_ids=matched_ids,
                auth=target_auth,
            )
            transfer.target_playlist_id = target_playlist_id

            if transfer.total_tracks == 0:
                transfer.status = TransferStatus.FAILED
                transfer.error_message = "Playlist de origem esta vazia"
            elif transfer.matched_tracks == transfer.total_tracks:
                transfer.status = TransferStatus.COMPLETED
            elif transfer.matched_tracks == 0:
                transfer.status = TransferStatus.FAILED
                transfer.error_message = "Nenhuma faixa foi encontrada no destino"
            else:
                transfer.status = TransferStatus.PARTIAL

        except Exception as exc:  # noqa: BLE001
            transfer.status = TransferStatus.FAILED
            transfer.error_message = str(exc)

        transfer.updated_at = datetime.now(UTC)
        await self._transfers.update_one(
            {"_id": transfer.id},
            {"$set": transfer.to_mongo()},
        )

    async def _mark_running(self, transfer: TransferDocument) -> None:
        transfer.status = TransferStatus.RUNNING
        transfer.updated_at = datetime.now(UTC)
        await self._transfers.update_one(
            {"_id": transfer.id},
            {"$set": {"status": transfer.status, "updated_at": transfer.updated_at}},
        )

    async def get_transfer(self, user_id: str, transfer_id: str) -> TransferDocument | None:
        if not ObjectId.is_valid(transfer_id):
            return None
        doc = await self._transfers.find_one(
            {"_id": ObjectId(transfer_id), "user_id": ObjectId(user_id)}
        )
        if not doc:
            return None
        return TransferDocument.model_validate(doc)

    async def list_transfers(self, user_id: str, limit: int = 20) -> list[TransferDocument]:
        cursor = (
            self._transfers.find({"user_id": ObjectId(user_id)})
            .sort("created_at", -1)
            .limit(limit)
        )
        return [TransferDocument.model_validate(doc) async for doc in cursor]
