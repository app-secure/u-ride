export interface AppNotification {
  id?: string;
  title: string;
  message: string;
  type: 'trip_accepted' | 'trip_rejected' | 'trip_completed' | 'trip_cancelled' | 'trip_reminder' | 'system';
  tripId?: string;
  driverUid?: string;
  driverName?: string;
  createdAt: string;
  read: boolean;
}
