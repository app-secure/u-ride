import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { BehaviorSubject, switchMap, firstValueFrom } from 'rxjs';

import { TripsService } from '../../../core/services/trips.service';
import { TripRequestsService } from '../../../core/services/trip-requests.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { ReportsService } from '../../../core/services/reports.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { TripRequest } from '../../../core/models/trip-request.model';
import type { Trip } from '../../../core/models/trip.model';

@Component({
  selector: 'app-ride-requests',
  templateUrl: './ride-requests.page.html',
  styleUrls: ['./ride-requests.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class RideRequestsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly trips = inject(TripsService);
  private readonly tripRequests = inject(TripRequestsService);
  private readonly reviews = inject(ReviewsService);
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly tripId = this.route.snapshot.paramMap.get('tripId') ?? '';
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly requests$ = this.refresh$.pipe(
    switchMap(() => this.tripRequests.getByTrip(this.tripId)),
  );

  trip: Trip | null = null;
  currentUid: string | null = null;

  // Mapas para ocultar botones
  ratedMap: Record<string, boolean> = {};
  reportedMap: Record<string, boolean> = {};

  constructor() {
    this.auth.user$.pipe(takeUntilDestroyed()).subscribe(user => {
      this.currentUid = user?.uid ?? null;
      if (this.currentUid) this.checkActionsStatus();
    });

    // Cargar viaje one-shot
    if (this.tripId) {
      this.trips.getById(this.tripId)
        .pipe(takeUntilDestroyed())
        .subscribe(trip => {
          this.trip = trip ?? null;
          if (this.trip) this.checkActionsStatus();
        });
    }

    this.requests$.pipe(takeUntilDestroyed()).subscribe(reqs => {
      if (reqs) this.checkActionsStatus();
    });
  }

  tripStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'open':
        return 'Activo';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return String(status ?? '').trim() || 'Desconocido';
    }
  }

  requestStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'none':
        return 'Sin solicitud';
      case 'pending':
        return 'Pendiente';
      case 'accepted':
        return 'Aceptado';
      case 'rejected':
        return 'Rechazado';
      case 'cancelled':
        return 'Cancelado';
      case 'cancelled_by_passenger':
        return 'Cancelado por pasajero';
      default:
        return String(status ?? '').trim() || 'Desconocido';
    }
  }

  paymentStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'pending':
        return 'Pago pendiente';
      case 'refunded':
        return 'Reembolsado';
      default:
        return String(status ?? '').trim() || 'Pago';
    }
  }

  ionViewWillEnter(): void {
    this.refresh$.next();
    this.checkActionsStatus();
  }

  private async checkActionsStatus(): Promise<void> {
    if (!this.tripId || !this.currentUid) return;

    try {
      const reqs = await firstValueFrom(this.tripRequests.getByTrip(this.tripId));
      if (!reqs || reqs.length === 0) return;

      const newRatedMap: Record<string, boolean> = { ...this.ratedMap };
      const newReportedMap: Record<string, boolean> = { ...this.reportedMap };
      let changed = false;

      for (const req of reqs) {
        if (req.status !== 'accepted') continue;
        const passengerUid = req.passengerUid;

        // ── Rated: check desde campo del request o fallback a API ──
        const ratedFromRequest = req.driverRated === true;
        if (newRatedMap[passengerUid] !== ratedFromRequest) {
          newRatedMap[passengerUid] = ratedFromRequest;
          changed = true;
        }

        if (!ratedFromRequest) {
          try {
            const reviews = await firstValueFrom(this.reviews.getByTrip(this.tripId));
            const rated = reviews.some(r => r.fromUid === this.currentUid && r.toUid === passengerUid);
            if (rated && !newRatedMap[passengerUid]) {
              newRatedMap[passengerUid] = true;
              changed = true;
            }
          } catch { /* Ignorar */ }
        }

        // ── Reported: verificar en la API por pasajero específico ──
        if (!newReportedMap[passengerUid]) {
          try {
            const reported = await firstValueFrom(
              this.reports.hasReportedForTrip(this.tripId, passengerUid)
            );
            if (reported !== newReportedMap[passengerUid]) {
              newReportedMap[passengerUid] = reported;
              changed = true;
            }
          } catch { /* Ignorar */ }
        }
      }

      if (changed) {
        this.ratedMap = newRatedMap;
        this.reportedMap = newReportedMap;
        this.cdr.detectChanges();
      }
    } catch {
      // Ignorar errores de carga
    }
  }

  goBack(): void {
    this.location.back();
  }

  trackByReq(_: number, req: TripRequest): string {
    return req.id;
  }

  async accept(req: TripRequest): Promise<void> {
    await firstValueFrom(this.tripRequests.acceptRequest(req.id));
    this.refresh$.next();
    const toast = await this.toastCtrl.create({
      message: 'Solicitud aceptada.',
      duration: 1800,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  }

  async reject(req: TripRequest): Promise<void> {
    await firstValueFrom(this.tripRequests.rejectRequest(req.id));
    this.refresh$.next();
    const toast = await this.toastCtrl.create({
      message: 'Solicitud rechazada.',
      duration: 1800,
      position: 'top',
      color: 'medium',
    });
    await toast.present();
  }

  ratePassenger(passengerUid: string): void {
    if (!this.tripId) return;
    if (this.ratedMap[passengerUid]) return;
    this.router.navigate(['/app/rate', this.tripId, passengerUid]);
  }

  async reportPassengerPrompt(passengerUid: string): Promise<void> {
    if (!this.currentUid || !this.tripId) return;

    // Verificar en la API si ya envió un reporte para este pasajero en este viaje
    try {
      const yaReporto = await firstValueFrom(this.reports.hasReportedForTrip(this.tripId));
      if (yaReporto || this.reportedMap[passengerUid]) {
        const toast = await this.toastCtrl.create({
          message: 'Ya hemos recibido tu reporte y lo estamos revisando.',
          duration: 3000,
          position: 'top',
          color: 'warning',
        });
        await toast.present();
        this.reportedMap = { ...this.reportedMap, [passengerUid]: true };
        return;
      }
    } catch {
      // Si falla la verificación, dejar pasar al formulario
    }

    this.router.navigate(['/app/report', passengerUid], { queryParams: { tripId: this.tripId } });
  }
}
