// npm test: the rules of the mirrored FastAPI (src/app/api/demo-db.ts), run in Node with type stripping.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { CATALOG } from '../src/app/data/catalog.ts';
import { DEMO_ACCOUNT } from '../src/app/data/site.ts';
import { EN } from '../src/app/i18n/en.ts';
import { PT } from '../src/app/i18n/pt.ts';
import { availability, isDb, isDue, route, seed, useCatalog, type Db, type PlaylistSync, type Provider } from '../src/app/api/demo-db.ts';

useCatalog(CATALOG);
const T0 = Date.UTC(2026, 10, 10, 12, 7);
let db: Db = seed(T0, DEMO_ACCOUNT);
let now = T0;
let token = '';
const call = (method: string, path: string, body?: unknown, auth = true) => {
  const r = route(db, method, path, body ?? null, auth && token ? `Bearer ${token}` : null, now);
  db = JSON.parse(JSON.stringify(db)); // what localStorage does between requests
  return r as { status: number; body: any };
};
let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log(`ok ${n} ${name}`); };

test('seed is a valid db with the demo user', () => {
  assert.ok(isDb(db));
  assert.equal(db.users.length, 1);
  assert.equal(CATALOG.length > 150, true);
});

test('auth: 401 without token, login, wrong password, me', () => {
  assert.equal(call('GET', '/accounts').status, 401);
  assert.equal(call('GET', '/accounts').body.detail, 'Not authenticated');
  assert.equal(call('POST', '/auth/login', { email: DEMO_ACCOUNT.email, password: 'errada123' }).status, 401);
  const r = call('POST', '/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password });
  assert.equal(r.status, 200);
  token = r.body.access_token;
  assert.equal(call('GET', '/auth/me').body.email, DEMO_ACCOUNT.email);
  const refreshed = call('POST', '/auth/refresh', { refresh_token: r.body.refresh_token });
  assert.equal(refreshed.status, 200);
  assert.equal(call('POST', '/auth/refresh', { refresh_token: r.body.access_token }).status, 401);
  assert.equal(call('POST', '/auth/register', { name: 'X', email: DEMO_ACCOUNT.email, password: '12345678' }).status, 409);
  const v = call('POST', '/auth/register', { name: 'X', email: 'x@demo.example', password: '123' });
  assert.equal(v.status, 422);
  assert.deepEqual(v.body.detail[0].loc, ['body', 'password']);
});

test('accounts: three linked services, Amazon was unlinked', () => {
  const r = call('GET', '/accounts');
  assert.deepEqual(r.body.map((a: { provider: string }) => a.provider).sort(), ['apple_music', 'spotify', 'youtube']);
  assert.equal(call('GET', '/playlists/deezer').status, 400);
  assert.equal(call('GET', '/playlists/deezer').body.detail, "Conta do provedor 'deezer' nao vinculada");
  assert.equal(call('GET', '/playlists/tidal').status, 422);
});

test('playlists: Spotify library has the virtual playlists and tracks', () => {
  const pls = call('GET', '/playlists/spotify').body;
  assert.ok(pls.some((p: { id: string }) => p.id === '__liked_songs__'));
  const rock = pls.find((p: { name: string }) => p.name === 'Rock Nacional 80/90');
  const tracks = call('GET', `/playlists/spotify/${rock.id}/tracks`).body;
  assert.equal(tracks.length, rock.track_count);
  assert.ok(tracks.every((t: { provider: string; image_url: null }) => t.provider === 'spotify' && t.image_url === null));
  assert.equal(call('GET', '/playlists/spotify/nao-existe/tracks').status, 502);
});

test('simulated OAuth: authorize, bad code, wrong provider, link Deezer', () => {
  const a = call('GET', '/auth/oauth/deezer/authorize').body;
  assert.ok(a.authorize_url.startsWith('/oauth/simulado/?provider=deezer'));
  assert.equal(call('POST', '/auth/oauth/deezer/callback', { code: 'x', state: a.state }, false).status, 400);
  assert.equal(call('POST', '/auth/oauth/spotify/callback', { code: 'demo-abcdefgh', state: a.state }, false).body.detail, 'state nao corresponde ao provedor informado na URL');
  const ok = call('POST', '/auth/oauth/deezer/callback', { code: 'demo-abcdefgh', state: a.state }, false);
  assert.equal(ok.body.status, 'linked');
  assert.ok(call('GET', '/playlists/deezer').body.length >= 3);
  now += 11 * 60_000;
  assert.equal(call('POST', '/auth/oauth/deezer/callback', { code: 'demo-abcdefgh', state: a.state }, false).status, 400, 'state expires in 10 min');
});

let transferId = '';
test('transfer: rules, then pending -> running with growing results -> final', () => {
  const pl = call('GET', '/playlists/spotify').body.find((p: { name: string }) => p.name === 'Indie de estrada');
  const base = { source_provider: 'spotify', target_provider: 'deezer', source_playlist_id: pl.id, source_playlist_name: pl.name, target_playlist_name: 'Indie (transferida)' };
  assert.equal(call('POST', '/transfers', { ...base, target_provider: 'spotify' }).body.detail, 'Origem e destino nao podem ser iguais');
  assert.equal(call('POST', '/transfers', { ...base, target_provider: 'amazon_music' }).status, 400);
  const bad = call('POST', '/transfers', { ...base, target_playlist_name: '' });
  assert.equal(bad.status, 422);
  assert.deepEqual(bad.body.detail[0].loc, ['body', 'target_playlist_name']);

  const r = call('POST', '/transfers', base);
  assert.equal(r.status, 202);
  assert.equal(r.body.status, 'pending');
  transferId = r.body.id;
  now += 2500;
  const mid = call('GET', `/transfers/${transferId}`).body;
  assert.equal(mid.status, 'running');
  assert.ok(mid.results.length > 0 && mid.results.length < mid.total_tracks);
  now += 20_000;
  const done = call('GET', `/transfers/${transferId}`).body;
  assert.ok(['completed', 'partial'].includes(done.status), done.status);
  assert.equal(done.results.length, done.total_tracks);
  assert.equal(done.matched_tracks, done.results.filter((x: { matched: boolean }) => x.matched).length);
  assert.ok(done.target_playlist_id);
  const created = call('GET', '/playlists/deezer').body.find((p: { id: string }) => p.id === done.target_playlist_id);
  assert.equal(created.name, 'Indie (transferida) By ITransferMusic');
  assert.equal(created.track_count, done.matched_tracks);
  assert.equal(call('GET', `/transfers/${transferId}/alive`).body.alive, true);
  assert.equal(call('GET', '/transfers').body[0].id, transferId);
  assert.equal(call('GET', '/transfers/000000000000000000000000').status, 404);
});

test('preview: confidence only on matches, totals add up, selected tracks respected', () => {
  const pl = call('GET', '/playlists/spotify').body.find((p: { id: string }) => p.id === '__liked_songs__');
  const ids = call('GET', `/playlists/spotify/${pl.id}/tracks`).body.slice(0, 7).map((t: { id: string }) => t.id);
  const p = call('POST', '/transfers/preview', { source_provider: 'spotify', target_provider: 'apple_music', source_playlist_id: pl.id, selected_track_ids: ids }).body;
  assert.equal(p.total_tracks, 7);
  for (const r of p.results) assert.ok(r.matched ? r.confidence > 0 && r.confidence <= 1 : r.confidence === null);
});

test('availability: most tracks exist exactly, some as versions, a few are missing', () => {
  const counts = { exact: 0, version: 0, missing: 0 };
  for (const p of ['spotify', 'deezer'] as Provider[]) CATALOG.forEach((c, k) => {
    const a = availability(p, k);
    counts[!a ? 'missing' : a.name === c.name ? 'exact' : 'version']++;
  });
  assert.ok(counts.missing > 0 && counts.version > counts.missing && counts.exact > counts.version * 3, JSON.stringify(counts));
});

test('failed transfer: empty selection fails and creates no playlist (demo fix)', () => {
  const before = call('GET', '/playlists/youtube').body.length;
  const pl = call('GET', '/playlists/spotify').body[3];
  const r = call('POST', '/transfers', { source_provider: 'spotify', target_provider: 'youtube', source_playlist_id: pl.id, target_playlist_name: 'Vazia', selected_track_ids: ['nao-existe'] });
  now += 5000;
  const t = call('GET', `/transfers/${r.body.id}`).body;
  assert.equal(t.status, 'failed');
  assert.equal(t.error_message, 'Playlist de origem esta vazia');
  assert.equal(t.target_playlist_id, null);
  assert.equal(call('GET', '/playlists/youtube').body.length, before);
});

test('share: token, public read without auth', () => {
  const s = call('POST', `/transfers/${transferId}/share`).body;
  assert.equal(s.share_url, `/share/${s.token}`);
  assert.equal(call('POST', `/transfers/${transferId}/share`).body.token, s.token, 'same token twice');
  const pub = call('GET', `/shares/${s.token}`, null, false);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.owner_name, DEMO_ACCOUNT.name);
  assert.equal(call('GET', '/shares/nope', null, false).status, 404);
});

