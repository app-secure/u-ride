export interface TripReview {
  id: string;
  tripId: string;

  fromUid: string;
  toUid: string;

  stars: number; // 1..5
  comment?: string;

  createdAt: string;
  updatedAt: string;
}
