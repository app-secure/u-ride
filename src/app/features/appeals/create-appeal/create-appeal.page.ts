import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { AuthService } from '../../../core/auth/auth.service';
import { AppealService, CreateAppealDto } from '../../../core/services/appeal.service';

@Component({
  selector: 'app-create-appeal',
  templateUrl: './create-appeal.page.html',
  styleUrls: ['./create-appeal.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class CreateAppealPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly appealService = inject(AppealService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toastCtrl = inject(ToastController);

  readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]],
    evidenceUrl: [''],
  });

  saving = false;
  uploading = false;
  evidencePreview: string | null = null;
  selectedFile: File | Blob | null = null;

  goBack(): void {
    this.location.back();
  }

  async takePhoto(): Promise<void> {
    await this.captureImage(CameraSource.Camera);
  }

  async selectFromGallery(): Promise<void> {
    await this.captureImage(CameraSource.Photos);
  }

  private async captureImage(source: CameraSource): Promise<void> {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: source
      });

      if (image.webPath) {
        this.evidencePreview = image.webPath;
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.selectedFile = blob;
      }
    } catch (e) {
      console.log('User cancelled or error taking photo:', e);
    }
  }

  clearEvidence(): void {
    this.evidencePreview = null;
    this.selectedFile = null;
    this.form.patchValue({ evidenceUrl: '' });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    try {
      let uploadedUrl = this.form.getRawValue().evidenceUrl;

      // Usamos el servicio de apelaciones para subir la evidencia a Cloudinary en la carpeta apelaciones
      if (this.selectedFile) {
        this.uploading = true;
        try {
          const res = await firstValueFrom(this.appealService.uploadEvidence(this.selectedFile));
          uploadedUrl = res.evidenceUrl;
          this.form.patchValue({ evidenceUrl: uploadedUrl });
        } catch (err: any) {
          const t = await this.toastCtrl.create({
            message: 'Error al subir la evidencia.',
            duration: 2500,
            color: 'danger'
          });
          await t.present();
          this.saving = false;
          this.uploading = false;
          return;
        }
        this.uploading = false;
      }

      const v = this.form.getRawValue();
      const dto: CreateAppealDto = {
        reason: v.reason.trim(),
        evidenceUrl: v.evidenceUrl?.trim() || undefined,
      };

      await firstValueFrom(this.appealService.createAppeal(dto));

      const toast = await this.toastCtrl.create({
        message: 'Apelación enviada correctamente. Será revisada por un administrador.',
        duration: 2600,
        position: 'top',
        color: 'success',
      });
      await toast.present();

      this.location.back();
    } catch (err: any) {
      const msg = err.error?.message || 'Ocurrió un error al enviar la apelación. Intenta de nuevo.';
      const toast = await this.toastCtrl.create({
        message: msg,
        duration: 3000,
        position: 'top',
        color: 'danger',
      });
      await toast.present();

      // Si ya tiene una apelación pendiente o no está bloqueado, devolvemos al usuario
      if (err.status === 400) {
        this.location.back();
      }
    } finally {
      this.saving = false;
    }
  }
}
