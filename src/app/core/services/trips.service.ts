import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  increment,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import type { Trip, TripCreate } from '../models/trip.model';
import type { TripRequest, TripRequestStatus } from '../models/trip-request.model';
import { TimeService } from './time.service';
import { NotificationsService } from './notifications.service';
import { AuthService } from '../auth/auth.service';

export type DriverLiveLocation = {
  driverUid: string;
  active: boolean;
  lat?: number;
  lng?: number;
  updatedAt?: string;
};

@Injectable({ providedIn: 'root' })
export class TripsService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  private readonly notifications = inject(NotificationsService);
  private readonly auth = inject(AuthService);

  private static readonly DEFAULT_TRIP_ROUTES: string[] = [
    'Izamba - Huachi Chico - Querochaca',
    'Ingahurco -Huahi Chico - Querochaca',
    'Ingahurco -Huachi Chico',
    'Huachi Chico- Querochaca',
    'Huachi Chico -Ingahurco',
  ];

  private static readonly DEFAULT_TRIP_RULES: string[] = [
    'Puntualidad',
    'Respeto y buen trato',
    'No compartir datos sensibles',
  ];

  tripRoutes$(): Observable<string[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, 'tripRoutes');
      return (collectionData(ref, { idField: 'id' }) as Observable<Array<{ id: string; name?: unknown }>>).pipe(
        map(docs => {
          const names = docs
            .map(d => (typeof d?.name === 'string' ? d.name.trim() : ''))
            .filter(Boolean);
          const out = [...new Set(names)].sort((a, b) => a.localeCompare(b));
          return out.length > 0 ? out : TripsService.DEFAULT_TRIP_ROUTES;
        }),
      );
    });
  }

  tripRoutesDocs$(): Observable<Array<{ id: string; name: string }>> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, 'tripRoutes');
      return (collectionData(ref, { idField: 'id' }) as Observable<Array<{ id: string; name?: unknown }>>).pipe(
        map(docs =>
          docs
            .map(d => ({ id: String(d.id), name: typeof d?.name === 'string' ? d.name.trim() : '' }))
            .filter(d => d.id && d.name),
        ),
      );
    });
  }

  async createTripRoute(name: string): Promise<void> {
    const clean = String(name ?? '').trim();
    if (!clean) return;
    const ref = collection(this.firestore, 'tripRoutes');
    await addDoc(ref, { name: clean, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as any);
  }

  async updateTripRoute(id: string, name: string): Promise<void> {
    const clean = String(name ?? '').trim();
    if (!id || !clean) return;
    const ref = doc(this.firestore, `tripRoutes/${id}`);
    await updateDoc(ref, { name: clean, updatedAt: serverTimestamp() } as any);
  }

  async deleteTripRoute(id: string): Promise<void> {
    if (!id) return;
    const ref = doc(this.firestore, `tripRoutes/${id}`);
    await deleteDoc(ref);
  }

  tripRules$(): Observable<string[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, 'tripRules');
      return (collectionData(ref, { idField: 'id' }) as Observable<Array<{ id: string; text?: unknown }>>).pipe(
        map(docs => {
          const texts = docs
            .map(d => (typeof d?.text === 'string' ? d.text.trim() : ''))
            .filter(Boolean);
          const out = [...new Set(texts)].sort((a, b) => a.localeCompare(b));
          return out.length > 0 ? out : TripsService.DEFAULT_TRIP_RULES;
        }),
      );
    });
  }

  tripRulesDocs$(): Observable<Array<{ id: string; text: string }>> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, 'tripRules');
      return (collectionData(ref, { idField: 'id' }) as Observable<Array<{ id: string; text?: unknown }>>).pipe(
        map(docs =>
          docs
            .map(d => ({ id: String(d.id), text: typeof d?.text === 'string' ? d.text.trim() : '' }))
            .filter(d => d.id && d.text),
        ),
      );
    });
  }

  async createTripRule(text: string): Promise<void> {
    const clean = String(text ?? '').trim();
    if (!clean) return;
    const ref = collection(this.firestore, 'tripRules');
    await addDoc(ref, { text: clean, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as any);
  }

  async updateTripRule(id: string, text: string): Promise<void> {
    const clean = String(text ?? '').trim();
    if (!id || !clean) return;
    const ref = doc(this.firestore, `tripRules/${id}`);
    await updateDoc(ref, { text: clean, updatedAt: serverTimestamp() } as any);
  }

  async deleteTripRule(id: string): Promise<void> {
    if (!id) return;
    const ref = doc(this.firestore, `tripRules/${id}`);
    await deleteDoc(ref);
  }

  trips$(filters?: { routeName?: string; originZone?: string; destinationZone?: string; date?: string; onlyOpen?: boolean }): Observable<Trip[]> {
    return runInInjectionContext(this.injector, () => {
      // Escuchar cambios en el usuario para reiniciar la consulta si es necesario
      return this.auth.user$.pipe(
        switchMap((user: any) => {
          if (!user) return of([] as Trip[]);

          const baseRef = collection(this.firestore, 'trips');
          const onlyOpen = filters?.onlyOpen ?? true;
          const q = onlyOpen ? query(baseRef, where('status', '==', 'open')) : query(baseRef);

          return (collectionData(q, { idField: 'id' }) as Observable<Trip[]>).pipe(
            catchError(err => {
              console.error('Error cargando viajes:', err);
              return of([] as Trip[]);
            }),
            map(trips => {
              let out = trips;
              if (filters?.routeName) {
                const search = filters.routeName.toLowerCase();
                out = out.filter(t => t.routeName?.toLowerCase().includes(search));
              }
              if (filters?.originZone) {
                const search = filters.originZone.toLowerCase();
                out = out.filter(t => t.originZone.toLowerCase().includes(search));
              }
              if (filters?.destinationZone) {
                const search = filters.destinationZone.toLowerCase();
                out = out.filter(t => t.destinationZone.toLowerCase().includes(search));
              }
              if (filters?.date) {
                out = out.filter(t => String(t.departureAt).startsWith(filters.date as string));
              }
              return [...out].sort((a, b) => String(a.departureAt).localeCompare(String(b.departureAt)));
            })
          );
        })
      );
    });
  }

  trip$(tripId: string): Observable<Trip | undefined> {
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, `trips/${tripId}`);
      return docData(ref, { idField: 'id' }) as Observable<Trip | undefined>;
    });
  }

  async publishTrip(create: TripCreate): Promise<string> {
    const now = TimeService.nowIso();
    const tripsRef = collection(this.firestore, 'trips');
    const docRef = await addDoc(tripsRef, {
      ...create,
      seatsAvailable: create.seatsTotal,
      confirmedPassengerUids: [],
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  async completeTrip(tripId: string): Promise<void> {
    const now = TimeService.nowIso();
    const tripRef = doc(this.firestore, `trips/${tripId}`);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) return;
    const trip = snap.data() as Trip;

    await updateDoc(tripRef, { status: 'completed', updatedAt: now } as any);

    // Incrementar contadores del conductor
    if (trip.driverUid) {
      const driverRef = doc(this.firestore, `users/${trip.driverUid}`);
      await updateDoc(driverRef, {
        tripsCount: increment(1),
        driverTripsCount: increment(1),
      } as any);
    }

    // Incrementar contadores de los pasajeros confirmados y enviar notificación
    const passengers = Array.isArray(trip.confirmedPassengerUids) ? trip.confirmedPassengerUids : [];
    
    for (const pUid of passengers) {
      const pRef = doc(this.firestore, `users/${pUid}`);
      await updateDoc(pRef, {
        tripsCount: increment(1),
        passengerTripsCount: increment(1),
      } as any);

      // Notificación de viaje finalizado - USANDO tripId (parámetro) en lugar de trip.id
      await this.notifications.sendNotification(pUid, {
        title: '¡Viaje finalizado! 🏁',
        message: 'Tu viaje con ' + (trip.driverName || 'tu conductor') + ' ha terminado. Haz clic aquí para calificar tu experiencia.',
        type: 'trip_completed',
        tripId: tripId, // <--- CORRECCIÓN AQUÍ
        driverUid: trip.driverUid,
        driverName: trip.driverName || 'Conductor'
      });
    }
  }

  async updateTripStatus(tripId: string, status: 'open' | 'completed' | 'cancelled'): Promise<void> {
    const now = TimeService.nowIso();
    const tripDoc = doc(this.firestore, `trips/${tripId}`);
    await updateDoc(tripDoc, { status, updatedAt: now } as any);
  }

  async updateTrip(tripId: string, patch: Partial<Trip>): Promise<void> {
    const now = TimeService.nowIso();
    const tripDoc = doc(this.firestore, `trips/${tripId}`);
    await updateDoc(tripDoc, { ...patch, updatedAt: now } as any);
  }

  async deleteTrip(tripId: string): Promise<void> {
    const tripDoc = doc(this.firestore, `trips/${tripId}`);
    await deleteDoc(tripDoc);
  }

  requests$(tripId: string): Observable<TripRequest[]> {
    return runInInjectionContext(this.injector, () => {
      const reqRef = collection(this.firestore, `trips/${tripId}/requests`);
      const q = query(reqRef, orderBy('createdAt', 'desc'));
      return collectionData(q, { idField: 'id' }) as Observable<TripRequest[]>;
    });
  }

  async getRequestsOnce(tripId: string): Promise<TripRequest[]> {
    const reqRef = collection(this.firestore, `trips/${tripId}/requests`);
    const snap = await getDocs(query(reqRef, orderBy('createdAt', 'desc')));
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as TripRequest));
  }

  async requestToJoin(tripId: string, passengerUid: string, passengerName: string): Promise<void> {
    const now = TimeService.nowIso();
    const reqDoc = doc(this.firestore, `trips/${tripId}/requests/${passengerUid}`);
    const body: Omit<TripRequest, 'id'> = {
      tripId,
      passengerUid,
      passengerName,
      status: 'pending',
      paymentStatus: 'paid',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(reqDoc, body, { merge: true });
    // Escribir también en la colección plana del usuario (sin índice)
    const userReqDoc = doc(this.firestore, `users/${passengerUid}/myRequests/${tripId}`);
    await setDoc(userReqDoc, { tripId, status: 'pending', updatedAt: now }, { merge: true });
  }

  passengerRequest$(tripId: string, passengerUid: string): Observable<TripRequest | undefined> {
    return runInInjectionContext(this.injector, () => {
      const reqDoc = doc(this.firestore, `trips/${tripId}/requests/${passengerUid}`);
      return docData(reqDoc, { idField: 'id' }) as Observable<TripRequest | undefined>;
    });
  }

  userMyRequests$(passengerUid: string): Observable<{ tripId: string; status: string }[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, `users/${passengerUid}/myRequests`);
      return collectionData(ref, { idField: 'tripId' }) as Observable<{ tripId: string; status: string }[]>;
    });
  }

  /** Sincroniza el estado de myRequests del usuario cuando el conductor cambia el estado */
  /** Alias público para sincronizar el estado desde los componentes */
  syncUserRequestStatusPublic(tripId: string, passengerUid: string, status: string): void {
    this.syncUserRequestStatus(tripId, passengerUid, status).catch(() => {});
  }

  async syncUserRequestStatus(tripId: string, passengerUid: string, status: string): Promise<void> {
    const now = TimeService.nowIso();
    const userReqDoc = doc(this.firestore, `users/${passengerUid}/myRequests/${tripId}`);
    // setDoc con merge:true crea el documento si no existe, o lo actualiza si ya existe
    await setDoc(userReqDoc, { tripId, status, updatedAt: now }, { merge: true });
  }

  async setRequestStatus(tripId: string, passengerUid: string, status: TripRequestStatus): Promise<void> {
    const now = TimeService.nowIso();
    const reqDoc = doc(this.firestore, `trips/${tripId}/requests/${passengerUid}`);
    await updateDoc(reqDoc, { status, updatedAt: now } as any);

    // Sincronizar estado en la colección plana del usuario
    await this.syncUserRequestStatus(tripId, passengerUid, status);

    if (status === 'accepted') {
      const tripDoc = doc(this.firestore, `trips/${tripId}`);
      const snap = await getDoc(tripDoc);
      const trip = snap.data() as any;
      const confirmed: string[] = Array.isArray(trip?.confirmedPassengerUids) ? trip.confirmedPassengerUids : [];
      if (!confirmed.includes(passengerUid)) {
        await updateDoc(tripDoc, {
          confirmedPassengerUids: [...confirmed, passengerUid],
          seatsAvailable: increment(-1),
          updatedAt: now,
        } as any);

        // Notificación de solicitud aceptada
        await this.notifications.sendNotification(passengerUid, {
          title: '¡Solicitud aceptada! ✅',
          message: 'El conductor ' + (trip.driverName || 'u-ride') + ' ha aceptado tu solicitud de viaje.',
          type: 'trip_accepted',
          tripId: tripId,
          driverUid: trip.driverUid,
          driverName: trip.driverName
        });
      }
    }
  }

  async markPassengerRated(tripId: string, passengerUid: string): Promise<void> {
    const now = TimeService.nowIso();
    const reqDoc = doc(this.firestore, `trips/${tripId}/requests/${passengerUid}`);
    await setDoc(reqDoc, { driverRated: true, updatedAt: now } as any, { merge: true } as any);
  }

  async markPassengerReported(tripId: string, passengerUid: string): Promise<void> {
    const now = TimeService.nowIso();
    const reqDoc = doc(this.firestore, `trips/${tripId}/requests/${passengerUid}`);
    await setDoc(reqDoc, { driverReported: true, updatedAt: now } as any, { merge: true } as any);
  }

  async cancelSpot(tripId: string, passengerUid: string): Promise<void> {
    const now = TimeService.nowIso();
    const tripDoc = doc(this.firestore, `trips/${tripId}`);
    const snap = await getDoc(tripDoc);
    const trip = snap.data() as any;
    const confirmed: string[] = Array.isArray(trip?.confirmedPassengerUids) ? trip.confirmedPassengerUids : [];
    if (confirmed.includes(passengerUid)) {
      await updateDoc(tripDoc, {
        confirmedPassengerUids: confirmed.filter(id => id !== passengerUid),
        seatsAvailable: increment(1),
        updatedAt: now,
      } as any);
      
      const reqDoc = doc(this.firestore, `trips/${tripId}/requests/${passengerUid}`);
      await updateDoc(reqDoc, { status: 'cancelled_by_passenger', updatedAt: now } as any);
    }
  }

  driverLiveLocation$(tripId: string): Observable<DriverLiveLocation | undefined> {
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, `trips/${tripId}/live/driver`);
      return docData(ref) as Observable<DriverLiveLocation | undefined>;
    });
  }

  async setDriverLiveLocation(tripId: string, payload: { driverUid: string; lat: number; lng: number; active?: boolean }): Promise<void> {
    if (!tripId) return;
    const now = TimeService.nowIso();
    const ref = doc(this.firestore, `trips/${tripId}/live/driver`);
    await setDoc(
      ref,
      {
        driverUid: payload.driverUid,
        active: payload.active ?? true,
        lat: payload.lat,
        lng: payload.lng,
        updatedAt: now,
      } satisfies DriverLiveLocation,
      { merge: true },
    );
  }

  async setDriverLiveActive(tripId: string, driverUid: string, active: boolean): Promise<void> {
    if (!tripId || !driverUid) return;
    const now = TimeService.nowIso();
    const ref = doc(this.firestore, `trips/${tripId}/live/driver`);
    await setDoc(ref, { driverUid, active, updatedAt: now } satisfies DriverLiveLocation, { merge: true });
  }
}
