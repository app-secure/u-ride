import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface PayPalCreateOrderResponse {
  orderId: string;
  approveUrl: string;
}

@Injectable({ providedIn: 'root' })
export class PayPalPaymentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/payments/paypal`;

  createOrder(tripRequestId: string): Observable<PayPalCreateOrderResponse> {
    return this.http.post<PayPalCreateOrderResponse>(`${this.base}/orders`, {
      tripRequestId,
    });
  }
}
