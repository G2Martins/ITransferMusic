import logging
from typing import Any

import httpx

from src.integrations.base import MusicProviderClient, ProviderAuth
from src.models.common import Provider
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track

logger = logging.getLogger(__name__)


# IDs virtuais para "playlists" pessoais do Spotify que nao sao playlists reais.
VIRTUAL_LIKED = "__liked_songs__"
VIRTUAL_ALBUMS = "__saved_albums__"
VIRTUAL_ARTISTS = "__followed_artists__"


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

    async def _count(self, path: str, auth: ProviderAuth) -> int | None:
        try:
            resp = await self._client.get(
                f"{path}?limit=1", headers=self._headers(auth)
            )
            resp.raise_for_status()
            return resp.json().get("total")
        except httpx.HTTPError:
            return None

    def _virtual_playlists(self) -> list[PlaylistSummary]:
        return [
            PlaylistSummary(
                id=VIRTUAL_LIKED,
                name="Músicas favoritas",
                description="Sua biblioteca de faixas curtidas no Spotify.",
                image_url=None,
                track_count=None,
                provider=self.provider,
            ),
            PlaylistSummary(
                id=VIRTUAL_ALBUMS,
                name="Álbuns favoritos",
                description="Todos os álbuns salvos na sua biblioteca.",
                image_url=None,
                track_count=None,
                provider=self.provider,
            ),
            PlaylistSummary(
                id=VIRTUAL_ARTISTS,
                name="Artistas favoritos",
                description="Artistas que você segue — transfere as faixas mais populares.",
                image_url=None,
                track_count=None,
                provider=self.provider,
            ),
        ]

    async def list_user_playlists(self, auth: ProviderAuth) -> list[PlaylistSummary]:
        playlists: list[PlaylistSummary] = list(self._virtual_playlists())
        url: str | None = "/me/playlists?limit=50"
        while url:
            resp = await self._client.get(url, headers=self._headers(auth))
            resp.raise_for_status()
            body = resp.json()
            for item in body.get("items", []):
                images = item.get("images") or []
                # Feb/2026 migration: `tracks.total` renomeado para `items.total`.
                # Mantém fallback para o campo antigo.
                count_block = item.get("items") or item.get("tracks") or {}
                playlists.append(
                    PlaylistSummary(
                        id=item["id"],
                        name=item.get("name", ""),
                        description=item.get("description"),
                        image_url=images[0]["url"] if images else None,
                        track_count=count_block.get("total"),
                        provider=self.provider,
                    )
                )
            next_url = body.get("next")
            url = next_url.replace(self.BASE_URL, "") if next_url else None
        return playlists

    async def get_playlist_tracks(
        self, playlist_id: str, auth: ProviderAuth
    ) -> list[Track]:
        if playlist_id == VIRTUAL_LIKED:
            return await self._liked_tracks(auth)
        if playlist_id == VIRTUAL_ALBUMS:
            return await self._saved_album_tracks(auth)
        if playlist_id == VIRTUAL_ARTISTS:
            return await self._followed_artist_tracks(auth)

        # Migração Feb/2026 da Spotify: /playlists/{id}/tracks foi removido em
        # Dev Mode e substituido por /playlists/{id}/items. Campo `track` foi
        # renomeado para `item` em cada entrada.
        # Ref: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
        tracks: list[Track] = []
        url: str | None = (
            f"/playlists/{playlist_id}/items"
            "?limit=100&market=from_token&additional_types=track"
        )
        while url:
            resp = await self._client.get(url, headers=self._headers(auth))
            resp.raise_for_status()
            body = resp.json()
            for entry in body.get("items", []):
                # compat: aceita tanto `item` (novo) quanto `track` (legado)
                track_data = entry.get("item") or entry.get("track") or {}
                if track_data.get("id"):
                    tracks.append(self._to_track(track_data))
            next_url = body.get("next")
            url = next_url.replace(self.BASE_URL, "") if next_url else None
        return tracks

    async def _liked_tracks(self, auth: ProviderAuth) -> list[Track]:
        tracks: list[Track] = []
        url: str | None = "/me/tracks?limit=50&market=from_token"
        while url:
            resp = await self._client.get(url, headers=self._headers(auth))
            resp.raise_for_status()
            body = resp.json()
            for item in body.get("items", []):
                track_data = item.get("track") or {}
                if not track_data.get("id"):
                    continue
                tracks.append(self._to_track(track_data))
            next_url = body.get("next")
            url = next_url.replace(self.BASE_URL, "") if next_url else None
        return tracks

    async def _saved_album_tracks(self, auth: ProviderAuth) -> list[Track]:
        tracks: list[Track] = []
        url: str | None = "/me/albums?limit=50"
        while url:
            resp = await self._client.get(url, headers=self._headers(auth))
            resp.raise_for_status()
            body = resp.json()
            for item in body.get("items", []):
                album = item.get("album") or {}
                for t in (album.get("tracks") or {}).get("items", []) or []:
                    if not t.get("id"):
                        continue
                    # album endpoint nao traz objeto `album` dentro do track;
                    # injeta para preservar nome e capa do album.
                    t["album"] = {
                        "name": album.get("name"),
                        "images": album.get("images") or [],
                    }
                    tracks.append(self._to_track(t))
            next_url = body.get("next")
            url = next_url.replace(self.BASE_URL, "") if next_url else None
        return tracks

    async def _followed_artist_tracks(self, auth: ProviderAuth) -> list[Track]:
        artists: list[dict[str, Any]] = []
        url: str | None = "/me/following?type=artist&limit=50"
        while url:
            resp = await self._client.get(url, headers=self._headers(auth))
            resp.raise_for_status()
            body = resp.json()
            block = body.get("artists") or {}
            for a in block.get("items") or []:
                if a.get("id"):
                    artists.append(a)
            next_url = block.get("next")
            url = next_url.replace(self.BASE_URL, "") if next_url else None

        tracks: list[Track] = []
        for artist in artists:
            resp = await self._client.get(
                f"/artists/{artist['id']}/top-tracks",
                params={"market": "from_token"},
                headers=self._headers(auth),
            )
            if resp.status_code >= 400:
                continue
            for t in resp.json().get("tracks", []):
                if t.get("id"):
                    tracks.append(self._to_track(t))
        return tracks

    def _to_track(self, track_data: dict[str, Any]) -> Track:
        artists = track_data.get("artists") or []
        artist = artists[0]["name"] if artists else "Desconhecido"
        album_obj = track_data.get("album") or {}
        album = album_obj.get("name")
        images = album_obj.get("images") or []
        # Pega a menor imagem disponivel (para thumbnail) ou a primeira.
        image_url = images[-1]["url"] if images else None
        return Track(
            id=track_data["id"],
            name=track_data.get("name", ""),
            artist=artist,
            album=album,
            image_url=image_url,
            uri=track_data.get("uri", f"spotify:track:{track_data['id']}"),
            provider=self.provider,
        )

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
        return self._to_track(items[0])

    async def search_tracks(
        self, query: str, auth: ProviderAuth, limit: int = 5, offset: int = 0
    ) -> list[Track]:
        # Spotify /search em Developer Mode (Feb/2026) passou a rejeitar limit > 10
        # com HTTP 400 "Invalid limit". Capamos defensivamente em 10.
        capped = max(1, min(limit, 10))
        # Spotify aceita offset <= 1000 para search.
        offset = max(0, min(offset, 1000 - capped))
        params: dict[str, Any] = {
            "q": query,
            "type": "track",
            "limit": capped,
            "market": "from_token",
        }
        # Evita incluir offset=0 explicitamente (reduz superficie de erro do endpoint).
        if offset > 0:
            params["offset"] = offset
        resp = await self._client.get(
            "/search",
            params=params,
            headers=self._headers(auth),
        )
        if resp.status_code >= 400:
            body = resp.text[:300]
            logger.warning(
                "spotify search_tracks HTTP %s query=%r offset=%s body=%s",
                resp.status_code,
                query,
                offset,
                body,
            )
            resp.raise_for_status()
        items = ((resp.json().get("tracks") or {}).get("items")) or []
        tracks = [self._to_track(it) for it in items if it and it.get("id")]
        if not tracks:
            logger.info(
                "spotify search_tracks vazio query=%r offset=%s (total=%s)",
                query,
                offset,
                ((resp.json().get("tracks") or {}).get("total")),
            )
        return tracks

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
        if resp.status_code == 403:
            spotify_msg = ""
            try:
                spotify_msg = (resp.json().get("error") or {}).get("message", "") or ""
            except Exception:  # noqa: BLE001
                spotify_msg = resp.text[:200]
            raise PermissionError(
                "Spotify recusou a criacao da playlist (403). "
                f"Resposta do Spotify: '{spotify_msg}'. "
                "Causas comuns: (1) app em Developer Mode e o usuario nao foi "
                "adicionado em Dashboard > Users and Access; (2) a conta foi "
                "autorizada sem o escopo 'playlist-modify-private/public' - "
                "neste caso, desvincule e vincule novamente o Spotify."
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

    async def add_tracks_to_playlist(
        self, playlist_id: str, track_ids: list[str], auth: ProviderAuth
    ) -> None:
        if not track_ids:
            return
        await self._add_tracks(playlist_id, track_ids, auth)

    async def remove_tracks_from_playlist(
        self, playlist_id: str, track_ids: list[str], auth: ProviderAuth
    ) -> None:
        if not track_ids:
            return
        for chunk_start in range(0, len(track_ids), 100):
            chunk = track_ids[chunk_start : chunk_start + 100]
            tracks = [{"uri": f"spotify:track:{tid}"} for tid in chunk]
            resp = await self._client.request(
                "DELETE",
                f"/playlists/{playlist_id}/tracks",
                headers=self._headers(auth),
                json={"tracks": tracks},
            )
            resp.raise_for_status()

    async def playlist_exists(self, playlist_id: str, auth: ProviderAuth) -> bool:
        if playlist_id.startswith("__"):
            # playlists virtuais sao agregacoes pessoais do usuario; sempre "existem".
            return True
        try:
            resp = await self._client.get(
                f"/playlists/{playlist_id}?fields=id",
                headers=self._headers(auth),
            )
            return resp.status_code == 200
        except Exception:  # noqa: BLE001
            return False

    async def aclose(self) -> None:
        await self._client.aclose()
