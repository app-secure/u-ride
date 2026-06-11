import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Appeal {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  reason: string;
  evidenceUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  adminNotes?: string;
}

export interface CreateAppealDto {
  reason: string;
  evidenceUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppealService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appeals`;

  createAppeal(dto: CreateAppealDto): Observable<any> {
    return this.http.post(this.apiUrl, dto);
  }

  getMyAppeals(): Observable<Appeal[]> {
    return this.http.get<Appeal[]>(`${this.apiUrl}/me`);
  }

  getAllAppeals(): Observable<Appeal[]> {
    return this.http.get<Appeal[]>(this.apiUrl);
  }

  processAppeal(id: number, approve: boolean, adminNotes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/process`, { approve, adminNotes });
  }

  /**
   * Sube una evidencia de apelación directamente a Cloudinary.
   */
  uploadEvidence(file: File | Blob): Observable<{ evidenceUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'uride_appeals');

    const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/dyfjz9q5h/image/upload';

    return this.http.post<any>(cloudinaryUrl, formData).pipe(
      map(res => ({ evidenceUrl: res.secure_url }))
    );
  }
}
