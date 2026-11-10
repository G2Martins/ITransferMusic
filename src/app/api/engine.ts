// Lazy chunk of the demo backend: catalog + mirrored API + localStorage persistence (see demo-api.ts).
import { CATALOG } from '../data/catalog';
import { DEMO_ACCOUNT } from '../data/site';
import { Db, isDb, route, seed, useCatalog } from './demo-db';

const KEY = 'itransfermusic:db:v1';
useCatalog(CATALOG);

function load(): Db {
  try {
    const db = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (isDb(db)) return db;
  } catch { /* corrupt or blocked storage: start over */ }
  return save(seed(Date.now(), DEMO_ACCOUNT));
}

function save(db: Db): Db {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* private mode: the demo still works for this page view */ }
  return db;
}

export const reset = () => void save(seed(Date.now(), DEMO_ACCOUNT));

export function handle(method: string, path: string, body: unknown, authorization: string | null) {
  const db = load();
  const res = route(db, method, path, body, authorization, Date.now());
  if (res.dirty) save(db);
  return res;
}
