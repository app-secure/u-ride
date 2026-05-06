import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators, type ValidationErrors } from '@angular/forms';
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

  private readonly securePasswordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S{8,}$/;
  private readonly institutionalEmailPattern = new RegExp(`^[^\\s@]+@${this.domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

  private noNumbersValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const hasNumbers = /\d/.test(control.value);
    return hasNumbers ? { hasNumbers: true } : null;
  }

  private onlyNumbersValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const hasLetters = /[a-zA-Z]/.test(control.value);
    return hasLetters ? { hasLetters: true } : null;
  }

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return this.securePasswordPattern.test(value) ? null : { weakPassword: true };
  }

  private institutionalEmailValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return this.institutionalEmailPattern.test(value) ? null : { institutionalEmail: true };
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = String(group.get('password')?.value ?? '').trim();
    const password2 = String(group.get('password2')?.value ?? '').trim();

    if (!password || !password2) {
      return null;
    }

    return password === password2 ? null : { passwordMismatch: true };
  }

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), (c: AbstractControl) => this.noNumbersValidator(c)]],
    lastName: ['', [Validators.required, Validators.minLength(2), (c: AbstractControl) => this.noNumbersValidator(c)]],
    email: ['', [Validators.required, Validators.email, (c: AbstractControl) => this.institutionalEmailValidator(c)]],
    password: ['', [Validators.required, Validators.minLength(8), (c: AbstractControl) => this.passwordStrengthValidator(c)]],
    password2: ['', [Validators.required, Validators.minLength(8)]],
    career: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/), (c: AbstractControl) => this.onlyNumbersValidator(c)]],
    zone: ['', [Validators.required, Validators.minLength(2)]],
  }, {
    validators: [(group: AbstractControl) => this.passwordsMatchValidator(group)],
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

  onNameKeydown(event: KeyboardEvent): void {
    this.blockInvalidInput(event, /\d/);
  }

  onPhoneKeydown(event: KeyboardEvent): void {
    this.blockInvalidInput(event, /[^\d]/);
  }

  onNamePaste(event: ClipboardEvent): void {
    this.blockInvalidPaste(event, /\d/);
  }

  onPhonePaste(event: ClipboardEvent): void {
    this.blockInvalidPaste(event, /[^\d]/);
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

    if (!this.securePasswordPattern.test(password)) {
      await this.presentToast('La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.', 'danger', 3000);
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

  private blockInvalidInput(event: KeyboardEvent, invalidPattern: RegExp): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    if (invalidPattern.test(event.key)) {
      event.preventDefault();
    }
  }

  private blockInvalidPaste(event: ClipboardEvent, invalidPattern: RegExp): void {
    const pastedText = event.clipboardData?.getData('text') ?? '';
    if (invalidPattern.test(pastedText)) {
      event.preventDefault();
    }
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
      return 'La contraseña es muy débil. Usa al menos 8 caracteres, una mayúscula, un número y un carácter especial.';
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
