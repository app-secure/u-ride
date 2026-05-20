import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule, ToastController, ModalController, AlertController } from '@ionic/angular';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { Vehicle } from '../../../core/models/vehicle.model';
import { firstValueFrom } from 'rxjs';
import { VehicleModalComponent } from './vehicle-modal/vehicle-modal.component';

@Component({
  selector: 'app-vehicles',
  templateUrl: './vehicles.page.html',
  styleUrls: ['./vehicles.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class VehiclesPage implements OnInit {
  private readonly vehiclesService = inject(VehiclesService);
  private readonly toastCtrl       = inject(ToastController);
  private readonly modalCtrl       = inject(ModalController);
  private readonly alertCtrl       = inject(AlertController);
  private readonly location        = inject(Location);

  vehicles: Vehicle[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.loadVehicles();
  }

  async loadVehicles(): Promise<void> {
    this.isLoading = true;
    try {
      this.vehicles = await firstValueFrom(this.vehiclesService.getVehicles());
    } catch {
      this.showToast('Error al cargar los vehículos.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async openModal(vehicle?: Vehicle): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: VehicleModalComponent,
      componentProps: { vehicle },
      breakpoints: [0, 1],
      initialBreakpoint: 1,
    });

    modal.onDidDismiss().then(result => {
      if (result.role === 'confirm') {
        this.loadVehicles();
      }
    });

    await modal.present();
  }

  async confirmDelete(vehicle: Vehicle): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar vehículo',
      message: `¿Estás seguro de que deseas eliminar el ${vehicle.brand} ${vehicle.modelOrBusNumber} (${vehicle.plate})?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.deleteVehicle(vehicle),
        },
      ],
    });
    await alert.present();
  }

  private async deleteVehicle(vehicle: Vehicle): Promise<void> {
    try {
      await firstValueFrom(this.vehiclesService.deleteVehicle(vehicle.id));
      this.showToast('Vehículo eliminado correctamente.', 'success');
      this.vehicles = this.vehicles.filter(v => v.id !== vehicle.id);
    } catch {
      this.showToast('Error al eliminar el vehículo.', 'danger');
    }
  }

  goBack(): void {
    this.location.back();
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
