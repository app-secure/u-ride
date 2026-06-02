import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { AuthService } from '../../../core/auth/auth.service';
import { ReportsService } from '../../../core/services/reports.service';
import { Observable } from 'rxjs';
import { UserProfile } from '../../../core/models/user-profile.model';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-create-report',
  templateUrl: './create-report.page.html',
  styleUrls: ['./create-report.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class CreateReportPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly reports = inject(ReportsService);
  private readonly usersService = inject(UsersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toastCtrl = inject(ToastController);

  readonly reportedUid = this.route.snapshot.paramMap.get('reportedUid') ?? '';
  readonly tripId = this.route.snapshot.queryParamMap.get('tripId');
  readonly reportedUser$: Observable<UserProfile | undefined> = this.usersService.profile$(this.reportedUid);

  readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
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

      if (this.selectedFile) {
        this.uploading = true;
        try {
          const res = await firstValueFrom(this.reports.uploadEvidence(this.selectedFile));
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
      await firstValueFrom(this.reports.createReport({
        reportedUid: this.reportedUid,
        tripId: this.tripId ?? undefined,
        reason: v.reason.trim(),
        evidenceUrl: v.evidenceUrl?.trim() || undefined,
      }));

      const toast = await this.toastCtrl.create({
        message: 'Reporte enviado. Gracias por ayudar a mantener la comunidad segura.',
        duration: 2600,
        position: 'top',
        color: 'success',
      });
      await toast.present();

      this.location.back();
    } catch (err: any) {
      // 409 = ya reportó este viaje
      const msg = err?.status === 409
        ? 'Ya hemos recibido tu reporte y lo estamos revisando.'
        : 'Ocurrió un error al enviar el reporte. Intenta de nuevo.';

      const toast = await this.toastCtrl.create({
        message: msg,
        duration: 3000,
        position: 'top',
        color: err?.status === 409 ? 'warning' : 'danger',
      });
      await toast.present();

      if (err?.status === 409) this.location.back();
    } finally {
      this.saving = false;
    }
  }
}
