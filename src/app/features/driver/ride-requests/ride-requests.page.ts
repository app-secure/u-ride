import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';

import { TripsService } from '../../../core/services/trips.service';
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
  private readonly reviews = inject(ReviewsService);
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly tripId = this.route.snapshot.paramMap.get('tripId') ?? '';
  readonly requests$ = this.trips.requests$(this.tripId);

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

    this.trips
      .trip$(this.tripId)
      .pipe(takeUntilDestroyed())
      .subscribe(trip => {
        this.trip = trip ?? null;
        if (this.trip) this.checkActionsStatus();
      });

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
      case 'cancelled_by_passenger':
        return 'Cancelado por pasajero';
      default:
        return String(status ?? '').trim() || 'Desconocido';
    }
  }

  ionViewWillEnter(): void {
    this.checkActionsStatus();
  }

  private async checkActionsStatus(): Promise<void> {
    if (!this.tripId || !this.currentUid) return;
    
    // Obtenemos todas las solicitudes actuales de forma síncrona si es posible, 
    // o esperamos a que el observable emita.
    // Para ser más seguros, pedimos las solicitudes una vez al servicio.
    const reqs = await this.trips.getRequestsOnce(this.tripId);
    if (!reqs || reqs.length === 0) return;

    const newRatedMap: Record<string, boolean> = { ...this.ratedMap };
    const newReportedMap: Record<string, boolean> = { ...this.reportedMap };

    let changed = false;

    // Procesamos todos los pasajeros que fueron aceptados
    await Promise.all(
      reqs.map(async req => {
        if (req.status !== 'accepted') return;

        const passengerUid = req.passengerUid;

        // Estado inmediato desde la solicitud (persistente y siempre disponible al cargar la lista)
        const ratedFromRequest = req.driverRated === true;
        const reportedFromRequest = req.driverReported === true;

        if (newRatedMap[passengerUid] !== ratedFromRequest) {
          newRatedMap[passengerUid] = ratedFromRequest;
          changed = true;
        }
        if (newReportedMap[passengerUid] !== reportedFromRequest) {
          newReportedMap[passengerUid] = reportedFromRequest;
          changed = true;
        }

        // Fallback para calificaciones: si por alguna razón el flag no existe, consultamos reviews (permitido por rules).
        if (!ratedFromRequest) {
          try {
            const rated = await this.reviews.hasReviewed(this.tripId, this.currentUid!, passengerUid);
            if (rated && !newRatedMap[passengerUid]) {
              newRatedMap[passengerUid] = true;
              changed = true;
              // Best-effort para persistir y que se vea en próximos refrescos
              await this.trips.markPassengerRated(this.tripId, passengerUid);
            }
          } catch {
            // Ignorar
          }
        }

        // Reportes: por rules, el conductor no puede leer /reports; el estado debe venir del request (driverReported).
      }),
    );

    if (changed) {
      this.ratedMap = newRatedMap;
      this.reportedMap = newReportedMap;
      this.cdr.detectChanges();
    }
  }

  goBack(): void {
    this.location.back();
  }

  trackByReq(_: number, req: TripRequest): string {
    return req.id;
  }

  async accept(req: TripRequest): Promise<void> {
    await this.trips.setRequestStatus(this.tripId, req.passengerUid, 'accepted');
    const toast = await this.toastCtrl.create({
      message: 'Solicitud aceptada.',
      duration: 1800,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  }

  async reject(req: TripRequest): Promise<void> {
    await this.trips.setRequestStatus(this.tripId, req.passengerUid, 'rejected');
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

  async reportPassengerPrompt(passengerUid: string, passengerName: string): Promise<void> {
    if (this.reportedMap[passengerUid]) {
      const toast = await this.toastCtrl.create({
        message: 'Este pasajero ya fue reportado para este viaje.',
        duration: 2000,
        position: 'top',
        color: 'medium',
      });
      await toast.present();
      return;
    }

    if (!this.currentUid) return;

    const alert = await this.alertCtrl.create({
      header: `Reportar a ${passengerName}`,
      message: 'Por favor indica el motivo del reporte (ej. Comportamiento indebido, impuntualidad excesiva).',
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Escribe el motivo aquí...'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Enviar Reporte', 
          role: 'destructive',
          handler: async (data) => {
            if (!data.reason || data.reason.trim().length === 0) {
              const toast = await this.toastCtrl.create({
                message: 'Debes escribir un motivo válido.', duration: 2000, color: 'warning', position: 'top'
              });
              toast.present();
              return false;
            }
            
            try {
              if (!this.currentUid) return false;
              if (this.reportedMap[passengerUid]) return true;
              
              await this.reports.createReport({
                reporterUid: this.currentUid,
                reportedUid: passengerUid,
                tripId: this.tripId,
                reason: data.reason.trim()
              });

              this.reportedMap[passengerUid] = true;
              try {
                await this.trips.markPassengerReported(this.tripId, passengerUid);
              } catch {
                // Best-effort
              }

              const toast = await this.toastCtrl.create({
                message: 'Reporte enviado. Un administrador revisará el caso.', duration: 3000, color: 'success', position: 'top'
              });
              await toast.present();
              return true;
            } catch (e) {
              const msg = (e as any)?.message || '';
              if (msg.toLowerCase().includes('ya reportaste')) {
                this.reportedMap[passengerUid] = true;
                try {
                  await this.trips.markPassengerReported(this.tripId, passengerUid);
                } catch {
                  // Best-effort
                }
                const toast = await this.toastCtrl.create({
                  message: 'Este pasajero ya fue reportado para este viaje.',
                  duration: 2200,
                  color: 'medium',
                  position: 'top',
                });
                await toast.present();
                return true;
              }
              const toast = await this.toastCtrl.create({
                message: 'Error al enviar el reporte.', duration: 3000, color: 'danger', position: 'top'
              });
              await toast.present();
              return false;
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
