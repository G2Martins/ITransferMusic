from datetime import UTC, datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from src.models.user import UserDocument
from src.schemas.auth import LoginRequest, MeResponse, RegisterRequest, TokenResponse


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._users = db["users"]

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
        if not doc or not verify_password(payload.password, doc["hashed_password"]):
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
        )

    async def update_profile(self, user_id: str, name: str) -> MeResponse:
        await self._users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"name": name, "updated_at": datetime.now(UTC)}},
        )
        return await self.get_me(user_id)

    async def change_password(
        self, user_id: str, current_password: str, new_password: str
    ) -> None:
        doc = await self._find_user(user_id)
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
