// The FastAPI backend (BackEnd/src), translated to a pure in-browser "server": routes, DTOs, service rules, the
// background transfer job and the APScheduler sync scan. No imports, so scripts/demo-api.test.ts runs it in Node;
// the catalog (src/app/data/catalog.ts) is injected with useCatalog(). Every deliberate divergence from the Python
// code is tagged "demo fix" or "demo extension" and listed in the README ("Diferenças assumidas").

export type Provider = 'spotify' | 'youtube' | 'apple_music' | 'amazon_music' | 'deezer';
const PROVIDERS: Provider[] = ['spotify', 'youtube', 'apple_music', 'amazon_music', 'deezer'];
export type TransferStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial';
export type SyncStatus = 'active' | 'paused' | 'error';
export type SyncFrequency = 'daily' | 'weekly';
export type SyncMethod = 'add_only' | 'mirror';

export interface CatalogTrack { name: string; artist: string; album: string; year: number; genres: string[]; moods: string[] }

// ---------- DTOs: same names and fields as the Pydantic schemas ----------
export interface TokenResponse { access_token: string; refresh_token: string; token_type: 'bearer' }
export interface MeResponse { id: string; name: string; email: string; timezone_offset_minutes: number }
export interface LinkedAccount {
  provider: Provider; provider_user_id: string | null; provider_display_name: string | null;
  expires_at: string | null; created_at: string | null; updated_at: string | null;
}
export interface OAuthAuthorizeResponse { authorize_url: string; state: string }
export interface OAuthCallbackResponse { status: string; provider: string; provider_user_id: string | null; provider_display_name: string | null }
export interface PlaylistSummary { id: string; name: string; description: string | null; image_url: string | null; track_count: number | null; provider: Provider }
export interface Track { id: string; name: string; artist: string; album: string | null; image_url: string | null; uri: string; provider: Provider }
export interface TransferTrackResult {
  source_track_id: string; source_name: string; source_artist: string; source_album: string | null;
  image_url: string | null; matched_target_id: string | null; matched: boolean;
  /** Demo extension: similarity between source and match (0..1). The FastAPI takes the first search hit as is. */
  confidence?: number | null;
  /** Demo extension: title of the track found in the destination (differs on remasters, live versions...). */
  matched_name?: string | null;
}
export interface TransferResponse {
  id: string; source_provider: Provider; target_provider: Provider; source_playlist_id: string;
  source_playlist_name: string | null; source_playlist_image_url: string | null; target_playlist_id: string | null;
  target_playlist_name: string; target_playlist_description: string | null; status: TransferStatus;
  total_tracks: number; matched_tracks: number; results: TransferTrackResult[]; error_message: string | null;
  share_token: string | null; created_at: string; updated_at: string;
}
export interface TransferPreview { source_playlist_name: string; total_tracks: number; matched_tracks: number; results: TransferTrackResult[] }
export interface ShareTokenResponse { token: string; share_url: string }
export interface SharePublic {
  token: string; owner_name: string; owner_id: string; playlist_name: string; playlist_description: string | null;
  playlist_image_url: string | null; source_provider: Provider; source_playlist_id: string; target_provider: Provider;
  target_playlist_id: string | null; total_tracks: number; matched_tracks: number; tracks: TransferTrackResult[];
}
export interface GeneratorResponse { tracks: Track[]; used_queries: string[] }
export interface GeneratorSaveResponse { playlist_id: string; matched_count: number; total_count: number }
export interface PlaylistSync {
  id: string; source_provider: Provider; source_playlist_id: string; source_playlist_name: string | null;
  target_provider: Provider; target_playlist_id: string; target_playlist_name: string | null;
  frequency: SyncFrequency; run_hour: number; run_minute: number; method: SyncMethod; status: SyncStatus;
  last_synced_at: string | null; last_error: string | null; tracks_added_last_run: number; created_at: string; updated_at: string;
}
export interface SyncRun { user_id?: string; at: string; sync_id: string; label: string; trigger: 'cron' | 'manual'; added: number; removed: number; ok: boolean; error: string | null }
/** Demo extension: what APScheduler would show for the server's job store. */
export interface SchedulerView {
  jobs: { id: string; func: string; trigger: string; timezone: string; next_run_time: string; last_run_time: string | null }[];
  next_runs: { sync_id: string; next_run_at: string | null }[];
  runs: SyncRun[];
}

// ---------- Stored documents ----------
interface UserDoc { id: string; name: string; email: string; password_hash: string; timezone_offset_minutes: number; created_at: string; updated_at: string }
interface AccountDoc { user_id: string; provider: Provider; provider_user_id: string; provider_display_name: string; expires_at: string; scope: string; created_at: string; updated_at: string }
/** A playlist that lives "at the provider" (Spotify, YouTube...). Tracks are catalog indexes. */
interface PlaylistDoc { id: string; user_id: string; provider: Provider; name: string; description: string | null; keys: number[]; created_at: string }
interface TransferDoc extends TransferResponse {
  user_id: string; selected_track_ids: string[] | null; apply_watermark: boolean;
  /** The background task, precomputed and replayed against the clock so it survives a reload. */
  sim?: { start: number; step: number; plan: TransferTrackResult[]; error: string | null };
}
interface SyncDoc extends PlaylistSync { user_id: string }
export interface Db {
  v: 1; seq: number;
  users: UserDoc[]; accounts: AccountDoc[]; playlists: PlaylistDoc[]; transfers: TransferDoc[]; syncs: SyncDoc[];
  scheduler: { last_tick: string; last_fire: string | null; runs: SyncRun[] };
}
export interface Res { status: number; body: unknown; dirty: boolean }

// ---------- Small pure helpers ----------
let CAT: CatalogTrack[] = [];
const ID_INDEX = new Map<string, number>();
export function useCatalog(c: CatalogTrack[]) { CAT = c; ID_INDEX.clear(); QUERY_INDEX.clear(); docText.clear(); }

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
export const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const ms = (s: string) => Date.parse(s);

