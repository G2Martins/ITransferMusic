// Site constants. No imports: scripts/seo.ts, scripts/check.ts, scripts/pages.ts and the Node test read this file
// directly (Node type stripping).
export const SITE_URL = 'https://g2martins.github.io/ITransferMusic';
export const SITE_NAME = 'ITransferMusic';
export const AUTHOR = 'Gustavo Martins Gripaldi';
export const PORTFOLIO_URL = 'https://g2portfolio.grovicdata.com/';
export const PROJECT_URL = 'https://g2portfolio.grovicdata.com/projetos/itransfermusic/';
export const REPO_URL = 'https://github.com/G2Martins/ITransferMusic';
export const OG_IMAGE = '/og.png';

/** Same base URL as the original Angular frontend (environment.apiBaseUrl). The demo build answers it in the browser. */
export const API_URL = 'http://localhost:8000/api/v1';

/** Public pages (prerendered, in the sitemap). App routes are client-only and noindex. */
export const PUBLIC_PAGES = ['/', '/sobre/'];

export type Provider = 'spotify' | 'youtube' | 'apple_music' | 'amazon_music' | 'deezer';
export const PROVIDERS: Provider[] = ['spotify', 'youtube', 'apple_music', 'amazon_music', 'deezer'];

/** Name + brand colour, used only for small identifying badges. `oauth`: what the original backend supports. */
export const PROVIDER_META: Record<Provider, { label: string; color: string; oauth: string }> = {
  spotify: { label: 'Spotify', color: '#1DB954', oauth: 'OAuth2 (Authorization Code)' },
  youtube: { label: 'YouTube Music', color: '#FF0033', oauth: 'OAuth2 Google (YouTube Data API v3)' },
  apple_music: { label: 'Apple Music', color: '#FA2D48', oauth: 'MusicKit JS (stub no original)' },
  amazon_music: { label: 'Amazon Music', color: '#1F9FE0', oauth: 'API restrita (stub no original)' },
  deezer: { label: 'Deezer', color: '#A238FF', oauth: 'fora de escopo no original' },
};

/** Browser-only routes: each gets a noindex copy of the client shell in docs/ so a reload answers 200. */
export const APP_ROUTES = [
  'entrar', 'painel', 'conexoes', 'playlists', 'transferir', 'transferencias', 'sincronizacoes', 'gerador',
  'oauth/simulado', ...PROVIDERS.map((p) => `auth/callback/${p}`),
];

/** The demo account. The password never comes from the visitor: the login button sends this constant. */
export const DEMO_ACCOUNT = { name: 'Lia Moraes', email: 'lia@demo.example', password: 'demo-itransfermusic' };

/** The FastAPI contract (BackEnd/src/api/v1), answered in the browser by src/app/api/demo-db.ts. */
export const ENDPOINTS: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; what: string }[] = [
  { method: 'POST', path: '/auth/register', what: 'Cria usuário local e devolve JWT' },
  { method: 'POST', path: '/auth/login', what: 'Login por e-mail e senha' },
  { method: 'POST', path: '/auth/refresh', what: 'Novo par de tokens' },
  { method: 'GET', path: '/auth/me', what: 'Usuário autenticado' },
  { method: 'PATCH', path: '/auth/me', what: 'Nome e fuso horário' },
  { method: 'GET', path: '/auth/oauth/{provider}/authorize', what: 'URL de consentimento + state' },
  { method: 'POST', path: '/auth/oauth/{provider}/callback', what: 'Troca o code e vincula a conta' },
  { method: 'GET', path: '/accounts', what: 'Contas vinculadas' },
  { method: 'DELETE', path: '/accounts/{provider}', what: 'Desvincula' },
  { method: 'GET', path: '/playlists/{provider}', what: 'Playlists do usuário no serviço' },
  { method: 'GET', path: '/playlists/{provider}/{id}/tracks', what: 'Faixas de uma playlist' },
  { method: 'POST', path: '/transfers', what: 'Cria a transferência (roda em background)' },
  { method: 'GET', path: '/transfers', what: 'Histórico' },
  { method: 'GET', path: '/transfers/{id}', what: 'Status e resultado por faixa' },
  { method: 'GET', path: '/transfers/{id}/alive', what: 'A playlist destino ainda existe?' },
  { method: 'POST', path: '/transfers/{id}/share', what: 'Gera o link público' },
  { method: 'GET', path: '/shares/{token}', what: 'Página pública da playlist' },
  { method: 'POST', path: '/generator/tracks', what: 'Gera faixas por gênero, humor e prompt' },
  { method: 'POST', path: '/generator/save', what: 'Salva a playlist gerada no serviço' },
  { method: 'POST', path: '/syncs', what: 'Cria sincronização periódica' },
  { method: 'GET', path: '/syncs', what: 'Lista sincronizações' },
  { method: 'PATCH', path: '/syncs/{id}', what: 'Pausa ou retoma' },
  { method: 'DELETE', path: '/syncs/{id}', what: 'Remove' },
  { method: 'POST', path: '/syncs/{id}/run', what: 'Executa agora' },
];
