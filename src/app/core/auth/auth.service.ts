import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  Auth,
  authState,
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
  OAuthProvider,
  signInWithPopup,
} from '@angular/fire/auth';
import { Observable, firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UsersService } from '../services/users.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly users = inject(UsersService);
  private readonly injector = inject(EnvironmentInjector);

  readonly user$: Observable<User | null> = runInInjectionContext(this.injector, () => authState(this.auth));

  async register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    career: string;
    phone: string;
    zone: string;
  }): Promise<void> {
    const normalized = payload.email.trim().toLowerCase();
    this.assertInstitutionEmail(normalized);

    const cred = await createUserWithEmailAndPassword(this.auth, normalized, payload.password);
    
    if (cred.user) {
      const displayName = `${payload.firstName.trim()} ${payload.lastName.trim()}`;

      // Establecer displayName en Firebase Auth para que persista en el token
      try {
        await updateProfile(cred.user, { displayName });
      } catch (e) {
        console.warn('[AuthService.register] updateProfile on Firebase failed:', e);
      }

      try {
        // Sincronizar usuario con el backend vía API REST
        await firstValueFrom(
          this.users.syncUserWithDetails(cred.user, {
            displayName,
            career: payload.career.trim(),
            zone: payload.zone.trim(),
            phone: payload.phone.trim(),
          }),
        );
      } catch (e) {
        console.warn('[AuthService.register] syncUser failed:', e);
      }
    }
  }

  async login(email: string, password: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    this.assertInstitutionEmail(normalized);

    const cred = await signInWithEmailAndPassword(this.auth, normalized, password);
    try {
      // Sincronizar usuario con el backend vía API REST
      await firstValueFrom(this.users.syncUser(cred.user));
    } catch (e) {
      console.warn('[AuthService.login] syncUser failed:', e);
      throw new Error('PROFILE_WRITE_FAILED');
    }
  }

  async loginWithMicrosoft(): Promise<'done'> {
    // FLUJO NATIVO (Android / iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseAuthentication.signInWithMicrosoft();
        if (result.user) {
          await firstValueFrom(this.users.syncUser(result.user as any));
          return 'done';
        }
        throw new Error('NATIVE_LOGIN_FAILED');
      } catch (error) {
        console.error('[AuthService] Error nativo:', error);
        throw error;
      }
    }

    // FLUJO WEB (Navegador)
    const provider = this.buildMicrosoftProvider();
    try {
      const cred = await signInWithPopup(this.auth, provider);
      await this.finalizeMicrosoftLogin(cred);
      return 'done';
    } catch (error: any) {
      console.error('[AuthService] Error web:', error);
      throw error;
    }
  }

  async completeMicrosoftRedirectIfNeeded(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    let cred: UserCredential | null = null;
    try {
      cred = await getRedirectResult(this.auth);
    } catch {
      return false;
    }

    if (!cred?.user) return false;
    await this.finalizeMicrosoftLogin(cred);
    return true;
  }

  private buildMicrosoftProvider(): OAuthProvider {
    const provider = new OAuthProvider('microsoft.com');
    const domain = environment.institutionEmailDomain?.trim().toLowerCase();
    if (domain) {
      provider.setCustomParameters({
        tenant: 'common',
        login_hint: `@${domain}`,
      });
    }
    return provider;
  }

  private async finalizeMicrosoftLogin(cred: UserCredential): Promise<void> {
    const domain = environment.institutionEmailDomain?.trim().toLowerCase();

    const email = cred.user.email?.trim().toLowerCase();
    if (email && domain && !email.endsWith(`@${domain}`)) {
      await signOut(this.auth);
      throw new Error('EMAIL_DOMAIN_NOT_ALLOWED');
    }

    try {
      // Sincronizar usuario con el backend vía API REST
      await firstValueFrom(this.users.syncUser(cred.user));
    } catch (e) {
      console.warn('[AuthService.loginWithMicrosoft] syncUser failed:', e);
      throw new Error('PROFILE_WRITE_FAILED');
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigateByUrl('/auth/login');
  }

  async refreshCurrentUser(): Promise<User | null> {
    const current = this.auth.currentUser;
    if (!current) return null;
    await current.reload();
    return this.auth.currentUser;
  }

  async getCurrentUserOrThrow(): Promise<User> {
    const user = this.auth.currentUser ?? (await firstValueFrom(this.user$));
    if (!user) throw new Error('NO_AUTH');
    return user;
  }

  private assertInstitutionEmail(email: string): void {
    const domain = environment.institutionEmailDomain?.trim().toLowerCase();
    if (!domain) return;
    if (!email.endsWith(`@${domain}`)) {
      throw new Error('EMAIL_DOMAIN_NOT_ALLOWED');
    }
  }

  async getUser(): Promise<User | null> {
    return this.auth.currentUser ?? await firstValueFrom(this.user$);
  }
}
