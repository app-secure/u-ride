import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ReportsService } from '../../../core/services/reports.service';
import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { Report } from '../../../core/models/report.model';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, RouterLinkActive],
})
export class ReportsPage {
  private readonly reportsSvc = inject(ReportsService);
  private readonly users = inject(UsersService);
  private readonly authSvc = inject(AuthService);
  private readonly toastCtrl = inject(ToastController);

  readonly user$ = this.authSvc.user$;
  readonly reports$ = this.reportsSvc.reports$('open');
  busy = false;

  async logout(): Promise<void> {
    await this.authSvc.logout();
  }

  async markWarned(report: Report): Promise<void> {
    this.busy = true;
    try {
      await this.reportsSvc.resolveReport(report.id, {
        status: 'resolved',
        action: 'warned',
        adminNotes: 'Advertencia aplicada.',
      });
      await this.toast('Reporte resuelto: advertencia.', 'success');
    } finally {
      this.busy = false;
    }
  }

  async suspend7d(report: Report): Promise<void> {
    this.busy = true;
    try {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await this.users.updateProfile(report.reportedUid, { suspendedUntil: until });
      await this.reportsSvc.resolveReport(report.id, {
        status: 'resolved',
        action: 'suspended',
        adminNotes: `Suspendido hasta ${until}`,
      });
      await this.toast('Reporte resuelto: suspensión 7 días.', 'warning');
    } finally {
      this.busy = false;
    }
  }

  private async toast(message: string, color: 'success' | 'warning' | 'medium' | 'danger'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2200, position: 'top', color });
    await t.present();
  }
}
