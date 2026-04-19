from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.security import decrypt_provider_token, encrypt_provider_token
from src.integrations.base import ProviderAuth
from src.integrations.oauth.registry import get_oauth_provider, is_oauth_supported
from src.models.common import Provider
from src.models.linked_account import LinkedAccountDocument

_REFRESH_MARGIN = timedelta(seconds=60)


class LinkedAccountNotFoundError(Exception):
    pass


class AccountService:
    """Gerencia contas de provedores vinculadas e entrega `ProviderAuth`.

    `get_auth` faz refresh automatico do access_token quando perto de expirar.
    """

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
                f"Conta do provedor '{provider.value}' nao vinculada"
            )

        doc = await self._refresh_if_needed(doc, provider)
        return ProviderAuth(
            access_token=decrypt_provider_token(doc["access_token_encrypted"]),
        )

    async def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        cursor = self._collection.find({"user_id": ObjectId(user_id)})
        result: list[dict[str, Any]] = []
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

    async def _refresh_if_needed(
        self, doc: dict[str, Any], provider: Provider
    ) -> dict[str, Any]:
        expires_at = doc.get("expires_at")
        if not expires_at:
            return doc

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at > datetime.now(UTC) + _REFRESH_MARGIN:
            return doc

        refresh_cipher = doc.get("refresh_token_encrypted")
        if not refresh_cipher or not is_oauth_supported(provider):
            return doc

        oauth = get_oauth_provider(provider)
        refresh_plain = decrypt_provider_token(refresh_cipher)

        try:
            tokens = await oauth.refresh(refresh_plain)
        except httpx.HTTPError:
            # Deixa o cliente seguir; API externa vai retornar 401 e o frontend
            # pode redirigir o usuario para re-vincular a conta.
            return doc

        update: dict[str, Any] = {
            "access_token_encrypted": encrypt_provider_token(tokens.access_token),
            "expires_at": tokens.expires_at,
            "updated_at": datetime.now(UTC),
        }
        if tokens.refresh_token and tokens.refresh_token != refresh_plain:
            update["refresh_token_encrypted"] = encrypt_provider_token(tokens.refresh_token)
        if tokens.scope:
            update["scope"] = tokens.scope

        await self._collection.update_one({"_id": doc["_id"]}, {"$set": update})
        doc.update(update)
        return doc
