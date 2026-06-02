import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { BehaviorSubject, switchMap, map, forkJoin, of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { ReportsService } from '../../../core/services/reports.service';
import { UsersService } from '../../../core/services/users.service';
import type { Report } from '../../../core/models/report.model';
import type { UserProfile } from '../../../core/models/user-profile.model';

export interface ReportWithNames extends Report {
  reporterName?: string;
  reportedName?: string;
  reporterPhoto?: string;
  reportedPhoto?: string;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ReportsPage {
  private readonly reportsSvc = inject(ReportsService);
  private readonly usersSvc = inject(UsersService);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  busy = false;

  // Selected report for evidence modal
  selectedReport: ReportWithNames | null = null;
  showEvidenceModal = false;

  readonly allReports$ = this.refresh$.pipe(
    switchMap(() => this.reportsSvc.getAll(1, 100).pipe(
      switchMap(result => {
        if (!result.items.length) return of([] as ReportWithNames[]);
        // Enrich with user names
        const uids = [...new Set([
          ...result.items.map(r => r.reporterUid),
          ...result.items.map(r => r.reportedUid),
        ])];
        const userCalls = uids.map(uid =>
          this.usersSvc.getProfile(uid).pipe(map(p => ({ uid, profile: p })))
        );
        return forkJoin(userCalls).pipe(
          map(profiles => {
            const profileMap = new Map<string, UserProfile | null>();
            profiles.forEach(({ uid, profile }) => profileMap.set(uid, profile));
            return result.items.map(r => ({
              ...r,
              reporterName: profileMap.get(r.reporterUid)?.displayName ?? r.reporterUid.slice(0, 8) + '...',
              reportedName: profileMap.get(r.reportedUid)?.displayName ?? r.reportedUid.slice(0, 8) + '...',
              reporterPhoto: profileMap.get(r.reporterUid)?.photoUrl,
              reportedPhoto: profileMap.get(r.reportedUid)?.photoUrl,
            } as ReportWithNames));
          })
        );
      })
    ))
  );

  readonly openReports$ = this.allReports$.pipe(
    map(reports => reports.filter(r => r.status === 'open'))
  );

  readonly resolvedReports$ = this.allReports$.pipe(
    map(reports => reports.filter(r => r.status === 'resolved'))
  );

  handleRefresh(event: any): void {
    this.refresh$.next();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  openEvidenceModal(report: ReportWithNames): void {
    this.selectedReport = report;
    this.showEvidenceModal = true;
  }

  closeEvidenceModal(): void {
    this.showEvidenceModal = false;
    this.selectedReport = null;
  }

  getActionLabel(action?: string): string {
    switch (action) {
      case 'warned': return 'Advertido';
      case 'suspended': return 'Suspendido';
      default: return 'Sin acción';
    }
  }

  getActionColor(action?: string): string {
    switch (action) {
      case 'warned': return 'warning';
      case 'suspended': return 'danger';
      default: return 'medium';
    }
  }

  async markWarned(report: Report): Promise<void> {
    this.busy = true;
    try {
      await firstValueFrom(this.reportsSvc.resolveReport(report.id, 'warned', 'Advertencia aplicada.'));
      this.refresh$.next();
      await this.toast('Reporte resuelto: advertencia enviada.', 'success');
    } catch {
      await this.toast('Error al procesar el reporte.', 'danger');
    } finally {
      this.busy = false;
    }
  }

  async suspend7d(report: Report): Promise<void> {
    this.busy = true;
    try {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await firstValueFrom(this.usersSvc.suspendUser(report.reportedUid, until));
      await firstValueFrom(this.reportsSvc.resolveReport(report.id, 'suspended', `Suspendido hasta ${until.toLocaleDateString()}`));
      this.refresh$.next();
      await this.toast('Reporte resuelto: usuario suspendido 7 días.', 'warning');
    } catch {
      await this.toast('Error al suspender usuario.', 'danger');
    } finally {
      this.busy = false;
    }
  }

  private async toast(message: string, color: 'success' | 'warning' | 'medium' | 'danger'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2500, position: 'top', color });
    await t.present();
  }
}
