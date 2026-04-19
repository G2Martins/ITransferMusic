from abc import ABC, abstractmethod

from src.models.common import Provider
from src.schemas.playlist import PlaylistSummary
from src.schemas.track import Track


class ProviderAuth:
    """Credenciais resolvidas passadas para o cliente.

    `access_token` sempre obrigatorio. `user_token` e opcional (Apple Music usa dois tokens).
    """

    def __init__(self, access_token: str, user_token: str | None = None) -> None:
        self.access_token = access_token
        self.user_token = user_token


class MusicProviderClient(ABC):
    """Contrato comum de todos os clients de provedores de streaming."""

    provider: Provider

    @abstractmethod
    async def list_user_playlists(self, auth: ProviderAuth) -> list[PlaylistSummary]:
        ...

    @abstractmethod
    async def get_playlist_tracks(
        self, playlist_id: str, auth: ProviderAuth
    ) -> list[Track]:
        ...

    @abstractmethod
    async def search_track(self, query: str, auth: ProviderAuth) -> Track | None:
        ...

    @abstractmethod
    async def create_playlist(
        self,
        name: str,
        description: str | None,
        track_ids: list[str],
        auth: ProviderAuth,
    ) -> str:
        """Cria a playlist no destino e retorna o ID criado."""
        ...
