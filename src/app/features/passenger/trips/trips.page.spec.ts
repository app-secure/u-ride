import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { TripRequestsService } from '../../../core/services/trip-requests.service';
import { TripsService } from '../../../core/services/trips.service';
import { TripsPage } from './trips.page';

describe('TripsPage', () => {
  let component: TripsPage;
  let fixture: ComponentFixture<TripsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripsPage, IonicModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user$: of(null),
          },
        },
        {
          provide: TripsService,
          useValue: {
            tripRoutes$: jasmine.createSpy('tripRoutes$').and.returnValue(of([])),
            searchTrips: jasmine.createSpy('searchTrips').and.returnValue(of({ items: [] })),
          },
        },
        {
          provide: TripRequestsService,
          useValue: {
            getMyRequests: jasmine.createSpy('getMyRequests').and.returnValue(of([])),
            cancelRequest: jasmine.createSpy('cancelRequest').and.returnValue(of(undefined)),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TripsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
