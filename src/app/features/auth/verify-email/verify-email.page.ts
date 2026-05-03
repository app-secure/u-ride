import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { Auth, sendEmailVerification } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { RoleStateService } from '../../../core/services/role-state.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class VerifyEmailPage {
  private readonly authSvc = inject(AuthService);
  private readonly auth = inject(Auth);
  private readonly users = inject(UsersService);
  private readonly roleState = inject(RoleStateService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  loading = false;

  get email(): string {
    return this.auth.currentUser?.email ?? '';
  }

  async resend(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      await this.router.navigateByUrl('/auth/login');
      return;
    }
    this.loading = true;
    try {
      await sendEmailVerification(user);
      const toast = await this.toastCtrl.create({
        message: 'Enlace reenviado. Revisa tu correo.',
        duration: 2400,
        position: 'top',
        color: 'success',
      });
      await toast.present();
    } finally {
      this.loading = false;
    }
  }

  async iVerified(): Promise<void> {
    this.loading = true;
    try {
      const refreshed = await this.authSvc.refreshCurrentUser();
      if (!refreshed) {
        await this.router.navigateByUrl('/auth/login');
        return;
      }
      if (!refreshed.emailVerified) {
        const toast = await this.toastCtrl.create({
          message: 'Aún no aparece verificado. Intenta de nuevo en unos segundos.',
          duration: 2600,
          position: 'top',
          color: 'warning',
        });
        await toast.present();
        return;
      }

      try {
        // Sincronizar con el backend vía API REST
        await firstValueFrom(this.users.syncUser(refreshed));
        this.roleState.setRole(null);
        await this.router.navigateByUrl('/app/role');
      } catch (e: any) {
        const raw = String(e?.message ?? e);
        const toast = await this.toastCtrl.create({
          message: 'Tu correo está verificado, pero no se pudo sincronizar tu perfil. Intenta de nuevo.',
          duration: 3200,
          position: 'top',
          color: 'warning',
        });
        await toast.present();
      }
    } finally {
      this.loading = false;
    }
  }

  async logout(): Promise<void> {
    await this.authSvc.logout();
  }
}
