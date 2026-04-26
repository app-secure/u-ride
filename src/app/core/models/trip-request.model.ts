export type TripRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface TripRequest {
  id: string;
  tripId: string;
  passengerUid: string;
  passengerName: string;
  status: TripRequestStatus;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  /** Acciones del conductor (para viajes completados). */
  driverRated?: boolean;
  driverReported?: boolean;
  createdAt: string;
  updatedAt: string;
}
