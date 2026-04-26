import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { switchMap, map, of, take } from 'rxjs';

import { UsersService } from '../services/users.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly users = inject(UsersService);

  canActivate() {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return of(undefined);
        return this.users.profile$(user.uid);
      }),
      take(1),
      map(profile => {
        if (!profile) {
          this.router.navigateByUrl('/auth/login');
          return false;
        }
        const isAdmin = !!profile.roles?.admin;
        if (!isAdmin) {
          this.router.navigateByUrl('/app/trips');
          return false;
        }
        return true;
      }),
    );
  }
}
