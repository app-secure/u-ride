import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { TripsService } from '../../../core/services/trips.service';
import { TripRequestsService } from '../../../core/services/trip-requests.service';
import { RoleStateService } from '../../../core/services/role-state.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { ReportsService } from '../../../core/services/reports.service';
import { TripDetailPage } from './trip-detail.page';

describe('TripDetailPage', () => {
  let component: TripDetailPage;
  let fixture: ComponentFixture<TripDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripDetailPage, IonicModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ tripId: 'tripId' }),
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            user$: of({ uid: 'uid' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            profile$: jasmine.createSpy('profile$').and.returnValue(of({ uid: 'uid', displayName: 'Test' } as any)),
            getProfile: jasmine.createSpy('getProfile').and.returnValue(of(undefined)),
          },
        },
        {
          provide: TripsService,
          useValue: {
            getById: jasmine.createSpy('getById').and.returnValue(of(undefined)),
          },
        },
        {
          provide: TripRequestsService,
          useValue: {
            getMyRequests: jasmine.createSpy('getMyRequests').and.returnValue(of([])),
          },
        },
        {
          provide: RoleStateService,
          useValue: {
            currentRole: 'passenger',
          },
        },
        {
          provide: ReviewsService,
          useValue: {
            getByTrip: jasmine.createSpy('getByTrip').and.returnValue(of([])),
          },
        },
        {
          provide: ReportsService,
          useValue: {
            createReport: jasmine.createSpy('createReport').and.returnValue(of(undefined)),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TripDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
