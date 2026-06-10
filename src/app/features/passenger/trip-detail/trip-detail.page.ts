import { Component, ElementRef, ViewChild, inject, DestroyRef } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { IonicModule, AlertController, ToastController, ModalController, ActionSheetController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { Browser } from '@capacitor/browser';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { TripsService } from '../../../core/services/trips.service';
import { TripRequestsService } from '../../../core/services/trip-requests.service';
import { PayPalPaymentsService } from '../../../core/services/paypal-payments.service';
import { RoleStateService } from '../../../core/services/role-state.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { ReportsService } from '../../../core/services/reports.service';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';
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
  private readonly payPal = inject(PayPalPaymentsService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly roleState = inject(RoleStateService);
  private readonly reviews = inject(ReviewsService);
  private readonly reports = inject(ReportsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly defaultRuleTexts: string[] = ['Puntualidad', 'Respeto y buen trato', 'No compartir datos sensibles'];

  @ViewChild('mapEl') private readonly mapEl?: ElementRef<HTMLElement>;
  @ViewChild('tripModal') private readonly tripModal?: any;

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
  myRequestId: string | null = null;
  myPaymentStatus: string = 'pending'; // 'pending' | 'paid' | 'refunded'

  isCompletingTrip = false;
  isCancellingTrip = false;

  userProfile: UserProfile | null = null;
  get isSuspended(): boolean {
    if (!this.userProfile?.suspendedUntil) return false;
    return new Date(this.userProfile.suspendedUntil) > new Date();
  }

  // Live tracking / compartir trayecto
  sharingTrip = false;
  private watchId: string | null = null;
  private driverLive?: DriverLiveLocation;
  private locationPollTimer?: any;

  constructor() {
    this.tripId = this.route.snapshot.paramMap.get('tripId') ?? '';

    this.users.myProfile$
      .pipe(takeUntilDestroyed())
      .subscribe(profile => {
        if (!profile) return;
        this.userProfile = profile;
        this.currentUid = profile.uid;
        this.currentName = profile.displayName || 'Estudiante';
        this.loadMyRequestStatus();
        this.checkDriverActionStatus();
      });

    this.router.events
      .pipe(
        filter((event): event is NavigationStart => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.closeAllModals();
      });

    // Cargar viaje one-shot
    this.loadTrip();

    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe(params => {
      if (params['openPayment'] === 'true') {
        setTimeout(() => {
          if (!this.isDriver && this.myRequestStatus === 'accepted' && this.myPaymentStatus !== 'paid') {
            this.openPaymentModal();
          }
        }, 800);
      }
    });

    // Seguridad: Si el usuario pierde la sesión (logout), cerramos el modal y navegamos de vuelta.
    this.auth.user$.pipe(takeUntilDestroyed()).subscribe(user => {
      if (!user) {
        this.isModalOpen = false;
        this.sharingTrip = false;

        // Dismiss todos los modales abiertos de forma explícita
        this.modalCtrl.dismiss(null, 'logout').catch(() => { });

        // Navega de vuelta al login
        setTimeout(() => {
          this.router.navigate(['/auth/login']).catch(() => { });
        }, 150);
      }
    });
  }

  ionViewWillEnter(): void {
    this.users.refreshMyProfile();
    this.isModalOpen = true;
    this.checkDriverActionStatus();
    this.startPollingLocation();

    // Retorno PayPal (vía redirect)
    const paypal = this.route.snapshot.queryParamMap.get('paypal');
    const tripRequestId = this.route.snapshot.queryParamMap.get('tripRequestId');
    if (paypal === 'success') {
      // Si estamos dentro de un popup, notificamos a la ventana padre y cerramos.
      if (!Capacitor.isNativePlatform()) {
        try {
          window.opener?.postMessage({ type: 'paypal', status: 'success', tripRequestId }, window.location.origin);
        } catch {}
        try {
          window.close();
          return;
        } catch {}
      }
      this.loadMyRequestStatus();
      void this.toastCtrl.create({
        message: '✓ Pago completado con PayPal.',
        duration: 3200,
        position: 'top',
        color: 'success',
      }).then(t => t.present());
      // Limpia query params para evitar repetir el toast
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true }).catch(() => {});
    } else if (paypal === 'cancel') {
      if (!Capacitor.isNativePlatform()) {
        try {
          window.opener?.postMessage({ type: 'paypal', status: 'cancel', tripRequestId }, window.location.origin);
        } catch {}
        try {
          window.close();
          return;
        } catch {}
      }
      void this.toastCtrl.create({
        message: 'Pago cancelado. Puedes intentarlo de nuevo.',
        duration: 3200,
        position: 'top',
        color: 'warning',
      }).then(t => t.present());
      // Limpia query params
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true }).catch(() => {});
    } else if (paypal === 'error') {
      if (!Capacitor.isNativePlatform()) {
        try {
          window.opener?.postMessage({ type: 'paypal', status: 'error', tripRequestId }, window.location.origin);
        } catch {}
        try {
          window.close();
          return;
        } catch {}
      }
      void this.toastCtrl
        .create({
          message: 'No se pudo completar el pago con PayPal.',
          duration: 3500,
          position: 'top',
          color: 'danger',
        })
        .then(t => t.present());
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true }).catch(() => {});
    } else if (tripRequestId) {
      // Si viene solo el id (por compat), refrescamos
      this.loadMyRequestStatus();
    }
  }

  ionViewWillLeave(): void {
    // Cerramos el modal antes de salir para evitar el bug de Ionic
    this.closeAllModals();
    this.stopPollingLocation();

    // Si el conductor estaba compartiendo, detenemos al salir.
    if (this.isDriver && this.sharingTrip) {
      this.stopSharingTrip().catch(() => { });
    }
  }

  goBack(): void {
    this.closeAllModals();
    setTimeout(() => {
      this.location.back();
    }, 150);
  }

  private closeAllModals(): void {
    this.isModalOpen = false;

    if (this.tripModal) {
      this.tripModal.dismiss(null, 'route-change').catch(() => { });
    }
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
      this.myRequestId = mine?.id ?? null;
      this.myPaymentStatus = mine?.paymentStatus ?? 'pending';
    });
  }

  private async checkDriverActionStatus(): Promise<void> {
    if (!this.trip || !this.currentUid || this.isDriver) return;

    // Verificar si ya reportó este viaje (aplica para cualquier estado del viaje)
    try {
      this.reportedDriver = await firstValueFrom(this.reports.hasReportedForTrip(this.tripId));
    } catch {
      this.reportedDriver = false;
    }

    // Las verificaciones de calificación solo aplican para viajes completados
    if (this.trip.status !== 'completed') return;

    try {
      const reviews = await firstValueFrom(this.reviews.getByTrip(this.tripId));
      this.ratedDriver = reviews.some(r => r.fromUid === this.currentUid && r.toUid === this.trip!.driverUid);
    } catch {
      this.ratedDriver = false;
    }
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
              color: '#ef4444',
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
    return !!this.trip && this.isDriver && (this.trip.status === 'open' || this.trip.status === 'closed');
  }

  get canCancelTrip(): boolean {
    return !!this.trip && this.isDriver && (this.trip.status === 'open' || this.trip.status === 'closed');
  }

  get hasConfirmedPassengers(): boolean {
    return !!this.trip && Array.isArray(this.trip.confirmedPassengerUids) && this.trip.confirmedPassengerUids.length > 0;
  }

  get canShareTrip(): boolean {
    return !!this.trip && this.isDriver && (this.trip.status === 'open' || this.trip.status === 'closed' || this.trip.status === 'inprogress');
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

    // Empezar a enviar la ubicación en segundo plano mientras el driver esté en esta pantalla.
    this.watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 8000 },
      async position => {
        if (!position?.coords) return;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        // Actualizar UI local para que el conductor vea su propio marcador
        this.driverLive = { driverUid: this.currentUid!, lat, lng, active: true };
        this.syncDriverMarker();

        try {
          await firstValueFrom(this.trips.setDriverLiveLocation(this.tripId, { driverUid: this.currentUid!, lat, lng, active: true }));
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
      try {
        await firstValueFrom(this.trips.setDriverLiveLocation(this.tripId, { driverUid: this.currentUid!, lat: 0, lng: 0, active: false }));
      } catch { }
    }

    const toast = await this.toastCtrl.create({
      message: 'Dejaste de compartir el trayecto.',
      duration: 2000,
      position: 'top',
      color: 'medium',
    });
    await toast.present();
  }

  private startPollingLocation(): void {
    if (this.locationPollTimer) return;
    this.locationPollTimer = setInterval(() => {
      if (!this.tripId || this.isDriver) return;
      if (this.trip?.status !== 'open') return;
      if (!this.isAcceptedPassenger) return;

      this.trips.getDriverLiveLocation(this.tripId).subscribe({
        next: (loc) => {
          if (loc) {
            this.driverLive = loc;
            this.syncDriverMarker();
          }
        },
        error: () => { }
      });
    }, 5000);
  }

  private stopPollingLocation(): void {
    if (this.locationPollTimer) {
      clearInterval(this.locationPollTimer);
      this.locationPollTimer = undefined;
    }
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

  /** PASO 1: El pasajero acepta las reglas y envía la solicitud al conductor (sin pago aún). */
  async requestTrip(): Promise<void> {
    if (!this.trip || !this.currentUid) return;
    if (this.isDriver) return;

    if (this.isSuspended) {
      const toast = await this.toastCtrl.create({
        message: 'Acción denegada. No puedes publicar ni solicitar viajes mientras tu cuenta esté suspendida.',
        duration: 4000,
        color: 'danger',
        position: 'bottom',
        icon: 'warning-outline'
      });
      await toast.present();
      return;
    }

    const rules = (Array.isArray(this.trip.ruleTexts) && this.trip.ruleTexts.length > 0)
      ? this.trip.ruleTexts
      : this.defaultRuleTexts;

    const rulesMsg = rules.map(r => `• ${r}`).join('\n');

    const alert = await this.alertCtrl.create({
      header: 'Reglas mínimas de seguridad',
      message: rulesMsg,
      cssClass: 'compact-rules-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-cancel-btn'
        },
        {
          text: 'Aceptar y solicitar',
          role: 'confirm',
          cssClass: 'alert-confirm-btn',
          handler: () => {
            // Enviar la solicitud directamente, sin pago previo
            this.sendTripRequest();
          }
        },
      ],
    });
    await alert.present();
  }

  private async sendTripRequest(): Promise<void> {
    if (!this.trip || !this.currentUid) return;
    try {
      const req = await firstValueFrom(this.tripRequests.createRequest(this.tripId));
      this.myRequestStatus = 'pending';
      this.myRequestId = req.id;
      this.myPaymentStatus = req.paymentStatus;

      const toast = await this.toastCtrl.create({
        message: '✓ Solicitud enviada. Espera que el conductor la acepte.',
        duration: 3000,
        position: 'top',
        color: 'success',
      });
      await toast.present();
    } catch (e: any) {
      let errorMessage = 'Error al enviar la solicitud. Intenta de nuevo.';
      if (e?.status === 409) {
        errorMessage = 'Ya tienes una solicitud para este viaje.';
      }
      const toast = await this.toastCtrl.create({
        message: errorMessage,
        duration: 3500,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
    }
  }

  async cancelMyRequest(): Promise<void> {
    if (!this.tripId || !this.myRequestId || !this.currentUid) return;

    const alert = await this.alertCtrl.create({
      header: this.myRequestStatus === 'pending' ? 'Cancelar Solicitud' : 'Cancelar Cupo',
      message: this.myRequestStatus === 'pending' 
        ? '¿Deseas cancelar tu solicitud para este viaje?' 
        : '¿Estás seguro de que deseas cancelar tu cupo? El conductor será notificado.',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: async () => {
            try {
              await firstValueFrom(this.tripRequests.cancelRequest(this.myRequestId!));
              this.myRequestStatus = 'none';
              this.myRequestId = null;
              
              const toast = await this.toastCtrl.create({
                message: 'Operación realizada con éxito.',
                duration: 2500,
                color: 'success',
                position: 'bottom'
              });
              await toast.present();
            } catch (error) {
              const toast = await this.toastCtrl.create({
                message: 'Ocurrió un error al cancelar.',
                duration: 2500,
                color: 'danger',
                position: 'bottom'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  /** PASO 2: El conductor aceptó. El pasajero puede pagar ahora. */
  async openPaymentModal(): Promise<void> {
    if (!this.trip || !this.currentUid || this.isDriver || this.myRequestStatus !== 'accepted') return;
    
    const modal = await this.modalCtrl.create({
      component: PaymentModalComponent,
      componentProps: {
        trip: this.trip,
        myRequestStatus: this.myRequestStatus,
        myRequestId: this.myRequestId
      },
      cssClass: 'payment-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.success) {
      this.loadMyRequestStatus();
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
    if (!this.canFinalize || this.isCompletingTrip) return;

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

    this.isCompletingTrip = true;
    try {
      await this.trips.completeTrip(this.tripId);

      // Reflejar estado local inmediatamente para ocultar acciones de viaje abierto.
      this.trip = this.trip ? { ...this.trip, status: 'completed' } : this.trip;

      const toast = await this.toastCtrl.create({
        message: 'Viaje finalizado. Ya pueden calificar.',
        duration: 2200,
        position: 'top',
        color: 'success',
      });
      await toast.present();
    } finally {
      this.isCompletingTrip = false;
    }
  }

  async cancelTrip(): Promise<void> {
    if (!this.tripId || !this.trip) return;
    if (!this.isDriver) return;
    if (!this.canCancelTrip || this.isCancellingTrip) return;

    const alert = await this.alertCtrl.create({
      header: 'Cancelar Viaje',
      message: '¿Estás seguro de que deseas cancelar este viaje? Los pasajeros serán notificados.',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: async () => {
            this.isCancellingTrip = true;
            try {
              await firstValueFrom(this.trips.updateTripStatus(this.tripId, 'cancelled'));

              this.trip = this.trip ? { ...this.trip, status: 'cancelled' } : this.trip;

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
            } finally {
              this.isCancellingTrip = false;
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

  viewDriverProfile(): void {
    if (!this.trip) return;
    const dUid = this.trip.driverUid;
    const tId = this.trip.id;
    this.isModalOpen = false;
    setTimeout(() => {
      this.router.navigate(['/app/driver-profile', dUid], {
        queryParams: { tripId: tId }
      });
    }, 150);
  }

  async reportDriver(): Promise<void> {
    if (!this.trip) return;
    const tId = this.trip.id;
    const dUid = this.trip.driverUid;

    // Verificar si ya envió un reporte para este viaje
    try {
      const yaReporto = await firstValueFrom(this.reports.hasReportedForTrip(tId));
      if (yaReporto) {
        const toast = await this.toastCtrl.create({
          message: 'Ya hemos recibido tu reporte y lo estamos revisando.',
          duration: 3000,
          position: 'top',
          color: 'warning',
        });
        await toast.present();
        this.reportedDriver = true;
        return;
      }
    } catch {
      // Si falla la verificación, dejar pasar al formulario
    }

    this.isModalOpen = false;
    setTimeout(() => {
      this.router.navigate(['/app/report', dUid], {
        queryParams: { tripId: tId }
      });
    }, 150);
  }

  async openDriverMenu(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Opciones del viaje',
      buttons: [
        {
          text: 'Editar viaje',
          icon: 'create-outline',
          handler: () => {
            if (!this.tripId) return;
            this.isModalOpen = false;
            setTimeout(() => {
              this.router.navigate(['/app/publish', this.tripId]);
            }, 250);
          }
        }
      ]
    });
    await sheet.present();
  }

  async deleteTrip(): Promise<void> {
    if (!this.tripId || !this.trip) return;
    const alert = await this.alertCtrl.create({
      header: 'Eliminar viaje',
      message: '¿Seguro que deseas eliminar este viaje? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await firstValueFrom(this.trips.deleteTrip(this.tripId!));
              const toast = await this.toastCtrl.create({
                message: 'Viaje eliminado.',
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              await toast.present();
              this.router.navigate(['/app/my-trips']);
            } catch {
              const toast = await this.toastCtrl.create({
                message: 'Error al eliminar el viaje.',
                duration: 2000,
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
}
