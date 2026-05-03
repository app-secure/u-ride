import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { TripRequest } from '../models/trip-request.model';

@Injectable({ providedIn: 'root' })
export class TripRequestsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/triprequests`;

  /**
   * Crea una solicitud para unirse a un viaje.
   * El passengerUid y passengerName se extraen del token en el backend.
   * POST /api/triprequests
   */
  createRequest(tripId: string): Observable<TripRequest> {
    return this.http.post<TripRequest>(this.base, { tripId });
  }

  /**
   * El conductor acepta una solicitud.
   * PATCH /api/triprequests/{id}/accept
   */
  acceptRequest(id: string): Observable<TripRequest> {
    return this.http.patch<TripRequest>(`${this.base}/${id}/accept`, {});
  }

  /**
   * El conductor rechaza una solicitud.
   * PATCH /api/triprequests/{id}/reject
   */
  rejectRequest(id: string): Observable<TripRequest> {
    return this.http.patch<TripRequest>(`${this.base}/${id}/reject`, {});
  }

  /**
   * El pasajero cancela su solicitud.
   * PATCH /api/triprequests/{id}/cancel
   */
  cancelRequest(id: string): Observable<TripRequest> {
    return this.http.patch<TripRequest>(`${this.base}/${id}/cancel`, {});
  }

  /**
   * Obtiene todas las solicitudes de un viaje (para el conductor).
   * GET /api/triprequests/trip/{tripId}
   */
  getByTrip(tripId: string): Observable<TripRequest[]> {
    return this.http.get<TripRequest[]>(`${this.base}/trip/${tripId}`);
  }

  /**
   * Obtiene las solicitudes del pasajero autenticado.
   * GET /api/triprequests/my-requests
   */
  getMyRequests(): Observable<TripRequest[]> {
    return this.http.get<TripRequest[]>(`${this.base}/my-requests`);
  }
}
