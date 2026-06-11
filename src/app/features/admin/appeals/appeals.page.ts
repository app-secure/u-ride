import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonSpinner,
  IonRefresher, IonRefresherContent, IonIcon, IonButton,
  IonBadge, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, closeCircleOutline, refreshOutline, documentTextOutline, timeOutline, imageOutline, closeOutline } from 'ionicons/icons';
import { AppealService, Appeal } from '../../../core/services/appeal.service';

@Component({
  selector: 'app-appeals',
  templateUrl: './appeals.page.html',
  styleUrls: ['./appeals.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonSpinner,
    IonRefresher, IonRefresherContent, IonIcon
  ]
})
export class AppealsPage implements OnInit {
  private appealService = inject(AppealService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  appeals: Appeal[] = [];
  isLoading = true;
  selectedAppeal: Appeal | null = null;
  showEvidenceModal = false;

  constructor() {
    addIcons({ shieldCheckmarkOutline, closeCircleOutline, refreshOutline, documentTextOutline, timeOutline, imageOutline, closeOutline });
  }

  ngOnInit() {
    this.loadAppeals();
  }

  async loadAppeals(event?: any) {
    if (!event) this.isLoading = true;
    try {
      this.appeals = await this.appealService.getAllAppeals().toPromise() || [];
    } catch (e) {
      console.error(e);
      this.showToast('Error al cargar apelaciones', 'danger');
    } finally {
      this.isLoading = false;
      if (event) event.target.complete();
    }
  }

  async processAppeal(appeal: Appeal, approve: boolean) {
    const actionText = approve ? 'aprobar' : 'rechazar';
    
    const alert = await this.alertCtrl.create({
      header: `¿${approve ? 'Aprobar' : 'Rechazar'} apelación?`,
      message: `El usuario ${appeal.userName} será ${approve ? 'desbloqueado' : 'mantenido bloqueado'}.`,
      inputs: [
        {
          name: 'adminNotes',
          type: 'textarea',
          placeholder: 'Notas del administrador (opcional)'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: approve ? 'Aprobar' : 'Rechazar',
          role: 'confirm',
          handler: async (data) => {
            try {
              await this.appealService.processAppeal(appeal.id, approve, data.adminNotes).toPromise();
              this.showToast(`Apelación ${approve ? 'aprobada' : 'rechazada'} correctamente.`);
              this.loadAppeals();
            } catch (e: any) {
              this.showToast(e.error?.message || 'Error al procesar apelación.', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  openEvidenceModal(appeal: Appeal): void {
    this.selectedAppeal = appeal;
    this.showEvidenceModal = true;
  }

  closeEvidenceModal(): void {
    this.showEvidenceModal = false;
    this.selectedAppeal = null;
  }

  async showToast(msg: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
