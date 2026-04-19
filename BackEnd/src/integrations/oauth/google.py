from typing import Any
from urllib.parse import urlencode

import httpx

from src.core.config import Settings, get_settings
from src.integrations.oauth.base import OAuthProvider, OAuthTokenResponse
from src.models.common import Provider


class GoogleOAuthProvider(OAuthProvider):
    """Usado para vincular o YouTube (Google OAuth com escopo do YouTube Data API)."""

    provider = Provider.YOUTUBE
    AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    SCOPES = [
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ]

    def _settings(self) -> Settings:
        s = get_settings()
        if not (s.google_client_id and s.google_client_secret and s.google_redirect_uri):
            raise RuntimeError(
                "Google/YouTube nao configurado: defina GOOGLE_CLIENT_ID, "
                "GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no .env"
            )
        return s

    def build_authorize_url(self, state: str) -> str:
        s = self._settings()
        params = {
            "client_id": s.google_client_id,
            "redirect_uri": s.google_redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.SCOPES),
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
        }
        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> OAuthTokenResponse:
        s = self._settings()
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": s.google_client_id,
                    "client_secret": s.google_client_secret,
                    "redirect_uri": s.google_redirect_uri,
                },
            )
            resp.raise_for_status()
            return OAuthTokenResponse.from_provider_response(resp.json())

    async def refresh(self, refresh_token: str) -> OAuthTokenResponse:
        s = self._settings()
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": s.google_client_id,
                    "client_secret": s.google_client_secret,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            # Google nao envia refresh_token em responses de refresh; preservar.
            if "refresh_token" not in data:
                data["refresh_token"] = refresh_token
            return OAuthTokenResponse.from_provider_response(data)

    async def fetch_user_info(self, access_token: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                self.USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "provider_user_id": data.get("id"),
                "display_name": data.get("name") or data.get("email"),
            }
