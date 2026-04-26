import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, setDoc, updateDoc, query, orderBy, limit, writeBatch } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AppNotification } from '../models/notification.model';
import { TimeService } from './time.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private readonly firestore = inject(Firestore);

  notifications$(uid: string): Observable<AppNotification[]> {
    const ref = collection(this.firestore, `users/${uid}/notifications`);
    const q = query(ref, orderBy('createdAt', 'desc'), limit(20));
    return collectionData(q, { idField: 'id' }) as Observable<AppNotification[]>;
  }

  async sendNotification(uid: string, notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>): Promise<void> {
    const ref = collection(this.firestore, `users/${uid}/notifications`);
    const newDoc = doc(ref);
    const data: AppNotification = {
      ...notification,
      read: false,
      createdAt: TimeService.nowIso(),
      id: newDoc.id
    };
    await setDoc(newDoc, data);
  }

  async markAsRead(uid: string, notificationId: string): Promise<void> {
    const ref = doc(this.firestore, `users/${uid}/notifications/${notificationId}`);
    await updateDoc(ref, { read: true });
  }

  async markAllAsRead(uid: string, notifications: AppNotification[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    notifications.forEach(n => {
      if (!n.read && n.id) {
        const ref = doc(this.firestore, `users/${uid}/notifications/${n.id}`);
        batch.update(ref, { read: true });
      }
    });
    await batch.commit();
  }
}
