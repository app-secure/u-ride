/// <reference types="jasmine" />

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { RoleStateService } from '../../../core/services/role-state.service';
import { UsersService } from '../../../core/services/users.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage, IonicModule.forRoot(), RouterLink],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            login: jasmine.createSpy('login').and.resolveTo(),
            loginWithMicrosoft: jasmine.createSpy('loginWithMicrosoft').and.resolveTo(),
            completeMicrosoftRedirectIfNeeded: jasmine.createSpy('completeMicrosoftRedirectIfNeeded').and.resolveTo(false),
            getCurrentUserOrThrow: jasmine.createSpy('getCurrentUserOrThrow').and.resolveTo({ uid: 'uid' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            profile$: jasmine.createSpy('profile$').and.returnValue(of(undefined)),
          },
        },
        {
          provide: RoleStateService,
          useValue: {
            setRole: jasmine.createSpy('setRole'),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
