import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { from, of, switchMap, throwError } from 'rxjs';
import { API_URL } from '../data/site';

/** Build flag from angular.json `define`: true for the static demo, false for `npm run start:api` (real FastAPI). */
declare const DEMO_API: boolean;
export const DEMO = typeof DEMO_API === 'undefined' || DEMO_API;

// ponytail: the mirrored API + catalog (~40 KB) load on the first API call, so the landing page never pays for them.
let engine: Promise<typeof import('./engine')> | undefined;
const load = () => (engine ??= import('./engine'));

/** "Restaurar dados de demonstração": fresh sample data relative to now. */
export const resetDemoDb = async () => (await load()).reset();

/**
 * The demo backend. Requests to API_URL never leave the browser: `route` (demo-db.ts), the in-browser mirror of the
 * FastAPI routers, answers them, with the database in localStorage.
 */
export const demoApi: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);
  return from(load()).pipe(
    switchMap((e) => {
      const res = e.handle(req.method, req.urlWithParams.slice(API_URL.length), req.body, req.headers.get('Authorization'));
      if (res.status >= 400) return throwError(() => new HttpErrorResponse({ status: res.status, error: res.body, url: req.url }));
      return of(new HttpResponse({ status: res.status, body: res.body, url: req.url }));
    }),
  );
};
