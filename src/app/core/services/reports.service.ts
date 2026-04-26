import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';

import type { Report, ReportAction, ReportStatus } from '../models/report.model';
import { TimeService } from './time.service';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  private reportDocId(reporterUid: string, reportedUid: string, tripId?: string): string {
    const safeReporter = String(reporterUid || '').trim();
    const safeReported = String(reportedUid || '').trim();
    const safeTrip = String(tripId || '').trim();
    // Los ids de trips (Firestore auto-id) no contienen '/', así que es seguro concatenar.
    return safeTrip ? `${safeReporter}_${safeReported}_${safeTrip}` : `${safeReporter}_${safeReported}`;
  }

  reports$(status: ReportStatus = 'open'): Observable<Report[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, 'reports');
      const q = query(ref, where('status', '==', status));
      return (collectionData(q, { idField: 'id' }) as Observable<Report[]>).pipe(
        map(reports => [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      );
    });
  }

  async createReport(input: Omit<Report, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const now = TimeService.nowIso();
      // Si está asociado a un viaje, prevenimos duplicados por (reporterUid, reportedUid, tripId)
      if (input.tripId) {
        const reportId = this.reportDocId(input.reporterUid, input.reportedUid, input.tripId);
        const ref = doc(this.firestore, `reports/${reportId}`);

        try {
          // Importante: NO hacemos lecturas previas porque tus rules bloquean read en /reports.
          // Si el doc ya existe, setDoc cuenta como update y el backend lo rechazará.
          await setDoc(ref, {
            ...input,
            status: 'open',
            createdAt: now,
            updatedAt: now,
          } as any);
          return;
        } catch (e: any) {
          const code = String(e?.code || '').toLowerCase();
          const msg = String(e?.message || '').toLowerCase();
          if (code.includes('permission') || msg.includes('insufficient permissions') || msg.includes('permission-denied')) {
            throw new Error('Ya reportaste a este usuario para este viaje.');
          }
          throw e;
        }
      }

      // Sin tripId: mantener comportamiento previo (puede haber múltiples reportes en el tiempo).
      const ref = collection(this.firestore, 'reports');
      await addDoc(ref, {
        ...input,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      } as any);
    });
  }

  async hasReported(reporterUid: string, reportedUid: string, tripId?: string): Promise<boolean> {
    return runInInjectionContext(this.injector, async () => {
      // Tus rules bloquean read en /reports para usuarios no-admin, así que esta función
      // no es confiable desde el cliente "driver". Se deja para contextos con permisos (admin).
      const directId = this.reportDocId(reporterUid, reportedUid, tripId);
      const directRef = doc(this.firestore, `reports/${directId}`);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) return true;

      const ref = collection(this.firestore, 'reports');
      let q = query(ref, where('reporterUid', '==', reporterUid), where('reportedUid', '==', reportedUid));
      if (tripId) q = query(q, where('tripId', '==', tripId));
      const snap = await getDocs(q);
      return !snap.empty;
    });
  }

  async resolveReport(reportId: string, patch: { status: ReportStatus; action: ReportAction; adminNotes?: string }): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const ref = doc(this.firestore, `reports/${reportId}`);
      await updateDoc(ref, {
        ...patch,
        updatedAt: TimeService.nowIso(),
      } as any);
    });
  }
}
