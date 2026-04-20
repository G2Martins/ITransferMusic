from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.models.sync import PlaylistSyncDocument, SyncStatus
from src.schemas.sync import PlaylistSyncCreate


class SyncNotFoundError(Exception):
    pass


class SyncService:
    """CRUD de sincronizacoes de playlists. O job diario de propagar mudancas
    fica como TODO (exigira um scheduler como APScheduler).
    """

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._collection = db["playlist_syncs"]

    async def create(
        self, user_id: str, payload: PlaylistSyncCreate
    ) -> PlaylistSyncDocument:
        if payload.source_provider == payload.target_provider and (
            payload.source_playlist_id == payload.target_playlist_id
        ):
            raise ValueError("Origem e destino nao podem ser a mesma playlist")

        doc = PlaylistSyncDocument(
            user_id=ObjectId(user_id),
            source_provider=payload.source_provider,
            source_playlist_id=payload.source_playlist_id,
            source_playlist_name=payload.source_playlist_name,
            target_provider=payload.target_provider,
            target_playlist_id=payload.target_playlist_id,
            target_playlist_name=payload.target_playlist_name,
        )
        result = await self._collection.insert_one(doc.to_mongo())
        doc.id = result.inserted_id
        return doc

    async def list_for_user(self, user_id: str) -> list[PlaylistSyncDocument]:
        cursor = (
            self._collection.find({"user_id": ObjectId(user_id)})
            .sort("created_at", -1)
        )
        return [PlaylistSyncDocument.model_validate(d) async for d in cursor]

    async def set_status(
        self, user_id: str, sync_id: str, status: SyncStatus
    ) -> PlaylistSyncDocument:
        if not ObjectId.is_valid(sync_id):
            raise SyncNotFoundError("Sync invalida")
        await self._collection.update_one(
            {"_id": ObjectId(sync_id), "user_id": ObjectId(user_id)},
            {"$set": {"status": status.value}},
        )
        raw = await self._collection.find_one(
            {"_id": ObjectId(sync_id), "user_id": ObjectId(user_id)}
        )
        if not raw:
            raise SyncNotFoundError("Sync nao encontrada")
        return PlaylistSyncDocument.model_validate(raw)

    async def delete(self, user_id: str, sync_id: str) -> None:
        if not ObjectId.is_valid(sync_id):
            return
        await self._collection.delete_one(
            {"_id": ObjectId(sync_id), "user_id": ObjectId(user_id)}
        )
