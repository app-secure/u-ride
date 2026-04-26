import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { BehaviorSubject, catchError, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import * as L from 'leaflet';

export type LocationPickerResult = { label: string; lat: number; lng: number };

@Component({
  selector: 'app-location-picker-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './location-picker-modal.component.html',
  styleUrls: ['./location-picker-modal.component.scss'],
})
export class LocationPickerModalComponent implements AfterViewInit, OnDestroy {
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  @Input() title = 'Seleccionar ubicación';
  @Input() initialQuery = '';
  @Input() initialLat: number | null = null;
  @Input() initialLng: number | null = null;

  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private marker?: L.Marker;

  queryValue = '';
  picked: LocationPickerResult | null = null;

  private readonly query$ = new BehaviorSubject<string>('');

  constructor() {
    this.query$
      .pipe(
        map(q => q.trim()),
        debounceTime(350),
        distinctUntilChanged(),
        switchMap(q => (q.length < 2 ? of([]) : from(this.searchPlacesEc(q)).pipe(catchError(() => of([]))))),
      )
      .subscribe(hits => {
        const best = hits[0];
        if (!best) return;
        this.applyPicked(best.label, best.lat, best.lng, true, false);
      });
  }

  ngAfterViewInit(): void {
    this.queryValue = String(this.initialQuery ?? '');
    this.query$.next(this.queryValue);

    setTimeout(() => {
      this.initMap();
    }, 0);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm(): Promise<void> {
    if (!this.picked) {
      const toast = await this.toastCtrl.create({
        message: 'Selecciona una ubicación en el mapa.',
        duration: 1800,
        position: 'top',
        color: 'warning',
      });
      await toast.present();
      return;
    }

    await this.modalCtrl.dismiss(this.picked, 'confirm');
  }

  onQueryInput(ev: CustomEvent): void {
    const value = (ev as any)?.detail?.value;
    this.queryValue = String(value ?? '');
    this.query$.next(this.queryValue);
  }

  private initMap(): void {
    if (!this.mapEl?.nativeElement) return;

    const center: L.LatLngExpression =
      this.initialLat != null && this.initialLng != null ? [this.initialLat, this.initialLng] : [-1.249, -78.616];

    this.map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      attributionControl: false,
    }).setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const label = await this.reverseGeocode(lat, lng);
      this.applyPicked(label, lat, lng, false, true);
    });

    if (this.initialLat != null && this.initialLng != null) {
      this.applyPicked(
        this.initialQuery?.trim() ? this.initialQuery.trim() : 'Ubicación seleccionada',
        this.initialLat,
        this.initialLng,
        true,
        false,
      );
    }

    setTimeout(() => this.map?.invalidateSize(), 350);
  }

  private applyPicked(label: string, lat: number, lng: number, pan: boolean, updateQuery: boolean): void {
    this.picked = { label, lat, lng };

    if (updateQuery) {
      this.queryValue = label;
      this.query$.next(label);
    }

    if (!this.map) return;

    const ll: L.LatLngExpression = [lat, lng];

    if (this.marker) {
      this.marker.setLatLng(ll);
    } else {
      this.marker = L.marker(ll).addTo(this.map);
    }

    if (pan) {
      this.map.setView(ll, 16);
    }
  }

  private async searchPlacesEc(query: string): Promise<Array<LocationPickerResult>> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'es');
    url.searchParams.set('countrycodes', 'ec');
    url.searchParams.set('q', query);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as Array<any>;

    return (Array.isArray(data) ? data : [])
      .map(item => ({
        label: String(item?.display_name ?? ''),
        lat: Number(item?.lat),
        lng: Number(item?.lon),
      }))
      .filter(p => p.label && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('accept-language', 'es');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) return 'Ubicación seleccionada';

    const data = (await res.json()) as { display_name?: unknown } | null | undefined;
    const name = data?.display_name;
    return typeof name === 'string' && name.trim() ? name : 'Ubicación seleccionada';
  }
}
