import { Injectable } from '@angular/core';

export type AuditEventType =
  | 'auth.register'
  | 'auth.login'
  | 'trip.publish'
  | 'trip.request'
  | 'trip.request.accept'
  | 'trip.request.reject'
  | 'report.create'
  | 'admin.action';

/**
 * STUB: La auditoría ahora es gestionada por el backend (.NET AuditableEntity).
 * Este servicio se mantiene como stub para no romper componentes que lo referencian.
 * Se puede eliminar cuando se limpien todas las referencias.
 */
@Injectable({ providedIn: 'root' })
export class AuditLogService {
  async log(_uid: string, _type: AuditEventType, _payload: Record<string, any>): Promise<void> {
    // No-op: auditoría manejada por el backend
  }
}
