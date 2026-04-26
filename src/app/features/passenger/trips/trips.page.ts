import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { combineLatest, of, forkJoin } from 'rxjs';
import { debounceTime, startWith, switchMap, take, map } from 'rxjs/operators';

import { TripsService } from '../../../core/services/trips.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { Trip } from '../../../core/models/trip.model';

@Component({
  selector: 'app-trips',
  templateUrl: './trips.page.html',
  styleUrls: ['./trips.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class TripsPage {
  private readonly fb = inject(FormBuilder);
  private readonly tripsSvc = inject(TripsService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);

  currentUid: string | null = null;
  /** Mapa de tripId -> estado de solicitud del usuario */
  myRequestsMap: Record<string, string> = {};

  readonly routes$ = this.tripsSvc.tripRoutes$();

  readonly filters = this.fb.nonNullable.group({
    routeName: [''],
    date: [''],
  });

  readonly trips$ = this.filters.valueChanges.pipe(
    startWith(this.filters.getRawValue()),
    debounceTime(250),
    switchMap(v =>
      this.tripsSvc.trips$({
        routeName: v.routeName?.trim() ? v.routeName.trim() : undefined,
        date: v.date ? v.date : undefined,
        onlyOpen: true,
      }),
    ),
  );

  constructor() {
    // Fuente 1: userMyRequests$ en tiempo real (para solicitudes nuevas)
    this.auth.user$.pipe(
      switchMap(user => {
        if (!user) return of([] as { tripId: string; status: string }[]);
        this.currentUid = user.uid;
        return this.tripsSvc.userMyRequests$(user.uid);
      })
    ).subscribe(requests => {
      const update: Record<string, string> = {};
      requests.forEach(r => { update[r.tripId] = r.status; });
      this.myRequestsMap = { ...this.myRequestsMap, ...update };
    });

    // Fuente 2: one-shot por trip al cargar la lista (para solicitudes antiguas)
    combineLatest([this.trips$, this.auth.user$]).pipe(
      switchMap(([trips, user]) => {
        if (!user || trips.length === 0) return of([] as { tripId: string; status: string }[]);
        const uid = user.uid;
        // Solo revisar trips que aún no están en el mapa
        const tripsToCheck = trips.filter(t => !this.myRequestsMap[t.id]);
        if (tripsToCheck.length === 0) return of([] as { tripId: string; status: string }[]);
        const checks = tripsToCheck.map(trip =>
          this.tripsSvc.passengerRequest$(trip.id, uid).pipe(
            take(1),
            map(req => ({ tripId: trip.id, status: req?.status ?? 'none' }))
          )
        );
        return forkJoin(checks);
      })
    ).subscribe(results => {
      const update: Record<string, string> = {};
      results.forEach(r => {
        if (r.status !== 'none') {
          update[r.tripId] = r.status;
          // Si está aceptado y el uid está disponible, asegurar que el doc de usuario exista
          if (r.status === 'accepted' && this.currentUid) {
            this.tripsSvc.syncUserRequestStatusPublic(r.tripId, this.currentUid, 'accepted');
          }
        }
      });
      if (Object.keys(update).length > 0) {
        this.myRequestsMap = { ...this.myRequestsMap, ...update };
      }
    });
  }

  openTrip(trip: Trip): void {
    this.router.navigate(['/app/trips', trip.id]);
  }

  placeMainLabel(full: string | null | undefined): string {
    const s = String(full ?? '').trim();
    if (!s) return '';
    const first = s.split(',')[0]?.trim();
    return first || s;
  }

  isAccepted(trip: Trip): boolean {
    if (!this.currentUid || !trip.confirmedPassengerUids) return false;
    return trip.confirmedPassengerUids.includes(this.currentUid);
  }

  getRequestStatus(trip: Trip): string {
    const mapStatus = this.myRequestsMap[trip.id];
    // Si hay estado en el mapa y no está cancelado por el pasajero, usarlo
    if (mapStatus && mapStatus !== 'cancelled_by_passenger') return mapStatus;
    // Fallback: confirmedPassengerUids
    if (this.isAccepted(trip)) return 'accepted';
    return 'none';
  }

  async cancelMySpot(trip: Trip): Promise<void> {
    if (!this.currentUid) return;

    const alert = await this.alertCtrl.create({
      header: 'Cancelar cupo',
      message: '¿Estás seguro que deseas cancelar tu cupo en este viaje?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.tripsSvc.cancelSpot(trip.id, this.currentUid!);
              const updated = { ...this.myRequestsMap };
              delete updated[trip.id];
              this.myRequestsMap = updated;
              const toast = await this.toastCtrl.create({
                message: 'Has liberado tu cupo exitosamente.',
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              await toast.present();
            } catch (e) {
              const toast = await this.toastCtrl.create({
                message: 'Error al cancelar el cupo.',
                duration: 2000,
                color: 'danger',
                position: 'top'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
