import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Subscription, timer, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { NotificationsService } from './notifications.service';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsWatcherService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly notificationsSvc = inject(NotificationsService);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);

  private running = false;
  private pollingSub?: Subscription;
  private authSub?: Subscription;

  private currentUid: string | null = null;
  private seenNotificationIds: Record<string, true> = {};
  private initialized = false;

  start(): void {
    if (this.running) return;
    if (!isPlatformBrowser(this.platformId)) return;

    this.running = true;
    this.authSub = this.auth.user$.subscribe(user => {
      const uid = user?.uid ?? null;
      if (uid === this.currentUid) return;

      this.stopPolling();
      this.currentUid = uid;
      this.initialized = false;
      this.seenNotificationIds = {};

      if (!uid) return;

      const persisted = this.readPersisted(uid);
      if (persisted) {
        this.seenNotificationIds = persisted.seenNotificationIds;
        this.initialized = persisted.initialized;
      }

      this.startPolling(uid);
    });
  }

  private startPolling(uid: string): void {
    this.pollingSub = timer(0, 20000)
      .pipe(
        switchMap(() =>
          this.notificationsSvc.getMyNotifications().pipe(
            catchError(() => of([] as AppNotification[])),
          ),
        ),
      )
      .subscribe((notifications) => {
        this.handleSnapshot(uid, notifications);
      });
  }

  private handleSnapshot(uid: string, notifications: AppNotification[]): void {
    if (!this.initialized) {
      for (const n of notifications) {
        if (n.id) this.seenNotificationIds[n.id] = true;
      }
      this.initialized = true;
      this.persist(uid);
      return;
    }

    const nextSeen = { ...this.seenNotificationIds };
    const newNotifications = notifications.filter(n => n.id && !this.seenNotificationIds[n.id]);

    for (const n of newNotifications) {
      if (n.id) nextSeen[n.id] = true;

      // Mostrar toast si es una notificación general. 
      // Si tiene tripId, evitamos mostrarla aquí porque los watchers especializados 
      // (TripRequestStatusWatcherService y DriverTripRequestsWatcherService) ya muestran una alerta mejorada (las blancas).
      // EXCEPCIÓN: Las notificaciones del estado general del viaje (iniciado, finalizado, cancelado por conductor)
      // no tienen un watcher especializado para el pasajero, por lo que las mostramos aquí.
      const type = n.type?.toLowerCase();
      if (!n.tripId || type === 'tripstarted' || type === 'tripcompleted' || type === 'tripcancelled') {
        void this.presentToast(n);
      }
    }

    this.seenNotificationIds = nextSeen;
    this.persist(uid);
  }

  private async presentToast(n: AppNotification): Promise<void> {
    const toast = await this.toastCtrl.create({
      header: n.title,
      message: n.message,
      duration: 6000,
      position: 'top',
      color: n.type?.toLowerCase() === 'system' ? 'warning' : 'primary',
      buttons: [
        {
          text: 'Ir a notificaciones',
          role: 'info',
          handler: () => {
            void this.router.navigate(['/app/notifications']);
          },
        },
        {
          text: 'Cerrar',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }

  private storageKey(uid: string): string {
    return `uride_seen_notifications_${uid}`;
  }

  private readPersisted(uid: string): { initialized: boolean; seenNotificationIds: Record<string, true> } | null {
    try {
      const raw = localStorage.getItem(this.storageKey(uid));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        initialized: Boolean(parsed.initialized),
        seenNotificationIds: (parsed.seenNotificationIds ?? {}) as Record<string, true>,
      };
    } catch {
      return null;
    }
  }

  private persist(uid: string): void {
    try {
      localStorage.setItem(
        this.storageKey(uid),
        JSON.stringify({
          initialized: this.initialized,
          seenNotificationIds: this.seenNotificationIds,
        }),
      );
    } catch {
      // ignore
    }
  }

  private stopPolling(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = undefined;
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.authSub?.unsubscribe();
    this.authSub = undefined;
    this.running = false;
  }
}
