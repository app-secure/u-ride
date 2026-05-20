import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { of, timer } from 'rxjs';

import { RoleStateService } from '../../../core/services/role-state.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class TabsPage {
  readonly roleState = inject(RoleStateService);
  readonly role$ = this.roleState.role$;

  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationsService);

  readonly showTabBar$ = this.router.events.pipe(
    filter(ev => ev instanceof NavigationEnd),
    startWith(null),
    map(() => !this.router.url.startsWith('/app/admin')),
  );

  readonly unreadCount$ = this.auth.user$.pipe(
    switchMap(user => {
      if (!user) return of(0);
      return timer(0, 15000).pipe(
        switchMap(() => this.notifications.getUnreadCount().pipe(
          catchError(() => of(0)),
        )),
      );
    }),
    startWith(0),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
