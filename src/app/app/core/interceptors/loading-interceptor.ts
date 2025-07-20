// src/app/core/interceptors/loading.interceptor.ts

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { finalize } from 'rxjs/operators';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Ne pas afficher le loader pour certaines requêtes
  const skipUrls = ['/api/auth/me', '/api/notifications'];
  const shouldSkip = skipUrls.some(url => req.url.includes(url));

  if (!shouldSkip) {
    loadingService.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!shouldSkip) {
        loadingService.hide();
      }
    })
  );
};