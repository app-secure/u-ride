import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonicModule, LoadingController, PopoverController, ToastController } from '@ionic/angular';
import { Observable, of, BehaviorSubject, firstValueFrom } from 'rxjs';
import { filter, switchMap, catchError, startWith, shareReplay } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth.service';
import { TripsService } from '../../../core/services/trips.service';
import type { Trip } from '../../../core/models/trip.model';
import { RoleStateService, AppRole } from '../../../core/services/role-state.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { AppNotification } from '../../../core/models/notification.model';
import { UsersService } from '../../../core/services/users.service';
import { TripRequestsService } from '../../../core/services/trip-requests.service';
import type { UserProfile } from '../../../core/models/user-profile.model';

@Component({
  selector: 'app-sidebar-shell',
  templateUrl: './sidebar-shell.page.html',
  styleUrls: ['./sidebar-shell.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})

export class SidebarShellPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly roleState = inject(RoleStateService);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly popoverCtrl = inject(PopoverController);
  private readonly toastCtrl = inject(ToastController);
  private readonly trips = inject(TripsService);
  private readonly tripRequestsSvc = inject(TripRequestsService);
  private readonly notifications = inject(NotificationsService);
  private readonly users = inject(UsersService);

  // Define tu diccionario de roles en la clase de tu componente
  roleTranslations: { [key: string]: string } = {
    'driver': 'Conductor',
    'passenger': 'Pasajero',
    'admin': 'Administrador' // Por si acaso lo necesitas en el futuro
  };

  readonly user$ = this.auth.user$;
  readonly role$: Observable<AppRole> = this.roleState.role$;
  readonly profile$: Observable<UserProfile | null> = this.auth.user$.pipe(
    switchMap(user => (user ? this.users.myProfile$ : of(null))),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

  private readonly refreshIntervalMs = 10000;
  private refreshTimerId: number | null = null;
  private notifiedTripIds = new Set<string>();

  isAdminArea = false;
  isRoleArea = false;

  constructor() {
    this.isAdminArea = this.router.url.startsWith('/app/admin');
    this.isRoleArea = this.router.url.startsWith('/app/role');
    this.router.events
      .pipe(
        filter((e: any): e is NavigationEnd => e instanceof NavigationEnd)
      )
      .subscribe(() => {
        this.isAdminArea = this.router.url.startsWith('/app/admin');
        this.isRoleArea = this.router.url.startsWith('/app/role');
      });

    this.notifications$.subscribe(notifs => {
      const newUnreadCount = notifs.filter(n => !n.read).length;
      if (newUnreadCount > this.unreadNotifs) {
        // Hubo nuevas notificaciones, refrescamos el perfil por si hubo una suspensión
        this.users.refreshMyProfile();
      }
      this.currentNotifs = notifs;
      this.unreadNotifs = newUnreadCount;
    });

    this.refreshTimerId = window.setInterval(() => {
      this.refreshNotifs$.next();
      this.checkUpcomingTrips();
    }, this.refreshIntervalMs);

    setTimeout(() => this.checkUpcomingTrips(), 2000);
  }

  private async checkUpcomingTrips(): Promise<void> {
    const role = this.currentRole;
    if (!role || this.isAdminArea) return;

    try {
      const user = await this.auth.getUser();
      if (!user) return;

      let tripsToCheck: Trip[] = [];
      if (role === 'driver') {
        const allTrips = await firstValueFrom(this.trips.getMyTrips());
        tripsToCheck = allTrips.filter(t => t.status === 'open');
      } else if (role === 'passenger') {
        const reqs = await firstValueFrom(this.tripRequestsSvc.getMyRequests());
        const acceptedReqs = reqs.filter(r => r.status === 'accepted');
        
        const tripPromises = acceptedReqs.map(req => 
          firstValueFrom(this.trips.getById(req.tripId)).catch(() => null)
        );
        const trips = await Promise.all(tripPromises);
        tripsToCheck = trips.filter((t): t is Trip => t !== null && t.status === 'open');
      }

      const now = new Date();
      for (const trip of tripsToCheck) {
        const departureTime = new Date(trip.departureAt);
        const diffMs = departureTime.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins >= 0 && diffMins <= 15 && !this.notifiedTripIds.has(trip.id)) {
          this.notifiedTripIds.add(trip.id);
          
          const toast = await this.toastCtrl.create({
            message: `🚗 El viaje hacia ${trip.destinationZone} inicia en ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}.`,
            duration: 5000,
            position: 'top',
            color: 'warning',
            icon: 'time-outline'
          });
          await toast.present();

          const localNotif: AppNotification = {
            id: 'local_reminder_' + trip.id + '_' + Date.now(),
            type: 'trip_reminder',
            title: 'Viaje próximo a iniciar',
            message: `El viaje hacia ${trip.destinationZone} inicia en ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}.`,
            tripId: trip.id,
            driverUid: trip.driverUid,
            read: false,
            createdAt: new Date().toISOString()
          };

          this.currentNotifs = [localNotif, ...this.currentNotifs];
          this.unreadNotifs++;
        }
      }
    } catch (err) {
      // Silencioso para no ensuciar la consola
    }
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

  async goToAdmin(): Promise<void> {
    await this.popoverCtrl.dismiss().catch(() => {});
    await this.router.navigateByUrl('/app/admin');
  }

  async goToProfile(): Promise<void> {
    await this.popoverCtrl.dismiss().catch(() => {});
    await this.router.navigateByUrl('/app/profile');
  }

  async goToVehicles(): Promise<void> {
    await this.popoverCtrl.dismiss().catch(() => {});
    await this.router.navigateByUrl('/app/profile/vehicles');
  }

  async goToHome(): Promise<void> {
    await this.popoverCtrl.dismiss().catch(() => {});
    const role = this.currentRole;
    if (role === 'driver') {
      await this.router.navigateByUrl('/app/my-trips');
    } else {
      await this.router.navigateByUrl('/app/trips');
    }
  }

  async logout(popover?: any): Promise<void> {
    if (popover) {
      await popover.dismiss();
    }
    await this.popoverCtrl.dismiss().catch(() => {});
    await this.auth.logout();
    this.roleState.setRole(null);
    await this.router.navigateByUrl('/auth/login');
  }

  async handleNotificationAction(notif: AppNotification): Promise<void> {
    const user = await this.auth.getUser();
    if (user && !notif.read && notif.id) {
      await this.notifications.markAsRead(user.uid, notif.id);
      this.refreshNotifs$.next();
    }

    await this.popoverCtrl.dismiss().catch(() => {});

    if (this.isReportNotification(notif)) {
      await this.router.navigateByUrl('/app/admin/reports');
      return;
    }

    if (notif.type === 'trip_completed') {
      // Ir a calificar
      await this.router.navigate(['/app/rate', notif.tripId, notif.driverUid]);
    } else if (notif.tripId) {
      // Ir al detalle según rol
      if (this.currentRole === 'driver') {
        await this.router.navigate(['/app/requests', notif.tripId]);
      } else {
        if (this.currentRole !== 'passenger') {
          this.roleState.setRole('passenger');
        }
        await this.router.navigate(['/app/trips', notif.tripId]);
      }
    }
  }

  isSameNotificationDay(createdAt: string): boolean {
    const notificationDate = new Date(createdAt);
    if (Number.isNaN(notificationDate.getTime())) {
      return false;
    }

    const today = new Date();
    return notificationDate.toDateString() === today.toDateString();
  }

  private isReportNotification(notif: AppNotification): boolean {
    const content = `${notif.title ?? ''} ${notif.message ?? ''}`.toLowerCase();
    return content.includes('reporte') || content.includes('report');
  }
}
