from typing import Any

import httpx

from src.integrations.base import MusicProviderClient, ProviderAuth
from src.models.common import Provider
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track


class SpotifyClient(MusicProviderClient):
    provider = Provider.SPOTIFY
    BASE_URL = "https://api.spotify.com/v1"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client or httpx.AsyncClient(base_url=self.BASE_URL, timeout=15.0)

    @staticmethod
    def _headers(auth: ProviderAuth) -> dict[str, str]:
        return {"Authorization": f"Bearer {auth.access_token}"}

    async def _get_user_id(self, auth: ProviderAuth) -> str:
        resp = await self._client.get("/me", headers=self._headers(auth))
        resp.raise_for_status()
        return resp.json()["id"]

    async def list_user_playlists(self, auth: ProviderAuth) -> list[PlaylistSummary]:
        playlists: list[PlaylistSummary] = []
        url: str | None = "/me/playlists?limit=50"
        while url:
            resp = await self._client.get(url, headers=self._headers(auth))
            resp.raise_for_status()
            body = resp.json()
            for item in body.get("items", []):
                images = item.get("images") or []
                playlists.append(
                    PlaylistSummary(
                        id=item["id"],
                        name=item.get("name", ""),
                        description=item.get("description"),
                        image_url=images[0]["url"] if images else None,
                        track_count=(item.get("tracks") or {}).get("total"),
                        provider=self.provider,
                    )
                )
            next_url = body.get("next")
            url = next_url.replace(self.BASE_URL, "") if next_url else None
        return playlists

    async def get_playlist_tracks(
        self, playlist_id: str, auth: ProviderAuth
    ) -> list[Track]:
        tracks: list[Track] = []
        url: str | None = f"/playlists/{playlist_id}/tracks?limit=100"
        while url:
            resp = await self._client.get(url, headers=self._headers(auth))
            resp.raise_for_status()
            body = resp.json()
            for item in body.get("items", []):
                track_data = item.get("track") or {}
                if not track_data.get("id"):
                    continue
                artists = track_data.get("artists") or []
                artist = artists[0]["name"] if artists else "Desconhecido"
                album = (track_data.get("album") or {}).get("name")
                tracks.append(
                    Track(
                        id=track_data["id"],
                        name=track_data.get("name", ""),
                        artist=artist,
                        album=album,
                        uri=track_data.get("uri", f"spotify:track:{track_data['id']}"),
                        provider=self.provider,
                    )
                )
            next_url = body.get("next")
            url = next_url.replace(self.BASE_URL, "") if next_url else None
        return tracks

    async def search_track(self, query: str, auth: ProviderAuth) -> Track | None:
        resp = await self._client.get(
            "/search",
            params={"q": query, "type": "track", "limit": 1},
            headers=self._headers(auth),
        )
        resp.raise_for_status()
        items = ((resp.json().get("tracks") or {}).get("items")) or []
        if not items:
            return None
        item = items[0]
        artists = item.get("artists") or []
        return Track(
            id=item["id"],
            name=item.get("name", ""),
            artist=artists[0]["name"] if artists else "Desconhecido",
            album=(item.get("album") or {}).get("name"),
            uri=item.get("uri", f"spotify:track:{item['id']}"),
            provider=self.provider,
        )

    async def create_playlist(
        self,
        name: str,
        description: str | None,
        track_ids: list[str],
        auth: ProviderAuth,
    ) -> str:
        user_id = await self._get_user_id(auth)
        body: dict[str, Any] = {
            "name": name,
            "description": description or "",
            "public": False,
        }
        resp = await self._client.post(
            f"/users/{user_id}/playlists",
            headers=self._headers(auth),
            json=body,
        )
        resp.raise_for_status()
        playlist_id = resp.json()["id"]

        if track_ids:
            await self._add_tracks(playlist_id, track_ids, auth)
        return playlist_id

    async def _add_tracks(
        self, playlist_id: str, track_ids: list[str], auth: ProviderAuth
    ) -> None:
        # Spotify aceita no maximo 100 URIs por requisicao.
        for chunk_start in range(0, len(track_ids), 100):
            chunk = track_ids[chunk_start : chunk_start + 100]
            uris = [f"spotify:track:{tid}" for tid in chunk]
            resp = await self._client.post(
                f"/playlists/{playlist_id}/tracks",
                headers=self._headers(auth),
                json={"uris": uris},
            )
            resp.raise_for_status()

    async def aclose(self) -> None:
        await self._client.aclose()
