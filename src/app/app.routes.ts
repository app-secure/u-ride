import type { Routes } from '@angular/router';

import { VerifiedGuard } from './core/auth/verified.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.page').then(m => m.LoginPage),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.page').then(m => m.RegisterPage),
      },
      {
        path: 'verify-email',
        loadComponent: () => import('./features/auth/verify-email/verify-email.page').then(m => m.VerifyEmailPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: 'app',
    canActivate: [VerifiedGuard],
    loadComponent: () =>
      import('./features/shell/sidebar/sidebar-shell.page').then(m => m.SidebarShellPage),
    children: [
      {
        path: 'role',
        loadComponent: () => import('./features/shell/role-selection/role-selection.page').then(m => m.RoleSelectionPage),
      },
      {
        path: '',
        loadChildren: () => import('./features/shell/tabs/tabs.routes').then(m => m.TABS_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'auth/login' },
];
