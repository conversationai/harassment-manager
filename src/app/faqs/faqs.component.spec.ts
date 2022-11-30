import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FAQSComponent } from './faqs.component';

describe('FAQSComponent', () => {
  let component: FAQSComponent;
  let fixture: ComponentFixture<FAQSComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FAQSComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FAQSComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
