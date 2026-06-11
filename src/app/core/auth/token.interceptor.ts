import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { from, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Functional interceptor que adjunta el JWT de Firebase Auth
 * como header Authorization: Bearer <token> en cada request
 * dirigida a la API del backend.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo interceptar peticiones a nuestra API
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(Auth);
  const user = auth.currentUser;

  // Si no hay usuario autenticado, enviar sin token
  if (!user) {
    return next(req);
  }

  return from(user.getIdToken()).pipe(
    switchMap(token => {
      const cloned = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
      return next(cloned);
    }),
  );
};
