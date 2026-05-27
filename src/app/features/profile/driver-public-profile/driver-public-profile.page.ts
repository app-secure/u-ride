import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { UserProfile } from '../../../core/models/user-profile.model';

@Component({
  selector: 'app-driver-public-profile',
  templateUrl: './driver-public-profile.page.html',
  styleUrls: ['./driver-public-profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class DriverPublicProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);

  driverUid = '';
  tripId: string | null = null;
  profile: UserProfile | null = null;
  loading = true;
  currentUid: string | null = null;

  constructor() {
    this.driverUid = this.route.snapshot.paramMap.get('driverUid') ?? '';
    this.tripId = this.route.snapshot.queryParamMap.get('tripId');

    this.auth.user$.subscribe(user => {
      this.currentUid = user?.uid ?? null;
    });

    this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    if (!this.driverUid) {
      this.loading = false;
      return;
    }
    try {
      this.profile = await firstValueFrom(this.users.getProfile(this.driverUid));
    } catch {
      this.profile = null;
    } finally {
      this.loading = false;
    }
  }

  get ratingAvg(): number {
    if (!this.profile) return 0;
    if (this.profile.averageRating) return this.profile.averageRating;
    const sum = this.profile.ratingSum ?? 0;
    const count = this.profile.ratingCount ?? 0;
    return count ? sum / count : 0;
  }

  get ratingStars(): number[] {
    const avg = Math.round(this.ratingAvg);
    return Array.from({ length: 5 }, (_, i) => i < avg ? 1 : 0);
  }

  reportDriver(): void {
    const params: any = {};
    if (this.tripId) params['tripId'] = this.tripId;
    this.router.navigate(['/app/report', this.driverUid], { queryParams: params });
  }

  goBack(): void {
    this.location.back();
  }
}
