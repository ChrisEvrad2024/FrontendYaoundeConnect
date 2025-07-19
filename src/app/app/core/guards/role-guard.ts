import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { map, take } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const requiredRoles = route.data['roles'] as string[];

  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/auth/login']);
        return false;
      }


      const hasRequiredRole = requiredRoles.includes(user.role);

      if (hasRequiredRole) {
        return true;
      }

      // Afficher un message d'erreur et rediriger
      toastr.error('Vous n\'avez pas les permissions nécessaires pour accéder à cette page');
      router.navigate(['/map']);
      return false;
    })
  );
};