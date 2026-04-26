export type TripStatus = 'open' | 'closed' | 'cancelled' | 'completed';

export interface TripRuleSet {
  punctuality: boolean;
  respect: boolean;
  noSensitiveData: boolean;
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
  originLat?: number; // Optional latitude for origin
  originLng?: number; // Optional longitude for origin
  destinationLat?: number; // Optional latitude for destination
  destinationLng?: number; // Optional longitude for destination
  departureAt: string; // ISO
  seatsTotal: number;
  seatsAvailable: number;
  price: number;

  notes?: string;
  vehicleInfo?: {
    plate: string;
    model: string;
    brand: string;
    color: string;
  };
  rules: TripRuleSet;
  status: TripStatus;

  confirmedPassengerUids: string[];

  createdAt: string;
  updatedAt: string;
}

export type TripCreate = Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'seatsAvailable' | 'confirmedPassengerUids'>;
