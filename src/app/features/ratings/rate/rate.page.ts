import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { Observable, of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import type { Trip } from '../../../core/models/trip.model';
import type { UserProfile } from '../../../core/models/user-profile.model';
import { ReviewsService } from '../../../core/services/reviews.service';
import { TripsService } from '../../../core/services/trips.service';
import { UsersService } from '../../../core/services/users.service';
import type { TripReview } from '../../../core/models/trip-review.model';

@Component({
  selector: 'app-rate',
  templateUrl: './rate.page.html',
  styleUrls: ['./rate.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class RatePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly trips = inject(TripsService);
  private readonly users = inject(UsersService);
  private readonly reviews = inject(ReviewsService);
  private readonly toastCtrl = inject(ToastController);

  readonly tripId = this.route.snapshot.paramMap.get('tripId') ?? '';
  readonly toUid = this.route.snapshot.paramMap.get('toUid') ?? '';

  currentUid: string | null = null;
  trip: Trip | null = null;
  toProfile: UserProfile | null = null;
  otherReviews$: Observable<TripReview[]> = of([]);

  submitting = false;
  blockedReason: string | null = null;

  readonly form = this.fb.nonNullable.group({
    stars: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.maxLength(280)]],
  });

  constructor() {
    this.auth.user$.pipe(takeUntilDestroyed()).subscribe(user => {
      this.currentUid = user?.uid ?? null;
      if (!user) this.router.navigate(['/auth/login']);
      this.computeBlockedReason();
    });

    this.trips
      .trip$(this.tripId)
      .pipe(takeUntilDestroyed())
      .subscribe(trip => {
        this.trip = trip ?? null;
        this.computeBlockedReason();
      });

    this.users
      .profile$(this.toUid)
      .pipe(takeUntilDestroyed())
      .subscribe(profile => {
        this.toProfile = profile ?? null;
      });

    this.otherReviews$ = this.reviews.userReviews$(this.toUid);
  }

  setStars(n: number): void {
    this.form.controls.stars.setValue(n);
  }

  get titleLabel(): string {
    if (!this.trip || !this.currentUid) return 'Calificar';
    if (this.currentUid === this.trip.driverUid) return 'Calificar pasajero/a';
    return 'Calificar conductor/a';
  }

  get targetName(): string {
    return this.toProfile?.displayName || 'Usuario';
  }

  private computeBlockedReason(): void {
    const trip = this.trip;
    const currentUid = this.currentUid;

    if (!this.tripId || !this.toUid) {
      this.blockedReason = 'No se pudo cargar el destino de la calificación.';
      return;
    }

    if (!currentUid) {
      this.blockedReason = 'Debes iniciar sesión.';
      return;
    }

    if (!trip) {
      this.blockedReason = 'Cargando viaje…';
      return;
    }

    if (trip.status !== 'completed') {
      this.blockedReason = 'Solo puedes calificar cuando el viaje esté finalizado.';
      return;
    }

    const isDriver = currentUid === trip.driverUid;
    const isPassenger = trip.confirmedPassengerUids?.includes(currentUid);
    if (!isDriver && !isPassenger) {
      this.blockedReason = 'No perteneces a este viaje.';
      return;
    }

    if (isDriver) {
      const toIsAccepted = trip.confirmedPassengerUids?.includes(this.toUid);
      if (!toIsAccepted) {
        this.blockedReason = 'Solo puedes calificar a pasajeros aceptados.';
        return;
      }
    } else if (this.toUid !== trip.driverUid) {
      this.blockedReason = 'Solo puedes calificar al conductor/a del viaje.';
      return;
    }

    if (currentUid === this.toUid) {
      this.blockedReason = 'No puedes calificarte a ti mismo.';
      return;
    }

    this.blockedReason = null;
  }

  async submit(): Promise<void> {
    this.computeBlockedReason();
    if (this.blockedReason) {
      const toast = await this.toastCtrl.create({
        message: this.blockedReason,
        duration: 2200,
        position: 'top',
        color: 'medium',
      });
      await toast.present();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    try {
      const fromUid = this.currentUid;
      if (!fromUid) throw new Error('NO_AUTH');
      await this.reviews.submitTripReview({
        tripId: this.tripId,
        fromUid,
        toUid: this.toUid,
        stars: this.form.controls.stars.value,
        comment: this.form.controls.comment.value,
      });

      // Si el conductor está calificando a un pasajero, persistimos el estado en la solicitud.
      const isDriver = fromUid === this.trip?.driverUid;
      if (isDriver) {
        try {
          await this.trips.markPassengerRated(this.tripId, this.toUid);
        } catch {
          // Best-effort: no bloquear la navegación si falla el flag.
        }
      }

      const toast = await this.toastCtrl.create({
        message: '¡Gracias! Tu calificación fue enviada.',
        duration: 2200,
        position: 'top',
        color: 'success',
      });
      await toast.present();

      // Redirigir según el rol
      if (isDriver) {
        await this.router.navigate(['/app/requests', this.tripId]);
      } else {
        await this.router.navigate(['/app/trips', this.tripId]);
      }
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err?.message ?? 'No se pudo enviar la calificación.',
        duration: 2400,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.submitting = false;
    }
  }
}
