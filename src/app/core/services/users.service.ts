import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import type { User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

import type { UserProfile, UserProfileUpdate } from '../models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  private stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as Partial<T>);
  }

  profile$(uid: string): Observable<UserProfile | undefined> {
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, `users/${uid}`);
      return docData(ref) as Observable<UserProfile | undefined>;
    });
  }

  users$(): Observable<UserProfile[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, 'users');
      return collectionData(ref) as Observable<UserProfile[]>;
    });
  }

  async ensureUserDoc(user: User): Promise<void> {
    const ref = doc(this.firestore, `users/${user.uid}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return;
    }
    const base: UserProfile = {
      uid: user.uid,
      email: user.email ?? '',
      emailVerified: user.emailVerified,
      displayName: user.displayName ?? '',
      career: '',
      zone: '',
      ...(user.phoneNumber ? { phone: user.phoneNumber } : {}),
      ...(user.photoURL ? { photoUrl: user.photoURL } : {}),
      roles: {},
      ratingSum: 0,
      ratingCount: 0,
      tripsCount: 0,
      driverTripsCount: 0,
      passengerTripsCount: 0,
      suspendedUntil: null,
      disabled: false,
    };

    await setDoc(ref, base);
  }

  async updateProfile(uid: string, patch: UserProfileUpdate): Promise<void> {
    const ref = doc(this.firestore, `users/${uid}`);
    const cleanPatch = this.stripUndefined(patch as any);
    await updateDoc(ref, {
      ...cleanPatch,
    } as any);
  }

  async syncEmailVerified(uid: string, emailVerified: boolean): Promise<void> {
    const ref = doc(this.firestore, `users/${uid}`);
    await updateDoc(ref, {
      emailVerified,
    } as any);
  }
}
