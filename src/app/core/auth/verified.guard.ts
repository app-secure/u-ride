import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { switchMap, map, of, catchError, take } from 'rxjs';

import { UsersService } from '../services/users.service';

@Injectable({ providedIn: 'root' })
export class VerifiedGuard implements CanActivate {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly users = inject(UsersService);
  private readonly user$ = authState(this.auth);

  canActivate() {
    return this.user$.pipe(
      switchMap(user => {
        if (!user) {
          this.router.navigateByUrl('/auth/login');
          return of(false);
        }

        // Llamada HTTP one-shot al perfil del usuario
        return this.users.getProfile(user.uid).pipe(
          take(1),
          map(profile => {
            if (profile?.disabled) {
              this.router.navigateByUrl('/auth/login');
              return false;
            }

            const isAdmin = !!profile?.roles?.admin;
            if (user.emailVerified || isAdmin) return true;

            this.router.navigateByUrl('/auth/verify-email');
            return false;
          }),
          catchError(() => {
            this.router.navigateByUrl('/auth/verify-email');
            return of(false);
          }),
        );
      }),
    );
  }
}
