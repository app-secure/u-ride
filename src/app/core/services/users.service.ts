import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { User } from '@angular/fire/auth';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { UserProfile, UserProfileUpdate } from '../models/user-profile.model';
import type { PagedResult } from '../models/paged-result.model';

/** Forma del DTO que devuelve el backend (usa firebaseUid en vez de uid). */
interface UserProfileApiDto {
  firebaseUid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  career?: string;
  zone?: string;
  phone?: string;
  photoUrl?: string;
  roles?: { admin?: boolean };
  ratingSum: number;
  ratingCount: number;
  averageRating: number;
  tripsCount: number;
  driverTripsCount: number;
  passengerTripsCount: number;
  suspendedUntil?: string | null;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** DTO enviado al backend para sincronizar usuario. */
interface SyncUserDto {
  firebaseUid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  career?: string;
  zone?: string;
  phone?: string;
  photoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  /**
   * Mapea el DTO del backend (firebaseUid) al modelo del frontend (uid).
   */
  private mapProfile(dto: UserProfileApiDto): UserProfile {
    return {
      uid: dto.firebaseUid,
      email: dto.email,
      emailVerified: dto.emailVerified,
      displayName: dto.displayName,
      career: dto.career ?? '',
      zone: dto.zone ?? '',
      phone: dto.phone,
      photoUrl: dto.photoUrl,
      roles: dto.roles,
      ratingSum: dto.ratingSum,
      ratingCount: dto.ratingCount,
      averageRating: dto.averageRating,
      tripsCount: dto.tripsCount,
      driverTripsCount: dto.driverTripsCount,
      passengerTripsCount: dto.passengerTripsCount,
      suspendedUntil: dto.suspendedUntil,
      disabled: dto.disabled,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }

  /**
   * Sincroniza un usuario de Firebase → SQL Server.
   * Se llama después de cada login/registro para asegurar
   * que el perfil exista en el backend.
   * POST /api/users/sync
   */
  syncUser(user: User): Observable<UserProfile> {
    const body: SyncUserDto = {
      firebaseUid: user.uid,
      email: user.email ?? '',
      emailVerified: user.emailVerified,
      displayName: user.displayName ?? '',
      phone: user.phoneNumber ?? undefined,
      photoUrl: user.photoURL ?? undefined,
    };
    return this.http.post<UserProfileApiDto>(`${this.base}/sync`, body).pipe(
      map(dto => this.mapProfile(dto)),
    );
  }

  /**
   * Sincroniza usuario con datos adicionales (career, zone, etc).
   * Usado en registro con formulario completo.
   */
  syncUserWithDetails(user: User, details: { career?: string; zone?: string; phone?: string; displayName?: string }): Observable<UserProfile> {
    const body: SyncUserDto = {
      firebaseUid: user.uid,
      email: user.email ?? '',
      emailVerified: user.emailVerified,
      displayName: details.displayName ?? user.displayName ?? '',
      career: details.career,
      zone: details.zone,
      phone: details.phone ?? user.phoneNumber ?? undefined,
      photoUrl: user.photoURL ?? undefined,
    };
    return this.http.post<UserProfileApiDto>(`${this.base}/sync`, body).pipe(
      map(dto => this.mapProfile(dto)),
    );
  }

  /**
   * Obtiene el perfil del usuario autenticado.
   * GET /api/users/me
   */
  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfileApiDto>(`${this.base}/me`).pipe(
      map(dto => this.mapProfile(dto)),
    );
  }

  /**
   * Obtiene el perfil público de cualquier usuario por su UID.
   * GET /api/users/{uid}
   */
  getProfile(uid: string): Observable<UserProfile> {
    return this.http.get<UserProfileApiDto>(`${this.base}/${uid}`).pipe(
      map(dto => this.mapProfile(dto)),
    );
  }

  /**
   * Alias observable para compatibilidad con guards y componentes
   * que usaban profile$(uid). Ahora es un one-shot HTTP.
   */
  profile$(uid: string): Observable<UserProfile | undefined> {
    return this.getProfile(uid).pipe(
      map(p => p as UserProfile | undefined),
    );
  }

  /**
   * Actualiza el perfil del usuario autenticado.
   * PUT /api/users/me
   */
  updateProfile(patch: UserProfileUpdate): Observable<UserProfile> {
    const body: Partial<SyncUserDto> = {
      displayName: patch.displayName,
      career: patch.career,
      zone: patch.zone,
      phone: patch.phone,
      photoUrl: patch.photoUrl,
    };
    // Limpiar undefined
    const cleanBody: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) cleanBody[k] = v;
    }
    return this.http.put<UserProfileApiDto>(`${this.base}/me`, cleanBody).pipe(
      map(dto => this.mapProfile(dto)),
    );
  }

  /**
   * [Admin] Suspende a un usuario.
   * POST /api/users/{uid}/suspend
   */
  suspendUser(uid: string, until: Date): Observable<any> {
    return this.http.post(`${this.base}/${uid}/suspend`, { until: until.toISOString() });
  }

  // ─── Admin ───

  /**
   * [Admin] Lista todos los usuarios con paginación.
   * GET /api/users?page=1&pageSize=50
   */
  getAllUsers(page = 1, pageSize = 50): Observable<PagedResult<UserProfile>> {
    return this.http.get<{
      items: UserProfileApiDto[];
      totalCount: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`${this.base}`, { params: { page: page.toString(), pageSize: pageSize.toString() } }).pipe(
      map(result => ({
        items: result.items.map(dto => this.mapProfile(dto)),
        totalCount: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages ?? Math.ceil(result.totalCount / result.pageSize),
      })),
    );
  }

  /**
   * [Admin] Actualiza el perfil de cualquier usuario.
   * PUT /api/users/{uid}
   */
  adminUpdateUser(uid: string, patch: UserProfileUpdate): Observable<UserProfile> {
    const body: Partial<SyncUserDto> = {
      displayName: patch.displayName,
      career: patch.career,
      zone: patch.zone,
      phone: patch.phone,
    };
    const cleanBody: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) cleanBody[k] = v;
    }
    return this.http.put<UserProfileApiDto>(`${this.base}/${uid}`, cleanBody).pipe(
      map(dto => this.mapProfile(dto)),
    );
  }

  /**
   * [Admin] Activa/desactiva un usuario.
   * POST /api/users/{uid}/toggle-disabled
   */
  toggleDisabled(uid: string): Observable<UserProfile> {
    return this.http.post<UserProfileApiDto>(`${this.base}/${uid}/toggle-disabled`, {}).pipe(
      map(dto => this.mapProfile(dto)),
    );
  }

  /**
   * Sube una imagen a Cloudinary usando Unsigned Upload
   */
  uploadProfilePicture(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'uride_profiles');
    
    const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/dyfjz9q5h/image/upload';
    
    return this.http.post<any>(cloudinaryUrl, formData).pipe(
      map(res => res.secure_url)
    );
  }
}
