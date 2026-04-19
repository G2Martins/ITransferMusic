from typing import Annotated

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.db import get_database
from src.core.security import decode_token
from src.services.account_service import AccountService
from src.services.auth_service import AuthService
from src.services.playlist_transfer_service import PlaylistTransferService

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=True)


def get_db() -> AsyncIOMotorDatabase:
    return get_database()


DbDep = Annotated[AsyncIOMotorDatabase, Depends(get_db)]


def get_auth_service(db: DbDep) -> AuthService:
    return AuthService(db)


def get_account_service(db: DbDep) -> AccountService:
    return AccountService(db)


def get_playlist_transfer_service(
    db: DbDep,
    accounts: Annotated[AccountService, Depends(get_account_service)],
) -> PlaylistTransferService:
    return PlaylistTransferService(db, accounts)


async def get_current_user_id(token: Annotated[str, Depends(_oauth2_scheme)]) -> str:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais invalidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise credentials_exc from exc

    if payload.get("type") != "access":
        raise credentials_exc

    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        raise credentials_exc
    return user_id


CurrentUserId = Annotated[str, Depends(get_current_user_id)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
AccountServiceDep = Annotated[AccountService, Depends(get_account_service)]
PlaylistTransferServiceDep = Annotated[
    PlaylistTransferService, Depends(get_playlist_transfer_service)
]
