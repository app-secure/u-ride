import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

import { RoleStateService } from '../../../core/services/role-state.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-role-selection',
  templateUrl: './role-selection.page.html',
  styleUrls: ['./role-selection.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class RoleSelectionPage {
  private readonly router = inject(Router);
  private readonly roleState = inject(RoleStateService);
  private readonly auth = inject(AuthService);

  goToPassenger(): void {
    this.roleState.setRole('passenger');
    this.router.navigateByUrl('/app/trips');
  }

  goToDriver(): void {
    this.roleState.setRole('driver');
    this.router.navigateByUrl('/app/my-trips');
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.roleState.setRole(null);
    await this.router.navigateByUrl('/auth/login');
  }
}
