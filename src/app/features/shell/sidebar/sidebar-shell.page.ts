import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonicModule, LoadingController, PopoverController } from '@ionic/angular';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { filter, switchMap, map, catchError, startWith } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth.service';
import { TripsService } from '../../../core/services/trips.service';
import type { Trip } from '../../../core/models/trip.model';
import { RoleStateService, AppRole } from '../../../core/services/role-state.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { AppNotification } from '../../../core/models/notification.model';

@Component({
  selector: 'app-sidebar-shell',
  templateUrl: './sidebar-shell.page.html',
  styleUrls: ['./sidebar-shell.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class SidebarShellPage {
  private readonly auth = inject(AuthService);
  private readonly roleState = inject(RoleStateService);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly popoverCtrl = inject(PopoverController);
  private readonly trips = inject(TripsService);
  private readonly notifications = inject(NotificationsService);

  readonly user$ = this.auth.user$;
  readonly role$: Observable<AppRole> = this.roleState.role$;

  private readonly refreshNotifs$ = new BehaviorSubject<void>(undefined);

  readonly notifications$: Observable<AppNotification[]> = this.refreshNotifs$.pipe(
    switchMap(() => this.notifications.getMyNotifications().pipe(
      catchError((err: any) => {
        console.error('Error cargando notificaciones:', err);
        return of([]);
      })
    )),
    startWith([])
  );

  private currentNotifs: AppNotification[] = [];
  unreadNotifs = 0;

  isAdminArea = false;

  constructor() {
    this.isAdminArea = this.router.url.startsWith('/app/admin');
    this.router.events
      .pipe(
        filter((e: any): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => this.router.url.startsWith('/app/admin')),
      )
      .subscribe((isAdmin: boolean) => {
        this.isAdminArea = isAdmin;
      });

    this.notifications$.subscribe(notifs => {
      this.currentNotifs = notifs;
      this.unreadNotifs = notifs.filter(n => !n.read).length;
    });
  }

  async onNotificationsOpen(): Promise<void> {
    const user = await this.auth.getUser();
    if (user && this.unreadNotifs > 0) {
      await this.notifications.markAllAsRead(user.uid, this.currentNotifs);
    }
  }

  get currentRole(): AppRole {
    return this.roleState.currentRole;
  }

  async toggleRole(): Promise<void> {

  await this.popoverCtrl.dismiss().catch(() => {});

  const loading = await this.loadingCtrl.create({
    message: 'Cambiando de rol...',
    spinner: 'crescent',
    cssClass: 'role-loading',
  });

  await loading.present();

  const newRole: AppRole =
    this.currentRole === 'passenger' ? 'driver' : 'passenger';

  setTimeout(async () => {
    this.roleState.setRole(newRole);

    if (newRole === 'passenger') {
      await this.router.navigateByUrl('/app/trips');
    } else {
      await this.router.navigateByUrl('/app/my-trips');
    }

    await loading.dismiss();
  }, 800);
}

 async goToProfile(): Promise<void> {
  await this.popoverCtrl.dismiss().catch(() => {});
  await this.router.navigateByUrl('/app/profile');
}

  async logout(popover?: any): Promise<void> {
    if (popover) {
      await popover.dismiss();
    }
    await this.auth.logout();
    this.roleState.setRole(null);
    await this.router.navigateByUrl('/auth/login');
  }

  async handleNotificationAction(notif: AppNotification): Promise<void> {
    const user = await this.auth.getUser();
    if (user && !notif.read && notif.id) {
      await this.notifications.markAsRead(user.uid, notif.id);
    }

    await this.popoverCtrl.dismiss().catch(() => {});

    if (notif.type === 'trip_completed') {
      // Ir a calificar
      await this.router.navigate(['/app/rate', notif.tripId, notif.driverUid]);
    } else if (notif.tripId) {
      // Ir al detalle del viaje
      if (this.currentRole !== 'passenger') {
        this.roleState.setRole('passenger');
      }
      await this.router.navigate(['/app/trips', notif.tripId]);
    }
  }
}
