import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, type ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);

  readonly domain = environment.institutionEmailDomain;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    password2: ['', [Validators.required, Validators.minLength(6)]],
    career: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    zone: ['', [Validators.required, Validators.minLength(2)]],
  });

  loading = false;
  showPassword = false;
  showPassword2 = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  togglePassword2(): void {
    this.showPassword2 = !this.showPassword2;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, password, password2, career, phone, zone } = this.form.getRawValue();

    const domainError = this.institutionEmailError(email);
    if (domainError) {
      await this.presentToast(`Usa tu correo institucional @${this.domain}.`, 'danger', 2400);
      return;
    }

    if (password !== password2) {
      await this.presentToast('Las contraseñas no coinciden.', 'danger', 2400);
      return;
    }

    this.loading = true;
    let ok = false;
    try {
      await this.auth.register({
        email,
        password,
        firstName,
        lastName,
        career,
        phone,
        zone,
      });
      ok = true;
    } catch (e: any) {
      const msg = this.mapRegisterErrorMessage(e);
      await this.presentToast(msg, 'danger', 2600);
    } finally {
      this.loading = false;
    }

    if (ok) {
      // Espera un frame para que el ion-loading se cierre antes de navegar.
      if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
        await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
      }
      await this.router.navigateByUrl('/auth/verify-email');
    }
  }

  private institutionEmailError(email: string): ValidationErrors | null {
    const domain = this.domain?.trim().toLowerCase();
    if (!domain) return null;
    const value = String(email ?? '').trim().toLowerCase();
    if (!value) return null;
    return value.endsWith(`@${domain}`) ? null : { institutionEmail: true };
  }

  private mapRegisterErrorMessage(e: unknown): string {
    const raw = String((e as any)?.message ?? e ?? '');
    const low = raw.toLowerCase();

    if (raw.includes('EMAIL_DOMAIN_NOT_ALLOWED')) {
      return `Usa tu correo institucional @${this.domain}.`;
    }
    if (raw.includes('auth/email-already-in-use')) {
      return 'Ese correo ya está registrado.';
    }
    if (raw.includes('auth/weak-password')) {
      return 'La contraseña es muy débil. Usa al menos 6 caracteres.';
    }
    if (raw.includes('auth/invalid-email')) {
      return 'Correo inválido.';
    }
    if (low.includes('permission') || low.includes('insufficient')) {
      return 'La cuenta se pudo crear, pero no se pudo sincronizar el perfil con el servidor. Verifica la conexión.';
    }
    return 'No se pudo crear la cuenta.';
  }

  private async presentToast(
    message: string,
    color: 'danger' | 'warning' | 'success',
    duration: number,
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position: 'top',
      color,
    });
    await toast.present();
  }

  goToLogin(): void {
    this.loading = false;
    this.router.navigateByUrl('/auth/login');
  }
}
