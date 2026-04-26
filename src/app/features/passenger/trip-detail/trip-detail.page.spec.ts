import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { TripsService } from '../../../core/services/trips.service';
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
            user$: of(null),
          },
        },
        {
          provide: UsersService,
          useValue: {
            profile$: jasmine.createSpy('profile$').and.returnValue(of(undefined)),
          },
        },
        {
          provide: TripsService,
          useValue: {
            trip$: jasmine.createSpy('trip$').and.returnValue(of(undefined)),
            passengerRequest$: jasmine.createSpy('passengerRequest$').and.returnValue(of(undefined)),
            driverLiveLocation$: jasmine.createSpy('driverLiveLocation$').and.returnValue(of(undefined)),
            requestToJoin: jasmine.createSpy('requestToJoin').and.resolveTo(),
            completeTrip: jasmine.createSpy('completeTrip').and.resolveTo(),
            setDriverLiveActive: jasmine.createSpy('setDriverLiveActive').and.resolveTo(),
            setDriverLiveLocation: jasmine.createSpy('setDriverLiveLocation').and.resolveTo(),
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
            hasReviewed: jasmine.createSpy('hasReviewed').and.resolveTo(false),
          },
        },
        {
          provide: ReportsService,
          useValue: {
            hasReported: jasmine.createSpy('hasReported').and.resolveTo(false),
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
