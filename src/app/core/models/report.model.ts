export type ReportStatus = 'open' | 'in_review' | 'resolved';
export type ReportAction = 'warned' | 'suspended' | 'none';

export interface Report {
  id: string;
  reporterUid: string;
  reportedUid: string;
  tripId?: string; // Opcional para reportes fuera de viajes si existieran
  reason: string;
  evidenceUrl?: string;
  status: ReportStatus;
  action?: ReportAction;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}
