import { RenderMode, ServerRoute } from '@angular/ssr';

// Public pages are prerendered (GitHub Pages, no server). The app itself lives in localStorage, so every app route
// renders in the browser; scripts/pages.ts gives each a noindex shell so a reload answers 200.
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'sobre', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
