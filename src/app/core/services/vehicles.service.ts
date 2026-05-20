import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Vehicle, CreateVehicleDto, UpdateVehicleDto } from '../models/vehicle.model';

@Injectable({
  providedIn: 'root'
})
export class VehiclesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vehicles`;

  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.baseUrl}/me`);
  }

  getVehicleById(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.baseUrl}/${id}`);
  }

  createVehicle(dto: CreateVehicleDto): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.baseUrl, dto);
  }

  updateVehicle(id: number, dto: UpdateVehicleDto): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${this.baseUrl}/${id}`, dto);
  }

  deleteVehicle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
