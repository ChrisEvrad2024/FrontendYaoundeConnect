// src/app/core/interceptors/auth.interceptor.ts

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Ne pas ajouter le token pour les routes d'authentification
  const authUrls = ['/auth/login', '/auth/register', '/auth/verify-email'];
  const isAuthUrl = authUrls.some(url => req.url.includes(url));

  if (token && !isAuthUrl) {
    // Cloner la requête et ajouter le header Authorization
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};