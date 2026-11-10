// Post-build smoke check (npm run check, also part of build:pages). Exits 1 on any failure.
// SEO essentials per prerendered page, trailing slashes on internal links, no em dash anywhere.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { PORTFOLIO_URL, PROJECT_URL, PUBLIC_PAGES, SITE_URL } from '../src/app/data/site.ts';

const root = new URL('../dist/itransfermusic/browser/', import.meta.url);
const file = (p: string) => new URL(p.replace(/^\//, ''), root);
const fails: string[] = [];
const must = (ok: unknown, msg: string) => ok || fails.push(msg);

const sitemap = readFileSync(file('sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE_URL, ''));
must(urls.join() === PUBLIC_PAGES.join(), `sitemap urls ${urls.join()} != ${PUBLIC_PAGES.join()}`);

for (const u of urls) {
  if (!existsSync(file(`${u}index.html`))) { fails.push(`not prerendered: ${u}`); continue; }
  const h = readFileSync(file(`${u}index.html`), 'utf8');
  const title = h.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const desc = h.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  must(title && title.length <= 160, `${u}: title missing or > 160 chars`);
  must(desc.length >= 70 && desc.length <= 160, `${u}: description ${desc.length} chars (want 70-160)`);
  must((h.match(/<h1[\s>]/g) ?? []).length === 1, `${u}: expected exactly one <h1>`);
  must(h.includes(`<link rel="canonical" href="${SITE_URL}${u}">`), `${u}: canonical mismatch`);
  must(h.includes(`content="${SITE_URL}/og.png"`), `${u}: og:image missing`);
  must(/name="robots" content="index, follow/.test(h), `${u}: should be indexable`);
  must(h.includes('Projeto de portfólio de Gustavo Martins Gripaldi. Demo estática: contas e transferências são simuladas e os dados ficam só no seu navegador.'), `${u}: disclaimer missing`);
  must(h.includes('Marcas pertencem aos respectivos donos; projeto de portfólio sem afiliação.'), `${u}: trademark note missing`);
  must(h.includes(`href="${PROJECT_URL}"`), `${u}: portfolio project link missing`);
  const ld = h.match(/<script id="ld-json" type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
  try {
    const graph = JSON.parse(ld ?? '')['@graph'] as Record<string, any>[];
    const site = graph.find((n) => n['@type'] === 'WebSite');
    const app = graph.find((n) => n['@type'] === 'WebApplication');
    must(site, `${u}: WebSite JSON-LD missing`);
    must(app, `${u}: WebApplication JSON-LD missing`);
    for (const p of [site?.creator, app?.author, app?.creator])
      must(p?.['@id'] === `${PORTFOLIO_URL}#person` && p?.url === PORTFOLIO_URL && p?.name === 'Gustavo Martins Gripaldi', `${u}: JSON-LD person mismatch`);
  } catch { fails.push(`${u}: invalid JSON-LD`); }
}

// Every page and shell: internal links end in "/" (GitHub Pages answers /path with a 301), portfolio links too.
const walk = (dir: URL): URL[] => readdirSync(dir).flatMap((n) => {
  const p = new URL(n, dir);
  return statSync(p).isDirectory() ? walk(new URL(`${n}/`, dir)) : [p];
});
const all = walk(root);
for (const f of all.filter((f) => f.pathname.endsWith('.html'))) {
  const h = readFileSync(f, 'utf8');
  const name = decodeURIComponent(f.pathname.split('/browser/')[1]);
  for (const [, href] of h.matchAll(/href="(\/[^"#?]*)/g))
    must(href.endsWith('/') || /\.[a-z0-9]+$/i.test(href), `${name}: link without trailing slash ${href}`);
  for (const [, href] of h.matchAll(/href="(https:\/\/g2portfolio\.grovicdata\.com[^"#?]*)/g))
    must(href.endsWith('/'), `${name}: portfolio link without trailing slash ${href}`);
}

// No em dash in anything a visitor can read.
for (const f of all.filter((f) => /\.(html|js|json|txt|xml|webmanifest)$/.test(f.pathname) && !f.pathname.endsWith('3rdpartylicenses.txt')))
  must(!readFileSync(f, 'utf8').includes(String.fromCharCode(0x2014)), `em dash in ${decodeURIComponent(f.pathname.split('/browser/')[1])}`);

for (const f of ['robots.txt', 'sitemap.xml', 'site.webmanifest', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og.png', 'index.csr.html', 'fonts/geist-latin-wght-normal.woff2', 'fonts/geist-mono-latin-wght-normal.woff2'])
  must(existsSync(file(f)), `missing /${f}`);

if (fails.length) { console.error(`check: ${fails.length} problem(s)\n- ` + [...new Set(fails)].join('\n- ')); process.exit(1); }
console.log(`check: ${urls.length} urls OK, trailing slashes OK, no em dash`);
