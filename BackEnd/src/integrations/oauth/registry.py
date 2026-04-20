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


def _coerce(provider: Provider | str) -> Provider:
    if isinstance(provider, Provider):
        return provider
    try:
        return Provider(str(provider))
    except ValueError as exc:
        raise ValueError(f"Provedor desconhecido: {provider!r}") from exc


def get_oauth_provider(provider: Provider | str) -> OAuthProvider:
    p = _coerce(provider)
    try:
        return _OAUTH_REGISTRY[p]()
    except KeyError as exc:
        raise ValueError(
            f"OAuth code-flow nao suportado para '{p.value}'. "
            "Apple Music usa MusicKit JS; Amazon Music e restrito; "
            "Deezer fora de escopo."
        ) from exc


def is_oauth_supported(provider: Provider | str) -> bool:
    try:
        return _coerce(provider) in _OAUTH_REGISTRY
    except ValueError:
        return False
