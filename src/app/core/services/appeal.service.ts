import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Appeal {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  adminNotes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppealService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appeals`;

  createAppeal(reason: string): Observable<any> {
    return this.http.post(this.apiUrl, { reason });
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
}
