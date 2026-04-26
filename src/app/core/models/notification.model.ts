export interface AppNotification {
  id?: string;
  title: string;
  message: string;
  type: 'trip_accepted' | 'trip_completed' | 'trip_cancelled' | 'system';
  tripId?: string;
  driverUid?: string;
  driverName?: string;
  createdAt: string;
  read: boolean;
}
