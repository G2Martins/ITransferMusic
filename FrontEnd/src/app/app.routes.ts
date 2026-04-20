import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'feature/:slug',
    loadComponent: () =>
      import('./pages/feature/feature.component').then((m) => m.FeatureComponent),
  },
  {
    path: 'help',
    loadComponent: () =>
      import('./pages/help/help.component').then((m) => m.HelpComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'auth/callback/:provider',
    loadComponent: () =>
      import('./pages/auth/oauth-callback/oauth-callback.component').then(
        (m) => m.OAuthCallbackComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'transfer/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/transfer/new-transfer.component').then(
        (m) => m.NewTransferComponent,
      ),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/account/account-layout.component').then(
        (m) => m.AccountLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/account/profile/account-profile.component').then(
            (m) => m.AccountProfileComponent,
          ),
      },
      {
        path: 'syncs',
        loadComponent: () =>
          import('./pages/account/syncs/account-syncs.component').then(
            (m) => m.AccountSyncsComponent,
          ),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./pages/account/history/account-history.component').then(
            (m) => m.AccountHistoryComponent,
          ),
      },
    ],
  },
  // Redirect para compatibilidade com a rota antiga
  { path: 'profile', redirectTo: '/account/profile', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
