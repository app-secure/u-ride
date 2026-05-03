import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { TripReview } from '../models/trip-review.model';

/** DTO para crear una review. Coincide con CreateReviewDto del backend. */
export interface CreateReviewDto {
  tripId: string;
  toUid: string;
  stars: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reviews`;

  /**
   * Crea una calificación post-viaje.
   * El fromUid se extrae del token en el backend.
   * POST /api/reviews
   */
  createReview(dto: CreateReviewDto): Observable<TripReview> {
    return this.http.post<TripReview>(this.base, dto);
  }

  /**
   * Obtiene las calificaciones de un viaje.
   * GET /api/reviews/trip/{tripId}
   */
  getByTrip(tripId: string): Observable<TripReview[]> {
    return this.http.get<TripReview[]>(`${this.base}/trip/${tripId}`);
  }

  /**
   * Obtiene las calificaciones recibidas por un usuario.
   * GET /api/reviews/user/{uid}
   */
  getByUser(uid: string): Observable<TripReview[]> {
    return this.http.get<TripReview[]>(`${this.base}/user/${uid}`);
  }

  /**
   * Alias para compatibilidad con componentes que usaban userReviews$(uid).
   */
  userReviews$(uid: string): Observable<TripReview[]> {
    return this.getByUser(uid);
  }
}
