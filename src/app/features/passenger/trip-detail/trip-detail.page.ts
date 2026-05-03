import { Component, ElementRef, ViewChild, inject, DestroyRef } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap, firstValueFrom } from 'rxjs';

import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { TripsService } from '../../../core/services/trips.service';
import { TripRequestsService } from '../../../core/services/trip-requests.service';
import { RoleStateService } from '../../../core/services/role-state.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { ReportsService } from '../../../core/services/reports.service';
import type { Trip } from '../../../core/models/trip.model';
import type { UserProfile } from '../../../core/models/user-profile.model';

export type DriverLiveLocation = {
  driverUid: string;
  active: boolean;
  lat?: number;
  lng?: number;
  updatedAt?: string;
};

@Component({
  selector: 'app-trip-detail',
  templateUrl: './trip-detail.page.html',
  styleUrls: ['./trip-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class TripDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);
  private readonly trips = inject(TripsService);
  private readonly tripRequests = inject(TripRequestsService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly roleState = inject(RoleStateService);
  private readonly reviews = inject(ReviewsService);
  private readonly reports = inject(ReportsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly defaultRuleTexts: string[] = ['Puntualidad', 'Respeto y buen trato', 'No compartir datos sensibles'];

  @ViewChild('mapEl') private readonly mapEl?: ElementRef<HTMLElement>;

  private map?: L.Map;
  private originMarker?: L.Marker;
  private destinationMarker?: L.Marker;
  private routeLine?: L.Polyline;
  private driverMarker?: L.Marker;

  tripId = '';
  currentUid: string | null = null;
  currentName = '';

  ratedDriver = false;
  reportedDriver = false;

  trip: Trip | null = null;
  driverProfile: UserProfile | null = null;
  isModalOpen = true;

  // Estado de la solicitud del pasajero actual ('none' | 'pending' | 'accepted' | 'rejected' | 'cancelled_by_passenger')
  myRequestStatus: string = 'none';

  // Payment state
  isPaymentModalOpen = false;
  processingPayment = false;

  // Live tracking / compartir trayecto
  sharingTrip = false;
  private watchId: string | null = null;
  private driverLive?: DriverLiveLocation;

  constructor() {
    this.tripId = this.route.snapshot.paramMap.get('tripId') ?? '';

    this.auth.user$
      .pipe(
        switchMap(user => (user ? this.users.profile$(user.uid) : of(undefined))),
        takeUntilDestroyed(),
      )
      .subscribe(profile => {
        if (!profile) return;
        this.currentUid = profile.uid;
        this.currentName = profile.displayName || 'Estudiante';
        this.loadMyRequestStatus();
        this.checkDriverActionStatus();
      });

    // Cargar viaje one-shot
    this.loadTrip();

    // Seguridad: Si el usuario pierde la sesión (logout), cerramos el modal.
    this.auth.user$.pipe(takeUntilDestroyed()).subscribe(user => {
      if (!user) {
        this.isModalOpen = false;
        this.sharingTrip = false;
      }
    });
  }

  ionViewWillEnter(): void {
    this.isModalOpen = true;
    this.checkDriverActionStatus();
  }

  ionViewWillLeave(): void {
    // Cerramos el modal antes de salir para evitar el bug de Ionic
    this.isModalOpen = false;

    // Si el conductor estaba compartiendo, detenemos al salir.
    if (this.isDriver && this.sharingTrip) {
      this.stopSharingTrip().catch(() => {});
    }
  }

  goBack(): void {
    this.isModalOpen = false;
    setTimeout(() => {
      this.location.back();
    }, 150);
  }

  onSheetChanged(): void {
    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  private loadTrip(): void {
    if (!this.tripId) return;
    this.trips.getById(this.tripId).subscribe(trip => {
      this.trip = trip ?? null;
      if (trip) {
        this.users.getProfile(trip.driverUid).subscribe(p => {
          this.driverProfile = p ?? null;
        });
      }
      this.checkDriverActionStatus();
      this.initMapIfReady();
      this.syncTripMarkers();
      this.syncRouteLine();
    });
  }

  private loadMyRequestStatus(): void {
    if (!this.currentUid) return;
    this.tripRequests.getMyRequests().subscribe(requests => {
      const mine = requests.find(r => r.tripId === this.tripId);
      this.myRequestStatus = mine?.status ?? 'none';
    });
  }

  private async checkDriverActionStatus(): Promise<void> {
    if (!this.trip || !this.currentUid || this.isDriver) return;
    
    // Solo verificar si el viaje está finalizado
    if (this.trip.status !== 'completed') return;

    // Check via reviews API
    try {
      const reviews = await firstValueFrom(this.reviews.getByTrip(this.tripId));
      this.ratedDriver = reviews.some(r => r.fromUid === this.currentUid && r.toUid === this.trip!.driverUid);
    } catch {
      this.ratedDriver = false;
    }
    // reportedDriver: no hay endpoint para verificar, dejamos false
    this.reportedDriver = false;
  }

  private initMapIfReady(): void {
    if (this.map) return;
    if (!this.trip) return;
    const el = this.mapEl?.nativeElement;
    if (!el) return;

    this.map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
    }).setView([-0.1807, -78.4678], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    this.syncTripMarkers();
    this.syncRouteLine();

    // Centramos en origen/destino si existen.
    if (this.trip?.originLat != null && this.trip?.originLng != null) {
      const origin: L.LatLngExpression = [this.trip.originLat, this.trip.originLng];
      const destOk = this.trip?.destinationLat != null && this.trip?.destinationLng != null;
      if (destOk) {
        const dest: L.LatLngExpression = [this.trip.destinationLat!, this.trip.destinationLng!];
        const bounds = L.latLngBounds([origin as any, dest as any]);
        this.map.fitBounds(bounds, { padding: [24, 24] });
      } else {
        this.map.setView(origin, 13);
      }
    }

    // Fix de tamaños cuando Ionic termina de pintar.
    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  private syncTripMarkers(): void {
    if (!this.map) return;
    if (!this.trip) return;

    const hasOrigin = this.trip.originLat != null && this.trip.originLng != null;
    const hasDest = this.trip.destinationLat != null && this.trip.destinationLng != null;

    if (hasOrigin) {
      const origin: L.LatLngExpression = [this.trip.originLat!, this.trip.originLng!];
      if (this.originMarker === undefined) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));">
                   <div style="background-color: #10b981; border: 2px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                     <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                       <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                     </svg>
                   </div>
                   <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #10b981; margin-top: -1px;"></div>
                 </div>`,
          iconSize: [32, 40],
          iconAnchor: [16, 40],
        });
        this.originMarker = L.marker(origin, { icon }).addTo(this.map);
        this.originMarker.bindPopup('Origen');
      } else {
        this.originMarker.setLatLng(origin);
      }
    } else if (this.originMarker) {
      this.originMarker.remove();
      this.originMarker = undefined;
    }

    if (hasDest) {
      const dest: L.LatLngExpression = [this.trip.destinationLat!, this.trip.destinationLng!];
      if (this.destinationMarker === undefined) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));">
                   <div style="background-color: #ef4444; border: 2px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                     <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                       <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                     </svg>
                   </div>
                   <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ef4444; margin-top: -1px;"></div>
                 </div>`,
          iconSize: [32, 40],
          iconAnchor: [16, 40],
        });
        this.destinationMarker = L.marker(dest, { icon }).addTo(this.map);
        this.destinationMarker.bindPopup('Destino');
      } else {
        this.destinationMarker.setLatLng(dest);
      }
    } else if (this.destinationMarker) {
      this.destinationMarker.remove();
      this.destinationMarker = undefined;
    }

    // Mantener el marcador del conductor sincronizado si hay datos.
    this.syncDriverMarker();
  }

  private syncDriverMarker(): void {
    if (!this.map) return;

    // Privacidad: sólo el conductor y pasajeros aceptados ven la ubicación.
    if (!this.isDriver && !this.isAcceptedPassenger) {
      if (this.driverMarker) {
        this.driverMarker.remove();
        this.driverMarker = undefined;
      }
      return;
    }

    const live = this.driverLive;
    // Solo mostrar si hay coordenadas y el conductor lo tiene activo.
    if (!live?.active || typeof live.lat !== 'number' || typeof live.lng !== 'number') {
      if (this.driverMarker) {
        this.driverMarker.remove();
        this.driverMarker = undefined;
      }
      return;
    }

    const pos: L.LatLngExpression = [live.lat, live.lng];
    if (this.driverMarker) {
      this.driverMarker.setLatLng(pos);
      return;
    }

      const icon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 4px rgba(0,0,0,0.3));">
                 <div style="background-color:#2563eb;border:2px solid white;border-radius:999px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
                   <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                     <path d="M5 11l1.5-4.5h11L19 11v7h-2v-2H7v2H5v-7zm3.5 1.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm7 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                   </svg>
                 </div>
                 <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #2563eb;margin-top:-1px;"></div>
               </div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
      });
      this.driverMarker = L.marker(pos, { icon }).addTo(this.map);
      this.driverMarker.bindPopup('Conductor');
  }

  private async syncRouteLine(): Promise<void> {
    if (!this.map) return;
    if (!this.trip) return;

    const hasOrigin = this.trip.originLat != null && this.trip.originLng != null;
    const hasDest = this.trip.destinationLat != null && this.trip.destinationLng != null;

    if (hasOrigin && hasDest) {
      const origin: L.LatLngExpression = [this.trip.originLat!, this.trip.originLng!];
      const dest: L.LatLngExpression = [this.trip.destinationLat!, this.trip.destinationLng!];

      // Primero dibujamos una línea recta temporal mientras cargamos la ruta real
      if (this.routeLine === undefined) {
        this.routeLine = L.polyline([origin as any, dest as any], {
          color: 'var(--ion-color-medium)',
          weight: 4,
          opacity: 0.5,
          dashArray: '5, 10'
        }).addTo(this.map);
      }

      try {
        // OSRM espera coordenadas en formato: lng,lat
        const url = `https://router.project-osrm.org/route/v1/driving/${this.trip.originLng},${this.trip.originLat};${this.trip.destinationLng},${this.trip.destinationLat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const coordinates = data.routes[0].geometry.coordinates;
            // OSRM devuelve [lng, lat], Leaflet usa [lat, lng]
            const latLngs: L.LatLngExpression[] = coordinates.map((c: [number, number]) => [c[1], c[0]]);
            
            // Actualizamos la línea con la ruta real e inteligente
            this.routeLine.setLatLngs(latLngs);
            this.routeLine.setStyle({
              color: 'var(--ion-color-primary)',
              weight: 6,
              opacity: 0.9,
              dashArray: ''
            });

            // Ajustar el zoom para que se vea toda la ruta
            this.map.fitBounds(this.routeLine.getBounds(), { padding: [24, 24] });
            return;
          }
        }
      } catch (error) {
        console.error('Error al obtener la ruta inteligente de OSRM:', error);
      }
      
      // Fallback a línea recta si la API falla
      this.routeLine.setLatLngs([origin as any, dest as any]);
      this.routeLine.setStyle({
        color: 'var(--ion-color-primary)',
        weight: 6,
        opacity: 0.9,
        dashArray: ''
      });
      return;
    }

    if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = undefined;
    }
  }

  get isDriver(): boolean {
    const isOwner = !!this.trip && !!this.currentUid && this.trip.driverUid === this.currentUid;
    const currentRole = this.roleState.currentRole;
    // Si el usuario es el creador pero está en modo pasajero, lo tratamos como pasajero.
    return isOwner && currentRole === 'driver';
  }

  get isAcceptedPassenger(): boolean {
    if (!this.trip || !this.currentUid) return false;
    return Array.isArray(this.trip.confirmedPassengerUids) && this.trip.confirmedPassengerUids.includes(this.currentUid);
  }

  get canFinalize(): boolean {
    return !!this.trip && this.isDriver && this.trip.status !== 'completed' && this.trip.status !== 'cancelled';
  }

  get canShareTrip(): boolean {
    return !!this.trip && this.isDriver && this.trip.status === 'open';
  }

  async toggleSharingTrip(): Promise<void> {
    if (!this.tripId || !this.currentUid) return;
    if (!this.canShareTrip) return;

    if (this.sharingTrip) {
      await this.stopSharingTrip();
    } else {
      await this.startSharingTrip();
    }
  }

  private async startSharingTrip(): Promise<void> {
    if (!this.currentUid) return;

    if (Capacitor.isNativePlatform()) {
      const perm = await Geolocation.requestPermissions();
      const ok = perm.location === 'granted' || perm.coarseLocation === 'granted';
      if (!ok) {
        const toast = await this.toastCtrl.create({
          message: 'Permiso de ubicación denegado. No se puede compartir el trayecto.',
          duration: 2500,
          position: 'top',
          color: 'warning',
        });
        await toast.present();
        return;
      }
    }

    this.sharingTrip = true;
    // STUB: setDriverLiveActive no tiene endpoint backend aún
    // await this.trips.setDriverLiveActive(this.tripId, this.currentUid, true);

    // Empezar a enviar la ubicación en segundo plano mientras el driver esté en esta pantalla.
    this.watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 8000 },
      async position => {
        if (!position?.coords) return;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        try {
          // STUB: setDriverLiveLocation no tiene endpoint backend aún
          // await this.trips.setDriverLiveLocation(this.tripId, { driverUid: this.currentUid!, lat, lng, active: true });
        } catch {
          // No bloquear el UI por errores intermitentes de red.
        }
      },
    );

    const toast = await this.toastCtrl.create({
      message: 'Trayecto compartido. Los pasajeros aceptados verán tu ubicación.',
      duration: 2200,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  }

  private async stopSharingTrip(): Promise<void> {
    if (this.watchId) {
      try {
        await Geolocation.clearWatch({ id: this.watchId });
      } catch {
        // ignore
      }
      this.watchId = null;
    }

    this.sharingTrip = false;
    if (this.currentUid) {
      // STUB: setDriverLiveActive no tiene endpoint backend aún
      // await this.trips.setDriverLiveActive(this.tripId, this.currentUid, false);
    }

    const toast = await this.toastCtrl.create({
      message: 'Dejaste de compartir el trayecto.',
      duration: 2000,
      position: 'top',
      color: 'medium',
    });
    await toast.present();
  }

  get driverRating(): number {
    if (!this.driverProfile || !this.driverProfile.ratingCount) return 0;
    return this.driverProfile.ratingSum! / this.driverProfile.ratingCount;
  }

  get canRateDriver(): boolean {
    if (!this.trip || !this.currentUid) return false;
    if (this.isDriver) return false;
    if (this.trip.status !== 'completed') return false;
    return this.trip.confirmedPassengerUids?.includes(this.currentUid);
  }

  async openPaymentModal(): Promise<void> {
    if (!this.trip || !this.currentUid) return;
    if (this.isDriver) return;

    const rules = (Array.isArray(this.trip.ruleTexts) && this.trip.ruleTexts.length > 0)
      ? this.trip.ruleTexts
      : this.defaultRuleTexts;
    const rulesMsg = rules.map(r => `• ${r}`).join('\n\n');

    const alert = await this.alertCtrl.create({
      header: 'Reglas mínimas de seguridad',
      message: rulesMsg,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Aceptar y continuar', 
          role: 'confirm',
          handler: () => {
            this.isPaymentModalOpen = true;
          }
        },
      ],
    });
    await alert.present();
  }

  closePaymentModal(): void {
    this.isPaymentModalOpen = false;
  }

  async confirmPaymentAndRequest(): Promise<void> {
    if (!this.trip || !this.currentUid) return;
    this.processingPayment = true;
    
    // Simular el tiempo de procesamiento del pago
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      await firstValueFrom(this.tripRequests.createRequest(this.tripId));
      
      this.closePaymentModal();
      
      const toast = await this.toastCtrl.create({
        message: 'Pago exitoso y solicitud enviada al conductor/a.',
        duration: 2500,
        position: 'top',
        color: 'success',
      });
      await toast.present();
    } catch (e: any) {
      const toast = await this.toastCtrl.create({
        message: 'Hubo un error al procesar el pago o la solicitud.',
        duration: 2500,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.processingPayment = false;
    }
  }

  openRequests(): void {
    if (!this.tripId) return;
    this.isModalOpen = false; // Cerramos el modal inferior para que no interrumpa
    setTimeout(() => {
      this.router.navigate(['/app/requests', this.tripId]);
    }, 250);
  }

  async completeTrip(): Promise<void> {
    if (!this.tripId || !this.trip) return;
    if (!this.isDriver) return;

    const alert = await this.alertCtrl.create({
      header: 'Finalizar viaje',
      message: 'Esto habilita las calificaciones y reseñas del viaje. ¿Confirmas finalizar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Finalizar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;

    await this.trips.completeTrip(this.tripId);
    const toast = await this.toastCtrl.create({
      message: 'Viaje finalizado. Ya pueden calificar.',
      duration: 2200,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  }

  async cancelTrip(): Promise<void> {
    if (!this.tripId || !this.trip) return;
    if (!this.isDriver) return;

    const alert = await this.alertCtrl.create({
      header: 'Cancelar Viaje',
      message: '¿Estás seguro de que deseas cancelar este viaje? Los pasajeros serán notificados.',
      buttons: [
        { text: 'No', role: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          role: 'destructive',
          handler: async () => {
            try {
              await firstValueFrom(this.trips.updateTripStatus(this.tripId, 'cancelled'));
              const toast = await this.toastCtrl.create({
                message: 'Viaje cancelado correctamente.',
                duration: 2500,
                color: 'success',
                position: 'top'
              });
              await toast.present();
              this.router.navigate(['/app/my-trips']);
            } catch (e: any) {
              const toast = await this.toastCtrl.create({
                message: 'Error al cancelar el viaje.',
                duration: 2500,
                color: 'danger',
                position: 'top'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  rateDriver(): void {
    if (!this.trip) return;
    const tId = this.trip.id;
    const dUid = this.trip.driverUid;

    this.isModalOpen = false;
    setTimeout(() => {
      this.router.navigate(['/app/rate', tId, dUid]);
    }, 150);
  }

  reportDriver(): void {
    if (!this.trip) return;
    const tId = this.trip.id;
    const dUid = this.trip.driverUid;

    this.isModalOpen = false;
    setTimeout(() => {
      this.router.navigate(['/app/report', dUid], { 
        queryParams: { tripId: tId } 
      });
    }, 150);
  }
}
