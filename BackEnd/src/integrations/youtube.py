import httpx

from src.integrations.base import MusicProviderClient, ProviderAuth
from src.models.common import Provider
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track


class YouTubeClient(MusicProviderClient):
    provider = Provider.YOUTUBE
    BASE_URL = "https://www.googleapis.com/youtube/v3"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client or httpx.AsyncClient(base_url=self.BASE_URL, timeout=15.0)

    @staticmethod
    def _headers(auth: ProviderAuth) -> dict[str, str]:
        return {"Authorization": f"Bearer {auth.access_token}"}

    async def list_user_playlists(self, auth: ProviderAuth) -> list[PlaylistSummary]:
        playlists: list[PlaylistSummary] = []
        page_token: str | None = None
        while True:
            params = {"part": "snippet,contentDetails", "mine": "true", "maxResults": 50}
            if page_token:
                params["pageToken"] = page_token
            resp = await self._client.get("/playlists", params=params, headers=self._headers(auth))
            resp.raise_for_status()
            body = resp.json()
            for item in body.get("items", []):
                snippet = item.get("snippet") or {}
                thumbnails = snippet.get("thumbnails") or {}
                thumb = (thumbnails.get("medium") or thumbnails.get("default") or {}).get("url")
                playlists.append(
                    PlaylistSummary(
                        id=item["id"],
                        name=snippet.get("title", ""),
                        description=snippet.get("description"),
                        image_url=thumb,
                        track_count=(item.get("contentDetails") or {}).get("itemCount"),
                        provider=self.provider,
                    )
                )
            page_token = body.get("nextPageToken")
            if not page_token:
                break
        return playlists

    async def get_playlist_tracks(
        self, playlist_id: str, auth: ProviderAuth
    ) -> list[Track]:
        tracks: list[Track] = []
        page_token: str | None = None
        while True:
            params = {
                "part": "snippet",
                "playlistId": playlist_id,
                "maxResults": 50,
            }
            if page_token:
                params["pageToken"] = page_token
            resp = await self._client.get(
                "/playlistItems", params=params, headers=self._headers(auth)
            )
            resp.raise_for_status()
            body = resp.json()
            for item in body.get("items", []):
                snippet = item.get("snippet") or {}
                resource = snippet.get("resourceId") or {}
                video_id = resource.get("videoId")
                if not video_id:
                    continue
                thumbnails = snippet.get("thumbnails") or {}
                thumb = (
                    (thumbnails.get("default") or thumbnails.get("medium") or {}).get(
                        "url"
                    )
                )
                tracks.append(
                    Track(
                        id=video_id,
                        name=snippet.get("title", ""),
                        artist=snippet.get("videoOwnerChannelTitle")
                        or snippet.get("channelTitle", ""),
                        album=None,
                        image_url=thumb,
                        uri=f"youtube:video:{video_id}",
                        provider=self.provider,
                    )
                )
            page_token = body.get("nextPageToken")
            if not page_token:
                break
        return tracks

    async def search_track(self, query: str, auth: ProviderAuth) -> Track | None:
        results = await self.search_tracks(query, auth, limit=1)
        return results[0] if results else None

    async def search_tracks(
        self, query: str, auth: ProviderAuth, limit: int = 5, offset: int = 0
    ) -> list[Track]:
        # YouTube Data API nao suporta offset; sobre-pedimos e descartamos o prefixo.
        capped = max(1, min(limit, 25))
        fetch = max(1, min(capped + offset, 50))
        resp = await self._client.get(
            "/search",
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": fetch,
            },
            headers=self._headers(auth),
        )
        resp.raise_for_status()
        items = resp.json().get("items") or []
        if offset:
            items = items[offset:]
        tracks: list[Track] = []
        for item in items:
            video_id = (item.get("id") or {}).get("videoId")
            if not video_id:
                continue
            snippet = item.get("snippet") or {}
            thumbnails = snippet.get("thumbnails") or {}
            thumb = (
                (
                    thumbnails.get("high")
                    or thumbnails.get("medium")
                    or thumbnails.get("default")
                    or {}
                ).get("url")
            )
            tracks.append(
                Track(
                    id=video_id,
                    name=snippet.get("title", ""),
                    artist=snippet.get("channelTitle", ""),
                    album=None,
                    image_url=thumb,
                    uri=f"youtube:video:{video_id}",
                    provider=self.provider,
                )
            )
        return tracks

    async def create_playlist(
        self,
        name: str,
        description: str | None,
        track_ids: list[str],
        auth: ProviderAuth,
    ) -> str:
        body = {
            "snippet": {"title": name, "description": description or ""},
            "status": {"privacyStatus": "private"},
        }
        resp = await self._client.post(
            "/playlists",
            params={"part": "snippet,status"},
            headers=self._headers(auth),
            json=body,
        )
        if resp.status_code in (401, 403):
            yt_msg = ""
            try:
                err = (resp.json().get("error") or {})
                yt_msg = err.get("message", "") or ""
                reasons = [
                    (e.get("reason") or "") for e in (err.get("errors") or [])
                ]
                yt_msg = f"{yt_msg} | reasons={','.join(filter(None, reasons))}"
            except Exception:  # noqa: BLE001
                yt_msg = resp.text[:200]
            raise PermissionError(
                f"YouTube recusou a criacao da playlist ({resp.status_code}). "
                f"Resposta do YouTube: '{yt_msg}'. "
                "Causas comuns: (1) a conta Google vinculada nao tem um canal do "
                "YouTube criado (acesse youtube.com e crie um canal); "
                "(2) quota diaria da YouTube Data API esgotada; "
                "(3) YouTube Data API v3 desabilitada no Google Cloud Console."
            )
        resp.raise_for_status()
        playlist_id = resp.json()["id"]

        for video_id in track_ids:
            await self._add_video(playlist_id, video_id, auth)
        return playlist_id

    async def _add_video(
        self, playlist_id: str, video_id: str, auth: ProviderAuth
    ) -> None:
        body = {
            "snippet": {
                "playlistId": playlist_id,
                "resourceId": {"kind": "youtube#video", "videoId": video_id},
            }
        }
        resp = await self._client.post(
            "/playlistItems",
            params={"part": "snippet"},
            headers=self._headers(auth),
            json=body,
        )
        # 409: video ja esta na playlist. 404: video indisponivel.
        # Em ambos os casos, ignorar silenciosamente para nao abortar a criacao.
        if resp.status_code in (404, 409):
            return
        resp.raise_for_status()

    async def add_tracks_to_playlist(
        self, playlist_id: str, track_ids: list[str], auth: ProviderAuth
    ) -> None:
        for video_id in track_ids:
            await self._add_video(playlist_id, video_id, auth)

    async def playlist_exists(self, playlist_id: str, auth: ProviderAuth) -> bool:
        try:
            resp = await self._client.get(
                "/playlists",
                params={"part": "id", "id": playlist_id},
                headers=self._headers(auth),
            )
            if resp.status_code != 200:
                return False
            return len(resp.json().get("items") or []) > 0
        except Exception:  # noqa: BLE001
            return False

    async def aclose(self) -> None:
        await self._client.aclose()
