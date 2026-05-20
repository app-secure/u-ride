import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Vehicle } from '../../../../core/models/vehicle.model';
import { VehiclesService } from '../../../../core/services/vehicles.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-vehicle-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form [formGroup]="form" (ngSubmit)="save()">
        <ion-list lines="full">
          <ion-item>
            <ion-input label="Marca" labelPlacement="stacked" formControlName="brand" placeholder="Ej: Toyota"></ion-input>
          </ion-item>
          
          <ion-item>
            <ion-input label="Modelo / Nro Bus" labelPlacement="stacked" formControlName="modelOrBusNumber" placeholder="Ej: Corolla o 45"></ion-input>
          </ion-item>

          <ion-item>
            <ion-input label="Placa" labelPlacement="stacked" formControlName="plate" placeholder="Ej: ABC-1234"></ion-input>
          </ion-item>

          <ion-item>
            <ion-input label="Color" labelPlacement="stacked" formControlName="color" placeholder="Ej: Rojo"></ion-input>
          </ion-item>

          <ion-item>
            <ion-input label="Número de asientos disponibles" type="number" labelPlacement="stacked" formControlName="seats"></ion-input>
          </ion-item>
        </ion-list>

        <ion-button expand="block" type="submit" [disabled]="form.invalid || isSaving" class="ion-margin-top">
          <ion-spinner *ngIf="isSaving" name="crescent"></ion-spinner>
          <span *ngIf="!isSaving">Guardar</span>
        </ion-button>
      </form>
    </ion-content>
  `,
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class VehicleModalComponent implements OnInit {
  @Input() vehicle?: Vehicle;
  
  private readonly modalCtrl = inject(ModalController);
  private readonly fb = inject(FormBuilder);
  private readonly vehiclesService = inject(VehiclesService);
  private readonly toastCtrl = inject(ToastController);

  isEdit = false;
  isSaving = false;

  form = this.fb.nonNullable.group({
    brand: ['', [Validators.required]],
    modelOrBusNumber: ['', [Validators.required]],
    plate: ['', [Validators.required]],
    color: ['', [Validators.required]],
    seats: [4, [Validators.required, Validators.min(1), Validators.max(50)]]
  });

  ngOnInit() {
    if (this.vehicle) {
      this.isEdit = true;
      this.form.patchValue({
        brand: this.vehicle.brand,
        modelOrBusNumber: this.vehicle.modelOrBusNumber,
        plate: this.vehicle.plate,
        color: this.vehicle.color,
        seats: this.vehicle.seats
      });
    }
  }

  close(role = 'cancel') {
    this.modalCtrl.dismiss(null, role);
  }

  async save() {
    if (this.form.invalid) return;

    this.isSaving = true;
    const dto = this.form.getRawValue();

    try {
      if (this.isEdit && this.vehicle) {
        await firstValueFrom(this.vehiclesService.updateVehicle(this.vehicle.id, dto));
      } else {
        await firstValueFrom(this.vehiclesService.createVehicle(dto));
      }
      this.close('confirm');
    } catch (e) {
      const toast = await this.toastCtrl.create({
        message: 'Error al guardar el vehículo.',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      this.isSaving = false;
    }
  }
}
