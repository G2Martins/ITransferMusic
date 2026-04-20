import { Provider } from '../services/api.service';

/** Devolve a URL publica da playlist no provedor de destino, quando possivel. */
export function playlistUrl(provider: Provider, id: string | null): string | null {
  if (!id) return null;
  switch (provider) {
    case 'spotify':
      return `https://open.spotify.com/playlist/${id}`;
    case 'youtube':
      return `https://www.youtube.com/playlist?list=${id}`;
    case 'apple_music':
      return `https://music.apple.com/library/playlist/${id}`;
    default:
      return null;
  }
}

const PROVIDER_LABEL: Record<Provider, string> = {
  spotify: 'Spotify',
  youtube: 'YouTube Music',
  apple_music: 'Apple Music',
  amazon_music: 'Amazon Music',
  deezer: 'Deezer',
};

const PROVIDER_ICON: Record<Provider, string> = {
  spotify: 'simple-icons:spotify',
  youtube: 'simple-icons:youtube',
  apple_music: 'simple-icons:applemusic',
  amazon_music: 'simple-icons:amazonmusic',
  deezer: 'simple-icons:deezer',
};

export function providerLabel(provider: Provider): string {
  return PROVIDER_LABEL[provider] ?? provider;
}

export function providerIcon(provider: Provider): string {
  return PROVIDER_ICON[provider] ?? 'ph:music-notes-duotone';
}