test('syncs: run now copies the new source tracks once; rules and 404', () => {
  const syncs: PlaylistSync[] = call('GET', '/syncs').body;
  const weekly = syncs.find((s) => s.frequency === 'weekly')!;
  const r1 = call('POST', `/syncs/${weekly.id}/run`);
  assert.equal(r1.status, 202);
  const after = call('GET', '/syncs').body.find((s: PlaylistSync) => s.id === weekly.id);
  assert.ok(after.tracks_added_last_run > 0, 'seeded source has new tracks');
  call('POST', `/syncs/${weekly.id}/run`);
  assert.equal(call('GET', '/syncs').body.find((s: PlaylistSync) => s.id === weekly.id).tracks_added_last_run, 0, 'no duplicates');
  assert.equal(call('POST', '/syncs/000000000000000000000000/run').status, 404);
  assert.equal(call('PATCH', `/syncs/${weekly.id}`, { status: 'paused' }).body.status, 'paused');
  assert.equal(call('PATCH', `/syncs/${weekly.id}`, { status: 'off' }).status, 422);
  assert.equal(call('POST', '/syncs', { source_provider: 'spotify', source_playlist_id: 'a', target_provider: 'spotify', target_playlist_id: 'a' }).status, 400);
  assert.equal(call('POST', '/syncs', { source_provider: 'spotify', source_playlist_id: 'a', target_provider: 'deezer', target_playlist_id: 'b', run_hour: 24 }).status, 422);
});

