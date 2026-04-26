import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { AuthService } from '../../../core/auth/auth.service';
import { ReportsService } from '../../../core/services/reports.service';
import { AuditLogService } from '../../../core/services/audit-log.service';

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
  private readonly audit = inject(AuditLogService);
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
      const user = await this.auth.getCurrentUserOrThrow();
      const v = this.form.getRawValue();
      await this.reports.createReport({
        reporterUid: user.uid,
        reportedUid: this.reportedUid,
        tripId: this.tripId ?? undefined,
        reason: v.reason.trim(),
        evidenceUrl: v.evidenceUrl?.trim() || undefined,
      });
      await this.audit.log(user.uid, 'report.create', { 
        reportedUid: this.reportedUid,
        tripId: this.tripId 
      });

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
