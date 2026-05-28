import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonicModule, PopoverController } from '@ionic/angular';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { filter, switchMap, catchError, startWith, shareReplay } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth.service';
import { RoleStateService } from '../../../core/services/role-state.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { AppNotification } from '../../../core/models/notification.model';
import { UsersService } from '../../../core/services/users.service';
import type { UserProfile } from '../../../core/models/user-profile.model';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.page.html',
  styleUrls: ['./admin-shell.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterOutlet, RouterLink, RouterLinkActive],
})
export class AdminShellPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly roleState = inject(RoleStateService);
  private readonly router = inject(Router);
  private readonly popoverCtrl = inject(PopoverController);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly notifications = inject(NotificationsService);
  private readonly usersSvc = inject(UsersService);

  readonly user$ = this.auth.user$;
  readonly deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  readonly profile$: Observable<UserProfile | null> = this.auth.user$.pipe(
    switchMap(user => (user ? this.usersSvc.myProfile$ : of(null))),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly refreshNotifs$ = new BehaviorSubject<void>(undefined);
  readonly notifications$: Observable<AppNotification[]> = this.refreshNotifs$.pipe(
    switchMap(() => this.notifications.getMyNotifications().pipe(
      catchError(() => of([] as AppNotification[]))
    )),
    startWith([])
  );

  private currentNotifs: AppNotification[] = [];
  unreadNotifs = 0;
  private refreshTimerId: number | null = null;

  constructor() {
    this.notifications$.subscribe(notifs => {
      this.currentNotifs = notifs;
      this.unreadNotifs = notifs.filter(n => !n.read).length;
    });
    this.refreshTimerId = window.setInterval(() => this.refreshNotifs$.next(), 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimerId !== null) {
      window.clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  async onNotificationsOpen(): Promise<void> {
    const user = await this.auth.getUser();
    if (user && this.unreadNotifs > 0) {
      await this.notifications.markAllAsRead(user.uid, this.currentNotifs);
      this.refreshNotifs$.next();
    }
  }

  async goToNotificationsHistory(): Promise<void> {
    await this.popoverCtrl.dismiss().catch(() => {});
    await this.router.navigateByUrl('/app/notifications');
  }

  async handleNotificationAction(notif: AppNotification): Promise<void> {
    const user = await this.auth.getUser();
    if (user && !notif.read && notif.id) {
      await this.notifications.markAsRead(user.uid, notif.id);
      this.refreshNotifs$.next();
    }
    await this.popoverCtrl.dismiss().catch(() => {});
  }

  async switchToPassenger(): Promise<void> {
    await this.popoverCtrl.dismiss().catch(() => {});
    const loading = await this.loadingCtrl.create({ message: 'Cambiando a modo pasajero...', spinner: 'crescent' });
    await loading.present();
    setTimeout(async () => {
      this.roleState.setRole('passenger');
      await this.router.navigateByUrl('/app/trips');
      await loading.dismiss();
    }, 600);
  }

  async switchToDriver(): Promise<void> {
    await this.popoverCtrl.dismiss().catch(() => {});
    const loading = await this.loadingCtrl.create({ message: 'Cambiando a modo conductor...', spinner: 'crescent' });
    await loading.present();
    setTimeout(async () => {
      this.roleState.setRole('driver');
      await this.router.navigateByUrl('/app/my-trips');
      await loading.dismiss();
    }, 600);
  }

  async goToProfile(): Promise<void> {
    await this.popoverCtrl.dismiss().catch(() => {});
    await this.router.navigateByUrl('/app/profile');
  }

  async logout(): Promise<void> {
    await this.popoverCtrl.dismiss().catch(() => {});
    await this.auth.logout();
    this.roleState.setRole(null);
    await this.router.navigateByUrl('/auth/login');
  }
}
