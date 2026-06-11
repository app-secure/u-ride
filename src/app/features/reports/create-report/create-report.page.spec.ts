import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../../core/auth/auth.service';
import { ReportsService } from '../../../core/services/reports.service';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { CreateReportPage } from './create-report.page';

describe('CreateReportPage', () => {
  let component: CreateReportPage;
  let fixture: ComponentFixture<CreateReportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateReportPage, IonicModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ reportedUid: 'reportedUid' }),
              queryParamMap: convertToParamMap({ tripId: 'tripId' }),
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            getCurrentUserOrThrow: jasmine
              .createSpy('getCurrentUserOrThrow')
              .and.resolveTo({ uid: 'uid' }),
          },
        },
        {
          provide: ReportsService,
          useValue: {
            createReport: jasmine.createSpy('createReport').and.resolveTo(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jasmine.createSpy('log').and.resolveTo(),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateReportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
