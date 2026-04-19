from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from src.models.common import Provider


@dataclass
class OAuthTokenResponse:
    access_token: str
    refresh_token: str | None = None
    expires_at: datetime | None = None
    scope: str | None = None

    @classmethod
    def from_provider_response(cls, data: dict[str, Any]) -> "OAuthTokenResponse":
        expires_in = data.get("expires_in")
        expires_at: datetime | None = None
        if expires_in is not None:
            expires_at = datetime.now(UTC) + timedelta(seconds=int(expires_in))
        return cls(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            expires_at=expires_at,
            scope=data.get("scope"),
        )


class OAuthProvider(ABC):
    """Contrato de provedores que suportam Authorization Code flow."""

    provider: Provider

    @abstractmethod
    def build_authorize_url(self, state: str) -> str:
        ...

    @abstractmethod
    async def exchange_code(self, code: str) -> OAuthTokenResponse:
        ...

    @abstractmethod
    async def refresh(self, refresh_token: str) -> OAuthTokenResponse:
        ...

    @abstractmethod
    async def fetch_user_info(self, access_token: str) -> dict[str, Any]:
        """Retorna {provider_user_id, display_name}."""
        ...
