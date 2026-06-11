import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Trip } from '../../../core/models/trip.model';
import { TripRequestsService } from '../../../core/services/trip-requests.service';
import { PayPalPaymentsService } from '../../../core/services/paypal-payments.service';
import { firstValueFrom } from 'rxjs';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-payment-modal',
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class PaymentModalComponent implements OnInit, OnDestroy {
  @Input() trip!: Trip;
  @Input() myRequestStatus!: string;
  @Input() myRequestId!: string;

  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private tripRequests = inject(TripRequestsService);
  private payPal = inject(PayPalPaymentsService);

  paymentStep: 'selection' | 'qr' | 'processing' | 'success' = 'selection';
  selectedPaymentMethod: string | null = null;
  processingPayment = false;
  paymentReferenceCode = '';
  qrExpirationTime = 120;

  paymentMethods = [
    { id: 'card', label: 'PayPal / Tarjeta', icon: 'card-outline', color: '#0070ba' },
    { id: 'transfer', label: 'Transferencia Directa', icon: 'swap-horizontal-outline', color: '#6366f1' },
    { id: 'cash', label: 'Efectivo al Conductor', icon: 'cash-outline', color: '#f59e0b' }
  ];

  private paypalPopup: Window | null = null;
  private paypalPopupPoll?: number;

  ngOnInit() {
    // Escuchar mensajes de PayPal en caso de redirección OAuth exitosa o error en ventana popup
    window.addEventListener('message', this.handlePaypalMessage);
  }

  ngOnDestroy() {
    this.stopPayPalPopupPolling();
    window.removeEventListener('message', this.handlePaypalMessage);
  }

  private handlePaypalMessage = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'paypal') {
      this.stopPayPalPopupPolling();
      if (this.paypalPopup && !this.paypalPopup.closed) {
        this.paypalPopup.close();
      }

      const status = event.data.status; // 'success' | 'cancel' | 'error'
      if (status === 'success') {
        this.paymentStep = 'success';
        this.paymentReferenceCode = this.generateReferenceCode();
        setTimeout(() => this.closePaymentModal(true), 4000);

        const t = await this.toastCtrl.create({
          message: '✓ Pago completado con PayPal.',
          duration: 3000, position: 'top', color: 'success'
        });
        await t.present();
      } else {
        this.paymentStep = 'selection';
        this.selectedPaymentMethod = null;
        this.processingPayment = false;
        
        const t = await this.toastCtrl.create({
          message: status === 'cancel' ? 'Cancelaste el pago con PayPal.' : 'Error al procesar PayPal.',
          duration: 3500, position: 'top', color: status === 'cancel' ? 'warning' : 'danger'
        });
        await t.present();
      }
    }
  };

  closePaymentModal(success: boolean = false) {
    this.modalCtrl.dismiss({ success });
  }

  selectPaymentMethod(methodId: string): void {
    this.selectedPaymentMethod = methodId;

    if (methodId === 'card') {
      this.startPayPalCheckout();
    } else if (methodId === 'qr') {
      this.paymentStep = 'qr';
      this.generatePaymentQR();
    } else {
      this.processPayment();
    }
  }

  async startPayPalCheckout(): Promise<void> {
    if (!this.trip || !this.myRequestId) return;
    this.paymentStep = 'processing';
    this.processingPayment = true;

    try {
      const res = await firstValueFrom(this.payPal.createOrder(this.myRequestId));

      if (!Capacitor.isNativePlatform()) {
        const popup = this.openPayPalPopup(res.approveUrl);
        if (popup) {
          this.paypalPopup = popup;
          this.startPayPalPopupPolling();
          return;
        }

        const toast = await this.toastCtrl.create({
          message: 'Tu navegador bloqueó la ventana emergente. Permite popups e intenta de nuevo.',
          duration: 4200, position: 'top', color: 'warning',
        });
        await toast.present();

        this.paymentStep = 'selection';
        this.selectedPaymentMethod = null;
        this.processingPayment = false;
        return;
      }

      await Browser.open({ url: res.approveUrl });
      this.processingPayment = false;
    } catch (e: any) {
      let msg = 'No se pudo iniciar el pago con PayPal.';
      
      if (e.error?.message === 'Esta solicitud ya ha sido pagada.') {
        msg = 'El pago ya se había concretado exitosamente.';
        this.paymentStep = 'success';
        setTimeout(() => this.closePaymentModal(true), 2500);
        
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 3500, position: 'top', color: 'success',
        });
        await toast.present();
        return;
      } else if (e.error?.message) {
        msg = e.error.message;
      }

      const toast = await this.toastCtrl.create({
        message: msg,
        duration: 3500, position: 'top', color: 'danger',
      });
      await toast.present();
      this.paymentStep = 'selection';
      this.selectedPaymentMethod = null;
      this.processingPayment = false;
    }
  }

  private openPayPalPopup(url: string): Window | null {
    const width = 520;
    const height = 720;
    const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.height - height) / 2));
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top}`;
    try {
      const w = window.open('', 'paypal_checkout', features);
      if (!w) return null;
      w.location.href = url;
      return w;
    } catch {
      return null;
    }
  }

  private startPayPalPopupPolling(): void {
    this.stopPayPalPopupPolling();
    this.paypalPopupPoll = window.setInterval(() => {
      if (!this.paypalPopup || this.paypalPopup.closed) {
        this.stopPayPalPopupPolling();
        this.paymentStep = 'selection';
        this.selectedPaymentMethod = null;
        this.processingPayment = false;
        void this.toastCtrl
          .create({
            message: 'Pago cancelado. Puedes intentarlo de nuevo.',
            duration: 3200, position: 'top', color: 'warning',
          })
          .then(t => t.present());
      }
    }, 800);
  }

  private stopPayPalPopupPolling(): void {
    if (this.paypalPopupPoll) {
      window.clearInterval(this.paypalPopupPoll);
      this.paypalPopupPoll = undefined;
    }
  }

  generatePaymentQR(): void {
    this.paymentReferenceCode = this.generateReferenceCode();
    this.qrExpirationTime = 120;

    const interval = setInterval(() => {
      this.qrExpirationTime--;
      if (this.qrExpirationTime <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      this.processPayment();
    }, 3000);
  }

  async processPayment(): Promise<void> {
    if (!this.trip || !this.myRequestId) {
      const toast = await this.toastCtrl.create({
        message: 'No se encontró la solicitud de viaje.',
        duration: 3500, position: 'top', color: 'danger'
      });
      await toast.present();
      return;
    }

    this.paymentStep = 'processing';
    this.processingPayment = true;

    try {
      await firstValueFrom(this.tripRequests.payRequest(this.myRequestId));

      this.paymentStep = 'success';
      this.paymentReferenceCode = this.generateReferenceCode();

      setTimeout(() => {
        this.closePaymentModal(true);
      }, 4000);

      const toast = await this.toastCtrl.create({
        message: '✓ Pago procesado exitosamente.',
        duration: 3000, position: 'top', color: 'success',
      });
      await toast.present();
    } catch (e: any) {
      this.paymentStep = 'selection';
      this.selectedPaymentMethod = null;

      const toast = await this.toastCtrl.create({
        message: 'Error al procesar el pago. Intenta de nuevo.',
        duration: 3500, position: 'top', color: 'danger',
      });
      await toast.present();
    } finally {
      this.processingPayment = false;
    }
  }

  private generateReferenceCode(): string {
    return 'REF-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  }
}
