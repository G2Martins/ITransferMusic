from datetime import UTC, datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.security import decrypt_provider_token, encrypt_provider_token
from src.integrations.base import ProviderAuth
from src.models.common import Provider
from src.models.linked_account import LinkedAccountDocument


class LinkedAccountNotFoundError(Exception):
    pass


class AccountService:
    """Gerencia contas de provedores vinculadas a um usuario e entrega `ProviderAuth`."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._collection = db["linked_accounts"]

    async def upsert(
        self,
        *,
        user_id: str,
        provider: Provider,
        access_token: str,
        refresh_token: str | None = None,
        provider_user_id: str | None = None,
        provider_display_name: str | None = None,
        expires_at: datetime | None = None,
        scope: str | None = None,
    ) -> LinkedAccountDocument:
        doc = LinkedAccountDocument(
            user_id=ObjectId(user_id),
            provider=provider,
            provider_user_id=provider_user_id,
            provider_display_name=provider_display_name,
            access_token_encrypted=encrypt_provider_token(access_token),
            refresh_token_encrypted=(
                encrypt_provider_token(refresh_token) if refresh_token else None
            ),
            expires_at=expires_at,
            scope=scope,
        )
        await self._collection.update_one(
            {"user_id": ObjectId(user_id), "provider": provider.value},
            {"$set": doc.to_mongo()},
            upsert=True,
        )
        return doc

    async def get_auth(self, user_id: str, provider: Provider) -> ProviderAuth:
        doc = await self._collection.find_one(
            {"user_id": ObjectId(user_id), "provider": provider.value}
        )
        if not doc:
            raise LinkedAccountNotFoundError(
                f"Conta do provedor {provider.value} nao vinculada"
            )
        return ProviderAuth(
            access_token=decrypt_provider_token(doc["access_token_encrypted"]),
        )

    async def list_for_user(self, user_id: str) -> list[dict]:
        cursor = self._collection.find({"user_id": ObjectId(user_id)})
        result: list[dict] = []
        async for doc in cursor:
            result.append(
                {
                    "provider": doc["provider"],
                    "provider_display_name": doc.get("provider_display_name"),
                    "provider_user_id": doc.get("provider_user_id"),
                    "expires_at": doc.get("expires_at"),
                    "created_at": doc.get("created_at"),
                    "updated_at": doc.get("updated_at"),
                }
            )
        return result

    async def unlink(self, user_id: str, provider: Provider) -> None:
        await self._collection.delete_one(
            {"user_id": ObjectId(user_id), "provider": provider.value}
        )

    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)
