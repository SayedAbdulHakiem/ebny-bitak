import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from './models';

export function roleGuard(roles: readonly UserRole[]): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.ensureReady();
    const profile = auth.profile();
    if (!profile) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    if (!roles.includes(profile.role)) return router.createUrlTree(['/']);
    return true;
  };
}
