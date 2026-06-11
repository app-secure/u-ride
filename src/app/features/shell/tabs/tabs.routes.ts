import type { Routes } from '@angular/router';

import { AdminGuard } from '../../../core/auth/admin.guard';

export const TABS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'trips' },
  {
    path: 'trips',
    loadComponent: () => import('../../passenger/trips/trips.page').then(m => m.TripsPage),
  },
  {
    path: 'my-trips',
    loadComponent: () => import('../../driver/driver-trips/driver-trips.page').then(m => m.DriverTripsPage),
  },
  {
    path: 'trips/:tripId',
    loadComponent: () => import('../../passenger/trip-detail/trip-detail.page').then(m => m.TripDetailPage),
  },
  {
    path: 'publish',
    loadComponent: () => import('../../driver/publish-trip/publish-trip.page').then(m => m.PublishTripPage),
  },
  {
    path: 'publish/:tripId',
    loadComponent: () => import('../../driver/publish-trip/publish-trip.page').then(m => m.PublishTripPage),
  },
  {
    path: 'requests/:tripId',
    loadComponent: () => import('../../driver/ride-requests/ride-requests.page').then(m => m.RideRequestsPage),
  },
  {
    path: 'notifications',
    loadComponent: () => import('../../notifications/notifications.page').then(m => m.NotificationsPage),
  },
  {
    path: 'profile',
    loadComponent: () => import('../../profile/profile/profile.page').then(m => m.ProfilePage),
  },
  {
    path: 'profile/vehicles',
    loadComponent: () => import('../../profile/vehicles/vehicles.page').then(m => m.VehiclesPage),
  },
  {
    path: 'report/:reportedUid',
    loadComponent: () => import('../../reports/create-report/create-report.page').then(m => m.CreateReportPage),
  },
  {
    path: 'driver-profile/:driverUid',
    loadComponent: () => import('../../profile/driver-public-profile/driver-public-profile.page').then(m => m.DriverPublicProfilePage),
  },
  {
    path: 'rate/:tripId/:toUid',
    loadComponent: () => import('../../ratings/rate/rate.page').then(m => m.RatePage),
  },
  {
    path: 'appeals/create',
    loadComponent: () => import('../../appeals/create-appeal/create-appeal.page').then(m => m.CreateAppealPage),
  },
  // ─── ADMIN (nested under AdminShellPage so navbar is persistent) ───
  {
    path: 'admin',
    canActivate: [AdminGuard],
    loadComponent: () => import('../../admin/shell/admin-shell.page').then(m => m.AdminShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'reports' },
      {
        path: 'reports',
        loadComponent: () => import('../../admin/reports/reports.page').then(m => m.ReportsPage),
      },
      {
        path: 'routes',
        loadComponent: () => import('../../admin/routes/routes.page').then(m => m.AdminRoutesPage),
      },
      {
        path: 'rules',
        loadComponent: () => import('../../admin/rules/rules.page').then(m => m.AdminRulesPage),
      },
      {
        path: 'users',
        loadComponent: () => import('../../admin/users/users.page').then(m => m.AdminUsersPage),
      },
      {
        path: 'appeals',
        loadComponent: () => import('../../admin/appeals/appeals.page').then(m => m.AppealsPage),
      },
    ],
  },
];
