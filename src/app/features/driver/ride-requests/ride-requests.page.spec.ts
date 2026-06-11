import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ReportsService } from '../../../core/services/reports.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { TripRequestsService } from '../../../core/services/trip-requests.service';
import { TripsService } from '../../../core/services/trips.service';
import { RideRequestsPage } from './ride-requests.page';

describe('RideRequestsPage', () => {
  let component: RideRequestsPage;
  let fixture: ComponentFixture<RideRequestsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RideRequestsPage, IonicModule.forRoot()],
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
          provide: TripsService,
          useValue: {
            getById: jasmine.createSpy('getById').and.returnValue(of(undefined)),
          },
        },
        {
          provide: TripRequestsService,
          useValue: {
            getByTrip: jasmine.createSpy('getByTrip').and.returnValue(of([])),
            acceptRequest: jasmine.createSpy('acceptRequest').and.returnValue(of(undefined)),
            rejectRequest: jasmine.createSpy('rejectRequest').and.returnValue(of(undefined)),
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

    fixture = TestBed.createComponent(RideRequestsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
