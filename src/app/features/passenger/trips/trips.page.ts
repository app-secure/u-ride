import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { debounceTime, startWith } from 'rxjs/operators';

import { TripsService } from '../../../core/services/trips.service';
import { TripRequestsService } from '../../../core/services/trip-requests.service';
import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { Trip } from '../../../core/models/trip.model';

/** Extensión de Trip que incluye la foto del conductor */
interface TripWithDriverPhoto extends Trip {
  driverPhotoUrl?: string;
}

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
  private readonly tripRequestsSvc = inject(TripRequestsService);
  private readonly usersSvc = inject(UsersService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);

  private readonly pageSize = 25;
  private page = 1;
  private lastQueryKey = '';
  private isFetching = false;

  currentUid: string | null = null;
  /** Mapa de tripId -> estado de solicitud del usuario */
  myRequestsMap: Record<string, { status: string; requestId: string }> = {};

  trips: Trip[] = [];
  loading = true;
  hasMore = true;

  readonly routes$ = this.tripsSvc.tripRoutes$();

  readonly filters = this.fb.nonNullable.group({
    routeName: [''],
    date: [''],
  });

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  constructor() {
    this.auth.user$.subscribe(user => {
      this.currentUid = user?.uid ?? null;
      if (user) {
        this.loadMyRequests();
      }
      this.resetAndLoad();
    });

    this.filters.valueChanges
      .pipe(startWith(this.filters.getRawValue()), debounceTime(250))
      .subscribe(() => {
        this.resetAndLoad();
      });
  }

  private buildQueryKey(): string {
    const v = this.filters.getRawValue();
    const originZone = v.routeName?.trim() ? v.routeName.trim() : '';
    const departureDate = v.date ? v.date : '';
    const uid = this.currentUid ?? '';
    return JSON.stringify({ originZone, departureDate, uid });
  }

  private resetAndLoad(): void {
    const key = this.buildQueryKey();
    if (key === this.lastQueryKey && this.trips.length > 0) return;
    this.lastQueryKey = key;

    this.page = 1;
    this.trips = [];
    this.hasMore = true;
    this.loading = true;
    this.fetchPage({ append: false });
  }

  loadMore(event: any): void {
    if (!this.hasMore || this.isFetching) {
      event?.target?.complete?.();
      return;
    }
    this.page += 1;
    this.fetchPage({ append: true, infiniteEvent: event });
  }

  private fetchPage(opts: { append: boolean; infiniteEvent?: any }): void {
    if (this.isFetching) return;
    this.isFetching = true;

    const v = this.filters.getRawValue();
    const originZone = v.routeName?.trim() ? v.routeName.trim() : undefined;
    const departureDate = v.date ? v.date : undefined;

    this.tripsSvc
      .searchTrips({
        originZone,
        departureDate,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (result) => {
          const uid = this.currentUid;
          const incoming = (result.items ?? []).filter(t => !uid || t.driverUid !== uid);

          if (opts.append) {
            const seen = new Set(this.trips.map(t => t.id));
            const merged = [...this.trips];
            for (const trip of incoming) {
              if (!seen.has(trip.id)) merged.push(trip);
            }
            this.trips = merged;
          } else {
            this.trips = incoming;
          }

          if (typeof (result as any).totalPages === 'number') {
            this.hasMore = this.page < (result as any).totalPages;
          } else {
            this.hasMore = incoming.length === this.pageSize;
          }
        },
        error: () => {
          this.hasMore = false;
        },
        complete: () => {
          this.loading = false;
          this.isFetching = false;
          opts.infiniteEvent?.target?.complete?.();
        },
      });
  }

  /** Enriquecer viajes con las fotos de los conductores */
  private enrichTripsWithDriverPhotos(trips: Trip[]): any {
    if (trips.length === 0) return of([] as TripWithDriverPhoto[]);

    const profileRequests = trips.map(trip =>
      this.usersSvc.profile$(trip.driverUid).pipe(
        map(profile => ({
          ...trip,
          driverPhotoUrl: profile?.photoUrl || undefined
        } as TripWithDriverPhoto)),
        catchError(() => of({ ...trip, driverPhotoUrl: undefined } as TripWithDriverPhoto))
      )
    );

    return forkJoin(profileRequests);
  }

  private loadMyRequests(): void {
    this.tripRequestsSvc.getMyRequests().subscribe(requests => {
      const update: Record<string, { status: string; requestId: string }> = {};
      requests.forEach(r => {
        update[r.tripId] = { status: r.status, requestId: r.id };
      });
      this.myRequestsMap = update;
    });
  }

  doRefresh(event: any): void {
    this.resetAndLoad();
    this.loadMyRequests();
    setTimeout(() => event.target.complete(), 600);
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

  getRequestStatus(tripId: string): string {
    const mapEntry = this.myRequestsMap[tripId];
    // Si hay estado en el mapa y no está cancelado por el pasajero, usarlo
    if (mapEntry && mapEntry.status !== 'cancelled_by_passenger') return mapEntry.status;
    return 'none';
  }

  getRequestStatusLabel(tripId: string): string {
    const status = this.getRequestStatus(tripId);
    switch (status) {
      case 'pending':
        return 'Solicitado';
      case 'accepted':
        return 'Aceptado';
      case 'rejected':
        return 'Rechazado';
      default:
        return '';
    }
  }

  async cancelMySpot(trip: Trip): Promise<void> {
    if (!this.currentUid) return;
    const mapEntry = this.myRequestsMap[trip.id];
    if (!mapEntry?.requestId) return;

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
              await this.tripRequestsSvc.cancelRequest(mapEntry.requestId).toPromise();
              const updated = { ...this.myRequestsMap };
              delete updated[trip.id];
              this.myRequestsMap = updated;
              this.resetAndLoad();
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
