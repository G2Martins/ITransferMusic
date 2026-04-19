from src.integrations.oauth.base import OAuthProvider
from src.integrations.oauth.google import GoogleOAuthProvider
from src.integrations.oauth.spotify import SpotifyOAuthProvider
from src.models.common import Provider

_OAUTH_REGISTRY: dict[Provider, type[OAuthProvider]] = {
    Provider.SPOTIFY: SpotifyOAuthProvider,
    Provider.YOUTUBE: GoogleOAuthProvider,
    # Apple Music: nao usa Authorization Code (tokens vem do MusicKit JS)
    # Amazon Music: API restrita
    # Deezer: fora de escopo por ora
}


def get_oauth_provider(provider: Provider) -> OAuthProvider:
    try:
        return _OAUTH_REGISTRY[provider]()
    except KeyError as exc:
        raise ValueError(
            f"OAuth code-flow nao suportado para '{provider.value}'. "
            "Apple Music usa MusicKit JS; Amazon Music e restrito; "
            "Deezer fora de escopo."
        ) from exc


def is_oauth_supported(provider: Provider) -> bool:
    return provider in _OAUTH_REGISTRY
