from datetime import UTC, datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.integrations.registry import get_provider_client
from src.models.common import Provider
from src.models.transfer import TransferDocument, TransferStatus, TransferTrackResult
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track
from src.schemas.transfer import PlaylistTransferCreate
from src.services.account_service import AccountService


class PlaylistTransferService:
    """Orquestra a transferencia de playlists entre provedores.

    Fluxo:
      1. Busca tracks na origem
      2. Para cada track, faz search no destino (por nome + artista)
      3. Cria playlist no destino com as tracks encontradas
      4. Persiste o job com metricas de matching
    """

    def __init__(self, db: AsyncIOMotorDatabase, accounts: AccountService) -> None:
        self._transfers = db["transfers"]
        self._accounts = accounts

    async def list_user_playlists(
        self, user_id: str, provider: Provider
    ) -> list[PlaylistSummary]:
        auth = await self._accounts.get_auth(user_id, provider)
        client = get_provider_client(provider)
        return await client.list_user_playlists(auth)

    async def get_playlist_tracks(
        self, user_id: str, provider: Provider, playlist_id: str
    ) -> list[Track]:
        auth = await self._accounts.get_auth(user_id, provider)
        client = get_provider_client(provider)
        return await client.get_playlist_tracks(playlist_id, auth)

    async def transfer(
        self, user_id: str, payload: PlaylistTransferCreate
    ) -> TransferDocument:
        if payload.source_provider == payload.target_provider:
            raise ValueError("Origem e destino nao podem ser iguais")

        transfer = TransferDocument(
            user_id=ObjectId(user_id),
            source_provider=payload.source_provider,
            target_provider=payload.target_provider,
            source_playlist_id=payload.source_playlist_id,
            target_playlist_name=payload.target_playlist_name,
            target_playlist_description=payload.target_playlist_description,
            status=TransferStatus.RUNNING,
        )
        result = await self._transfers.insert_one(transfer.to_mongo())
        transfer.id = result.inserted_id

        try:
            source_auth = await self._accounts.get_auth(user_id, payload.source_provider)
            target_auth = await self._accounts.get_auth(user_id, payload.target_provider)

            source_client = get_provider_client(payload.source_provider)
            target_client = get_provider_client(payload.target_provider)

            source_tracks = await source_client.get_playlist_tracks(
                payload.source_playlist_id, source_auth
            )
            transfer.total_tracks = len(source_tracks)

            matched_ids: list[str] = []
            for track in source_tracks:
                query = f"{track.name} {track.artist}".strip()
                found = await target_client.search_track(query, target_auth)
                result_entry = TransferTrackResult(
                    source_track_id=track.id,
                    source_name=track.name,
                    source_artist=track.artist,
                    matched_target_id=found.id if found else None,
                    matched=found is not None,
                )
                transfer.results.append(result_entry)
                if found:
                    matched_ids.append(found.id)

            transfer.matched_tracks = len(matched_ids)

            target_playlist_id = await target_client.create_playlist(
                name=payload.target_playlist_name,
                description=payload.target_playlist_description,
                track_ids=matched_ids,
                auth=target_auth,
            )
            transfer.target_playlist_id = target_playlist_id

            if transfer.matched_tracks == transfer.total_tracks:
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
        return transfer

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
