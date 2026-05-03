import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { TripsService, TripRouteDoc } from '../../../core/services/trips.service';

@Component({
  selector: 'app-admin-routes',
  templateUrl: './routes.page.html',
  styleUrls: ['./routes.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, RouterLinkActive],
})
export class AdminRoutesPage {
  private readonly authSvc = inject(AuthService);
  private readonly trips = inject(TripsService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly user$ = this.authSvc.user$;

  readonly routes$: Observable<TripRouteDoc[]> = this.refresh$.pipe(
    switchMap(() => this.trips.tripRoutesDocs$()),
    map(items => items.sort((a, b) => a.name.localeCompare(b.name))),
  );

  async logout(): Promise<void> {
    await this.authSvc.logout();
  }

  async createRoute(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Nueva ruta',
      inputs: [{ name: 'name', type: 'text', placeholder: 'Ej: Izamba - Huachi Chico - Querochaca' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async data => {
            const name = String(data?.name ?? '').trim();
            if (!name) return false;
            await firstValueFrom(this.trips.createTripRoute(name));
            this.refresh$.next();
            await this.toast('Ruta creada.', 'success');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async editRoute(r: TripRouteDoc): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Editar ruta',
      inputs: [{ name: 'name', type: 'text', value: r.name }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async data => {
            const name = String(data?.name ?? '').trim();
            if (!name) return false;
            await firstValueFrom(this.trips.updateTripRoute(r.id, name));
            this.refresh$.next();
            await this.toast('Ruta actualizada.', 'success');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteRoute(r: TripRouteDoc): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar ruta',
      message: `¿Eliminar "${r.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await firstValueFrom(this.trips.deleteTripRoute(r.id));
            this.refresh$.next();
            await this.toast('Ruta eliminada.', 'medium');
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string, color: 'success' | 'medium' | 'warning' | 'danger'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 1800, position: 'top', color });
    await t.present();
  }
}
