import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Vehicle } from '../../../../core/models/vehicle.model';
import { VehiclesService } from '../../../../core/services/vehicles.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-vehicle-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="close()" fill="clear">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modal-content">
      <form [formGroup]="form" (ngSubmit)="save()" class="vehicle-form">

        <div class="modal-icon-header">
          <div class="icon-circle">
            <ion-icon name="car-sport-outline"></ion-icon>
          </div>
          <p>{{ isEdit ? 'Actualiza los datos de tu vehículo' : 'Ingresa los datos de tu nuevo vehículo' }}</p>
        </div>

        <!-- Marca -->
        <div class="input-group">
          <label>Marca</label>
          <div class="custom-input-box">
            <ion-icon name="car-outline" class="icon-gray"></ion-icon>
            <input type="text" formControlName="brand" placeholder="Ej: Chevrolet, Toyota..." maxlength="40" />
          </div>
          <span class="error-msg" *ngIf="form.controls.brand.invalid && form.controls.brand.touched">
            La marca es obligatoria.
          </span>
        </div>

        <!-- Modelo -->
        <div class="input-group">
          <label>Modelo</label>
          <div class="custom-input-box">
            <ion-icon name="car-sport-outline" class="icon-gray"></ion-icon>
            <input type="text" formControlName="modelOrBusNumber" placeholder="Ej: Corolla, Aveo" maxlength="40" />
          </div>
          <span class="error-msg" *ngIf="form.controls.modelOrBusNumber.invalid && form.controls.modelOrBusNumber.touched">
            El modelo es obligatorio.
          </span>
        </div>

        <!-- Placa -->
        <div class="input-group">
          <label>Placa</label>
          <div class="custom-input-box">
            <ion-icon name="barcode-outline" class="icon-gray"></ion-icon>
            <input type="text" formControlName="plate" placeholder="Ej: ABC-1234" autocapitalize="characters" (input)="onVehiclePlateInput($event)" />
          </div>
          <span class="hint">Formato obligatorio: 3 letras, guion y 4 números.</span>
          <span class="error-msg" *ngIf="form.controls.plate.invalid && form.controls.plate.touched">
            <span *ngIf="form.controls.plate.hasError('pattern')">La placa debe tener el formato ABC-1234.</span>
            <span *ngIf="form.controls.plate.hasError('required')">La placa es obligatoria.</span>
          </span>
        </div>

        <!-- Color -->
        <div class="input-group">
          <label>Color</label>
          <div class="custom-input-box">
            <ion-icon name="color-palette-outline" class="icon-gray"></ion-icon>
            <input type="text" formControlName="color" placeholder="Ej: Blanco, Negro, Rojo..." maxlength="40" (keydown)="blockInvalidColor($event)" (input)="sanitizeColorInput($event)" />
          </div>
          <span class="error-msg" *ngIf="form.controls.color.invalid && form.controls.color.touched">
            El color es obligatorio.
          </span>
        </div>

        <!-- Asientos -->
        <div class="input-group">
          <label>Número de asientos disponibles</label>
          <div class="custom-input-box">
            <ion-icon name="people-outline" class="icon-gray"></ion-icon>
            <input type="number" formControlName="seats" placeholder="Ej: 4" min="1" max="50" (keydown)="blockInvalidNumber($event)" (input)="sanitizeNumberInput($event)" />
          </div>
          <span class="hint">No excedas la capacidad legal de tu vehículo</span>
          <span class="error-msg" *ngIf="form.controls.seats.invalid && form.controls.seats.touched">
            Ingresa un número entre 1 y 50.
          </span>
        </div>

        <ion-button
          expand="block"
          type="submit"
          [disabled]="form.invalid || isSaving"
          class="save-btn"
        >
          <ion-spinner *ngIf="isSaving" name="crescent"></ion-spinner>
          <span *ngIf="!isSaving">
            <ion-icon [name]="isEdit ? 'save-outline' : 'add-circle-outline'" slot="start"></ion-icon>
            {{ isEdit ? 'Guardar cambios' : 'Agregar vehículo' }}
          </span>
        </ion-button>

      </form>
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: white;
      --border-color: transparent;
      box-shadow: 0 1px 0 #f1f5f9;
    }

    .modal-content {
      --background: #f8fafc;
    }

    .vehicle-form {
      padding: 20px 20px 40px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .modal-icon-header {
      text-align: center;
      padding: 8px 0 4px;

      .icon-circle {
        width: 60px;
        height: 60px;
        border-radius: 16px;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px;

        ion-icon {
          font-size: 28px;
          color: white;
        }
      }

      p {
        color: #64748b;
        font-size: 14px;
        margin: 0;
      }
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
      }
    }

    .custom-input-box {
      display: flex;
      align-items: center;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0 16px;
      transition: all 0.2s ease;

      &:focus-within {
        border-color: #000000;
        box-shadow: 0 0 0 3px rgba(0,0,0,0.08);
      }

      ion-icon.icon-gray {
        font-size: 20px;
        color: #94a3b8;
        margin-right: 12px;
        flex-shrink: 0;
      }

      input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #1e293b;
        font-size: 15px;
        font-family: inherit;
        height: 48px;
        width: 100%;
      }
    }

    .hint {
      font-size: 12px;
      color: #94a3b8;
    }

    .error-msg {
      font-size: 12px;
      color: #ef4444;
      font-weight: 500;
    }

    .save-btn {
      margin-top: 8px;
      --border-radius: 14px;
      --background: #000000;
      font-weight: 700;
      text-transform: none;
      height: 52px;
      font-size: 16px;
    }

    @media (prefers-color-scheme: dark) {
      ion-toolbar {
        --background: #1e293b;
        --border-color: #334155;
        box-shadow: none;
        color: #f8fafc;
        border-bottom: 1px solid #334155;
      }

      ion-button[fill="clear"] {
        color: #f8fafc;
      }

      .modal-content {
        --background: #0f172a;
      }

      .modal-icon-header p {
        color: #cbd5e1;
      }

      .input-group label {
        color: #e2e8f0;
      }

      .custom-input-box {
        background: #1e293b;
        border-color: #334155;
        color-scheme: dark;

        &:focus-within {
          background: #0f172a;
          border-color: #f8fafc;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
        }

        input {
          color: #f8fafc;
        }
      }

      .icon-gray {
        color: #94a3b8;
      }

      .save-btn {
        --background: #e2e8f0;
        --color: #0f172a;
      }
    }
  `],
})
export class VehicleModalComponent implements OnInit {
  @Input() vehicle?: Vehicle;

  private readonly modalCtrl      = inject(ModalController);
  private readonly fb             = inject(FormBuilder);
  private readonly vehiclesService = inject(VehiclesService);
  private readonly toastCtrl      = inject(ToastController);

  isEdit   = false;
  isSaving = false;

  form = this.fb.nonNullable.group({
    brand:           ['', [Validators.required]],
    modelOrBusNumber:['', [Validators.required]],
    plate:           ['', [Validators.required, Validators.pattern(/^[A-Z]{3}-\d{4}$/)]],
    color:           ['', [Validators.required]],
    seats:           [4,  [Validators.required, Validators.min(1), Validators.max(50)]],
  });

  ngOnInit(): void {
    if (this.vehicle) {
      this.isEdit = true;
      this.form.patchValue({
        brand:            this.vehicle.brand,
        modelOrBusNumber: this.vehicle.modelOrBusNumber,
        plate:            this.vehicle.plate,
        color:            this.vehicle.color,
        seats:            this.vehicle.seats,
      });
    }
  }

  close(role = 'cancel'): void {
    this.modalCtrl.dismiss(null, role);
  }

  onVehiclePlateInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    const formatted = this.formatVehiclePlate(input.value);
    input.value = formatted;
    this.form.controls.plate.setValue(formatted);
  }

  private formatVehiclePlate(value: string): string {
    const letters = (value.match(/[A-Z]/gi) ?? []).join('').toUpperCase().slice(0, 3);
    const numbers = (value.match(/\d/g) ?? []).join('').slice(0, 4);

    if (!letters) return '';
    if (numbers) return `${letters}-${numbers}`;
    return letters.length === 3 ? `${letters}-` : letters;
  }

  blockInvalidNumber(event: KeyboardEvent, allowDecimal = false): void {
    const blockedKeys = ['e', 'E', '+', '-'];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
    if (!allowDecimal && event.key === '.') {
      event.preventDefault();
    }
  }

  sanitizeNumberInput(event: Event, allowDecimal = false): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    let value = input.value;

    if (allowDecimal) {
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      value = value.replace(/[^0-9]/g, '');
    }

    if (input.value !== value) {
      input.value = value;
    }
  }

  blockInvalidColor(event: KeyboardEvent): void {
    const allowedKeys = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/;
    // Si la tecla presionada es un solo caracter y no es una letra o espacio, la bloqueamos
    if (event.key.length === 1 && !allowedKeys.test(event.key)) {
      event.preventDefault();
    }
  }

  sanitizeColorInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    // Quitamos cualquier símbolo o número que se haya pegado ignorando el block de teclado
    const value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');

    if (input.value !== value) {
      input.value = value;
      this.form.controls.color.setValue(value);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const dto = this.form.getRawValue();

    try {
      if (this.isEdit && this.vehicle) {
        await firstValueFrom(this.vehiclesService.updateVehicle(this.vehicle.id, dto));
      } else {
        await firstValueFrom(this.vehiclesService.createVehicle(dto));
      }
      this.close('confirm');
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Error al guardar el vehículo. Inténtalo de nuevo.',
        duration: 2200,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    } finally {
      this.isSaving = false;
    }
  }
}
