export interface Vehicle {
  id: number;
  brand: string;
  modelOrBusNumber: string;
  plate: string;
  color: string;
  seats: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateVehicleDto {
  brand: string;
  modelOrBusNumber: string;
  plate: string;
  color: string;
  seats: number;
}

export type UpdateVehicleDto = CreateVehicleDto;
