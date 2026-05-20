import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { forkJoin, of, Subscription, timer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AuthService } from '../auth/auth.service';
import type { Trip } from '../models/trip.model';
import type { TripRequest } from '../models/trip-request.model';
import { TripsService } from './trips.service';
import { TripRequestsService } from './trip-requests.service';
import { RoleStateService } from './role-state.service';

@Injectable({ providedIn: 'root' })
export class DriverTripRequestsWatcherService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly roleState = inject(RoleStateService);
  private readonly trips = inject(TripsService);
  private readonly tripRequests = inject(TripRequestsService);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);

  private running = false;
  private pollingSub?: Subscription;
  private authSub?: Subscription;
  private roleSub?: Subscription;

  private currentUid: string | null = null;
  private currentRole: 'driver' | 'passenger' | null = null;

  private initialized = false;
  private seenRequestIds: Record<string, true> = {};

  start(): void {
    if (this.running) return;
    if (!isPlatformBrowser(this.platformId)) return;

    this.running = true;

    this.authSub = this.auth.user$.subscribe(user => {
      const uid = user?.uid ?? null;
      if (uid === this.currentUid) return;

      this.currentUid = uid;
      this.initialized = false;
      this.seenRequestIds = {};
      this.stopPolling();

      if (uid) {
        const persisted = this.readPersisted(uid);
        if (persisted) {
          this.initialized = persisted.initialized;
          this.seenRequestIds = persisted.seenRequestIds;
        }
      }

      this.updatePollingState();
    });

    this.roleSub = this.roleState.role$.subscribe(role => {
      this.currentRole = role;
      this.updatePollingState();
    });
  }

  private updatePollingState(): void {
    const shouldPoll = Boolean(this.currentUid) && this.currentRole === 'driver';
    if (!shouldPoll) {
      this.stopPolling();
      return;
    }

    if (this.pollingSub) return;

    const uid = this.currentUid!;
    this.pollingSub = timer(0, 15000)
      .pipe(
        switchMap(() =>
          this.trips.getMyTrips().pipe(
            catchError(() => of([] as Trip[])),
          ),
        ),
        switchMap((myTrips) => {
          const activeTrips = (myTrips ?? []).filter(t => t.status === 'open');
          if (activeTrips.length === 0) return of([] as Array<{ trip: Trip; requests: TripRequest[] }>);

          return forkJoin(
            activeTrips.map(trip =>
              this.tripRequests.getByTrip(trip.id).pipe(
                catchError(() => of([] as TripRequest[])),
                switchMap((requests) => of({ trip, requests })),
              ),
            ),
          );
        }),
      )
      .subscribe((items) => {
        this.handleSnapshot(uid, items);
      });
  }

  private handleSnapshot(uid: string, items: Array<{ trip: Trip; requests: TripRequest[] }>): void {
    const nextSeen: Record<string, true> = { ...this.seenRequestIds };

    if (!this.initialized) {
      for (const { requests } of items) {
        for (const r of requests ?? []) {
          if (r?.id) nextSeen[r.id] = true;
        }
      }
      this.seenRequestIds = nextSeen;
      this.initialized = true;
      this.persist(uid);
      return;
    }

    for (const { trip, requests } of items) {
      const pending = (requests ?? []).filter(r => r.status === 'pending');
      const newPending = pending.filter(r => r.id && !this.seenRequestIds[r.id]);

      if (newPending.length > 0) {
        for (const r of newPending) {
          if (r?.id) nextSeen[r.id] = true;
        }

        void this.presentToast({
          tripId: trip.id,
          header: 'Nueva petición de pasajero',
          message: `Tienes ${newPending.length} nueva${newPending.length === 1 ? '' : 's'} solicitud${newPending.length === 1 ? '' : 'es'} en tu viaje.`,
        });
      }

      // También marcar vistas las no-pending para evitar notificar si cambian a pending por errores
      for (const r of requests ?? []) {
        if (r?.id) nextSeen[r.id] = true;
      }
    }

    this.seenRequestIds = nextSeen;
    this.persist(uid);
  }

  private async presentToast(opts: { tripId: string; header: string; message: string }): Promise<void> {
    const toast = await this.toastCtrl.create({
      header: opts.header,
      message: opts.message,
      duration: 4500,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'Ver solicitudes',
          role: 'info',
          handler: () => {
            if (this.roleState.currentRole !== 'driver') {
              this.roleState.setRole('driver');
            }
            void this.router.navigate(['/app/requests', opts.tripId]);
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
    return `uride_driver_seen_req_${uid}`;
  }

  private readPersisted(uid: string): { initialized: boolean; seenRequestIds: Record<string, true> } | null {
    try {
      const raw = localStorage.getItem(this.storageKey(uid));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        initialized: Boolean(parsed.initialized),
        seenRequestIds: (parsed.seenRequestIds ?? {}) as Record<string, true>,
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
          seenRequestIds: this.seenRequestIds,
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
    this.roleSub?.unsubscribe();
    this.authSub = undefined;
    this.roleSub = undefined;
    this.running = false;
  }
}
