import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilePage } from './profile.page';
import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;
  let mockUsersService: jasmine.SpyObj<UsersService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockLocation: jasmine.SpyObj<Location>;

  beforeEach(async () => {
    mockUsersService = jasmine.createSpyObj('UsersService', ['updateProfile', 'profile$']);
    mockUsersService.updateProfile.and.returnValue(of({} as any));
    mockUsersService.profile$.and.returnValue(of({
      uid: '123',
      displayName: 'Cristian Jurado',
      career: 'Software',
      zone: 'Ficoa',
      phone: '0999999999'
    } as any));

    mockAuthService = jasmine.createSpyObj('AuthService', ['logout']);
    // mock property user$ as observable
    (mockAuthService as any).user$ = of({ uid: '123', email: 'test@uta.edu.ec' });

    mockLocation = jasmine.createSpyObj('Location', ['back']);

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ReactiveFormsModule, ProfilePage],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Location, useValue: mockLocation },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Requisito: RF2 | Caso de Prueba: CP-RF002-01 (Gestión de perfil - Caso exitoso)
  it('Debe actualizar los datos del perfil exitosamente', async () => {
    component.uid = '123';
    component.form.patchValue({
      displayName: 'Cristian Editado',
      zone: 'Huachi',
      career: 'Software',
      phone: '0999999999'
    });

    await component.save();
    
    expect(mockUsersService.updateProfile).toHaveBeenCalledWith(jasmine.objectContaining({
      displayName: 'Cristian Editado',
      zone: 'Huachi'
    }));
  });

  // Requisito: RF2 | Caso de Prueba: CP-RF002-02 (Gestión de perfil - Faltan campos obligatorios)
  it('No debe llamar al servicio si el formulario es inválido (falta zona)', async () => {
    component.uid = '123';
    component.form.patchValue({
      displayName: 'Cristian',
      zone: '', // Requerido vacío
      career: 'Software'
    });

    await component.save();
    expect(component.form.valid).toBeFalsy();
    expect(mockUsersService.updateProfile).not.toHaveBeenCalled();
  });
});
