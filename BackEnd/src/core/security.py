from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt

from src.core.config import get_settings


def hash_password(plain: str) -> str:
    """Gera hash bcrypt. O plain text e limitado a 72 bytes pelo proprio bcrypt;
    o schema Pydantic deve validar o tamanho antes de chegar aqui."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(days=settings.jwt_refresh_token_expire_days),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Token invalido ou expirado") from exc


def create_oauth_state_token(user_id: str, provider: str) -> str:
    """Token de curta duracao usado como `state` no fluxo OAuth (protecao CSRF)."""
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "provider": provider,
        "iat": now,
        "exp": now + timedelta(minutes=10),
        "type": "oauth_state",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_oauth_state_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != "oauth_state":
        raise ValueError("Token de state invalido")
    return payload


def _fernet() -> Fernet:
    settings = get_settings()
    return Fernet(settings.provider_token_encryption_key.encode())


def encrypt_provider_token(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_provider_token(cipher: str) -> str:
    try:
        return _fernet().decrypt(cipher.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Token cifrado invalido") from exc
