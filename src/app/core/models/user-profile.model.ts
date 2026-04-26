import type { AppRoles } from './app-roles.model';

export interface UserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;

  displayName: string;
  career: string;
  zone: string;
  phone?: string;
  photoUrl?: string;

  roles?: AppRoles;

  ratingSum?: number;
  ratingCount?: number;
  tripsCount?: number; // Total
  driverTripsCount?: number;
  passengerTripsCount?: number;

  suspendedUntil?: string | null;

  disabled?: boolean;
}

export type UserProfileUpdate = Partial<Omit<UserProfile, 'uid' | 'email'>>;
