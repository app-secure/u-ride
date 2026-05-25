import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { debounceTime, startWith, map, catchError } from 'rxjs/operators';
import { of, forkJoin, firstValueFrom } from 'rxjs';

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
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule],
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

  mainSegment: 'search' | 'recent' = 'search';

  private readonly pageSize = 25;
  private page = 1;
  private lastQueryKey = '';
  private isFetching = false;

  // ─── Historial / viajes recientes como pasajero (mismo diseño que conductor) ───
  private _recentSegment: 'active' | 'completed' = 'active';
  private readonly recentPageSize = 10;
  private recentNextIndex = 0;
  private recentLoaded = false;

  recentAllTrips: Trip[] = [];
  recentFilteredTrips: Trip[] = [];
  recentTrips: Trip[] = [];
  recentLoading = true;
  recentHasMore = false;

  get recentSegment(): 'active' | 'completed' {
    return this._recentSegment;
  }

  set recentSegment(val: 'active' | 'completed') {
    this._recentSegment = val;
    this.applyRecentFilterAndReset();
  }

  currentUid: string | null = null;
  /** Mapa de tripId -> estado de solicitud del usuario */
  myRequestsMap: Record<string, { status: string; requestId: string; paymentStatus: string }> = {};
  /** Mapa de solicitudes para la sección de mis viajes */
  recentRequestsMap: Record<string, { status: string; requestId: string; paymentStatus: string }> = {};

  trips: TripWithDriverPhoto[] = [];
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

  onMainSegmentChanged(): void {
    if (this.mainSegment === 'recent') {
      this.ensureRecentTripsLoaded();
    }
  }

  private ensureRecentTripsLoaded(): void {
    if (this.recentLoaded) return;
    this.recentLoaded = true;
    void this.loadRecentTrips();
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
            this.enrichTripsWithDriverPhotos(merged).subscribe((enriched: TripWithDriverPhoto[]) => {
              this.trips = enriched;
            });
          } else {
            this.enrichTripsWithDriverPhotos(incoming).subscribe((enriched: TripWithDriverPhoto[]) => {
              this.trips = enriched;
            });
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
      const update: Record<string, { status: string; requestId: string; paymentStatus: string }> = {};
      requests.forEach(r => {
        update[r.tripId] = { status: r.status, requestId: r.id, paymentStatus: r.paymentStatus ?? 'pending' };
      });
      this.myRequestsMap = update;
    });
  }

  doRefresh(event: any): void {
    if (this.mainSegment === 'recent') {
      this.loadRecentTrips().finally(() => event.target.complete());
      return;
    }

    // Por defecto, refrescar búsqueda de viajes
    this.lastQueryKey = '';
    this.resetAndLoad();
    this.loadMyRequests();
    setTimeout(() => event.target.complete(), 600);
  }

  // Métodos explícitos de recarga (útiles si luego se reintroduce botón)
  reloadSearchTrips(): void {
    this.lastQueryKey = '';
    this.resetAndLoad();
    this.loadMyRequests();
  }

  reloadRecentTrips(): void {
    this.recentLoaded = true;
    void this.loadRecentTrips();
  }

  loadMoreRecent(event: any): void {
    this.loadNextRecentChunk(event);
  }

  private async loadRecentTrips(): Promise<void> {
    this.recentLoading = true;
    try {
      const requests = await firstValueFrom(this.tripRequestsSvc.getMyRequests());

      // Incluir todas las solicitudes activas (pending + accepted), excluir cancelled_by_passenger
      const activeRequests = (requests ?? [])
        .filter(r => r.status !== 'cancelled_by_passenger')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Guardar el mapa de solicitudes para mostrar estado en cada tarjeta
      this.recentRequestsMap = {};
      activeRequests.forEach(r => {
        this.recentRequestsMap[r.tripId] = {
          status: r.status,
          requestId: r.id,
          paymentStatus: r.paymentStatus ?? 'pending',
        };
      });

      const uniqueTripIds = Array.from(new Set(activeRequests.map(r => r.tripId))).slice(0, 100);
      if (uniqueTripIds.length === 0) {
        this.recentAllTrips = [];
        this.applyRecentFilterAndReset();
        return;
      }

      const trips = await firstValueFrom(
        forkJoin(
          uniqueTripIds.map(id =>
            this.tripsSvc.getById(id).pipe(
              catchError(() => of(null as unknown as Trip | null)),
            ),
          ),
        ),
      );

      this.recentAllTrips = (trips ?? [])
        .filter((t): t is Trip => !!t)
        .sort((a, b) => new Date(b.departureAt).getTime() - new Date(a.departureAt).getTime());

      this.applyRecentFilterAndReset();
    } finally {
      this.recentLoading = false;
    }
  }

  private applyRecentFilterAndReset(): void {
    this.recentFilteredTrips = (this.recentAllTrips ?? []).filter(t => {
      const reqStatus = this.recentRequestsMap[t.id]?.status;

      if (this.recentSegment === 'completed') {
        // Historial: viajes completados O solicitudes rechazadas
        return t.status === 'completed' || reqStatus === 'rejected';
      } else {
        // Solicitudes activas: request pendiente o aceptada, y el viaje no está completado ni rechazado
        return (reqStatus === 'pending' || reqStatus === 'accepted') && t.status !== 'completed';
      }
    });

    this.recentTrips = [];
    this.recentNextIndex = 0;
    this.recentHasMore = this.recentFilteredTrips.length > 0;
    this.loadNextRecentChunk();
  }

  private loadNextRecentChunk(event?: any): void {
    if (!this.recentHasMore) {
      event?.target?.complete?.();
      return;
    }

    const next = this.recentFilteredTrips.slice(this.recentNextIndex, this.recentNextIndex + this.recentPageSize);
    this.recentTrips = [...this.recentTrips, ...next];
    this.recentNextIndex += next.length;
    this.recentHasMore = this.recentNextIndex < this.recentFilteredTrips.length;
    event?.target?.complete?.();
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
    if (mapEntry && mapEntry.status !== 'cancelled_by_passenger') return mapEntry.status;
    return 'none';
  }

  getRecentRequestStatus(tripId: string): string {
    return this.recentRequestsMap[tripId]?.status ?? 'none';
  }

  getRecentPaymentStatus(tripId: string): string {
    return this.recentRequestsMap[tripId]?.paymentStatus ?? 'pending';
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

  /** Cancela una solicitud desde la lista de "Mis Viajes" (pending o accepted) */
  async cancelRecentRequest(trip: Trip): Promise<void> {
    if (!this.currentUid) return;
    const mapEntry = this.recentRequestsMap[trip.id];
    if (!mapEntry?.requestId) return;

    const isPending = mapEntry.status === 'pending';
    const header = isPending ? 'Cancelar solicitud' : 'Cancelar cupo';
    const message = isPending
      ? '¿Deseas cancelar tu solicitud de viaje? El conductor no la recibirá.'
      : '¿Estás seguro que deseas cancelar tu cupo en este viaje?';

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.tripRequestsSvc.cancelRequest(mapEntry.requestId).toPromise();
              // Eliminar del mapa y recargar la lista
              const updated = { ...this.recentRequestsMap };
              delete updated[trip.id];
              this.recentRequestsMap = updated;
              // Recargar la lista de mis viajes
              this.recentLoaded = false;
              void this.loadRecentTrips();
              const toast = await this.toastCtrl.create({
                message: isPending ? 'Solicitud cancelada.' : 'Has liberado tu cupo exitosamente.',
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              await toast.present();
            } catch (e) {
              const toast = await this.toastCtrl.create({
                message: 'Error al cancelar. Intenta de nuevo.',
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
