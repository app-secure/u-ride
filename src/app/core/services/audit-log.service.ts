import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection } from '@angular/fire/firestore';

import { TimeService } from './time.service';

export type AuditEventType =
  | 'auth.register'
  | 'auth.login'
  | 'trip.publish'
  | 'trip.request'
  | 'trip.request.accept'
  | 'trip.request.reject'
  | 'report.create'
  | 'admin.action';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly firestore = inject(Firestore);

  async log(uid: string, type: AuditEventType, payload: Record<string, any>): Promise<void> {
    const ref = collection(this.firestore, 'events');
    await addDoc(ref, {
      uid,
      type,
      payload,
      createdAt: TimeService.nowIso(),
    });
  }
}
