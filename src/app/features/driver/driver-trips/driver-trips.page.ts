import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

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
  private readonly tripsSvc = inject(TripsService);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  private _segment: 'active' | 'completed' = 'active';
  private readonly pageSize = 10;
  private nextIndex = 0;

  allTrips: Trip[] = [];
  filteredTrips: Trip[] = [];
  trips: Trip[] = [];
  loading = true;
  hasMore = false;

  get segment(): 'active' | 'completed' {
    return this._segment;
  }

  set segment(val: 'active' | 'completed') {
    this._segment = val;
    this.applyFilterAndReset();
  }

  ionViewWillEnter(): void {
    this.loadTrips();
  }

  doRefresh(event: any): void {
    this.loadTrips().finally(() => event.target.complete());
  }

  loadMore(event: any): void {
    this.loadNextChunk(event);
  }

  private async loadTrips(): Promise<void> {
    this.loading = true;
    try {
      this.allTrips = await firstValueFrom(this.tripsSvc.getMyTrips());
      this.applyFilterAndReset();
    } finally {
      this.loading = false;
    }
  }

  private applyFilterAndReset(): void {
    this.filteredTrips = (this.allTrips ?? []).filter(t =>
      this.segment === 'active'
        ? t.status === 'open'
        : (t.status === 'completed' || t.status === 'cancelled')
    );
    this.trips = [];
    this.nextIndex = 0;
    this.hasMore = this.filteredTrips.length > 0;
    this.loadNextChunk();
  }

  private loadNextChunk(event?: any): void {
    if (!this.hasMore) {
      event?.target?.complete?.();
      return;
    }

    const next = this.filteredTrips.slice(this.nextIndex, this.nextIndex + this.pageSize);
    this.trips = [...this.trips, ...next];
    this.nextIndex += next.length;
    this.hasMore = this.nextIndex < this.filteredTrips.length;
    event?.target?.complete?.();
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
              await this.loadTrips();
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
              await this.loadTrips();
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
              await this.loadTrips();
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
