import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppealsPage } from './appeals.page';

describe('AppealsPage', () => {
  let component: AppealsPage;
  let fixture: ComponentFixture<AppealsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AppealsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
