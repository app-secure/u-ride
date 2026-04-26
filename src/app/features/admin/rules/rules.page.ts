import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth.service';
import { TripsService } from '../../../core/services/trips.service';

type TripRuleDoc = { id: string; text: string };

@Component({
  selector: 'app-admin-rules',
  templateUrl: './rules.page.html',
  styleUrls: ['./rules.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, RouterLinkActive],
})
export class AdminRulesPage {
  private readonly authSvc = inject(AuthService);
  private readonly trips = inject(TripsService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  readonly user$ = this.authSvc.user$;

  readonly rules$: Observable<TripRuleDoc[]> = this.trips
    .tripRulesDocs$()
    .pipe(map(items => items.sort((a, b) => a.text.localeCompare(b.text))));

  async logout(): Promise<void> {
    await this.authSvc.logout();
  }

  async createRule(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Nueva regla',
      inputs: [{ name: 'text', type: 'text', placeholder: 'Ej: No fumar' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async data => {
            const text = String(data?.text ?? '').trim();
            if (!text) return false;
            await this.trips.createTripRule(text);
            await this.toast('Regla creada.', 'success');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async editRule(r: TripRuleDoc): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Editar regla',
      inputs: [{ name: 'text', type: 'text', value: r.text }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async data => {
            const text = String(data?.text ?? '').trim();
            if (!text) return false;
            await this.trips.updateTripRule(r.id, text);
            await this.toast('Regla actualizada.', 'success');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteRule(r: TripRuleDoc): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar regla',
      message: `¿Eliminar "${r.text}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.trips.deleteTripRule(r.id);
            await this.toast('Regla eliminada.', 'medium');
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
