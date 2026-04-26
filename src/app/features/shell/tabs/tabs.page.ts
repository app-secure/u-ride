import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';

import { RoleStateService } from '../../../core/services/role-state.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class TabsPage {
  readonly roleState = inject(RoleStateService);
  readonly role$ = this.roleState.role$;

  private readonly router = inject(Router);

  readonly showTabBar$ = this.router.events.pipe(
    filter(ev => ev instanceof NavigationEnd),
    startWith(null),
    map(() => !this.router.url.startsWith('/app/admin')),
  );
}
