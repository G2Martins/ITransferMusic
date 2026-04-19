from src.integrations.amazon_music import AmazonMusicClient
from src.integrations.apple_music import AppleMusicClient
from src.integrations.base import MusicProviderClient
from src.integrations.spotify import SpotifyClient
from src.integrations.youtube import YouTubeClient
from src.models.common import Provider

_REGISTRY: dict[Provider, type[MusicProviderClient]] = {
    Provider.SPOTIFY: SpotifyClient,
    Provider.YOUTUBE: YouTubeClient,
    Provider.APPLE_MUSIC: AppleMusicClient,
    Provider.AMAZON_MUSIC: AmazonMusicClient,
    # Provider.DEEZER: fora de escopo por enquanto
}


def get_provider_client(provider: Provider) -> MusicProviderClient:
    try:
        return _REGISTRY[provider]()
    except KeyError as exc:
        raise ValueError(f"Provedor nao suportado: {provider}") from exc
