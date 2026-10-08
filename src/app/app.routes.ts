import { Routes } from '@angular/router';
import { roleGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((module) => module.HomePage),
  },
  {
    path: 'houses/:id',
    loadComponent: () => import('./pages/house-detail/house-detail').then((module) => module.HouseDetailPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((module) => module.LoginPage),
  },
  {
    path: 'stats',
    canActivate: [roleGuard(['admin'])],
    loadComponent: () => import('./pages/stats/stats').then((module) => module.StatsPage),
  },
  {
    path: 'admin/sellers',
    canActivate: [roleGuard(['admin'])],
    loadComponent: () => import('./pages/admin-sellers/admin-sellers').then((module) => module.AdminSellersPage),
  },
  {
    path: 'seller/houses/new',
    canActivate: [roleGuard(['seller'])],
    loadComponent: () => import('./pages/add-house/add-house').then((module) => module.AddHousePage),
  },
  { path: '**', redirectTo: '' },
];
