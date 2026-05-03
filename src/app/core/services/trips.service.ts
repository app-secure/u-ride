import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import type { Trip, TripCreate } from '../models/trip.model';
import type { PagedResult } from '../models/paged-result.model';

export interface TripSearchFilters {
  originZone?: string;
  destinationZone?: string;
  departureDate?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class TripsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/trips`;

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

  // ─── Rutas y Reglas (stubs — sin endpoint backend) ───

  /**
   * Retorna las rutas disponibles.
   * STUB: retorna lista estática hasta que se implemente endpoint backend.
   */
  tripRoutes$(): Observable<string[]> {
    return of(TripsService.DEFAULT_TRIP_ROUTES);
  }

  /**
   * STUB: Retorna documentos de rutas para admin.
   */
  tripRoutesDocs$(): Observable<Array<{ id: string; name: string }>> {
    return of(
      TripsService.DEFAULT_TRIP_ROUTES.map((name, i) => ({ id: `route-${i}`, name })),
    );
  }

  /**
   * STUB: Crear ruta (sin endpoint backend).
   */
  async createTripRoute(_name: string): Promise<void> {
    console.warn('[TripsService] createTripRoute: stub — no backend endpoint yet');
  }

  /**
   * STUB: Actualizar ruta (sin endpoint backend).
   */
  async updateTripRoute(_id: string, _name: string): Promise<void> {
    console.warn('[TripsService] updateTripRoute: stub — no backend endpoint yet');
  }

  /**
   * STUB: Eliminar ruta (sin endpoint backend).
   */
  async deleteTripRoute(_id: string): Promise<void> {
    console.warn('[TripsService] deleteTripRoute: stub — no backend endpoint yet');
  }

  /**
   * Retorna las reglas disponibles.
   * STUB: retorna lista estática.
   */
  tripRules$(): Observable<string[]> {
    return of(TripsService.DEFAULT_TRIP_RULES);
  }

  /**
   * STUB: Retorna documentos de reglas para admin.
   */
  tripRulesDocs$(): Observable<Array<{ id: string; text: string }>> {
    return of(
      TripsService.DEFAULT_TRIP_RULES.map((text, i) => ({ id: `rule-${i}`, text })),
    );
  }

  /**
   * STUB: Crear regla (sin endpoint backend).
   */
  async createTripRule(_text: string): Promise<void> {
    console.warn('[TripsService] createTripRule: stub — no backend endpoint yet');
  }

  /**
   * STUB: Actualizar regla (sin endpoint backend).
   */
  async updateTripRule(_id: string, _text: string): Promise<void> {
    console.warn('[TripsService] updateTripRule: stub — no backend endpoint yet');
  }

  /**
   * STUB: Eliminar regla (sin endpoint backend).
   */
  async deleteTripRule(_id: string): Promise<void> {
    console.warn('[TripsService] deleteTripRule: stub — no backend endpoint yet');
  }

  // ─── Viajes (API REST) ───

  /**
   * Busca viajes abiertos con filtros.
   * GET /api/trips/search
   */
  searchTrips(filters?: TripSearchFilters): Observable<PagedResult<Trip>> {
    let params = new HttpParams();
    if (filters?.originZone) params = params.set('originZone', filters.originZone);
    if (filters?.destinationZone) params = params.set('destinationZone', filters.destinationZone);
    if (filters?.departureDate) params = params.set('departureDate', filters.departureDate);
    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.pageSize) params = params.set('pageSize', filters.pageSize.toString());

    return this.http.get<PagedResult<Trip>>(`${this.base}/search`, { params });
  }

  /**
   * Obtiene un viaje por ID.
   * GET /api/trips/{id}
   */
  getById(id: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.base}/${id}`);
  }

  /**
   * Publica un nuevo viaje.
   * POST /api/trips
   */
  publishTrip(create: TripCreate): Observable<Trip> {
    return this.http.post<Trip>(this.base, create);
  }

  /**
   * Obtiene los viajes publicados por el conductor autenticado.
   * GET /api/trips/my-trips
   */
  getMyTrips(): Observable<Trip[]> {
    return this.http.get<Trip[]>(`${this.base}/my-trips`);
  }

  /**
   * Cambia el estado de un viaje (open, completed, cancelled).
   * PATCH /api/trips/{id}/status
   */
  updateTripStatus(id: string, status: string): Observable<Trip> {
    return this.http.patch<Trip>(`${this.base}/${id}/status`, { status });
  }

  // ─── Stubs para funcionalidades sin endpoint backend ───

  /**
   * STUB: Eliminar viaje (sin endpoint DELETE en backend).
   */
  async deleteTrip(_tripId: string): Promise<void> {
    console.warn('[TripsService] deleteTrip: stub — no backend endpoint yet');
  }

  /**
   * STUB: Actualizar viaje parcialmente (sin endpoint PATCH genérico en backend).
   */
  async updateTrip(_tripId: string, _patch: Partial<Trip>): Promise<void> {
    console.warn('[TripsService] updateTrip: stub — no backend endpoint yet');
  }

  /**
   * STUB: Completar viaje con lógica de contadores y notificaciones.
   * Actualmente el backend lo maneja al cambiar estado a 'completed'.
   */
  async completeTrip(tripId: string): Promise<void> {
    await this.updateTripStatus(tripId, 'completed').toPromise();
  }
}
