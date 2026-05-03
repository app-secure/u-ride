import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterLink],
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);

  readonly domain = environment.institutionEmailDomain;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading = false;

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const { email } = this.form.getRawValue();
      const normalized = email.trim().toLowerCase();

      if (this.domain && !normalized.endsWith(`@${this.domain}`)) {
        throw new Error('EMAIL_DOMAIN_NOT_ALLOWED');
      }

      await this.auth.resetPassword(normalized);
      
      const toast = await this.toastCtrl.create({
        message: 'Se ha enviado un enlace de recuperación a tu correo.',
        duration: 3000,
        position: 'top',
        color: 'success',
      });
      await toast.present();
      
      // Navigate back to login after showing success message
      this.router.navigateByUrl('/auth/login');
    } catch (e: any) {
      await this.presentError(e);
    } finally {
      this.loading = false;
    }
  }

  private async presentError(e: any): Promise<void> {
    const raw = String(e?.message ?? e);
    let msg = 'No se pudo enviar el enlace. Revisa tu correo.';
    
    if (raw.includes('EMAIL_DOMAIN_NOT_ALLOWED')) {
      msg = `Usa tu correo institucional @${this.domain}.`;
    } else if (raw.includes('auth/invalid-email')) {
      msg = 'El correo electrónico no es válido.';
    } else if (raw.includes('auth/user-not-found')) {
      msg = 'No existe una cuenta con este correo.';
    }

    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
}
