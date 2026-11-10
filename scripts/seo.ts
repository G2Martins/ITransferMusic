// Writes public/sitemap.xml and public/robots.txt (runs before every build).
import { writeFile } from 'node:fs/promises';
import { APP_ROUTES, PUBLIC_PAGES, SITE_URL } from '../src/app/data/site.ts';

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PAGES.map((p) => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${today}</lastmod><priority>${p === '/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`;

// ponytail: GitHub Pages project sites cannot own the domain-root robots.txt; this copy documents intent
// and points to the sitemap (submit it in Search Console). App routes also carry a noindex meta.
const robots = `User-agent: *
Allow: /
${APP_ROUTES.map((r) => `Disallow: /ITransferMusic/${r}/`).join('\n')}

Sitemap: ${SITE_URL}/sitemap.xml
`;

await writeFile(new URL('../public/sitemap.xml', import.meta.url), sitemap);
await writeFile(new URL('../public/robots.txt', import.meta.url), robots);
console.log(`seo: sitemap.xml with ${PUBLIC_PAGES.length} urls, robots.txt`);
