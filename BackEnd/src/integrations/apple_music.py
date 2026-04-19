from src.integrations.base import MusicProviderClient, ProviderAuth
from src.models.common import Provider
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track

# Implementacao completa pendente:
# - Gerar Developer Token (JWT assinado com AuthKey .p8 + Team ID + Key ID), 6 meses de validade
# - Frontend fornece Music User Token via MusicKit JS
# - Endpoints: /me/library/playlists, /me/library/playlists/{id}/tracks,
#              /catalog/{storefront}/search, POST /me/library/playlists,
#              POST /me/library/playlists/{id}/tracks
# - Headers: Authorization: Bearer {devToken} + Music-User-Token: {userToken}


class AppleMusicClient(MusicProviderClient):
    provider = Provider.APPLE_MUSIC
    BASE_URL = "https://api.music.apple.com/v1"

    async def list_user_playlists(self, auth: ProviderAuth) -> list[PlaylistSummary]:
        raise NotImplementedError("AppleMusicClient.list_user_playlists ainda nao implementado")

    async def get_playlist_tracks(
        self, playlist_id: str, auth: ProviderAuth
    ) -> list[Track]:
        raise NotImplementedError("AppleMusicClient.get_playlist_tracks ainda nao implementado")

    async def search_track(self, query: str, auth: ProviderAuth) -> Track | None:
        raise NotImplementedError("AppleMusicClient.search_track ainda nao implementado")

    async def create_playlist(
        self,
        name: str,
        description: str | None,
        track_ids: list[str],
        auth: ProviderAuth,
    ) -> str:
        raise NotImplementedError("AppleMusicClient.create_playlist ainda nao implementado")
