import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Report } from '../models/report.model';
import type { PagedResult } from '../models/paged-result.model';

/** DTO para crear un reporte. Coincide con CreateReportDto del backend. */
export interface CreateReportDto {
  reportedUid: string;
  tripId?: string;
  reason: string;
  evidenceUrl?: string;
}

/** DTO para resolver un reporte. Coincide con ResolveReportRequest del backend. */
export interface ResolveReportDto {
  action: string;
  adminNotes?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  /**
   * Crea un reporte contra otro usuario.
   * El reporterUid se extrae del token en el backend.
   * POST /api/reports
   */
  createReport(dto: CreateReportDto): Observable<Report> {
    return this.http.post<Report>(this.base, dto);
  }

  /**
   * Sube una evidencia al servidor backend (Coolify local).
   * POST /api/reports/upload-evidence
   */
  uploadEvidence(file: File | Blob): Observable<{ evidenceUrl: string }> {
    const formData = new FormData();
    formData.append('file', file, 'evidence.jpg');
    return this.http.post<{ evidenceUrl: string }>(`${this.base}/upload-evidence`, formData);
  }

  /**
   * [Admin] Obtiene todos los reportes paginados.
   * GET /api/reports?page=...&pageSize=...
   */
  getAll(page: number = 1, pageSize: number = 10): Observable<PagedResult<Report>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PagedResult<Report>>(this.base, { params });
  }

  /**
   * Alias observable para compatibilidad con componentes que usaban reports$(status).
   * Ahora retorna la lista paginada de reportes (la API filtra por estado internamente si aplica).
   */
  reports$(_status: string = 'open'): Observable<PagedResult<Report>> {
    return this.getAll(1, 50);
  }

  /**
   * [Admin] Resuelve un reporte.
   * PATCH /api/reports/{id}/resolve
   */
  resolveReport(id: string, action: string, adminNotes?: string): Observable<Report> {
    const body: ResolveReportDto = { action, adminNotes };
    return this.http.patch<Report>(`${this.base}/${id}/resolve`, body);
  }
}
