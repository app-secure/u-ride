import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class AppComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly removeListeners?: () => void;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const tryFocus = (ev: Event) => {
      const path = typeof (ev as any).composedPath === 'function' ? ((ev as any).composedPath() as unknown[]) : [];
      const firstEl = (path.find(p => p instanceof HTMLElement) as HTMLElement | undefined) ??
        (ev.target instanceof HTMLElement ? ev.target : undefined);
      if (!firstEl) return;

      // No interferir con controles que ya manejan click/focus por sí solos.
      const interactive = firstEl.closest(
        'a,button,ion-button,ion-toggle,ion-checkbox,ion-radio,ion-select,ion-datetime,ion-menu-button,ion-back-button,ion-segment-button',
      );
      if (interactive) return;

      const direct = path.find(p => p instanceof HTMLElement && ['ION-INPUT', 'ION-TEXTAREA', 'ION-SEARCHBAR'].includes(p.tagName)) as any;
      const item = (path.find(p => p instanceof HTMLElement && p.tagName === 'ION-ITEM') as HTMLElement | undefined) ??
        firstEl.closest('ion-item');

      const focusEl = direct ?? (item ? (item.querySelector('ion-input, ion-textarea, ion-searchbar') as any) : undefined);
      if (!focusEl || typeof focusEl.setFocus !== 'function') return;

      // Microtask: deja que Ionic procese el gesto primero.
      queueMicrotask(() => {
        try {
          focusEl.setFocus();
        } catch {
          // best-effort
        }
      });
    };

    // En emulación táctil / WebView, a veces no llega un 'click' confiable.
    document.addEventListener('pointerdown', tryFocus, true);
    document.addEventListener('touchstart', tryFocus, true);
    document.addEventListener('click', tryFocus, true);

    this.removeListeners = () => {
      document.removeEventListener('pointerdown', tryFocus, true);
      document.removeEventListener('touchstart', tryFocus, true);
      document.removeEventListener('click', tryFocus, true);
    };
  }

  ngOnDestroy(): void {
    this.removeListeners?.();
  }
}
