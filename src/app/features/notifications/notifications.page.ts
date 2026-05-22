import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { RoleStateService } from '../../core/services/role-state.service';
import type { AppNotification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-content [fullscreen]="true" class="ion-padding">
      <div style="width: 100%; max-width: 1200px; margin: 0 auto 16px auto;">
        <ion-button fill="clear" color="medium" (click)="goBack()" style="margin-left: -12px;">
          <ion-icon name="arrow-back" slot="start"></ion-icon>
          Volver
        </ion-button>
      </div>

      <div style="width: 100%; max-width: 1200px; margin: 0 auto;">
        <h2 style="margin: 8px 0 12px 0;">Historial de notificaciones</h2>

        <ng-container *ngIf="notifications$ | async as notifs">
          <div *ngIf="loadError" style="text-align: center; padding: 24px 0; opacity: 0.9;">
            <ion-icon name="alert-circle-outline" style="font-size: 36px;"></ion-icon>
            <p style="margin-top: 8px;">No se pudieron cargar tus notificaciones.</p>
          </div>

          <div *ngIf="notifs.length === 0" style="text-align: center; padding: 24px 0; opacity: 0.8;">
            <ion-icon name="notifications-off-outline" style="font-size: 36px;"></ion-icon>
            <p style="margin-top: 8px;">No tienes notificaciones</p>
          </div>

          <ion-list *ngIf="notifs.length > 0" class="notif-list">
            <ion-item
              *ngFor="let n of notifs"
              button
              detail="true"
              (click)="onNotificationTap(n)"
              [lines]="'full'"
            >
              <ion-icon
                slot="start"
                [name]="n.type === 'trip_completed' ? 'star' : 'checkmark-circle'"
              ></ion-icon>

              <ion-label>
                <h3 style="margin: 0; font-weight: 600;">{{ n.title }}</h3>
                <p style="margin: 4px 0 0 0;">{{ n.message }}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.75;">{{ n.createdAt | date:'short' }}</p>
              </ion-label>

              <ion-badge slot="end" color="primary" *ngIf="!n.read">Nueva</ion-badge>
            </ion-item>
          </ion-list>
        </ng-container>
      </div>
    </ion-content>
  `,
  styles: [
    `:host{display:block;}`,
    `.notif-list{background:transparent;}`,
    `@media (prefers-color-scheme: dark){.notif-list{background:var(--ion-background-color, #0b1220);}}`,
  ],
})
export class NotificationsPage {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationsService);
  private readonly roleState = inject(RoleStateService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  loadError = false;

  readonly notifications$: Observable<AppNotification[]> = this.refresh$.pipe(
    switchMap(() => {
      this.loadError = false;
      return this.notifications.getMyNotifications().pipe(
        catchError((err: any) => {
          this.loadError = true;
          console.error('Error cargando historial de notificaciones:', err);
          return of([]);
        }),
      );
    }),
    startWith([]),
  );

  ionViewWillEnter(): void {
    this.refresh$.next();
  }

  goBack(): void {
    this.location.back();
  }

  async onNotificationTap(notif: AppNotification): Promise<void> {
    const user = await this.auth.getUser();
    if (user && !notif.read && notif.id) {
      await this.notifications.markAsRead(user.uid, notif.id);
      this.refresh$.next();
    }

    if (notif.type === 'trip_completed') {
      await this.router.navigate(['/app/rate', notif.tripId, notif.driverUid]);
      return;
    }

    if (!notif.tripId) return;

    if (this.roleState.currentRole === 'driver') {
      await this.router.navigate(['/app/requests', notif.tripId]);
      return;
    }

    if (this.roleState.currentRole !== 'passenger') {
      this.roleState.setRole('passenger');
    }
    await this.router.navigate(['/app/trips', notif.tripId]);
  }
}
