import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ReportsService } from '../../../core/services/reports.service';
import type { UserProfile } from '../../../core/models/user-profile.model';

@Component({
  selector: 'app-driver-public-profile',
  templateUrl: './driver-public-profile.page.html',
  styleUrls: ['./driver-public-profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class DriverPublicProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly reports = inject(ReportsService);
  private readonly toastCtrl = inject(ToastController);

  driverUid = '';
  tripId: string | null = null;
  profile: UserProfile | null = null;
  loading = true;
  currentUid: string | null = null;
  /** Indica si el usuario ya envió un reporte para este viaje */
  hasReported = false;

  constructor() {
    this.driverUid = this.route.snapshot.paramMap.get('driverUid') ?? '';
    this.tripId = this.route.snapshot.queryParamMap.get('tripId');

    this.auth.user$.subscribe(user => {
      this.currentUid = user?.uid ?? null;
    });

    this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    if (!this.driverUid) {
      this.loading = false;
      return;
    }
    try {
      this.profile = await firstValueFrom(this.users.getProfile(this.driverUid));
    } catch {
      this.profile = null;
    }

    // Verificar si ya reportó este viaje para mantener el estado del botón
    if (this.tripId) {
      try {
        this.hasReported = await firstValueFrom(this.reports.hasReportedForTrip(this.tripId));
      } catch {
        this.hasReported = false;
      }
    }

    this.loading = false;
  }

  get ratingAvg(): number {
    if (!this.profile) return 0;
    if (this.profile.averageRating) return this.profile.averageRating;
    const sum = this.profile.ratingSum ?? 0;
    const count = this.profile.ratingCount ?? 0;
    return count ? sum / count : 0;
  }

  get ratingStars(): number[] {
    const avg = Math.round(this.ratingAvg);
    return Array.from({ length: 5 }, (_, i) => i < avg ? 1 : 0);
  }

  async reportDriver(): Promise<void> {
    // Si ya reportó, mostrar toast y no navegar
    if (this.hasReported) {
      const toast = await this.toastCtrl.create({
        message: 'Ya hemos recibido tu reporte y lo estamos revisando.',
        duration: 3000,
        position: 'top',
        color: 'warning',
      });
      await toast.present();
      return;
    }

    // Verificar en la API si ya reportó (segunda verificación por si el estado local no está sincronizado)
    if (this.tripId) {
      try {
        const yaReporto = await firstValueFrom(this.reports.hasReportedForTrip(this.tripId));
        if (yaReporto) {
          this.hasReported = true;
          const toast = await this.toastCtrl.create({
            message: 'Ya hemos recibido tu reporte y lo estamos revisando.',
            duration: 3000,
            position: 'top',
            color: 'warning',
          });
          await toast.present();
          return;
        }
      } catch {
        // Si falla la verificación, dejar pasar al formulario
      }
    }

    const params: any = {};
    if (this.tripId) params['tripId'] = this.tripId;
    this.router.navigate(['/app/report', this.driverUid], { queryParams: params });
  }

  goBack(): void {
    this.location.back();
  }
}
