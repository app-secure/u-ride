import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators, type ValidationErrors, type ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap, firstValueFrom } from 'rxjs';
import { startWith } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { TripsService } from '../../../core/services/trips.service';
import { VehiclesService } from '../../../core/services/vehicles.service';
import type { Trip, TripRuleSet } from '../../../core/models/trip.model';
import type { Vehicle } from '../../../core/models/vehicle.model';
import type { UserProfile } from '../../../core/models/user-profile.model';
import { LocationPickerModalComponent, type LocationPickerResult } from './location-picker-modal.component';

@Component({
  selector: 'app-publish-trip',
  templateUrl: './publish-trip.page.html',
  styleUrls: ['./publish-trip.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterLink],
})
export class PublishTripPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);
  private readonly trips = inject(TripsService);
  private readonly vehiclesService = inject(VehiclesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly location = inject(Location);
  private readonly modalCtrl = inject(ModalController);

  driverUid: string | null = null;
  driverName = '';
  myVehicles: Vehicle[] = [];
  userProfile: UserProfile | null = null;

  get isSuspended(): boolean {
    if (!this.userProfile?.suspendedUntil) return false;
    return new Date(this.userProfile.suspendedUntil) > new Date();
  }

  /** Asientos totales del vehículo seleccionado (capacidad real del vehículo). */
  selectedVehicleSeats: number | null = null;

  readonly editTripId = this.route.snapshot.paramMap.get('tripId');
  tripToEdit: Trip | null = null;

  readonly routeOptions$ = this.trips.tripRoutes$();
  readonly ruleOptions$ = this.trips.tripRules$();
  readonly paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Cualquiera'];

  readonly publishForm = this.fb.nonNullable.group({
    routeName: ['', [Validators.required]],
    originZone: ['', [Validators.required, Validators.minLength(2)]],
    destinationZone: ['', [Validators.required, Validators.minLength(2)]],
    originLat: [null as number | null],
    originLng: [null as number | null],
    destinationLat: [null as number | null],
    destinationLng: [null as number | null],
    date: ['', [Validators.required]],
    time: ['', [Validators.required]],
    seatsTotal: [1, [Validators.required, Validators.min(1), Validators.max(40)]],
    price: ['', Validators.required],
    paymentMethod: ['', Validators.required],
    ruleTexts: [[] as string[]],
    notes: ['', [Validators.maxLength(400)]],
    vehiclePlate: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}-\d{4}$/)]],
    vehicleModel: ['', [Validators.required]],
    vehicleBrand: ['', [Validators.required]],
    vehicleColor: ['', [Validators.required]],
  });

  isSubmitting = false;

  get hasPrice(): boolean {
    return String(this.publishForm.controls.price.value ?? '').trim() !== '';
  }

  constructor() {
    this.publishForm.addValidators(this.departureDateTimeValidator());

    // Aplicar validador de cupos al control seatsTotal (referencia a método de instancia).
    this.publishForm.controls.seatsTotal.addValidators(this.seatsNotExceedVehicleValidator());

    this.users.myProfile$
      .pipe(takeUntilDestroyed())
      .subscribe(async profile => {
        if (!profile) return;
        this.userProfile = profile;
        this.driverUid = profile.uid;
        this.driverName = profile.displayName || 'Conductor/a';
        try {
          this.myVehicles = await firstValueFrom(this.vehiclesService.getVehicles());

          // Si ya se cargó el viaje a editar antes que los vehículos,
          // resolvemos selectedVehicleSeats ahora que tenemos la lista.
          if (this.editTripId && this.tripToEdit) {
            this.resolveSelectedVehicleSeats(this.tripToEdit.vehicle?.plate);
          }
        } catch (e) {
          console.error('Error al cargar vehículos', e);
        }
      });

    if (this.editTripId) {
      this.trips.getById(this.editTripId)
        .pipe(takeUntilDestroyed())
        .subscribe(trip => {
          this.tripToEdit = trip ?? null;
          if (!trip) return;

          const iso = String(trip.departureAt ?? '');
          const date = iso.includes('T') ? iso.split('T')[0] : '';
          const time = iso.includes('T') ? iso.split('T')[1]?.slice(0, 5) : '';

          this.publishForm.patchValue({
            routeName: trip.routeName ?? '',
            originZone: trip.originZone ?? '',
            destinationZone: trip.destinationZone ?? '',
            originLat: trip.originLat ?? null,
            originLng: trip.originLng ?? null,
            destinationLat: trip.destinationLat ?? null,
            destinationLng: trip.destinationLng ?? null,
            date,
            time,
            seatsTotal: trip.seatsTotal ?? 1,
            price: String(trip.price ?? ''),
            paymentMethod: trip.paymentMethod ?? '',
            ruleTexts: Array.isArray(trip.ruleTexts) ? trip.ruleTexts : [],
            notes: trip.notes ?? '',
            vehiclePlate: trip.vehicle?.plate ?? '',
            vehicleModel: trip.vehicle?.model ?? '',
            vehicleBrand: trip.vehicle?.brand ?? '',
            vehicleColor: trip.vehicle?.color ?? '',
          });

          // Intentamos resolver los asientos desde la lista de vehículos
          // (puede que ya estén cargados o no, el método lo maneja).
          this.resolveSelectedVehicleSeats(trip.vehicle?.plate);
        });
    }

    // Método de pago: se habilita y se vuelve requerido sólo después de ingresar el costo.
    const priceCtrl = this.publishForm.controls.price;
    const paymentCtrl = this.publishForm.controls.paymentMethod;
    paymentCtrl.disable({ emitEvent: false });

    priceCtrl.valueChanges
      .pipe(startWith(priceCtrl.value), takeUntilDestroyed())
      .subscribe(v => {
        const has = String(v ?? '').trim() !== '';

        if (has) {
          paymentCtrl.enable({ emitEvent: false });
          paymentCtrl.setValidators([Validators.required]);
        } else {
          paymentCtrl.disable({ emitEvent: false });
          paymentCtrl.clearValidators();
          paymentCtrl.setValue('', { emitEvent: false });
        }
        paymentCtrl.updateValueAndValidity({ emitEvent: false });
      });
  }

  onVehicleSelected(event: any): void {
    const selectedVehicle = event.detail.value as Vehicle;
    if (selectedVehicle) {
      // Guardamos la capacidad real del vehículo por separado (para mostrar en tarjeta y validar cupos).
      this.selectedVehicleSeats = selectedVehicle.seats;

      const seatsCtrl = this.publishForm.controls.seatsTotal;
      const maxSeats = Math.max(1, selectedVehicle.seats - 1);
      const currentSeats = Number(seatsCtrl.value ?? 0);
      const shouldSetDefault = seatsCtrl.pristine || currentSeats <= 0 || currentSeats > maxSeats;
      if (shouldSetDefault) {
        seatsCtrl.setValue(maxSeats);
      }

      // Solo actualizamos los datos del vehículo; NO tocamos seatsTotal (cupos disponibles).
      this.publishForm.patchValue({
        vehicleBrand: selectedVehicle.brand,
        vehicleModel: selectedVehicle.modelOrBusNumber,
        vehiclePlate: selectedVehicle.plate,
        vehicleColor: selectedVehicle.color,
      });

      // Re-validamos seatsTotal ahora que tenemos el límite del vehículo.
      this.publishForm.controls.seatsTotal.updateValueAndValidity();
    }
  }

  async ionViewWillEnter(): Promise<void> {
    this.users.refreshMyProfile();
    try {
      this.myVehicles = await firstValueFrom(this.vehiclesService.getVehicles());
    } catch (e) {
      console.error('Error al actualizar vehículos', e);
    }
  }

  /**
   * Busca el vehículo coincidente por placa en la lista cargada y asigna
   * `selectedVehicleSeats`. Se usa al editar un viaje existente para que la
   * tarjeta del vehículo y el validador de cupos funcionen correctamente.
   */
  resolveSelectedVehicleSeats(plate: string | null | undefined): void {
    if (!plate || this.myVehicles.length === 0) return;
    const match = this.myVehicles.find(v => v.plate === plate);
    if (match) {
      this.selectedVehicleSeats = match.seats;
      this.publishForm.controls.seatsTotal.updateValueAndValidity();
    }
  }

  private async searchPlacesEc(query: string): Promise<Array<{ label: string; lat: number; lng: number }>> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'es');
    url.searchParams.set('countrycodes', 'ec');
    url.searchParams.set('q', query);

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as Array<any>;
    return (Array.isArray(data) ? data : []).map(item => ({
      label: String(item?.display_name ?? ''),
      lat: Number(item?.lat),
      lng: Number(item?.lon),
    })).filter(p => p.label && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }

  mainLabel(full: string | null | undefined): string {
    const s = String(full ?? '').trim();
    if (!s) return '';
    const first = s.split(',')[0]?.trim();
    return first || s;
  }

  async openLocationPicker(kind: 'origin' | 'destination'): Promise<void> {
    const title = kind === 'origin' ? 'Seleccionar origen' : 'Seleccionar destino';
    const controls = this.publishForm.controls;
    const currentLabel = kind === 'origin' ? controls.originZone.value : controls.destinationZone.value;
    const currentLat = kind === 'origin' ? controls.originLat.value : controls.destinationLat.value;
    const currentLng = kind === 'origin' ? controls.originLng.value : controls.destinationLng.value;

    // Coordenadas del punto OPUESTO (para mostrar como referencia en el modal)
    const otherLat = kind === 'origin' ? controls.destinationLat.value : controls.originLat.value;
    const otherLng = kind === 'origin' ? controls.destinationLng.value : controls.originLng.value;
    const otherLabel = kind === 'origin' ? controls.destinationZone.value : controls.originZone.value;

    // Si el punto a elegir no tiene coordenadas aún, geocodificar el nombre
    // de la ruta para centrar el mapa en esa zona automáticamente.
    let routeCenterLat: number | null = null;
    let routeCenterLng: number | null = null;

    if (currentLat == null || currentLng == null) {
      const routeName = controls.routeName.value?.trim();
      if (routeName) {
        try {
          const hits = await this.searchPlacesEc(routeName);
          if (hits[0]) {
            routeCenterLat = hits[0].lat;
            routeCenterLng = hits[0].lng;
          }
        } catch {
          // silenciar: si falla, el mapa abre en el centro por defecto
        }
      }
    }

    const modal = await this.modalCtrl.create({
      component: LocationPickerModalComponent,
      cssClass: 'location-picker-modal',
      componentProps: {
        title,
        kind,
        initialQuery: currentLabel,
        initialLat: currentLat,
        initialLng: currentLng,
        otherLat,
        otherLng,
        otherLabel: otherLabel || (kind === 'origin' ? 'Destino' : 'Origen'),
        routeCenterLat,
        routeCenterLng,
      },
    });

    await modal.present();
    const res = await modal.onWillDismiss<LocationPickerResult>();

    if (res.role !== 'confirm' || !res.data) return;
    const picked = res.data;

    if (kind === 'origin') {
      this.publishForm.patchValue({
        originZone: picked.label,
        originLat: picked.lat,
        originLng: picked.lng,
      });
    } else {
      this.publishForm.patchValue({
        destinationZone: picked.label,
        destinationLat: picked.lat,
        destinationLng: picked.lng,
      });
    }
  }

  isRuleSelected(text: string): boolean {
    const current = this.publishForm.controls.ruleTexts.value;
    return Array.isArray(current) && current.includes(text);
  }

  toggleRule(text: string, checked: boolean): void {
    const current = this.publishForm.controls.ruleTexts.value;
    const next = new Set(Array.isArray(current) ? current : []);
    if (checked) next.add(text);
    else next.delete(text);
    this.publishForm.controls.ruleTexts.setValue(Array.from(next));
  }

  todayDate(): string {
    return this.formatDate(new Date());
  }

  minTimeForSelectedDate(): string | null {
    if (this.publishForm.controls.date.value !== this.todayDate()) {
      return null;
    }

    const now = new Date();
    now.setSeconds(0, 0);
    return this.formatTime(now);
  }

  onVehiclePlateInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    const formatted = this.formatVehiclePlate(input.value);
    input.value = formatted;
    this.publishForm.controls.vehiclePlate.setValue(formatted);
  }

  onTimeChange(): void {
    const selectedDate = this.publishForm.controls.date.value;
    const selectedTime = this.publishForm.controls.time.value;

    if (!selectedDate || !selectedTime) {
      return;
    }

    if (selectedDate !== this.todayDate()) {
      return;
    }

    const selectedDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
    const now = new Date();
    now.setSeconds(0, 0);

    if (selectedDateTime < now) {
      const currentTime = this.formatTime(now);
      this.publishForm.controls.time.setValue(currentTime, { emitEvent: false });
    }
  }

  blockInvalidNumber(event: KeyboardEvent, allowDecimal = false): void {
    const blockedKeys = ['e', 'E', '+', '-'];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
      return;
    }

    if (!allowDecimal && event.key === '.') {
      event.preventDefault();
    }
  }

  sanitizeNumberInput(event: Event, allowDecimal = false): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    let value = input.value;

    if (allowDecimal) {
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      value = parts[0] + (parts.length > 1 ? `.${parts.slice(1).join('')}` : '');
    } else {
      value = value.replace(/\D/g, '');
    }

    if (input.value !== value) {
      input.value = value;
    }
  }

  private departureDateTimeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const date = String(control.get('date')?.value ?? '').trim();
      const time = String(control.get('time')?.value ?? '').trim();
      if (!date || !time) return null;

      const selected = new Date(`${date}T${time}:00`);
      if (Number.isNaN(selected.getTime())) return null;

      const now = new Date();
      now.setSeconds(0, 0);

      if (selected < now) {
        return { departureInPast: true };
      }

      const diffMs = selected.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      // Si la diferencia es mayor o igual a 15 minutos
      if (diffMinutes >= 15) {
        return { differenceTooLarge: true };
      }

      return null;
    };
  }

  /**
   * Validador de instancia para seatsTotal: los cupos deben ser
   * estrictamente MENORES a la capacidad real del vehículo seleccionado
   * (se reserva al menos 1 asiento para el conductor).
   */
  seatsNotExceedVehicleValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (this.selectedVehicleSeats === null) return null;
      const value = Number(control.value);
      if (!Number.isFinite(value)) return null;
      return value >= this.selectedVehicleSeats
        ? { exceedsVehicleSeats: { max: this.selectedVehicleSeats - 1, actual: value } }
        : null;
    };
  }

  private formatVehiclePlate(value: string): string {
    const letters = (value.match(/[A-Z]/gi) ?? []).join('').toUpperCase().slice(0, 3);
    const numbers = (value.match(/\d/g) ?? []).join('').slice(0, 4);

    if (!letters) {
      return '';
    }

    if (letters.length < 3) {
      return letters;
    }

    return numbers.length > 0 ? `${letters}-${numbers}` : letters;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async onSubmit(): Promise<void> {
    if (!this.driverUid) return;
    if (this.publishForm.invalid) {
      this.publishForm.markAllAsTouched();
      return;
    }

    if (this.isSuspended) {
      const toast = await this.toastCtrl.create({
        message: 'Acción denegada. No puedes publicar ni editar viajes mientras tu cuenta esté suspendida.',
        duration: 4000,
        color: 'danger',
        position: 'bottom',
        icon: 'warning-outline'
      });
      await toast.present();
      return;
    }

    if (this.editTripId && this.tripToEdit && this.tripToEdit.driverUid !== this.driverUid) {
      const toast = await this.toastCtrl.create({
        message: 'No puedes editar un viaje que no es tuyo.',
        duration: 2200,
        position: 'top',
        color: 'warning',
      });
      await toast.present();
      return;
    }

    this.isSubmitting = true;
    try {
      const v = this.publishForm.getRawValue();

      let originLat = v.originLat;
      let originLng = v.originLng;
      let destinationLat = v.destinationLat;
      let destinationLng = v.destinationLng;

      if (originLat == null || originLng == null) {
        const hits = await this.searchPlacesEc(v.originZone.trim());
        if (!hits[0]) {
          const toast = await this.toastCtrl.create({
            message: 'Selecciona un origen válido.',
            duration: 2200,
            position: 'top',
            color: 'warning',
          });
          await toast.present();
          this.isSubmitting = false;
          return;
        }
        originLat = hits[0].lat;
        originLng = hits[0].lng;
      }

      if (destinationLat == null || destinationLng == null) {
        if (v.destinationZone === 'Campus Matriz') {
          destinationLat = -1.266205; destinationLng = -78.623101;
        } else if (v.destinationZone === 'Campus Sur') {
          destinationLat = -1.272102; destinationLng = -78.632145;
        } else {
          const hits = await this.searchPlacesEc(v.destinationZone.trim());
          if (hits[0]) {
            destinationLat = hits[0].lat;
            destinationLng = hits[0].lng;
          }
        }
      }

      const departureAt = `${v.date}T${v.time}:00`;

      const rules: TripRuleSet = { punctuality: true, respect: true, noSensitiveData: true };
      const ruleTexts = (Array.isArray(v.ruleTexts) ? v.ruleTexts : []).map(s => String(s).trim()).filter(Boolean);

      if (this.editTripId) {
        const confirmedCount = Array.isArray(this.tripToEdit?.confirmedPassengerUids)
          ? this.tripToEdit!.confirmedPassengerUids.length
          : 0;

        const seatsTotal = Number(v.seatsTotal);
        if (Number.isFinite(seatsTotal) && seatsTotal < confirmedCount) {
          const toast = await this.toastCtrl.create({
            message: `No puedes bajar cupos totales por debajo de ${confirmedCount}.`,
            duration: 2600,
            position: 'top',
            color: 'warning',
          });
          await toast.present();
          this.isSubmitting = false;
          return;
        }

        await firstValueFrom(this.trips.updateTrip(this.editTripId, {
          routeName: v.routeName.trim(),
          originZone: v.originZone.trim(),
          destinationZone: v.destinationZone.trim(),
          originLat: originLat ?? undefined,
          originLng: originLng ?? undefined,
          destinationLat: destinationLat ?? undefined,
          destinationLng: destinationLng ?? undefined,
          departureAt,
          seatsTotal: seatsTotal,
          seatsAvailable: Math.max(0, seatsTotal - confirmedCount),
          price: Number(v.price),
          paymentMethod: String(v.paymentMethod ?? '').trim(),
          ruleTexts,
          notes: v.notes?.trim() || undefined,
          vehicle: {
            plate: v.vehiclePlate.trim(),
            model: v.vehicleModel.trim(),
            brand: v.vehicleBrand.trim(),
            color: v.vehicleColor.trim(),
          },
          rules,
        }));
      } else {
        await firstValueFrom(this.trips.publishTrip({
          routeName: v.routeName.trim(),
          originZone: v.originZone.trim(),
          destinationZone: v.destinationZone.trim(),
          originLat: originLat ?? undefined,
          originLng: originLng ?? undefined,
          destinationLat: destinationLat ?? undefined,
          destinationLng: destinationLng ?? undefined,
          departureAt,
          seatsTotal: Number(v.seatsTotal),
          price: Number(v.price),
          paymentMethod: String(v.paymentMethod ?? '').trim(),
          ruleTexts,
          notes: v.notes?.trim() || undefined,
          vehicle: {
            plate: v.vehiclePlate.trim(),
            model: v.vehicleModel.trim(),
            brand: v.vehicleBrand.trim(),
            color: v.vehicleColor.trim(),
          },
          rules,
        }));
      }

      const toast = await this.toastCtrl.create({
        message: this.editTripId ? 'Viaje actualizado exitosamente.' : 'Viaje publicado exitosamente.',
        duration: 2000,
        position: 'top',
        color: 'success',
      });
      await toast.present();

      if (!this.editTripId) {
        this.publishForm.reset({
          routeName: '',
          originZone: '',
          destinationZone: '',
          originLat: null,
          originLng: null,
          destinationLat: null,
          destinationLng: null,
          date: '',
          time: '',
          seatsTotal: 1,
          price: '',
          paymentMethod: '',
          ruleTexts: [],
          notes: '',
          vehiclePlate: '',
          vehicleModel: '',
          vehicleBrand: '',
          vehicleColor: '',
        });
      }
      this.router.navigate(['/app/my-trips']);
    } finally {
      this.isSubmitting = false;
    }
  }

  goBack(): void {
    this.location.back();
  }
}
