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
                tracks.append(
                    Track(
                        id=video_id,
                        name=snippet.get("title", ""),
                        artist=snippet.get("videoOwnerChannelTitle")
                        or snippet.get("channelTitle", ""),
                        album=None,
                        uri=f"youtube:video:{video_id}",
                        provider=self.provider,
                    )
                )
            page_token = body.get("nextPageToken")
            if not page_token:
                break
        return tracks

    async def search_track(self, query: str, auth: ProviderAuth) -> Track | None:
        resp = await self._client.get(
            "/search",
            params={"part": "snippet", "q": query, "type": "video", "maxResults": 1},
            headers=self._headers(auth),
        )
        resp.raise_for_status()
        items = resp.json().get("items") or []
        if not items:
            return None
        item = items[0]
        video_id = (item.get("id") or {}).get("videoId")
        if not video_id:
            return None
        snippet = item.get("snippet") or {}
        return Track(
            id=video_id,
            name=snippet.get("title", ""),
            artist=snippet.get("channelTitle", ""),
            album=None,
            uri=f"youtube:video:{video_id}",
            provider=self.provider,
        )

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
        resp.raise_for_status()

    async def aclose(self) -> None:
        await self._client.aclose()
