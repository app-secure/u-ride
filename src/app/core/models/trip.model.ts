export type TripStatus = 'open' | 'inprogress' | 'closed' | 'cancelled' | 'completed' | 'expired';

export interface TripRuleSet {
  punctuality: boolean;
  respect: boolean;
  noSensitiveData: boolean;
}

export interface VehicleInfo {
  plate: string;
  model: string;
  brand: string;
  color: string;
}

export interface Trip {
  id: string;
  driverUid: string;
  driverName: string;
  routeName?: string;
  paymentMethod?: string;
  ruleTexts?: string[];

  originZone: string;
  destinationZone: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  departureAt: string; // ISO
  seatsTotal: number;
  seatsAvailable: number;
  price: number;

  notes?: string;
  vehicle?: VehicleInfo;
  rules: TripRuleSet;
  status: TripStatus;

  confirmedPassengerUids: string[];

  createdAt: string;
  updatedAt: string;
}

/**
 * DTO para crear un viaje. Coincide con CreateTripDto del backend.
 * El backend extrae driverUid y driverName del token JWT.
 */
export interface TripCreate {
  routeName: string;
  paymentMethod: string;
  ruleTexts?: string[];
  originZone: string;
  destinationZone: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  departureAt: string;
  seatsTotal: number;
  price: number;
  notes?: string;
  vehicle: VehicleInfo;
  rules: TripRuleSet;
}
