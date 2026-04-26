import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Firestore, doc, getDoc, increment, setDoc, updateDoc, collection, collectionData, query, where, orderBy, limit } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import type { TripReview } from '../models/trip-review.model';
import { TimeService } from './time.service';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  async submitTripReview(input: {
    tripId: string;
    fromUid: string;
    toUid: string;
    stars: number;
    comment?: string;
  }): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const tripId = input.tripId;
      const fromUid = input.fromUid;
      const toUid = input.toUid;
      const stars = Number(input.stars);
      const comment = (input.comment ?? '').trim();

      if (!tripId || !fromUid || !toUid) throw new Error('Datos incompletos para calificar.');
      if (fromUid === toUid) throw new Error('No puedes calificarte a ti mismo.');
      if (!Number.isFinite(stars) || stars < 1 || stars > 5) throw new Error('La calificación debe ser de 1 a 5.');

      const now = TimeService.nowIso();
      const reviewId = `${fromUid}_${toUid}`;
      const reviewRef = doc(this.firestore, `trips/${tripId}/reviews/${reviewId}`);

      const existing = await getDoc(reviewRef);
      if (existing.exists()) throw new Error('Ya calificaste a este usuario para este viaje.');

      const review: TripReview = {
        id: reviewId,
        tripId,
        fromUid,
        toUid,
        stars,
        comment: comment || undefined,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(reviewRef, review);

      // Duplicar en la colección del usuario para consulta rápida
      const userReviewRef = doc(this.firestore, `users/${toUid}/reviews/${tripId}_${fromUid}`);
      await setDoc(userReviewRef, review);

      const userRef = doc(this.firestore, `users/${toUid}`);
      await updateDoc(userRef, {
        ratingSum: increment(stars),
        ratingCount: increment(1),
        updatedAt: now,
      } as any);
    });
  }
  async hasReviewed(tripId: string, fromUid: string, toUid: string): Promise<boolean> {
    return runInInjectionContext(this.injector, async () => {
      const reviewId = `${fromUid}_${toUid}`;
      const reviewRef = doc(this.firestore, `trips/${tripId}/reviews/${reviewId}`);
      const snap = await getDoc(reviewRef);
      return snap.exists();
    });
  }

  userReviews$(uid: string): Observable<TripReview[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, `users/${uid}/reviews`);
      const q = query(ref, orderBy('createdAt', 'desc'), limit(15));
      return collectionData(q) as Observable<TripReview[]>;
    });
  }
}
