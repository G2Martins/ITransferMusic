import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { Router, UrlSerializer, provideRouter, withInMemoryScrolling } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { DEMO, demoApi } from './api/demo-api';
import { routes } from './app.routes';
import { API_URL } from './data/site';
import { provideI18n } from './i18n/i18n';
import { TrailingSlashSerializer } from './shared/trailing-slash';
import { Session } from './state';

/**
 * Bearer token on every API call (the original auth.interceptor). On a 401 it tries POST /auth/refresh once; if that
 * fails the session ends and the visitor goes to /entrar/ (the original error.interceptor logged out directly).
 */
const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);
  const session = inject(Session);
  const router = inject(Router);
  const sign = (r: HttpRequest<unknown>) => {
    const t = session.tokens();
    return t ? r.clone({ setHeaders: { Authorization: `Bearer ${t.access_token}` } }) : r;
  };
  return next(sign(req)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || /\/auth\/(login|refresh|register)$/.test(req.url) || req.url.includes('/oauth/')) return throwError(() => err);
      return from(session.refresh()).pipe(
        switchMap((ok) => {
          if (ok) return next(sign(req));
          router.navigate(['/entrar'], { queryParams: { next: router.url } });
          return throwError(() => err);
        }),
      );
    }),
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    // Incremental: below-the-fold blocks of the public pages hydrate when they reach the viewport (less boot work).
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
    // Demo build: every call to API_URL is answered in the browser. `npm run start:api`: real FastAPI on :8000.
    provideHttpClient(withFetch(), withInterceptors(DEMO ? [authInterceptor, demoApi] : [authInterceptor])),
    { provide: UrlSerializer, useClass: TrailingSlashSerializer },
    provideI18n(),
  ],
};
