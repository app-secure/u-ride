import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

export interface TripRouteDoc {
  id: string;
  name: string;
}

export interface TripRuleDoc {
  id: string;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class TripsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/trips`;

  // ─── Rutas (API REST) ───

  /**
   * Lista todas las rutas predefinidas.
   * GET /api/trips/routes
   */
  tripRoutes$(): Observable<string[]> {
    return this.http.get<TripRouteDoc[]>(`${this.base}/routes`).pipe(
      map(routes => routes.map(r => r.name)),
    );
  }

  /**
   * Lista documentos de rutas (id + name) para admin.
   * GET /api/trips/routes
   */
  tripRoutesDocs$(): Observable<TripRouteDoc[]> {
    return this.http.get<TripRouteDoc[]>(`${this.base}/routes`);
  }

  /**
   * Crea una nueva ruta.
   * POST /api/trips/routes
   */
  createTripRoute(name: string): Observable<TripRouteDoc> {
    return this.http.post<TripRouteDoc>(`${this.base}/routes`, { name });
  }

  /**
   * Actualiza una ruta existente.
   * PUT /api/trips/routes/{id}
   */
  updateTripRoute(id: string, name: string): Observable<TripRouteDoc> {
    return this.http.put<TripRouteDoc>(`${this.base}/routes/${id}`, { name });
  }

  /**
   * Elimina una ruta.
   * DELETE /api/trips/routes/{id}
   */
  deleteTripRoute(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/routes/${id}`);
  }

  // ─── Reglas (API REST) ───

  /**
   * Lista todas las reglas predefinidas.
   * GET /api/trips/rules
   */
  tripRules$(): Observable<string[]> {
    return this.http.get<TripRuleDoc[]>(`${this.base}/rules`).pipe(
      map(rules => rules.map(r => r.text)),
    );
  }

  /**
   * Lista documentos de reglas (id + text) para admin.
   * GET /api/trips/rules
   */
  tripRulesDocs$(): Observable<TripRuleDoc[]> {
    return this.http.get<TripRuleDoc[]>(`${this.base}/rules`);
  }

  /**
   * Crea una nueva regla.
   * POST /api/trips/rules
   */
  createTripRule(text: string): Observable<TripRuleDoc> {
    return this.http.post<TripRuleDoc>(`${this.base}/rules`, { text });
  }

  /**
   * Actualiza una regla existente.
   * PUT /api/trips/rules/{id}
   */
  updateTripRule(id: string, text: string): Observable<TripRuleDoc> {
    return this.http.put<TripRuleDoc>(`${this.base}/rules/${id}`, { text });
  }

  /**
   * Elimina una regla.
   * DELETE /api/trips/rules/{id}
   */
  deleteTripRule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/rules/${id}`);
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

  /**
   * Actualiza un viaje existente.
   * PUT /api/trips/{id}
   */
  updateTrip(tripId: string, patch: Partial<Trip>): Observable<Trip> {
    return this.http.put<Trip>(`${this.base}/${tripId}`, patch);
  }

  /**
   * Elimina un viaje.
   * DELETE /api/trips/{id}
   */
  deleteTrip(tripId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${tripId}`);
  }

  /**
   * Completa un viaje (cambiar estado a 'completed').
   */
  async completeTrip(tripId: string): Promise<void> {
    await this.updateTripStatus(tripId, 'completed').toPromise();
  }
}
