import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

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
          provide: TripsService,
          useValue: {
            requests$: jasmine.createSpy('requests$').and.returnValue(of([])),
            trip$: jasmine.createSpy('trip$').and.returnValue(of(undefined)),
            setRequestStatus: jasmine.createSpy('setRequestStatus').and.resolveTo(),
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
