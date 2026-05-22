import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { BehaviorSubject, catchError, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import * as L from 'leaflet';

export type LocationPickerResult = { label: string; lat: number; lng: number };

// ─── Íconos reutilizables (idénticos a trip-detail.page.ts) ─────────────────

function buildDivIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 4px rgba(0,0,0,0.3));">
             <div style="background-color:${color};border:2px solid white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
               <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                 <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
               </svg>
             </div>
             <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-1px;"></div>
           </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
}

const ORIGIN_ICON = buildDivIcon('#10b981');
const DEST_ICON = buildDivIcon('#ef4444');

// ─── Coordenadas de referencia ───────────────────────────────────────────────

/** UTA Campus Huachi — vista por defecto para origen */
const UTA_HUACHI_LAT = -1.2698;
const UTA_HUACHI_LNG = -78.6242;
const UTA_HUACHI_ZOOM = 16;

/** Ambato completo — botón de restablecimiento de vista */
const AMBATO_CENTER_LAT = -1.2491;
const AMBATO_CENTER_LNG = -78.6167;
const AMBATO_ZOOM = 13;

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

  /** Título del modal (ej. "Seleccionar origen") */
  @Input() title = 'Seleccionar ubicación';

  /** Qué tipo de punto se está eligiendo: determina el color del marcador principal */
  @Input() kind: 'origin' | 'destination' = 'origin';

  /** Valor de búsqueda/etiqueta actuales del punto a elegir */
  @Input() initialQuery = '';
  @Input() initialLat: number | null = null;
  @Input() initialLng: number | null = null;

  /** Coordenadas del punto OPUESTO ya seleccionado (para mostrarlo como referencia). */
  @Input() otherLat: number | null = null;
  @Input() otherLng: number | null = null;
  @Input() otherLabel = '';

  /**
   * Centro aproximado de la ruta seleccionada (geocodificado desde el nombre).
   * Se usa como vista inicial del mapa cuando no hay coordenadas previas
   * para el punto que se está eligiendo.
   */
  @Input() routeCenterLat: number | null = null;
  @Input() routeCenterLng: number | null = null;

  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  /** Marcador del punto que se está eligiendo */
  private mainMarker?: L.Marker;
  /** Marcador de referencia del otro extremo (solo visual) */
  private otherMarker?: L.Marker;
  /** Línea que une ambos marcadores */
  private routeLine?: L.Polyline;

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

    setTimeout(() => {
      this.initMap();
      // Solo lanzar búsqueda si hay texto de partida (evita autoselección vacía)
      if (this.queryValue.trim().length >= 2) {
        this.query$.next(this.queryValue);
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  /** Restablece la vista del mapa a la ciudad de Ambato completa */
  resetToAmbatoView(): void {
    if (!this.map) return;
    this.map.setView([AMBATO_CENTER_LAT, AMBATO_CENTER_LNG], AMBATO_ZOOM, { animate: true });
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

  // ─── Init mapa ──────────────────────────────────────────────────────────────

  private initMap(): void {
    if (!this.mapEl?.nativeElement) return;

    // Prioridad del centro inicial:
    // 1. Posición guardada del punto actual
    // 2. Centro de la ruta seleccionada (geocodificado)
    // 3. UTA Huachi si es origen / Centro de Ambato si es destino (fallback inteligente)
    const center: L.LatLngExpression =
      this.initialLat != null && this.initialLng != null
        ? [this.initialLat, this.initialLng]
        : this.routeCenterLat != null && this.routeCenterLng != null
          ? [this.routeCenterLat, this.routeCenterLng]
          : this.kind === 'origin'
            ? [UTA_HUACHI_LAT, UTA_HUACHI_LNG]   // Zoom directo al campus UTA
            : [AMBATO_CENTER_LAT, AMBATO_CENTER_LNG];

    const initialZoom =
      this.initialLat != null ? 16
        : this.routeCenterLat != null ? 14
          : this.kind === 'origin' ? UTA_HUACHI_ZOOM
            : AMBATO_ZOOM;

    this.map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      attributionControl: false,
    }).setView(center, initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    // Marcador del otro extremo (referencia visual, no modificable)
    if (this.otherLat != null && this.otherLng != null) {
      const otherIcon = this.kind === 'origin' ? DEST_ICON : ORIGIN_ICON;
      const otherLabel = this.otherLabel || (this.kind === 'origin' ? 'Destino' : 'Origen');
      this.otherMarker = L.marker([this.otherLat, this.otherLng], { icon: otherIcon })
        .addTo(this.map)
        .bindPopup(otherLabel);
    }

    // Marcador principal ya existente (si venimos de editar)
    if (this.initialLat != null && this.initialLng != null) {
      this.applyPicked(
        this.initialQuery?.trim() ? this.initialQuery.trim() : 'Ubicación seleccionada',
        this.initialLat,
        this.initialLng,
        false, // no hacer pan aún; el fitBounds lo hará si hay dos puntos
        false,
      );
    }

    // Ajustar vista inicial
    this.fitMapView();

    // Click en mapa → seleccionar punto
    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const label = await this.reverseGeocode(lat, lng);
      this.applyPicked(label, lat, lng, false, true);
    });

    setTimeout(() => this.map?.invalidateSize(), 350);
  }

  // ─── Aplicar selección ───────────────────────────────────────────────────────

  private applyPicked(label: string, lat: number, lng: number, pan: boolean, updateQuery: boolean): void {
    this.picked = { label, lat, lng };

    if (updateQuery) {
      this.queryValue = label;
      // No relanzar la query para evitar búsqueda circular
    }

    if (!this.map) return;

    const ll: L.LatLngExpression = [lat, lng];
    const mainIcon = this.kind === 'origin' ? ORIGIN_ICON : DEST_ICON;

    if (this.mainMarker) {
      this.mainMarker.setLatLng(ll);
    } else {
      this.mainMarker = L.marker(ll, { icon: mainIcon })
        .addTo(this.map)
        .bindPopup(this.kind === 'origin' ? 'Origen' : 'Destino');
    }

    this.syncRouteLine();

    if (pan) {
      this.fitMapView();
    } else {
      this.fitMapView();
    }
  }

  /** Actualiza/crea la línea punteada entre ambos marcadores */
  private syncRouteLine(): void {
    if (!this.map) return;

    const hasMain = this.mainMarker != null;
    const hasOther = this.otherMarker != null;

    if (hasMain && hasOther) {
      const pts: L.LatLngExpression[] = [
        this.mainMarker!.getLatLng(),
        this.otherMarker!.getLatLng(),
      ];

      if (this.routeLine) {
        this.routeLine.setLatLngs(pts);
      } else {
        this.routeLine = L.polyline(pts, {
          color: '#6366f1',
          weight: 3,
          dashArray: '8 6',
          opacity: 0.75,
        }).addTo(this.map);
      }
    } else if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = undefined;
    }
  }

  /** Ajusta la vista para mostrar todos los marcadores presentes */
  private fitMapView(): void {
    if (!this.map) return;

    const points: L.LatLng[] = [];

    if (this.mainMarker) points.push(this.mainMarker.getLatLng());
    if (this.otherMarker) points.push(this.otherMarker.getLatLng());

    if (points.length === 2) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    } else if (points.length === 1) {
      this.map.setView(points[0], 16);
    }
    // Si no hay ninguno, se deja la vista por defecto de initMap
  }

  // ─── Geocodificación ─────────────────────────────────────────────────────────

  private async searchPlacesEc(query: string): Promise<Array<LocationPickerResult>> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'es');
    url.searchParams.set('countrycodes', 'ec');
    url.searchParams.set('q', query);

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
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
