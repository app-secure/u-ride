import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import type { UserProfile } from '../../../core/models/user-profile.model';

@Component({
  selector: 'app-admin-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, RouterLinkActive],
})
export class AdminUsersPage {
  private readonly authSvc = inject(AuthService);
  private readonly usersSvc = inject(UsersService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  readonly user$ = this.authSvc.user$;

  readonly users$: Observable<UserProfile[]> = this.usersSvc.users$().pipe(
    map(users =>
      [...(users ?? [])]
        .filter(u => !!u?.uid)
        .sort((a, b) => String(a.displayName ?? '').localeCompare(String(b.displayName ?? ''))),
    ),
  );

  async logout(): Promise<void> {
    await this.authSvc.logout();
  }

  async editUser(u: UserProfile): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Editar usuario',
      inputs: [
        { name: 'displayName', type: 'text', value: u.displayName ?? '', placeholder: 'Nombre' },
        { name: 'career', type: 'text', value: u.career ?? '', placeholder: 'Carrera' },
        { name: 'zone', type: 'text', value: u.zone ?? '', placeholder: 'Zona' },
        { name: 'phone', type: 'text', value: u.phone ?? '', placeholder: 'Teléfono' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async data => {
            await this.usersSvc.updateProfile(u.uid, {
              displayName: String(data?.displayName ?? '').trim(),
              career: String(data?.career ?? '').trim(),
              zone: String(data?.zone ?? '').trim(),
              phone: String(data?.phone ?? '').trim() || undefined,
            });
            await this.toast('Usuario actualizado.', 'success');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async toggleDisabled(u: UserProfile): Promise<void> {
    const next = !u.disabled;
    const alert = await this.alertCtrl.create({
      header: next ? 'Desactivar usuario' : 'Activar usuario',
      message: next
        ? `¿Desactivar a "${u.displayName || u.email || u.uid}"? No podrá ingresar a la app.`
        : `¿Activar a "${u.displayName || u.email || u.uid}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: next ? 'Desactivar' : 'Activar',
          role: next ? 'destructive' : 'confirm',
          handler: async () => {
            await this.usersSvc.updateProfile(u.uid, { disabled: next });
            await this.toast(next ? 'Usuario desactivado.' : 'Usuario activado.', next ? 'warning' : 'success');
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
