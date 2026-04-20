from datetime import UTC, datetime
from typing import Any

import httpx
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.config import get_settings
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from src.models.user import UserDocument
from src.schemas.auth import LoginRequest, MeResponse, RegisterRequest, TokenResponse

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._users = db["users"]
        self._db = db

    async def delete_account(self, user_id: str) -> None:
        """Remove usuario e TODOS os dados relacionados (contas vinculadas,
        transferencias, syncs). Operacao irreversivel."""
        if not ObjectId.is_valid(user_id):
            raise ValueError("Usuario invalido")
        oid = ObjectId(user_id)
        await self._db["linked_accounts"].delete_many({"user_id": oid})
        await self._db["transfers"].delete_many({"user_id": oid})
        await self._db["playlist_syncs"].delete_many({"user_id": oid})
        await self._users.delete_one({"_id": oid})

    async def register(self, payload: RegisterRequest) -> TokenResponse:
        existing = await self._users.find_one({"email": payload.email})
        if existing:
            raise ValueError("E-mail ja cadastrado")

        user = UserDocument(
            name=payload.name,
            email=payload.email,
            hashed_password=hash_password(payload.password),
        )
        result = await self._users.insert_one(user.to_mongo())
        return self._issue_tokens(str(result.inserted_id))

    async def login(self, payload: LoginRequest) -> TokenResponse:
        doc = await self._users.find_one({"email": payload.email})
        if not doc or not doc.get("hashed_password") or not verify_password(
            payload.password, doc["hashed_password"]
        ):
            raise ValueError("Credenciais invalidas")
        if not doc.get("is_active", True):
            raise ValueError("Usuario inativo")
        return self._issue_tokens(str(doc["_id"]))

    async def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
        except ValueError as exc:
            raise ValueError("Refresh token invalido") from exc
        if payload.get("type") != "refresh":
            raise ValueError("Token nao e um refresh token")

        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise ValueError("Refresh token malformado")
        doc = await self._users.find_one({"_id": ObjectId(user_id)})
        if not doc:
            raise ValueError("Usuario nao encontrado")
        return self._issue_tokens(user_id)

    async def get_me(self, user_id: str) -> MeResponse:
        doc = await self._find_user(user_id)
        return MeResponse(
            id=str(doc["_id"]),
            name=doc["name"],
            email=doc["email"],
            timezone_offset_minutes=doc.get("timezone_offset_minutes", -180),
        )

    async def update_profile(
        self,
        user_id: str,
        name: str | None = None,
        timezone_offset_minutes: int | None = None,
    ) -> MeResponse:
        update: dict = {"updated_at": datetime.now(UTC)}
        if name is not None:
            update["name"] = name
        if timezone_offset_minutes is not None:
            update["timezone_offset_minutes"] = timezone_offset_minutes
        await self._users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update},
        )
        return await self.get_me(user_id)

    async def google_login(self, credential: str) -> TokenResponse:
        """Valida o id_token do Google e emite nosso JWT.

        Cria o usuario local automaticamente na primeira vez.
        """
        settings = get_settings()
        if not settings.google_client_id:
            raise ValueError("Google OAuth nao configurado no backend")

        info = await self._verify_google_token(credential, settings.google_client_id)
        email = info.get("email")
        if not email or info.get("email_verified") not in ("true", True):
            raise ValueError("E-mail do Google nao verificado")

        doc = await self._users.find_one({"email": email})
        if doc is None:
            user = UserDocument(
                name=info.get("name") or email.split("@")[0],
                email=email,
                hashed_password=None,
                google_id=info.get("sub"),
                avatar_url=info.get("picture"),
            )
            result = await self._users.insert_one(user.to_mongo())
            return self._issue_tokens(str(result.inserted_id))

        # Atualiza google_id se ainda nao estiver salvo
        if not doc.get("google_id") and info.get("sub"):
            await self._users.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "google_id": info["sub"],
                        "avatar_url": info.get("picture"),
                        "updated_at": datetime.now(UTC),
                    }
                },
            )
        return self._issue_tokens(str(doc["_id"]))

    @staticmethod
    async def _verify_google_token(
        credential: str, expected_aud: str
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                GOOGLE_TOKENINFO_URL,
                params={"id_token": credential},
            )
        if resp.status_code != 200:
            raise ValueError("Token Google invalido")
        data = resp.json()
        if data.get("aud") != expected_aud:
            raise ValueError("Token nao pertence a este client_id")
        return data

    async def change_password(
        self, user_id: str, current_password: str, new_password: str
    ) -> None:
        doc = await self._find_user(user_id)
        if not doc.get("hashed_password"):
            raise ValueError(
                "Esta conta foi criada via Google; defina uma senha pela opcao 'Esqueci senha' antes."
            )
        if not verify_password(current_password, doc["hashed_password"]):
            raise ValueError("Senha atual incorreta")
        if current_password == new_password:
            raise ValueError("A nova senha precisa ser diferente da atual")
        await self._users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "hashed_password": hash_password(new_password),
                    "updated_at": datetime.now(UTC),
                }
            },
        )

    async def _find_user(self, user_id: str) -> dict:
        if not ObjectId.is_valid(user_id):
            raise ValueError("Usuario invalido")
        doc = await self._users.find_one({"_id": ObjectId(user_id)})
        if not doc:
            raise ValueError("Usuario nao encontrado")
        return doc

    @staticmethod
    def _issue_tokens(user_id: str) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(user_id),
            refresh_token=create_refresh_token(user_id),
        )
