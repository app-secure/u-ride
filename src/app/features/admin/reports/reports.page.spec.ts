import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

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
          provide: ReportsService,
          useValue: {
            reports$: jasmine.createSpy('reports$').and.returnValue(of([])),
            resolveReport: jasmine.createSpy('resolveReport').and.resolveTo(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            updateProfile: jasmine.createSpy('updateProfile').and.resolveTo(),
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
