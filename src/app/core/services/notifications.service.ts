import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notifications`;

  /**
   * Obtiene todas las notificaciones del usuario autenticado.
   * GET /api/notifications
   */
  getMyNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.base);
  }

  /**
   * Alias para compatibilidad con componentes que usaban notifications$(uid).
   * Ya no necesita uid — el backend lo extrae del token.
   */
  notifications$(_uid?: string): Observable<AppNotification[]> {
    return this.getMyNotifications();
  }

  /**
   * Obtiene el conteo de notificaciones no leídas.
   * GET /api/notifications/unread-count
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`).pipe(
      map(res => res.count),
    );
  }

  /**
   * Marca una notificación como leída.
   * PATCH /api/notifications/{id}/read
   */
  markAsRead(_uid: string, notificationId: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${notificationId}/read`, {});
  }

  /**
   * Marca todas las notificaciones como leídas (itera una a una).
   * El backend no tiene endpoint batch.
   */
  async markAllAsRead(_uid: string, notifications: AppNotification[]): Promise<void> {
    const unread = notifications.filter(n => !n.read && n.id);
    await Promise.all(
      unread.map(n => this.markAsRead(_uid, n.id!).toPromise()),
    );
  }
}
