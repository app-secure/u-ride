import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../services/users.service';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../../environments/environment';
import { of } from 'rxjs';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: jasmine.SpyObj<UsersService>;
  let mockAuth: any;

  beforeEach(() => {
    environment.institutionEmailDomain = 'uta.edu.ec';

    mockUsersService = jasmine.createSpyObj('UsersService', ['syncUserWithDetails', 'syncUser']);
    mockUsersService.syncUserWithDetails.and.returnValue(of({} as any));
    mockUsersService.syncUser.and.returnValue(of({} as any));

    mockAuth = { currentUser: { uid: '12345', email: 'estudiante@uta.edu.ec' } };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: mockAuth },
        { provide: UsersService, useValue: mockUsersService }
      ]
    });

    authService = TestBed.inject(AuthService);
  });

  // Requisito: RF1 | Caso de Prueba: CP-RF001-02 (Registro - Rechazo por dominio inválido)
  it('Debe rechazar el registro y arrojar error si el correo NO es institucional', async () => {
    const payload = {
      email: 'usuario@gmail.com',
      password: 'Password123',
      firstName: 'Usuario',
      lastName: 'Prueba',
      career: 'Software',
      phone: '0999999999',
      zone: 'Centro'
    };

    try {
      await authService.register(payload);
      fail('Se esperaba que falle la promesa');
    } catch (e: any) {
      expect(e.message).toBe('EMAIL_DOMAIN_NOT_ALLOWED');
    }
  });
});