/** FNV-1a 32 bit + murmur3 mix: every "random" thing in the demo derives from it, so data is stable across reloads. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  // murmur3 finalizer: FNV alone leaves the low bits of near-identical strings correlated (ids would collide).
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
function chars(seed: string, n: number, alphabet: string): string {
  let out = '';
  for (let i = 0; out.length < n; i++) out += alphabet[hash(`${seed}#${i}`) % alphabet.length];
  return out;
}
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const HEX = '0123456789abcdef';
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (s: string) => new Set(norm(s).split(' ').filter(Boolean));
function dice(a: string, b: string): number {
  const x = tokens(a), y = tokens(b);
  let both = 0;
  for (const t of x) if (y.has(t)) both++;
  return x.size + y.size ? Math.round((200 * both) / (x.size + y.size)) / 100 : 0;
}
/** Deterministic PRNG (mulberry32), for the generator's shuffles. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const oid = (db: Db, now: number) => Math.floor(now / 1000).toString(16).padStart(8, '0') + (++db.seq).toString(16).padStart(16, '0');
const isOid = (s: string) => /^[0-9a-f]{24}$/.test(s);

// ---------- The simulated providers ----------
/** Provider-native track id for catalog track k (Spotify base62, YouTube video id, Apple/Deezer numeric, Amazon ASIN). */
export function trackId(p: Provider, k: number): string {
  const s = `${p}:${k}`;
  switch (p) {
    case 'spotify': return chars(s, 22, B62);
    case 'youtube': return chars(s, 11, B62 + '-_');
    case 'apple_music': return '1' + chars(s, 9, '0123456789');
    case 'amazon_music': return 'B0' + chars(s, 8, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    case 'deezer': return '3' + chars(s, 8, '0123456789');
  }
}
function keyOf(p: Provider, id: string): number | undefined {
  if (!ID_INDEX.size) for (const q of PROVIDERS) CAT.forEach((_, k) => ID_INDEX.set(`${q}:${trackId(q, k)}`, k));
  return ID_INDEX.get(`${p}:${id}`);
}
const VARIANTS = [' - Remastered', ' (Ao Vivo)', ' - Radio Edit', ' - 2015 Remaster', ' (Live)'];
/** Title without the provider's version suffix, what a matcher would search for. */
const baseName = (n: string) => VARIANTS.reduce((x, v) => (x.endsWith(v) ? x.slice(0, -v.length) : x), n);
/** How catalog track k exists on provider p: missing (licensing, region), as a variant (remaster, live) or exact. */
export function availability(p: Provider, k: number): { name: string } | null {
  const h = hash(`avail:${p}:${k}`) % 100;
  if (h < 6) return null;
  const name = CAT[k].name;
  return { name: h < 18 ? name + VARIANTS[h % VARIANTS.length] : name };
}
function uri(p: Provider, id: string): string {
  return { spotify: `spotify:track:${id}`, youtube: `ytmusic:video:${id}`, apple_music: `applemusic:song:${id}`, amazon_music: `amzn:track:${id}`, deezer: `deezer:track:${id}` }[p];
}
function track(p: Provider, k: number): Track {
  const c = CAT[k];
  const id = trackId(p, k);
  return { id, name: availability(p, k)?.name ?? c.name, artist: c.artist, album: c.album, image_url: null, uri: uri(p, id), provider: p };
}
const QUERY_INDEX = new Map<string, number>();
/**
 * Mirror of MusicProviderClient.search_track: query "name artist", first hit or None. Like a real search engine,
 * "Back In Black - 2015 Remaster AC/DC" finds the song too (every version title points to the same track).
 */
function searchTrack(p: Provider, query: string): { k: number; track: Track } | null {
  if (!QUERY_INDEX.size) CAT.forEach((c, k) => ['', ...VARIANTS].forEach((v) => QUERY_INDEX.set(norm(`${c.name}${v} ${c.artist}`), k)));
  const k = QUERY_INDEX.get(norm(query));
  return k !== undefined && availability(p, k) ? { k, track: track(p, k) } : null;
}
function playlistId(p: Provider, seed: string): string {
  switch (p) {
    case 'spotify': return chars(seed, 22, B62);
    case 'youtube': return 'PL' + chars(seed, 32, B62 + '-_');
    case 'apple_music': return 'p.' + chars(seed, 14, B62);
    case 'amazon_music': return chars(seed, 32, HEX);
    case 'deezer': return '1' + chars(seed, 9, '0123456789');
  }
}
export const VIRTUAL = { LIKED: '__liked_songs__', ALBUMS: '__saved_albums__', ARTISTS: '__followed_artists__' } as const;

type Pick = (c: CatalogTrack, k: number) => boolean;
const has = (c: CatalogTrack, ...tags: string[]) => tags.some((t) => c.genres.includes(t) || c.moods.includes(t));
/** The library each provider "has" for the demo user: created on seed, or when the account is first linked. */
const LIBRARY: Record<Provider, [name: string, description: string | null, pick: Pick, max: number, id?: string][]> = {
  spotify: [
    ['Músicas Curtidas', 'Faixas curtidas na conta', (_, k) => hash(`liked:${k}`) % 5 === 0, 40, VIRTUAL.LIKED],
    ['Álbuns salvos', 'Faixas dos álbuns salvos', (c) => ['Nevermind', 'Currents', 'Dois', 'Rappa Mundi'].includes(c.album), 40, VIRTUAL.ALBUMS],
    ['Artistas seguidos', 'Faixas dos artistas seguidos', (c) => ['Legião Urbana', 'Arctic Monkeys', 'Kendrick Lamar', 'Bon Iver', 'Tame Impala'].includes(c.artist), 40, VIRTUAL.ARTISTS],
    ['Rock Nacional 80/90', 'Legião, Paralamas, Cazuza, Skank e companhia', (c) => has(c, 'mpb') && has(c, 'rock') && c.year < 2005, 30],
    ['Treino pesado', 'Para o último set', (c) => has(c, 'energetic') && has(c, 'metal', 'rap', 'rock', 'electronic', 'punk'), 24],
    ['Domingo de manhã', 'Café, janela aberta e nada para fazer', (c) => has(c, 'relaxed') && !has(c, 'classical'), 22],
    ['Indie de estrada', null, (c) => has(c, 'indie'), 18],
    ['MPB essencial', 'Bossa, samba e canção brasileira', (c) => has(c, 'mpb') && !has(c, 'rock', 'rap', 'metal'), 20],
  ],
  youtube: [
    ['Clássicos do Rock', 'Riffs que todo mundo conhece', (c) => has(c, 'rock') && !has(c, 'mpb') && c.year < 2000, 26],
    ['Hip-Hop 2000s', 'De Detroit ao Capão Redondo', (c) => has(c, 'hip-hop'), 20],
    ['Piano para estudar', 'Concentração sem letra', (c) => has(c, 'classical'), 12],
    ['Festa Pop', 'Só as que todo mundo canta', (c) => has(c, 'pop') && has(c, 'happy', 'energetic') && !has(c, 'mpb'), 24],
  ],
  apple_music: [
    ['Jazz no fim de tarde', 'Coltrane, Brubeck e bossa nova', (c) => has(c, 'jazz'), 16],
    ['Soul & R&B', 'Clássicos e contemporâneos', (c) => has(c, 'soul', 'r&b') && !has(c, 'pop'), 18],
    ['Country Roads', 'Estrada de terra e violão', (c) => has(c, 'country'), 12],
  ],
  amazon_music: [
    ['Reggae Vibes', 'Domingo de sol', (c) => has(c, 'reggae'), 12],
    ['Blues Clássico', 'Delta, Chicago e Texas', (c) => has(c, 'blues'), 10],
  ],
  deezer: [
    ['Pop BR', 'O melhor do pop nacional', (c) => has(c, 'mpb') && has(c, 'pop', 'happy'), 16],
    ['Descobertas da semana', 'Um pouco de tudo', (_, k) => hash(`discover:${k}`) % 7 === 0, 24],
    ['Sertanejo & Folk', 'Viola, violão e estrada', (c) => has(c, 'country', 'folk'), 18],
  ],
};

function ensureLibrary(db: Db, user: string, p: Provider, at: number) {
  if (db.playlists.some((l) => l.user_id === user && l.provider === p)) return;
  for (const [name, description, pick, max, fixed] of LIBRARY[p]) {
    const keys = CAT.map((c, k) => (pick(c, k) && availability(p, k) ? k : -1)).filter((k) => k >= 0)
      .sort((a, b) => hash(`${name}:${a}`) - hash(`${name}:${b}`)).slice(0, max);
    db.playlists.push({ id: fixed ?? playlistId(p, `${user}:${name}`), user_id: user, provider: p, name, description, keys, created_at: iso(at - 200 * DAY) });
  }
}
const summary = (l: PlaylistDoc): PlaylistSummary => ({ id: l.id, name: l.name, description: l.description, image_url: null, track_count: l.keys.length, provider: l.provider });

// ---------- Auth (JWT stand-in: same claims, no signature: there is no secret in a static site) ----------
const enc = (o: object) => 'demo.' + btoa(JSON.stringify(o)).replace(/=+$/, '');
function dec(t: string): Record<string, unknown> | null {
  try { const o = JSON.parse(atob(t.replace(/^demo\./, ''))); return o && typeof o === 'object' ? o : null; } catch { return null; }
}
function tokens4(sub: string, now: number): TokenResponse {
  return { access_token: enc({ sub, type: 'access', exp: now + 60 * MIN }), refresh_token: enc({ sub, type: 'refresh', exp: now + 30 * DAY }), token_type: 'bearer' };
}
function decodeToken(t: unknown, type: string, now: number): string | null {
  const p = typeof t === 'string' ? dec(t) : null;
  return p && p['type'] === type && typeof p['exp'] === 'number' && p['exp'] > now && typeof p['sub'] === 'string' && isOid(p['sub']) ? p['sub'] : null;
}
/** Demo hash, not bcrypt: the only password here is the public demo constant. */
const pwHash = (pw: string) => 'demo$' + hash(`itm:${pw}`).toString(16);

// ---------- FastAPI-shaped errors ----------
const res = (status: number, body: unknown = null): Res => ({ status, body, dirty: status < 400 });
const err = (status: number, detail: string): Res => ({ status, body: { detail }, dirty: false });
function v422(loc: (string | number)[], msg: string, type = 'value_error'): Res {
  return { status: 422, body: { detail: [{ type, loc, msg }] }, dirty: false };
}
const PROVIDER_MSG = "Input should be 'spotify', 'youtube', 'apple_music', 'amazon_music' or 'deezer'";
const asProvider = (v: unknown): Provider | null => (PROVIDERS.includes(v as Provider) ? (v as Provider) : null);
type Body = Record<string, unknown>;
/** Pydantic-style check of one field. Returns an error Res or null. */
function str(b: Body, f: string, min: number, max: number, optional = false): Res | null {
  const v = b[f];
  if (v === undefined || v === null) return optional ? null : v422(['body', f], 'Field required', 'missing');
  if (typeof v !== 'string') return v422(['body', f], 'Input should be a valid string', 'string_type');
  if (v.length < min) return v422(['body', f], `String should have at least ${min} character${min > 1 ? 's' : ''}`, 'string_too_short');
  if (v.length > max) return v422(['body', f], `String should have at most ${max} characters`, 'string_too_long');
  return null;
}
function int(b: Body, f: string, lo: number, hi: number): Res | null {
  const v = b[f];
  if (v === undefined) return null;
  if (typeof v !== 'number' || !Number.isInteger(v)) return v422(['body', f], 'Input should be a valid integer', 'int_type');
  if (v < lo) return v422(['body', f], `Input should be greater than or equal to ${lo}`, 'greater_than_equal');
  if (v > hi) return v422(['body', f], `Input should be less than or equal to ${hi}`, 'less_than_equal');
  return null;
}
function oneOf(b: Body, f: string, values: string[], fallback?: string): Res | null {
  const v = b[f] ?? fallback;
  if (v === undefined) return v422(['body', f], 'Field required', 'missing');
  return values.includes(v as string) ? null : v422(['body', f], `Input should be ${values.map((x) => `'${x}'`).join(' or ')}`, 'enum');
}
const first = (...checks: (Res | null)[]) => checks.find((c) => c) ?? null;
const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[a-z]{2,}$/i;

// ---------- Accounts ----------
const SCOPES: Record<Provider, string> = {
  spotify: 'playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-library-read user-follow-read user-read-email',
  youtube: 'https://www.googleapis.com/auth/youtube openid email profile',
  apple_music: 'musickit library-read library-modify',
  amazon_music: 'profile music::library',
  deezer: 'basic_access manage_library offline_access',
};
const account = (db: Db, user: string, p: Provider) => db.accounts.find((a) => a.user_id === user && a.provider === p);
const notLinked = (p: Provider) => `Conta do provedor '${p}' nao vinculada`;

function link(db: Db, user: UserDoc, p: Provider, now: number): AccountDoc {
  const providerUser = { spotify: user.email.split('@')[0].replace(/\W/g, '.'), youtube: 'UC' + chars(`yt:${user.id}`, 22, B62), apple_music: 'u.' + chars(`am:${user.id}`, 10, B62), amazon_music: 'amzn1.account.' + chars(`az:${user.id}`, 16, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), deezer: String(4_000_000 + (hash(user.id) % 900_000)) }[p];
  const existing = account(db, user.id, p);
  const doc: AccountDoc = {
    user_id: user.id, provider: p, provider_user_id: providerUser, provider_display_name: user.name,
    expires_at: iso(now + HOUR), scope: SCOPES[p], created_at: existing?.created_at ?? iso(now), updated_at: iso(now),
  };
  db.accounts = [...db.accounts.filter((a) => a !== existing), doc];
  ensureLibrary(db, user.id, p, now);
  return doc;
}

// ---------- Transfers: create + background job replayed against the clock ----------
const WATERMARK_SUFFIX = ' By ITransferMusic';
const WATERMARK_DESC = 'This playlist was created by https://www.ITransferMusic.com that lets you transfer your playlist to any music platform such as Spotify, YouTube Music, Apple Music, Deezer etc.';
const watermark = (name: string, desc: string | null) => ({ name: name.endsWith(WATERMARK_SUFFIX) ? name : name + WATERMARK_SUFFIX, desc: desc ? `${desc} | ${WATERMARK_DESC}` : WATERMARK_DESC });

function matchTrack(p: Provider, t: Track): TransferTrackResult {
  const found = searchTrack(p, `${baseName(t.name)} ${t.artist}`);
  return {
    source_track_id: t.id, source_name: t.name, source_artist: t.artist, source_album: t.album, image_url: t.image_url,
    matched_target_id: found?.track.id ?? null, matched: !!found,
    confidence: found ? dice(`${t.name} ${t.artist}`, `${found.track.name} ${found.track.artist}`) : null,
    matched_name: found?.track.name ?? null,
  };
}
const playlistOf = (db: Db, user: string, p: Provider, id: string) => db.playlists.find((l) => l.user_id === user && l.provider === p && l.id === id);

function plan(db: Db, user: string, source: Provider, target: Provider, playlist: string, selected: string[] | null) {
  const pl = playlistOf(db, user, source, playlist);
  if (!pl) return { pl, results: [] as TransferTrackResult[] };
  let tracks = pl.keys.map((k) => track(source, k));
  if (selected?.length) { const wanted = new Set(selected); tracks = tracks.filter((t) => wanted.has(t.id)); }
  return { pl, results: tracks.map((t) => matchTrack(target, t)) };
}

/**
 * Advances a transfer to where the FastAPI BackgroundTask would be at `now`: pending, then one track matched every
 * `step` ms (results grow while running; the original only writes them at the end), then the destination playlist
 * is created and the final status set, same rules as PlaylistTransferService.execute_transfer.
 */
function advance(db: Db, t: TransferDoc, now: number): boolean {
  const s = t.sim;
  if (!s) return false;
  const before = `${t.status}:${t.results.length}`;
  if (now < s.start) return false;
  const done = Math.min(s.plan.length, Math.floor((now - s.start) / s.step));
  const end = s.start + s.plan.length * s.step + 700;
  if (now < end && !s.error) {
    t.status = 'running';
    t.total_tracks = s.plan.length;
    t.results = s.plan.slice(0, done);
    t.matched_tracks = t.results.filter((r) => r.matched).length;
    t.updated_at = iso(Math.min(now, end));
    return before !== `${t.status}:${t.results.length}`;
  }
  // Finish: same order of checks as execute_transfer (accounts first, then tracks, then create the playlist).
  delete t.sim;
  t.updated_at = iso(end);
  const missing = [t.source_provider, t.target_provider].find((p) => !account(db, t.user_id, p));
  if (s.error || missing) {
    Object.assign(t, { status: 'failed', error_message: s.error ?? notLinked(missing!), results: [], total_tracks: 0, matched_tracks: 0 });
    return true;
  }
  t.total_tracks = s.plan.length;
  t.results = s.plan;
  t.matched_tracks = s.plan.filter((r) => r.matched).length;
  if (t.total_tracks === 0) { t.status = 'failed'; t.error_message = 'Playlist de origem esta vazia'; }
  else if (t.matched_tracks === t.total_tracks) t.status = 'completed';
  else if (t.matched_tracks === 0) { t.status = 'failed'; t.error_message = 'Nenhuma faixa foi encontrada no destino'; }
  else t.status = 'partial';
  // Demo fix: the FastAPI creates the destination playlist even when nothing matched (an empty playlist is left
  // behind on a failed transfer). Here a failed transfer creates nothing.
  if (t.status !== 'failed') {
    const { name, desc } = t.apply_watermark ? watermark(t.target_playlist_name, t.target_playlist_description) : { name: t.target_playlist_name, desc: t.target_playlist_description };
    const keys = [...new Set(s.plan.filter((r) => r.matched).map((r) => keyOf(t.target_provider, r.matched_target_id!)!))];
    const id = playlistId(t.target_provider, `${t.id}:target`);
    db.playlists.push({ id, user_id: t.user_id, provider: t.target_provider, name, description: desc || null, keys, created_at: iso(end) });
    t.target_playlist_id = id;
  }
  return true;
}

const view = (t: TransferDoc): TransferResponse => {
  const { user_id, selected_track_ids, apply_watermark, sim, ...dto } = t;
  return dto;
};

function createTransfer(db: Db, user: string, b: Body, now: number): Res {
  const bad = first(
    oneOf(b, 'source_provider', PROVIDERS), oneOf(b, 'target_provider', PROVIDERS), str(b, 'source_playlist_id', 1, 500),
    str(b, 'source_playlist_name', 0, 200, true), str(b, 'target_playlist_name', 1, 200), str(b, 'target_playlist_description', 0, 500, true),
  );
  if (bad) return bad;
  const sel = b['selected_track_ids'];
  if (sel != null && (!Array.isArray(sel) || sel.some((x) => typeof x !== 'string'))) return v422(['body', 'selected_track_ids'], 'Input should be a valid list', 'list_type');
  if (b['apply_watermark'] != null && typeof b['apply_watermark'] !== 'boolean') return v422(['body', 'apply_watermark'], 'Input should be a valid boolean', 'bool_type');
  const source = b['source_provider'] as Provider, target = b['target_provider'] as Provider;
  if (source === target) return err(400, 'Origem e destino nao podem ser iguais');
  // Demo fix: the route catches LinkedAccountNotFoundError but create_transfer never raises it, so the FastAPI
  // accepts the job and it fails later in the background. Here the missing account is a 400 up front.
  const missing = [source, target].find((p) => !account(db, user, p));
  if (missing) return err(400, notLinked(missing));
  const { pl, results } = plan(db, user, source, target, b['source_playlist_id'] as string, (sel as string[] | null) ?? null);
  const id = oid(db, now);
  const t: TransferDoc = {
    id, user_id: user, source_provider: source, target_provider: target, source_playlist_id: b['source_playlist_id'] as string,
    source_playlist_name: (b['source_playlist_name'] as string | undefined) ?? null, source_playlist_image_url: null,
    target_playlist_id: null, target_playlist_name: b['target_playlist_name'] as string,
    target_playlist_description: (b['target_playlist_description'] as string | undefined) ?? null, status: 'pending',
    total_tracks: 0, matched_tracks: 0, results: [], error_message: null, share_token: null, created_at: iso(now), updated_at: iso(now),
    selected_track_ids: (sel as string[] | null) ?? null, apply_watermark: (b['apply_watermark'] as boolean | undefined) ?? true,
    // ponytail: 4 to 9 s per playlist so a visitor sees it run; real transfers take one search call per track.
    sim: { start: now + 900, step: Math.max(160, Math.min(420, Math.round(5200 / Math.max(1, results.length)))), plan: results, error: pl ? null : `${source} retornou 404: Playlist nao encontrada` },
  };
  db.transfers.push(t);
  return res(202, view(t));
}

// ---------- Generator (generator_service.py) ----------
const MOOD_KEYWORDS: Record<string, string[]> = {
  happy: ['happy', 'feel good', 'upbeat'], sad: ['sad', 'melancholy', 'heartbreak'], angry: ['angry', 'aggressive', 'rage'],
  relaxed: ['relaxing', 'chill', 'calm'], energetic: ['energetic', 'workout', 'hype'], romantic: ['romantic', 'love', 'slow dance'],
};
/** Words a search engine would associate with each tag (EN keywords from the original + PT for free prompts). */
const TAG_WORDS: Record<string, string> = {
  happy: 'feliz alegre', sad: 'triste fossa', angry: 'raiva pesado', relaxed: 'relax relaxar calmo tranquilo estudar', energetic: 'energia treino academia festa',
  romantic: 'romantico amor paixao', mpb: 'brasil brasileiro brasileira nacional samba bossa', classical: 'classica classico piano',
  electronic: 'eletronica eletronico dance', 'hip-hop': 'hiphop', 'r&b': 'rnb', country: 'sertanejo', folk: 'acustico violao',
};
const docText = new Map<number, Set<string>>();
function words(k: number): Set<string> {
  let w = docText.get(k);
  if (!w) {
    const c = CAT[k];
    const tags = [...c.genres, ...c.moods];
    w = tokens([c.name, c.artist, c.album, ...tags, ...tags.map((t) => TAG_WORDS[t] ?? ''), ...c.moods.flatMap((m) => MOOD_KEYWORDS[m] ?? [])].join(' '));
    docText.set(k, w);
  }
  return w;
}
function buildQueries(prompt: string, genres: string[], moods: string[], count: number, rand: () => number): string[] {
  const moodTerm = (m: string) => { const bag = MOOD_KEYWORDS[m] ?? [m]; return m ? bag[Math.floor(rand() * bag.length)] : ''; };
  const g = genres.map((x) => x.trim().toLowerCase()).filter(Boolean), m = moods.map((x) => x.trim().toLowerCase()).filter(Boolean);
  const q: string[] = [];
  for (const gg of g.length ? g : ['']) for (const mm of m.length ? m : ['']) {
    const parts = [prompt, gg, moodTerm(mm)].filter(Boolean);
    if (parts.length) q.push(parts.join(' '));
  }
  if (prompt) q.push(prompt);
  q.push(...g, ...m.map(moodTerm));
  const seen = new Set<string>();
  let unique = q.filter((x) => { const k = x.toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  if (!unique.length) unique = ['top hits'];
  for (let i = unique.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [unique[i], unique[j]] = [unique[j], unique[i]]; }
  while (unique.length < count) unique.push(...unique.slice(0, count - unique.length));
  return unique.slice(0, count);
}
/** Mirror of search_tracks(query, limit, offset): tracks ranked by how many query words they match. */
function searchTracks(p: Provider, query: string, limit: number, offset: number): Track[] {
  const q = [...tokens(query)];
  const top = query === 'top hits';
  return CAT.map((_, k) => ({ k, score: top ? 1 : q.filter((w) => words(k).has(w)).length / q.length }))
    .filter((x) => x.score > 0 && availability(p, x.k))
    .sort((a, b) => b.score - a.score || hash(`${query}:${a.k}`) - hash(`${query}:${b.k}`))
    .slice(offset, offset + limit).map((x) => track(p, x.k));
}
function generate(db: Db, user: string, b: Body, now: number): Res {
  const bad = first(oneOf(b, 'source_provider', PROVIDERS), str(b, 'prompt', 0, 500, true), int(b, 'count', 1, 50));
  if (bad) return bad;
  const list = (f: string) => (Array.isArray(b[f]) ? (b[f] as unknown[]).filter((x): x is string => typeof x === 'string') : []);
  const p = b['source_provider'] as Provider;
  if (!account(db, user, p)) return err(400, notLinked(p));
  const count = (b['count'] as number | undefined) ?? 20, excluded = new Set(list('exclude_track_ids'));
  const rand = rng(hash(`${now}:${JSON.stringify(b)}`));
  const queries = buildQueries(((b['prompt'] as string | undefined) ?? '').trim(), list('genres'), list('moods'), count, rand);
  const perQuery = Math.max(5, Math.min(10, Math.floor((count * 2) / (new Set(queries.map((q) => q.toLowerCase())).size || 1))));
  const seen = new Set(excluded), out: Track[] = [], used: string[] = [];
  const pass = (offset: number) => {
    for (const q of queries) {
      if (out.length >= count) return;
      let added = false;
      for (const t of searchTracks(p, q, perQuery, offset)) {
        if (out.length >= count) return;
        if (seen.has(t.id)) continue;
        seen.add(t.id); out.push(t); added = true;
      }
      if (added && !used.includes(q)) used.push(q);
    }
  };
  const firstOffset = excluded.size ? 5 + Math.floor(rand() * 36) : 0;
  pass(firstOffset);
  for (const o of [0, 20, 50, 80]) if (out.length < count && o !== firstOffset) pass(o);
  if (!out.length && !excluded.size) return err(502, `Nenhuma faixa retornada pelo ${p}. Verifique os logs do backend. Possiveis causas: token invalido, filtros muito restritivos ou quota da API esgotada.`);
  return { status: 200, body: { tracks: out, used_queries: used } satisfies GeneratorResponse, dirty: false };
}
function saveGenerated(db: Db, user: string, b: Body, now: number): Res {
  const bad = first(oneOf(b, 'target_provider', PROVIDERS), str(b, 'playlist_name', 1, 200), str(b, 'playlist_description', 0, 500, true));
  if (bad) return bad;
  if (b['tracks'] != null && !Array.isArray(b['tracks'])) return v422(['body', 'tracks'], 'Input should be a valid list', 'list_type');
  const p = b['target_provider'] as Provider;
  if (!account(db, user, p)) return err(400, notLinked(p));
  const items = ((b['tracks'] as unknown[] | undefined) ?? []).slice(0, 200).map((x) => (x && typeof x === 'object' ? (x as Body) : {}));
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const named = items.filter((t) => s(t['name']));
  const keys: number[] = [];
  const results: TransferTrackResult[] = named.map((t) => {
    const found = searchTrack(p, `${s(t['name'])} ${s(t['artist'])}`);
    if (found && !keys.includes(found.k)) keys.push(found.k);
    return {
      source_track_id: s(t['id']) || s(t['name']), source_name: s(t['name']), source_artist: s(t['artist']), source_album: s(t['album']) || null,
      image_url: null, matched_target_id: found?.track.id ?? null,
      // Demo fix: the FastAPI stores matched=True for every generated track, even the ones it could not find.
      matched: !!found, confidence: found ? 1 : null, matched_name: found?.track.name ?? null,
    };
  });
  const { name, desc } = watermark(s(b['playlist_name']) || 'Minha Playlist Gerada', s(b['playlist_description']) || null);
  const id = playlistId(p, `gen:${user}:${now}:${db.seq}`);
  db.playlists.push({ id, user_id: user, provider: p, name, description: desc, keys, created_at: iso(now) });
  const status: TransferStatus = !named.length || !keys.length ? 'failed' : keys.length === named.length ? 'completed' : 'partial';
  db.transfers.push({
    id: oid(db, now), user_id: user, source_provider: p, target_provider: p, source_playlist_id: '__generator__',
    source_playlist_name: 'Gerador ITransferMusic', source_playlist_image_url: null, target_playlist_id: id, target_playlist_name: name,
    target_playlist_description: desc, status, total_tracks: named.length, matched_tracks: keys.length, results, error_message: null,
    share_token: null, created_at: iso(now), updated_at: iso(now), selected_track_ids: null, apply_watermark: true,
  });
  return res(201, { playlist_id: id, matched_count: keys.length, total_count: items.length } satisfies GeneratorSaveResponse);
}

// ---------- Syncs + the APScheduler scan (sync_runner.py, scheduler.py) ----------
const TICK = 15 * MIN;
/**
 * Mirror of sync_runner._is_due. Demo fix: the original builds "scheduled" as today's hh:mm, so a sync set to
 * 23:46-23:59 UTC is never inside the 15 min window when the 00:00 tick runs (scheduled lands in the future and
 * the delta is negative). Here "scheduled" is the latest occurrence at or before `now`.
 */
export function isDue(s: PlaylistSync, now: number): boolean {
  if (s.status !== 'active') return false;
  const d = new Date(now);
  let scheduled = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), s.run_hour, s.run_minute);
  if (scheduled > now) scheduled -= DAY;
  const delta = now - scheduled;
  if (delta < 0 || delta >= TICK) return false;
  if (!s.last_synced_at) return true;
  return now - ms(s.last_synced_at) >= (s.frequency === 'daily' ? DAY : 7 * DAY) - HOUR;
}
/** Mirror of sync_runner.run_sync: copy the source tracks missing in the destination (search by name + artist). */
function runSync(db: Db, s: SyncDoc, now: number, trigger: SyncRun['trigger']) {
  const log = (ok: boolean, added: number, removed: number, error: string | null) => {
    db.scheduler.runs = [{ user_id: s.user_id, at: iso(now), sync_id: s.id, label: `${s.source_playlist_name ?? s.source_playlist_id} → ${s.target_playlist_name ?? s.target_playlist_id}`, trigger, added, removed, ok, error }, ...db.scheduler.runs].slice(0, 40);
  };
  const fail = (msg: string) => { Object.assign(s, { status: 'error', last_error: msg.slice(0, 500), updated_at: iso(now) }); log(false, 0, 0, msg); };
  const missing = [s.source_provider, s.target_provider].find((p) => !account(db, s.user_id, p));
  if (missing) return fail(notLinked(missing));
  const src = playlistOf(db, s.user_id, s.source_provider, s.source_playlist_id);
  const tgt = playlistOf(db, s.user_id, s.target_provider, s.target_playlist_id);
  if (!src) return fail(`${s.source_provider} retornou 404: Playlist nao encontrada`);
  if (!tgt) return fail(`${s.target_provider} retornou 404: Playlist nao encontrada`);
  const targetIds = new Set(tgt.keys.map((k) => trackId(s.target_provider, k)));
  const added: number[] = [];
  for (const k of src.keys) {
    const t = track(s.source_provider, k);
    const found = searchTrack(s.target_provider, `${baseName(t.name)} ${t.artist}`);
    if (found && !targetIds.has(found.track.id)) { added.push(found.k); targetIds.add(found.track.id); }
  }
  tgt.keys.push(...added);
  let removed = 0;
  // Mirror mode only removes when both playlists are on the same provider (ids do not cross providers).
  if (s.method === 'mirror' && s.source_provider === s.target_provider) {
    const keep = new Set(src.keys);
    removed = tgt.keys.filter((k) => !keep.has(k)).length;
    tgt.keys = tgt.keys.filter((k) => keep.has(k));
  }
  Object.assign(s, { last_synced_at: iso(now), last_error: null, tracks_added_last_run: added.length, status: 'active', updated_at: iso(now) });
  log(true, added.length, removed, null);
}
/**
 * The AsyncIOScheduler job "sync_scan" (CronTrigger minute="*\/15", UTC), driven by the request clock: every quarter
 * hour between the last tick and now runs scan_and_run_due_syncs. The real server is always up; the demo "server"
 * only exists while a tab is open, so it catches up on the quarter hours it missed (up to 7 days back).
 */
export function tick(db: Db, now: number): boolean {
  const last = ms(db.scheduler.last_tick);
  let fire = Math.max(Math.floor(last / TICK) * TICK + TICK, Math.floor((now - 7 * DAY) / TICK) * TICK);
  if (fire > now) return false;
  for (; fire <= now; fire += TICK) {
    for (const s of db.syncs) if (isDue(s, fire)) runSync(db, s, fire, 'cron');
    db.scheduler.last_fire = iso(fire);
  }
  db.scheduler.last_tick = iso(now);
  return true;
}
/** Next quarter hour at which the scan would run this sync (null when paused or in error). */
export function nextRun(s: PlaylistSync, now: number): number | null {
  if (s.status !== 'active') return null;
  for (let f = Math.floor(now / TICK) * TICK + TICK, end = now + 8 * DAY; f <= end; f += TICK) if (isDue(s, f)) return f;
  return null;
}
const syncView = (s: SyncDoc): PlaylistSync => { const { user_id, ...dto } = s; return dto; };

function createSync(db: Db, user: string, b: Body, now: number): Res {
  const bad = first(
    oneOf(b, 'source_provider', PROVIDERS), str(b, 'source_playlist_id', 1, 500), str(b, 'source_playlist_name', 0, 500, true),
    oneOf(b, 'target_provider', PROVIDERS), str(b, 'target_playlist_id', 1, 500), str(b, 'target_playlist_name', 0, 500, true),
    oneOf(b, 'frequency', ['daily', 'weekly'], 'daily'), int(b, 'run_hour', 0, 23), int(b, 'run_minute', 0, 59), oneOf(b, 'method', ['add_only', 'mirror'], 'add_only'),
  );
  if (bad) return bad;
  if (b['source_provider'] === b['target_provider'] && b['source_playlist_id'] === b['target_playlist_id']) return err(400, 'Origem e destino nao podem ser a mesma playlist');
  const s: SyncDoc = {
    id: oid(db, now), user_id: user, source_provider: b['source_provider'] as Provider, source_playlist_id: b['source_playlist_id'] as string,
    source_playlist_name: (b['source_playlist_name'] as string | undefined) ?? null, target_provider: b['target_provider'] as Provider,
    target_playlist_id: b['target_playlist_id'] as string, target_playlist_name: (b['target_playlist_name'] as string | undefined) ?? null,
    frequency: (b['frequency'] as SyncFrequency | undefined) ?? 'daily', run_hour: (b['run_hour'] as number | undefined) ?? 2,
    run_minute: (b['run_minute'] as number | undefined) ?? 0, method: (b['method'] as SyncMethod | undefined) ?? 'add_only', status: 'active',
    last_synced_at: null, last_error: null, tracks_added_last_run: 0, created_at: iso(now), updated_at: iso(now),
  };
  db.syncs.push(s);
  return res(201, syncView(s));
}

// ---------- Router ----------
/**
 * One request against the mirrored API. `path` is relative to /api/v1 and may carry a query string. Every request
 * first advances running transfers and the scheduler to `now` (the server's background work); `dirty` says whether
 * anything changed, so the caller persists.
 */
export function route(db: Db, method: string, path: string, body: unknown, authorization: string | null, now: number): Res {
  let dirty = tick(db, now);
  for (const t of db.transfers) if (t.sim) dirty = advance(db, t, now) || dirty;
  const out = handle(db, method, path, (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as Body, authorization, now);
  return { ...out, dirty: out.dirty || dirty };
}

function handle(db: Db, method: string, path: string, b: Body, authorization: string | null, now: number): Res {
  const [rawPath, qs = ''] = path.split('?');
  const seg = rawPath.split('/').filter(Boolean).map(decodeURIComponent);
  const is = (m: string, ...parts: string[]) => method === m && seg.length === parts.length && parts.every((p, i) => p === '*' || p === seg[i]);

  // Public routes
  if (is('GET', 'health')) return { status: 200, body: { status: 'ok' }, dirty: false };
  if (is('POST', 'auth', 'register')) {
    const bad = first(str(b, 'name', 1, 120), str(b, 'email', 3, 254), str(b, 'password', 8, 72));
    if (bad) return bad;
    const email = (b['email'] as string).toLowerCase();
    if (!EMAIL.test(email)) return v422(['body', 'email'], 'value is not a valid email address: An email address must have an @-sign.');
    if (db.users.some((u) => u.email === email)) return err(409, 'E-mail ja cadastrado');
    const u: UserDoc = { id: oid(db, now), name: b['name'] as string, email, password_hash: pwHash(b['password'] as string), timezone_offset_minutes: -180, created_at: iso(now), updated_at: iso(now) };
    db.users.push(u);
    return res(201, tokens4(u.id, now));
  }
  if (is('POST', 'auth', 'login')) {
    const bad = first(str(b, 'email', 3, 254), str(b, 'password', 0, 1000));
    if (bad) return bad;
    const u = db.users.find((x) => x.email === (b['email'] as string).toLowerCase());
    if (!u || u.password_hash !== pwHash(b['password'] as string)) return err(401, 'Credenciais invalidas');
    return { status: 200, body: tokens4(u.id, now), dirty: false };
  }
  if (is('POST', 'auth', 'refresh')) {
    const sub = decodeToken(b['refresh_token'], 'refresh', now);
    if (!sub) return err(401, 'Refresh token invalido');
    if (!db.users.some((u) => u.id === sub)) return err(401, 'Usuario nao encontrado');
    return { status: 200, body: tokens4(sub, now), dirty: false };
  }
  if (is('POST', 'auth', 'oauth', '*', 'callback')) {
    const p = asProvider(seg[2]);
    if (!p) return v422(['path', 'provider'], PROVIDER_MSG, 'enum');
    const bad = first(str(b, 'code', 1, 2000), str(b, 'state', 1, 4000));
    if (bad) return bad;
    const state = dec(b['state'] as string);
    const sub = decodeToken(b['state'], 'oauth_state', now);
    if (!state || !sub) return err(400, 'state invalido: Token invalido ou expirado');
    if (state['provider'] !== p) return err(400, 'state nao corresponde ao provedor informado na URL');
    const user = db.users.find((u) => u.id === sub);
    if (!user) return err(400, 'state sem subject');
    if (!/^demo-[A-Za-z0-9]{8,}$/.test(b['code'] as string)) return err(400, 'Falha na troca de code: invalid_grant');
    const a = link(db, user, p, now);
    return res(200, { status: 'linked', provider: p, provider_user_id: a.provider_user_id, provider_display_name: a.provider_display_name } satisfies OAuthCallbackResponse);
  }
  if (is('GET', 'shares', '*')) {
    const t = db.transfers.find((x) => x.share_token === seg[1]);
    if (!t) return err(404, 'Share nao encontrado');
    const owner = db.users.find((u) => u.id === t.user_id);
    return {
      status: 200, dirty: false,
      body: {
        token: seg[1], owner_name: owner?.name ?? 'Usuario ITransferMusic', owner_id: t.user_id, playlist_name: t.target_playlist_name,
        playlist_description: t.target_playlist_description, playlist_image_url: t.source_playlist_image_url, source_provider: t.source_provider,
        source_playlist_id: t.source_playlist_id, target_provider: t.target_provider, target_playlist_id: t.target_playlist_id,
        total_tracks: t.total_tracks, matched_tracks: t.matched_tracks, tracks: t.results,
      } satisfies SharePublic,
    };
  }

  // Everything below needs "Authorization: Bearer <access token>" (OAuth2PasswordBearer + get_current_user_id).
  const bearer = authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) return err(401, 'Not authenticated');
  const userId = decodeToken(bearer, 'access', now);
  const user = db.users.find((u) => u.id === userId);
  if (!userId || !user) return err(401, 'Credenciais invalidas');
  const mine = <T extends { user_id: string }>(list: T[]) => list.filter((x) => x.user_id === user.id);

  if (is('GET', 'auth', 'me')) return { status: 200, body: { id: user.id, name: user.name, email: user.email, timezone_offset_minutes: user.timezone_offset_minutes } satisfies MeResponse, dirty: false };
  if (is('PATCH', 'auth', 'me')) {
    const bad = first(str(b, 'name', 1, 120, true), int(b, 'timezone_offset_minutes', -720, 840));
    if (bad) return bad;
    if (typeof b['name'] === 'string') user.name = b['name'];
    if (typeof b['timezone_offset_minutes'] === 'number') user.timezone_offset_minutes = b['timezone_offset_minutes'];
    user.updated_at = iso(now);
    return res(200, { id: user.id, name: user.name, email: user.email, timezone_offset_minutes: user.timezone_offset_minutes } satisfies MeResponse);
  }
  if (is('GET', 'auth', 'oauth', '*', 'authorize')) {
    const p = asProvider(seg[2]);
    if (!p) return v422(['path', 'provider'], PROVIDER_MSG, 'enum');
    // Demo extension: all five providers are simulated (the FastAPI only has code flow for Spotify and Google), and the
    // consent screen is a page of this app that says it is simulated. Nothing goes to a provider.
    const state = enc({ sub: user.id, provider: p, type: 'oauth_state', exp: now + 10 * MIN });
    const redirect = `/auth/callback/${p}/`;
    return { status: 200, dirty: false, body: { authorize_url: `/oauth/simulado/?provider=${p}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirect)}`, state } satisfies OAuthAuthorizeResponse };
  }
  if (is('GET', 'accounts')) {
    // AccountService refreshes the provider token when it is about to expire (_refresh_if_needed): a demo token is
    // always "fresh", valid for the hour after the request.
    const fresh = (a: AccountDoc) => (ms(a.expires_at) > now + MIN ? a.expires_at : iso(Math.floor(now / MIN) * MIN + HOUR));
    return { status: 200, dirty: false, body: mine(db.accounts).map((a): LinkedAccount => ({ provider: a.provider, provider_user_id: a.provider_user_id, provider_display_name: a.provider_display_name, expires_at: fresh(a), created_at: a.created_at, updated_at: a.updated_at })) };
  }
  if (is('DELETE', 'accounts', '*')) {
    const p = asProvider(seg[1]);
    if (!p) return v422(['path', 'provider'], PROVIDER_MSG, 'enum');
    db.accounts = db.accounts.filter((a) => !(a.user_id === user.id && a.provider === p));
    return res(204);
  }
  if (is('GET', 'playlists', '*') || is('GET', 'playlists', '*', '*', 'tracks')) {
    const p = asProvider(seg[1]);
    if (!p) return v422(['path', 'provider'], PROVIDER_MSG, 'enum');
    if (!account(db, user.id, p)) return err(400, notLinked(p));
    if (seg.length === 2) return { status: 200, dirty: false, body: mine(db.playlists).filter((l) => l.provider === p).map(summary) };
    const pl = playlistOf(db, user.id, p, seg[2]);
    if (!pl) return err(502, `${p} retornou 404: Playlist nao encontrada`);
    return { status: 200, dirty: false, body: pl.keys.map((k) => track(p, k)) };
  }

  if (is('POST', 'transfers')) return createTransfer(db, user.id, b, now);
  // Demo extension: the matching the background job would do, without creating anything (wizard step 4).
  if (is('POST', 'transfers', 'preview')) {
    const bad = first(oneOf(b, 'source_provider', PROVIDERS), oneOf(b, 'target_provider', PROVIDERS), str(b, 'source_playlist_id', 1, 500));
    if (bad) return bad;
    const source = b['source_provider'] as Provider, target = b['target_provider'] as Provider;
    if (source === target) return err(400, 'Origem e destino nao podem ser iguais');
    const missing = [source, target].find((p) => !account(db, user.id, p));
    if (missing) return err(400, notLinked(missing));
    const sel = Array.isArray(b['selected_track_ids']) ? (b['selected_track_ids'] as unknown[]).filter((x): x is string => typeof x === 'string') : null;
    const { pl, results } = plan(db, user.id, source, target, b['source_playlist_id'] as string, sel);
    if (!pl) return err(502, `${source} retornou 404: Playlist nao encontrada`);
    return { status: 200, dirty: false, body: { source_playlist_name: pl.name, total_tracks: results.length, matched_tracks: results.filter((r) => r.matched).length, results } satisfies TransferPreview };
  }
  if (is('GET', 'transfers')) {
    // Demo fix: `limit` is unbounded in the FastAPI; clamped to 1..100 here.
    const limit = Math.max(1, Math.min(100, Number(new URLSearchParams(qs).get('limit') ?? 20) || 20));
    return { status: 200, dirty: false, body: mine(db.transfers).sort((a, b2) => ms(b2.created_at) - ms(a.created_at) || b2.id.localeCompare(a.id)).slice(0, limit).map(view) };
  }
  const transfer = seg[0] === 'transfers' && seg[1] ? db.transfers.find((t) => t.id === seg[1] && t.user_id === user.id && isOid(seg[1])) : undefined;
  if (is('GET', 'transfers', '*')) return transfer ? { status: 200, body: view(transfer), dirty: false } : err(404, 'Transferencia nao encontrada');
  if (is('GET', 'transfers', '*', 'alive')) {
    const alive = !!transfer?.target_playlist_id && !!account(db, user.id, transfer.target_provider) && !!playlistOf(db, user.id, transfer.target_provider, transfer.target_playlist_id);
    return { status: 200, body: { alive }, dirty: false };
  }
  if (is('POST', 'transfers', '*', 'share')) {
    if (!transfer) return err(404, 'Transferencia nao encontrada');
    transfer.share_token ??= chars(`share:${transfer.id}:${now}`, 16, B62 + '-_');
    return res(200, { token: transfer.share_token, share_url: `/share/${transfer.share_token}` } satisfies ShareTokenResponse);
  }

  if (is('POST', 'generator', 'tracks')) return generate(db, user.id, b, now);
  if (is('POST', 'generator', 'save')) return saveGenerated(db, user.id, b, now);

  if (is('POST', 'syncs')) return createSync(db, user.id, b, now);
  if (is('GET', 'syncs')) return { status: 200, dirty: false, body: mine(db.syncs).sort((a, b2) => ms(b2.created_at) - ms(a.created_at)).map(syncView) };
  const sync = seg[0] === 'syncs' && seg[1] ? db.syncs.find((s) => s.id === seg[1] && s.user_id === user.id) : undefined;
  if (is('PATCH', 'syncs', '*')) {
    const bad = oneOf(b, 'status', ['active', 'paused', 'error']);
    if (bad) return bad;
    if (!isOid(seg[1])) return err(404, 'Sync invalida');
    if (!sync) return err(404, 'Sync nao encontrada');
    sync.status = b['status'] as SyncStatus;
    sync.updated_at = iso(now); // demo fix: the FastAPI does not touch updated_at here
    return res(200, syncView(sync));
  }
  if (is('DELETE', 'syncs', '*')) {
    db.syncs = db.syncs.filter((s) => s !== sync);
    return res(204);
  }
  if (is('POST', 'syncs', '*', 'run')) {
    // Demo fix: the FastAPI answers 202 {"status": "ok"} even when the sync does not exist.
    if (!sync) return err(404, 'Sync nao encontrada');
    runSync(db, sync, now, 'manual');
    return res(202, { status: 'ok' });
  }
  if (is('GET', '__demo', 'scheduler')) {
    const fire = Math.floor(now / TICK) * TICK + TICK;
    return {
      status: 200, dirty: false,
      body: {
        jobs: [{ id: 'sync_scan', func: 'src.core.scheduler:_tick', trigger: "cron[minute='*/15']", timezone: 'UTC', next_run_time: iso(fire), last_run_time: db.scheduler.last_fire }],
        next_runs: mine(db.syncs).map((s) => ({ sync_id: s.id, next_run_at: (() => { const n = nextRun(s, now); return n === null ? null : iso(n); })() })),
        runs: db.scheduler.runs.filter((r) => r.user_id === user.id).map(({ user_id, ...r }) => r),
      } satisfies SchedulerView,
    };
  }
  return err(404, 'Not Found');
}

// ---------- Seed: the demo account with three linked services, history and two syncs, relative to `now` ----------
export function seed(now: number, demo: { name: string; email: string; password: string }): Db {
  const db: Db = { v: 1, seq: 0, users: [], accounts: [], playlists: [], transfers: [], syncs: [], scheduler: { last_tick: iso(now), last_fire: null, runs: [] } };
  const user: UserDoc = { id: oid(db, now - 40 * DAY), name: demo.name, email: demo.email, password_hash: pwHash(demo.password), timezone_offset_minutes: -180, created_at: iso(now - 40 * DAY), updated_at: iso(now - 40 * DAY) };
  db.users.push(user);
  for (const [p, days] of [['spotify', 39], ['youtube', 30], ['apple_music', 21], ['amazon_music', 21]] as [Provider, number][]) link(db, user, p, now - days * DAY);
  const byName = (p: Provider, name: string) => db.playlists.find((l) => l.provider === p && l.name === name)!;
  const run = (at: number, src: Provider, dst: Provider, name: string, opts: { cut?: number; desc?: string } = {}) => {
    const pl = byName(src, name);
    const ids = opts.cut ? pl.keys.slice(0, pl.keys.length - opts.cut).map((k) => trackId(src, k)) : null;
    const r = createTransfer(db, user.id, { source_provider: src, target_provider: dst, source_playlist_id: pl.id, source_playlist_name: pl.name, target_playlist_name: `${pl.name} (transferida)`, target_playlist_description: opts.desc ?? null, selected_track_ids: ids }, at);
    const t = db.transfers.find((x) => x.id === (r.body as TransferResponse).id)!;
    advance(db, t, at + 60_000);
    return t;
  };
  const treino = run(now - 9 * DAY - 3 * HOUR, 'spotify', 'apple_music', 'Treino pesado', { cut: 3 });
  const rock = run(now - 6 * DAY - 5 * HOUR, 'spotify', 'youtube', 'Rock Nacional 80/90', { desc: 'Para o churrasco de sábado' });
  rock.share_token = chars(`share:${rock.id}`, 16, B62 + '-_');
  const hiphop = run(now - 4 * DAY - 2 * HOUR, 'youtube', 'spotify', 'Hip-Hop 2000s');
  const jazz = run(now - 26 * HOUR, 'apple_music', 'spotify', 'Jazz no fim de tarde');
  // The Hip-Hop copy was deleted on Spotify afterwards: /alive says false and the history keeps the record.
  db.playlists = db.playlists.filter((l) => l.id !== hiphop.target_playlist_id);
  void jazz;
  // A transfer to Amazon Music that failed in the background: the account was unlinked before the job ran.
  const country = byName('apple_music', 'Country Roads');
  db.transfers.push({
    id: oid(db, now - 2 * DAY), user_id: user.id, source_provider: 'apple_music', target_provider: 'amazon_music', source_playlist_id: country.id,
    source_playlist_name: country.name, source_playlist_image_url: null, target_playlist_id: null, target_playlist_name: 'Country Roads (transferida)',
    target_playlist_description: null, status: 'failed', total_tracks: 0, matched_tracks: 0, results: [], error_message: notLinked('amazon_music'),
    share_token: null, created_at: iso(now - 2 * DAY), updated_at: iso(now - 2 * DAY + 4000), selected_track_ids: null, apply_watermark: true,
  });
  db.accounts = db.accounts.filter((a) => a.provider !== 'amazon_music');
  // A playlist made with the generator, saved on Spotify.
  const gen = generate(db, user.id, { source_provider: 'spotify', genres: ['Jazz', 'Soul'], moods: ['Relaxed'], prompt: 'chuva', count: 14 }, now - 3 * DAY);
  saveGenerated(db, user.id, { target_provider: 'spotify', playlist_name: 'Fim de tarde chuvoso', playlist_description: 'Gerada por gênero e humor', tracks: (gen.body as GeneratorResponse).tracks }, now - 3 * DAY);

  // Syncs. "Treino pesado" weekly at 13:00 in Brasília (16:00 UTC); three tracks were added to the source after the
  // transfer, so "Executar agora" has something to copy.
  const mk = (t: TransferDoc, extra: Partial<PlaylistSync>, at: number) => {
    const r = createSync(db, user.id, { source_provider: t.source_provider, source_playlist_id: t.source_playlist_id, source_playlist_name: t.source_playlist_name, target_provider: t.target_provider, target_playlist_id: t.target_playlist_id, target_playlist_name: t.target_playlist_name, ...extra }, at);
    return db.syncs.find((s) => s.id === (r.body as PlaylistSync).id)!;
  };
  const weekly = mk(treino, { frequency: 'weekly', run_hour: 16, run_minute: 0, method: 'add_only' }, now - 9 * DAY);
  const d = new Date(now - 5 * DAY);
  const lastRun = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 16, 0);
  Object.assign(weekly, { last_synced_at: iso(lastRun), tracks_added_last_run: 0, updated_at: iso(lastRun) });
  db.scheduler.runs.push({ user_id: user.id, at: iso(lastRun), sync_id: weekly.id, label: `${weekly.source_playlist_name} → ${weekly.target_playlist_name}`, trigger: 'cron', added: 0, removed: 0, ok: true, error: null });
  const daily = mk(rock, { frequency: 'daily', run_hour: 2, run_minute: 30, method: 'add_only' }, now - 6 * DAY);
  Object.assign(daily, { status: 'paused', updated_at: iso(now - 2 * DAY) });
  const treinoSrc = byName('spotify', 'Treino pesado');
  const extra = CAT.map((c, k) => k).filter((k) => !treinoSrc.keys.includes(k) && availability('spotify', k) && has(CAT[k], 'energetic') && has(CAT[k], 'rock', 'electronic')).slice(0, 3);
  treinoSrc.keys.push(...extra);
  db.scheduler.last_tick = iso(now);
  return db;
}

/** Shape check for what comes back from localStorage. */
export function isDb(x: unknown): x is Db {
  const d = x as Db;
  return !!d && d.v === 1 && typeof d.seq === 'number' && [d.users, d.accounts, d.playlists, d.transfers, d.syncs].every(Array.isArray)
    && !!d.scheduler && typeof d.scheduler.last_tick === 'string' && Array.isArray(d.scheduler.runs);
}
