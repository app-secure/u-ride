import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { environment } from '../../../../environments/environment';
import { RoleStateService } from '../../../core/services/role-state.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);
  private readonly roleState = inject(RoleStateService);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);

  readonly domain = environment.institutionEmailDomain;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = false;
  showPassword = false;

  async ionViewWillEnter(): Promise<void> {
    // Si venimos de un redirect de Microsoft (Android/iOS), completamos aquí.
    this.loading = true;
    try {
      const handled = await this.auth.completeMicrosoftRedirectIfNeeded();
      if (handled) {
        await this.waitFrame();
        await this.navigateAfterLogin();
      }
    } catch (e: any) {
      await this.presentError(e);
    } finally {
      this.loading = false;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    let ok = false;
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      ok = true;
    } catch (e: any) {
      await this.presentError(e);
    } finally {
      this.loading = false;
    }

    if (ok) {
      await this.waitFrame();
      await this.navigateAfterLogin();
    }
  }

  async loginWithMicrosoft(): Promise<void> {
    this.loading = true;
    let ok = false;
    try {
      const result = await this.auth.loginWithMicrosoft();
      if (result === 'redirect') {
        // En native se abandona la app para autenticarse; no navegamos aquí.
        return;
      }
      ok = true;
    } catch (e: any) {
      // Si el usuario cierra el popup, no mostramos error feo
      if (!String(e).includes('auth/popup-closed-by-user')) {
        await this.presentError(e);
      }
    } finally {
      this.loading = false;
    }

    if (ok) {
      await this.waitFrame();
      await this.navigateAfterLogin();
    }
  }

  goToRegister(): void {
    this.loading = false;
    this.router.navigateByUrl('/auth/register');
  }

  private async presentError(e: any): Promise<void> {
    const raw = String(e?.message ?? e);
    let msg = 'No se pudo iniciar sesión.';
    if (raw.includes('EMAIL_DOMAIN_NOT_ALLOWED')) {
      msg = `Usa tu correo institucional @${this.domain}.`;
    }
    if (raw.includes('PROFILE_WRITE_FAILED')) {
      msg = 'Sesión iniciada, pero Firestore bloquea el perfil (rules/permisos). Revisa las reglas en Firebase Console.';
    }
    if (raw.includes('auth/invalid-credential')) {
      msg = 'Credenciales inválidas.';
    }
    if (raw.includes('auth/too-many-requests')) {
      msg = 'Demasiados intentos. Intenta más tarde.';
    }
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2600,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }

  private async waitFrame(): Promise<void> {
    // Espera un frame para que el ion-loading se cierre antes de navegar.
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
    }
  }

  private async navigateAfterLogin(): Promise<void> {
    try {
      const user = await this.auth.getCurrentUserOrThrow();
      const profile = await firstValueFrom(this.users.profile$(user.uid));

      if (profile?.roles?.admin) {
        await this.router.navigateByUrl('/app/admin/reports');
      } else {
        this.roleState.setRole(null);
        await this.router.navigateByUrl('/app/role');
      }
    } catch {
      this.roleState.setRole(null);
      await this.router.navigateByUrl('/app/role');
    }
  }
}
