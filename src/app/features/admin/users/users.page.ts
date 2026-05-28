import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Observable, BehaviorSubject } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import type { UserProfile } from '../../../core/models/user-profile.model';

@Component({
  selector: 'app-admin-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class AdminUsersPage {
  private readonly authSvc = inject(AuthService);
  private readonly usersSvc = inject(UsersService);
  private readonly toastCtrl = inject(ToastController);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly users$: Observable<UserProfile[]> = this.refresh$.pipe(
    switchMap(() => this.usersSvc.getAllUsers(1, 100)),
    map(result =>
      [...result.items]
        .filter(u => !!u?.uid)
        .sort((a, b) => String(a.displayName ?? '').localeCompare(String(b.displayName ?? ''))),
    ),
  );

  // Detail Modal
  detailUser: UserProfile | null = null;
  showDetailModal = false;

  // Edit modal
  editMode = false;
  editForm = { displayName: '', career: '', zone: '', phone: '' };
  saving = false;

  isSuspended(u: UserProfile): boolean {
    if (!u.suspendedUntil) return false;
    return new Date(u.suspendedUntil) > new Date();
  }

  openDetail(u: UserProfile): void {
    this.detailUser = u;
    this.editForm = {
      displayName: u.displayName ?? '',
      career: u.career ?? '',
      zone: u.zone ?? '',
      phone: u.phone ?? '',
    };
    this.editMode = false;
    this.showDetailModal = true;
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.detailUser = null;
    this.editMode = false;
  }

  enableEdit(): void {
    this.editMode = true;
  }

  async saveEdit(): Promise<void> {
    if (!this.detailUser) return;
    this.saving = true;
    try {
      await firstValueFrom(this.usersSvc.adminUpdateUser(this.detailUser.uid, {
        displayName: this.editForm.displayName.trim(),
        career: this.editForm.career.trim(),
        zone: this.editForm.zone.trim(),
        phone: this.editForm.phone.trim() || undefined,
      }));
      this.refresh$.next();
      this.editMode = false;
      await this.toast('Usuario actualizado.', 'success');
    } catch {
      await this.toast('Error al actualizar usuario.', 'danger');
    } finally {
      this.saving = false;
    }
  }

  async toggleDisabled(u: UserProfile): Promise<void> {
    const next = !u.disabled;
    const msg = next
      ? `¿Desactivar a "${u.displayName || u.email}"?`
      : `¿Activar a "${u.displayName || u.email}"?`;
    if (!confirm(msg)) return;
    try {
      await firstValueFrom(this.usersSvc.toggleDisabled(u.uid));
      this.refresh$.next();
      if (this.detailUser?.uid === u.uid) this.closeDetail();
      await this.toast(next ? 'Usuario desactivado.' : 'Usuario activado.', next ? 'warning' : 'success');
    } catch {
      await this.toast('Error al cambiar estado.', 'danger');
    }
  }

  async unsuspend(u: UserProfile): Promise<void> {
    if (!confirm(`¿Levantar la suspensión de "${u.displayName || u.email}"?`)) return;
    try {
      await firstValueFrom(this.usersSvc.unsuspendUser(u.uid));
      this.refresh$.next();
      if (this.detailUser?.uid === u.uid) this.closeDetail();
      await this.toast('Suspensión levantada.', 'success');
    } catch {
      await this.toast('Error al levantar la suspensión.', 'danger');
    }
  }

  private async toast(message: string, color: 'success' | 'medium' | 'warning' | 'danger'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 1800, position: 'top', color });
    await t.present();
  }
}
