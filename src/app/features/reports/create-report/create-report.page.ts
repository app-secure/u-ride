import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ReportsService } from '../../../core/services/reports.service';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  readonly reportedUid = this.route.snapshot.paramMap.get('reportedUid') ?? '';
  readonly tripId = this.route.snapshot.queryParamMap.get('tripId');

  readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(10)]],
    evidenceUrl: [''],
  });

  saving = false;

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    try {
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

      if (this.tripId) {
        await this.router.navigate(['/app/trips', this.tripId]);
      } else {
        await this.router.navigateByUrl('/app/trips');
      }
    } finally {
      this.saving = false;
    }
  }
}
