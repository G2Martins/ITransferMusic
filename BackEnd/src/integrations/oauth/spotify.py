import base64
from typing import Any
from urllib.parse import urlencode

import httpx

from src.core.config import Settings, get_settings
from src.integrations.oauth.base import OAuthProvider, OAuthTokenResponse
from src.models.common import Provider


class SpotifyOAuthProvider(OAuthProvider):
    provider = Provider.SPOTIFY
    AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
    TOKEN_URL = "https://accounts.spotify.com/api/token"
    USERINFO_URL = "https://api.spotify.com/v1/me"
    SCOPES = [
        "playlist-read-private",
        "playlist-read-collaborative",
        "playlist-modify-private",
        "playlist-modify-public",
        "user-read-email",
        "user-library-read",
        "user-follow-read",
    ]

    def _settings(self) -> Settings:
        s = get_settings()
        if not (s.spotify_client_id and s.spotify_client_secret and s.spotify_redirect_uri):
            raise RuntimeError(
                "Spotify nao configurado: defina SPOTIFY_CLIENT_ID, "
                "SPOTIFY_CLIENT_SECRET e SPOTIFY_REDIRECT_URI no .env"
            )
        return s

    def build_authorize_url(self, state: str) -> str:
        s = self._settings()
        params = {
            "client_id": s.spotify_client_id,
            "response_type": "code",
            "redirect_uri": s.spotify_redirect_uri,
            "scope": " ".join(self.SCOPES),
            "state": state,
            "show_dialog": "true",
        }
        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    def _basic_auth_header(self) -> str:
        s = self._settings()
        raw = f"{s.spotify_client_id}:{s.spotify_client_secret}".encode()
        return "Basic " + base64.b64encode(raw).decode()

    async def exchange_code(self, code: str) -> OAuthTokenResponse:
        s = self._settings()
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": s.spotify_redirect_uri,
                },
                headers={
                    "Authorization": self._basic_auth_header(),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            resp.raise_for_status()
            return OAuthTokenResponse.from_provider_response(resp.json())

    async def refresh(self, refresh_token: str) -> OAuthTokenResponse:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                headers={
                    "Authorization": self._basic_auth_header(),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            # Spotify pode nao devolver um novo refresh_token; preservar o atual.
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
                "display_name": data.get("display_name") or data.get("email"),
            }
