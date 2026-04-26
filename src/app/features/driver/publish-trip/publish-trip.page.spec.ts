import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { TripsService } from '../../../core/services/trips.service';
import { PublishTripPage } from './publish-trip.page';

describe('PublishTripPage', () => {
  let component: PublishTripPage;
  let fixture: ComponentFixture<PublishTripPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishTripPage, IonicModule.forRoot()],
      providers: [
        provideRouter([]),
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
            publishTrip: jasmine.createSpy('publishTrip').and.resolveTo('tripId'),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PublishTripPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