test('scheduler: the */15 scan runs a due sync, including the 23:50 UTC slot (demo fix)', () => {
  const s = { status: 'active', run_hour: 23, run_minute: 50, frequency: 'daily', last_synced_at: null } as unknown as PlaylistSync;
  assert.equal(isDue(s, Date.UTC(2026, 10, 11, 0, 0)), true);
  assert.equal(isDue(s, Date.UTC(2026, 10, 11, 0, 15)), false);
  const done = call('GET', '/transfers').body.find((t: { id: string }) => t.id === transferId);
  const at = new Date(now + 30 * 60_000);
  const created = call('POST', '/syncs', {
    source_provider: 'spotify', source_playlist_id: done.source_playlist_id, source_playlist_name: 'Indie de estrada',
    target_provider: 'deezer', target_playlist_id: done.target_playlist_id, target_playlist_name: 'Indie (transferida)',
    frequency: 'daily', run_hour: at.getUTCHours(), run_minute: Math.floor(at.getUTCMinutes() / 15) * 15,
  }).body;
  assert.equal(call('GET', '/syncs').body.find((x: PlaylistSync) => x.id === created.id).last_synced_at, null);
  now += 60 * 60_000;
  token = call('POST', '/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password }).body.access_token; // access token lasts 60 min
  assert.ok(token);
  const ran = call('GET', '/syncs').body.find((x: PlaylistSync) => x.id === created.id);
  assert.ok(ran.last_synced_at, 'cron fire ran the sync');
  const sched = call('GET', '/__demo/scheduler').body;
  assert.equal(sched.jobs[0].trigger, "cron[minute='*/15']");
  assert.ok(sched.runs.some((x: { sync_id: string; trigger: string }) => x.sync_id === created.id && x.trigger === 'cron'));
  assert.ok(sched.next_runs.find((x: { sync_id: string }) => x.sync_id === created.id).next_run_at);
});

test('generator: count, unique ids, exclusions, save with honest match flags (demo fix)', () => {
  const g = call('POST', '/generator/tracks', { source_provider: 'spotify', genres: ['Rock'], moods: ['Energetic'], count: 20 }).body;
  assert.equal(g.tracks.length, 20);
  assert.equal(new Set(g.tracks.map((t: { id: string }) => t.id)).size, 20);
  assert.ok(g.used_queries.length > 0);
  const more = call('POST', '/generator/tracks', { source_provider: 'spotify', genres: ['Rock'], moods: ['Energetic'], count: 10, exclude_track_ids: g.tracks.map((t: { id: string }) => t.id) }).body;
  assert.ok(more.tracks.every((t: { id: string }) => !g.tracks.some((x: { id: string }) => x.id === t.id)));
  assert.equal(call('POST', '/generator/tracks', { source_provider: 'amazon_music' }).status, 400);
  const same = call('POST', '/generator/save', { target_provider: 'spotify', playlist_name: 'Mesmo serviço', tracks: g.tracks }).body;
  assert.equal(same.matched_count, 20, 'same service finds every track, version titles included');
  const saved = call('POST', '/generator/save', { target_provider: 'deezer', playlist_name: 'Rock pra correr', tracks: g.tracks });
  assert.equal(saved.status, 201);
  const t = call('GET', '/transfers').body[0];
  assert.equal(t.source_playlist_id, '__generator__');
  assert.equal(t.matched_tracks, saved.body.matched_count);
  assert.equal(t.results.filter((r: { matched: boolean }) => r.matched).length, saved.body.matched_count);
});

test('unlink: playlists need the account again; seeded failed transfer explains why', () => {
  assert.equal(call('DELETE', '/accounts/deezer').status, 204);
  assert.equal(call('GET', '/playlists/deezer').status, 400);
  assert.ok(call('GET', '/transfers?limit=100').body.some((t: { error_message: string }) => t.error_message === "Conta do provedor 'amazon_music' nao vinculada"));
});

test('i18n: EN has every PT key, every key used in the code exists', () => {
  const flat = (o: object, p = ''): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
  const pt = flat(PT), en = new Set(flat(EN));
  assert.deepEqual(pt.filter((k) => !en.has(k)), [], 'missing in EN');
  assert.deepEqual([...en].filter((k) => !pt.includes(k)), [], 'missing in PT');
  const walk = (d: URL): URL[] => readdirSync(d).flatMap((f) => (statSync(new URL(f, d)).isDirectory() ? walk(new URL(`${f}/`, d)) : [new URL(f, d)]));
  const used = walk(new URL('../src/app/', import.meta.url)).filter((f) => /\.(ts|html)$/.test(f.pathname))
    .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\bt\('([a-z][\w.]*\w)'/g)].map((m) => m[1]));
  assert.ok(new Set(used).size > 150, 'key scan found ' + new Set(used).size);
  assert.deepEqual([...new Set(used)].filter((k) => k.includes('.') && !pt.includes(k)), [], 'used but not translated');
  assert.ok(!JSON.stringify([PT, EN]).includes(String.fromCharCode(0x2014)), 'no em dash in translations');
});

console.log(`demo-api: ${n} tests passed`);
