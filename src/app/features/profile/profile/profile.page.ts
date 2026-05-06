import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import type { UserProfile } from '../../../core/models/user-profile.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);
  private readonly toastCtrl = inject(ToastController);
  private readonly location = inject(Location);

  uid: string | null = null;
  profile: UserProfile | null = null;
  email: string | null = null;
  isEditing = false;

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    career: ['', [Validators.required, Validators.minLength(2)]],
    zone: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
  });

  saving = false;
  uploadingPhoto = false;

  get ratingAvg(): number {
    if (this.profile?.averageRating) return this.profile.averageRating;
    const sum = this.profile?.ratingSum ?? 0;
    const count = this.profile?.ratingCount ?? 0;
    if (!count) return 0;
    return sum / count;
  }

  constructor() {
    this.auth.user$
      .pipe(
        switchMap(user => {
          if (user) {
            this.email = user.email;
            return this.users.profile$(user.uid);
          }
          return of(undefined);
        }),
        takeUntilDestroyed(),
      )
      .subscribe(profile => {
        if (!profile) return;
        this.uid = profile.uid;
        this.profile = profile;
        this.form.patchValue({
          displayName: profile.displayName ?? '',
          career: profile.career ?? '',
          zone: profile.zone ?? '',
          phone: profile.phone ?? '',
        });
      });
  }

  toggleEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    if (this.profile) {
      this.form.patchValue({
        displayName: this.profile.displayName ?? '',
        career: this.profile.career ?? '',
        zone: this.profile.zone ?? '',
        phone: this.profile.phone ?? '',
      });
    }
    this.isEditing = false;
  }

  async save(): Promise<void> {
    if (!this.uid) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    try {
      const updated = await firstValueFrom(this.users.updateProfile(this.form.getRawValue()));
      this.profile = updated;
      const toast = await this.toastCtrl.create({
        message: 'Perfil actualizado.',
        duration: 1800,
        position: 'top',
        color: 'success',
      });
      await toast.present();
      this.isEditing = false;
    } finally {
      this.saving = false;
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  async onPhotoSelected(ev: Event): Promise<void> {
    if (!this.uid) return;
    const input = ev.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    // Permite volver a seleccionar el mismo archivo
    if (input) input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const toast = await this.toastCtrl.create({
        message: 'Selecciona un archivo de imagen.',
        duration: 2000,
        position: 'top',
        color: 'warning',
      });
      await toast.present();
      return;
    }

    // Limitamos a 5MB.
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      const toast = await this.toastCtrl.create({
        message: 'La imagen debe pesar menos de 5MB.',
        duration: 3500,
        position: 'top',
        color: 'warning',
      });
      await toast.present();
      return;
    }

    this.uploadingPhoto = true;
    try {
      // Subimos a Cloudinary
      const secureUrl = await firstValueFrom(this.users.uploadProfilePicture(file));

      // Guardamos la URL resultante vía API REST
      const updatedProfile = await firstValueFrom(this.users.updateProfile({ photoUrl: secureUrl }));
      if (this.profile) {
        this.profile.photoUrl = updatedProfile.photoUrl;
      }

      const toast = await this.toastCtrl.create({
        message: 'Foto de perfil actualizada.',
        duration: 1800,
        position: 'top',
        color: 'success',
      });
      await toast.present();
    } catch (e: any) {
      const toast = await this.toastCtrl.create({
        message: `No se pudo guardar la foto: ${String(e?.message ?? e)}`,
        duration: 2600,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.uploadingPhoto = false;
    }
  }

  goBack(): void {
    this.location.back();
  }
}
