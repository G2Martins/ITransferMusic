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

    async def search_tracks(
        self, query: str, auth: ProviderAuth, limit: int = 5
    ) -> list[Track]:
        """Retorna multiplas faixas para a query.

        Default: cai no `search_track` e devolve lista unitaria. Provedores
        que suportam `limit > 1` na API devem sobrescrever.
        """
        found = await self.search_track(query, auth)
        return [found] if found else []

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

    async def playlist_exists(self, playlist_id: str, auth: ProviderAuth) -> bool:
        """Verifica se a playlist ainda existe no provedor.

        Implementacao default: tenta ler faixas e trata 404/403 como 'nao existe'.
        Clients podem sobrescrever com uma chamada mais leve.
        """
        try:
            await self.get_playlist_tracks(playlist_id, auth)
            return True
        except Exception:  # noqa: BLE001
            return False

    async def add_tracks_to_playlist(
        self, playlist_id: str, track_ids: list[str], auth: ProviderAuth
    ) -> None:
        """Adiciona faixas a uma playlist existente. Opcional (sync).

        Por padrao, levanta NotImplementedError.
        """
        raise NotImplementedError(
            f"add_tracks_to_playlist nao implementado para {self.provider.value}"
        )

    async def remove_tracks_from_playlist(
        self, playlist_id: str, track_ids: list[str], auth: ProviderAuth
    ) -> None:
        """Remove faixas de uma playlist existente. Opcional (sync mirror)."""
        raise NotImplementedError(
            f"remove_tracks_from_playlist nao implementado para {self.provider.value}"
        )
