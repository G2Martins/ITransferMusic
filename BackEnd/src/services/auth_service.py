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
from src.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


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

    @staticmethod
    def _issue_tokens(user_id: str) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(user_id),
            refresh_token=create_refresh_token(user_id),
        )
