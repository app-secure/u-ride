export type TripRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'cancelled_by_passenger';

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
