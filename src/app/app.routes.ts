import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Session } from './state';

/** App routes need a session (client-only: these routes never prerender). */
const signedIn: CanActivateFn = (_, state) =>
  inject(Session).tokens() ? true : inject(Router).createUrlTree(['/entrar'], { queryParams: { next: state.url } });

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/home').then((m) => m.Home) },
  { path: 'sobre', loadComponent: () => import('./pages/about').then((m) => m.About) },
  { path: 'entrar', loadComponent: () => import('./pages/login').then((m) => m.Login) },
  { path: 'oauth/simulado', loadComponent: () => import('./pages/oauth').then((m) => m.Consent) },
  { path: 'auth/callback/:provider', loadComponent: () => import('./pages/oauth').then((m) => m.Callback) },
  { path: 'share/:token', loadComponent: () => import('./pages/share').then((m) => m.SharePage) },
  {
    path: '',
    canActivate: [signedIn],
    loadComponent: () => import('./shared/shell').then((m) => m.Shell),
    children: [
      { path: 'painel', loadComponent: () => import('./pages/dashboard').then((m) => m.Dashboard) },
      { path: 'conexoes', loadComponent: () => import('./pages/connections').then((m) => m.Connections) },
      { path: 'playlists', loadComponent: () => import('./pages/playlists').then((m) => m.Playlists) },
      { path: 'transferir', loadComponent: () => import('./pages/wizard').then((m) => m.Wizard) },
      { path: 'transferencias', loadComponent: () => import('./pages/transfers').then((m) => m.Transfers) },
      { path: 'sincronizacoes', loadComponent: () => import('./pages/syncs').then((m) => m.Syncs) },
      { path: 'gerador', loadComponent: () => import('./pages/generator').then((m) => m.Generator) },
    ],
  },
  { path: '**', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];
