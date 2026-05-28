import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

export const rolesGuard = (allowedRoles: Role[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.parseUrl('/login');
    }

    const roles = auth.getRoles();
    const isAllowed = allowedRoles.some((r) => roles.includes(r));

    if (!isAllowed) {
      return router.parseUrl('/');
    }

    return true;
  };
};
