import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, startWith } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { TripsService } from '../../../core/services/trips.service';
import type { Trip } from '../../../core/models/trip.model';

@Component({
  selector: 'app-driver-trips',
  templateUrl: './driver-trips.page.html',
  styleUrls: ['./driver-trips.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterLink],
})
export class DriverTripsPage {
  private readonly auth = inject(AuthService);
  private readonly tripsSvc = inject(TripsService);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  private readonly segmentSubject = new BehaviorSubject<'active' | 'completed'>('active');
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  
  get segment(): 'active' | 'completed' {
    return this.segmentSubject.value;
  }
  
  set segment(val: 'active' | 'completed') {
    this.segmentSubject.next(val);
  }

  readonly myTrips$: Observable<Trip[]> = this.refresh$.pipe(
    switchMap(() => this.tripsSvc.getMyTrips()),
  );

  readonly filteredTrips$: Observable<Trip[]> = combineLatest([
    this.myTrips$,
    this.segmentSubject.asObservable()
  ]).pipe(
    map(([trips, segment]) => trips.filter(t => 
      segment === 'active' ? t.status === 'open' : (t.status === 'completed' || t.status === 'cancelled')
    ))
  );

  ionViewWillEnter(): void {
    this.refresh$.next();
  }

  doRefresh(event: any): void {
    this.refresh$.next();
    setTimeout(() => event.target.complete(), 600);
  }

  async cancelTrip(trip: Trip): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar Viaje',
      message: '¿Estás seguro de que deseas cancelar este viaje? Los pasajeros serán notificados.',
      buttons: [
        { text: 'No', role: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          role: 'destructive',
          handler: async () => {
            try {
              await firstValueFrom(this.tripsSvc.updateTripStatus(trip.id, 'cancelled'));
              this.refresh$.next();
              await this.presentToast('Viaje cancelado correctamente.', 'success');
            } catch (e: any) {
              await this.presentToast('Error al cancelar el viaje.', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async finishTrip(trip: Trip): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Finalizar Viaje',
      message: '¿Confirmas que el viaje ha finalizado?',
      buttons: [
        { text: 'No', role: 'cancel' },
        { 
          text: 'Sí, finalizar', 
          handler: async () => {
            try {
              await firstValueFrom(this.tripsSvc.updateTripStatus(trip.id, 'completed'));
              this.refresh$.next();
              await this.presentToast('Viaje finalizado. Ahora puedes calificar/reportar pasajeros.', 'success');
            } catch (e: any) {
              await this.presentToast('Error al finalizar el viaje.', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  goToTripMap(trip: Trip): void {
    this.router.navigate(['/app/trips', trip.id]);
  }

  viewRequests(trip: Trip): void {
    this.router.navigate(['/app/requests', trip.id]);
  }

  editTrip(trip: Trip): void {
    this.router.navigate(['/app/publish', trip.id]);
  }

  async deleteTrip(trip: Trip): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar viaje',
      message: '¿Seguro que deseas eliminar este viaje? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await firstValueFrom(this.tripsSvc.deleteTrip(trip.id));
              this.refresh$.next();
              await this.presentToast('Viaje eliminado.', 'success');
            } catch {
              await this.presentToast('Error al eliminar el viaje.', 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  reportPassengers(trip: Trip): void {
    this.router.navigate(['/app/requests', trip.id]);
  }

  private async presentToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
