import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Subscription, timer, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AuthService } from '../auth/auth.service';
import { RoleStateService } from './role-state.service';
import { TripRequestsService } from './trip-requests.service';
import type { TripRequestStatus, TripRequest } from '../models/trip-request.model';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class TripRequestStatusWatcherService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly roleState = inject(RoleStateService);
  private readonly tripRequests = inject(TripRequestsService);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);

  private running = false;
  private pollingSub?: Subscription;
  private authSub?: Subscription;

  private currentUid: string | null = null;
  private initialized = false;
  private lastStatusByTripId: Record<string, TripRequestStatus> = {};

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
      this.lastStatusByTripId = {};

      if (!uid) return;

      const persisted = this.readPersisted(uid);
      if (persisted) {
        this.lastStatusByTripId = persisted.lastStatusByTripId;
        this.initialized = persisted.initialized;
      }

      this.startPolling(uid);
    });
  }

  private startPolling(uid: string): void {
    this.pollingSub = timer(0, 15000)
      .pipe(
        switchMap(() =>
          this.tripRequests.getMyRequests().pipe(
            catchError(() => of([] as TripRequest[])),
          ),
        ),
      )
      .subscribe((requests) => {
        this.handleSnapshot(uid, requests);
      });
  }

  private handleSnapshot(uid: string, requests: TripRequest[]): void {
    const nextMap: Record<string, TripRequestStatus> = {};
    for (const req of requests) {
      nextMap[req.tripId] = req.status;
    }

    if (!this.initialized) {
      this.lastStatusByTripId = nextMap;
      this.initialized = true;
      this.persist(uid);
      return;
    }

    // Detectar cambios de estado
    for (const req of requests) {
      const prev = this.lastStatusByTripId[req.tripId];
      const curr = req.status;
      if (!prev || prev === curr) continue;

      if (curr === 'accepted') {
        void this.presentToast({
          header: '¡Tu solicitud fue aceptada!',
          message: 'Ya tienes un cupo confirmado en el viaje.',
          tripId: req.tripId,
        });
      } else if (curr === 'rejected') {
        void this.presentToast({
          header: 'Tu solicitud fue rechazada',
          message: 'Puedes buscar otro viaje disponible.',
          tripId: req.tripId,
        });
      }
    }

    this.lastStatusByTripId = nextMap;
    this.persist(uid);
  }

  private async presentToast(opts: { header: string; message: string; tripId?: string }): Promise<void> {
    const toast = await this.toastCtrl.create({
      header: opts.header,
      message: opts.message,
      duration: 4500,
      position: 'top',
      color: 'primary',
      buttons: opts.tripId ? [
        {
          text: 'Ver viaje',
          role: 'info',
          handler: () => {
            if (this.roleState.currentRole !== 'passenger') {
              this.roleState.setRole('passenger');
            }
            void this.router.navigate(['/app/trips', opts.tripId]);
          },
        },
        {
          text: 'Cerrar',
          role: 'cancel',
        },
      ] : [
        {
          text: 'Cerrar',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }

  private storageKey(uid: string): string {
    return `uride_tripreq_status_${uid}`;
  }

  private readPersisted(uid: string): { initialized: boolean; lastStatusByTripId: Record<string, TripRequestStatus> } | null {
    try {
      const raw = localStorage.getItem(this.storageKey(uid));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== 'object') return null;
      const initialized = Boolean(parsed.initialized);
      const lastStatusByTripId = (parsed.lastStatusByTripId ?? {}) as Record<string, TripRequestStatus>;
      return { initialized, lastStatusByTripId };
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
          lastStatusByTripId: this.lastStatusByTripId,
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
