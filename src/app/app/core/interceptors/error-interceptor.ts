// src/app/core/interceptors/error.interceptor.ts

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Gestion spécifique selon le code d'erreur
      switch (error.status) {
        case 401:
          // Token expiré ou invalide
          if (!req.url.includes('/auth/')) {
            authService.logout();
            router.navigate(['/auth/login'], {
              queryParams: { returnUrl: router.url }
            });
          }
          break;

        case 403:
          // Accès interdit
          router.navigate(['/']);
          break;

        case 404:
          // Ressource non trouvée
          if (!req.url.includes('/api/')) {
            router.navigate(['/404']);
          }
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Erreur serveur
          console.error('Erreur serveur:', error);
          break;
      }

      // Propager l'erreur pour qu'elle soit gérée par le service appelant
      return throwError(() => error);
    })
  );
};