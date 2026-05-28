
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/api/auth/') || req.url.includes('/api/oauth2/')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const authReq = !token || req.headers.has('Authorization')
    ? req
    : req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

  return next(authReq).pipe(
    catchError((err) => {
      if (err?.status === 401) {
        auth.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};

