import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ReportsService } from '../../../core/services/reports.service';
import { UsersService } from '../../../core/services/users.service';
import { ReportsPage } from './reports.page';

describe('ReportsPage', () => {
  let component: ReportsPage;
  let fixture: ComponentFixture<ReportsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsPage, IonicModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user$: of({ uid: 'uid' }),
            logout: jasmine.createSpy('logout').and.resolveTo(),
          },
        },
        {
          provide: ReportsService,
          useValue: {
            getAll: jasmine.createSpy('getAll').and.returnValue(of({ items: [] })),
            resolveReport: jasmine.createSpy('resolveReport').and.returnValue(of(undefined)),
          },
        },
        {
          provide: UsersService,
          useValue: {
            suspendUser: jasmine.createSpy('suspendUser').and.returnValue(of(undefined)),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
