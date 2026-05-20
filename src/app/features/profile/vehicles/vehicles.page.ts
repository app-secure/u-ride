import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { Location } from '@angular/common';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { Vehicle } from '../../../core/models/vehicle.model';
import { firstValueFrom } from 'rxjs';
import { VehicleModalComponent } from './vehicle-modal/vehicle-modal.component';

@Component({
  selector: 'app-vehicles',
  templateUrl: './vehicles.page.html',
  styleUrls: ['./vehicles.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class VehiclesPage implements OnInit {
  private readonly vehiclesService = inject(VehiclesService);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);
  private readonly location = inject(Location);

  vehicles: Vehicle[] = [];
  isLoading = true;

  ngOnInit() {
    this.loadVehicles();
  }

  async loadVehicles() {
    this.isLoading = true;
    try {
      this.vehicles = await firstValueFrom(this.vehiclesService.getVehicles());
    } catch (error) {
      this.showToast('Error al cargar los vehículos.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async openModal(vehicle?: Vehicle) {
    const modal = await this.modalCtrl.create({
      component: VehicleModalComponent,
      componentProps: { vehicle }
    });

    modal.onDidDismiss().then((result) => {
      if (result.role === 'confirm') {
        this.loadVehicles(); // Recargar después de añadir/editar
      }
    });

    await modal.present();
  }

  async deleteVehicle(vehicle: Vehicle) {
    try {
      await firstValueFrom(this.vehiclesService.deleteVehicle(vehicle.id));
      this.showToast('Vehículo eliminado.', 'success');
      this.loadVehicles();
    } catch (error) {
      this.showToast('Error al eliminar el vehículo.', 'danger');
    }
  }

  goBack() {
    this.location.back();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }
}
