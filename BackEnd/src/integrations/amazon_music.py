from src.integrations.base import MusicProviderClient, ProviderAuth
from src.models.common import Provider
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track

# Amazon Music API publica e restrita (acesso apenas via parceria).
# Manter como stub ate obtermos credenciais oficiais.


class AmazonMusicClient(MusicProviderClient):
    provider = Provider.AMAZON_MUSIC

    async def list_user_playlists(self, auth: ProviderAuth) -> list[PlaylistSummary]:
        raise NotImplementedError("AmazonMusicClient ainda nao implementado")

    async def get_playlist_tracks(
        self, playlist_id: str, auth: ProviderAuth
    ) -> list[Track]:
        raise NotImplementedError("AmazonMusicClient ainda nao implementado")

    async def search_track(self, query: str, auth: ProviderAuth) -> Track | None:
        raise NotImplementedError("AmazonMusicClient ainda nao implementado")

    async def create_playlist(
        self,
        name: str,
        description: str | None,
        track_ids: list[str],
        auth: ProviderAuth,
    ) -> str:
        raise NotImplementedError("AmazonMusicClient ainda nao implementado")
