import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestInvestigationComponent } from './request-investigation.component';

describe('RequestInvestigationComponent', () => {
  let component: RequestInvestigationComponent;
  let fixture: ComponentFixture<RequestInvestigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RequestInvestigationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestInvestigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
