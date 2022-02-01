/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { By } from '@angular/platform-browser';
import { IntroStep, IntroStepperComponent } from './intro-stepper.component';


function getIsVisible(element: HTMLElement) {
  return window.getComputedStyle(element).visibility === 'visible';
}

describe('IntroStepperComponent', () => {
  let component: IntroStepperComponent;
  let fixture: ComponentFixture<IntroStepperComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [IntroStepperComponent],
      imports: [
        MatIconModule,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IntroStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should move through steps', () => {
    expect(component.introSteps[component.currentStepIndex]).toEqual(
      IntroStep.INTRO
    );
    expect(
      fixture.debugElement.query(By.css('.intro-step')).nativeElement
    ).not.toBe(null);
    expect(
      fixture.debugElement.query(By.css('.create-report-step'))
    ).toBeFalsy();
    expect(
      fixture.debugElement.query(By.css('.save-share-report-step'))
    ).toBeFalsy();

    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.back.arrow')).nativeElement
      )
    ).toBe(false);
    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.forward.arrow')).nativeElement
      )
    ).toBe(true);

    fixture.debugElement.query(By.css('.forward.arrow')).nativeElement.click();
    fixture.detectChanges();

    expect(component.introSteps[component.currentStepIndex]).toEqual(
      IntroStep.CREATE_REPORT
    );
    expect(fixture.debugElement.query(By.css('.intro-step'))).toBeFalsy();
    expect(
      fixture.debugElement.query(By.css('.create-report-step')).nativeElement
    ).not.toBe(null);
    expect(
      fixture.debugElement.query(By.css('.save-share-report-step'))
    ).toBeFalsy();

    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.back.arrow')).nativeElement
      )
    ).toBe(true);
    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.forward.arrow')).nativeElement
      )
    ).toBe(true);

    fixture.debugElement.query(By.css('.forward.arrow')).nativeElement.click();
    fixture.detectChanges();

    expect(component.introSteps[component.currentStepIndex]).toEqual(
      IntroStep.SAVE_SHARE_REPORT
    );
    expect(fixture.debugElement.query(By.css('.intro-step'))).toBeFalsy();
    expect(
      fixture.debugElement.query(By.css('.create-report-step'))
    ).toBeFalsy();
    expect(
      fixture.debugElement.query(By.css('.save-share-report-step'))
        .nativeElement
    ).not.toBe(null);

    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.back.arrow')).nativeElement
      )
    ).toBe(true);
    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.forward.arrow')).nativeElement
      )
    ).toBe(false);

    fixture.debugElement.query(By.css('.back.arrow')).nativeElement.click();
    fixture.detectChanges();

    expect(component.introSteps[component.currentStepIndex]).toEqual(
      IntroStep.CREATE_REPORT
    );
    expect(fixture.debugElement.query(By.css('.intro-step'))).toBeFalsy();
    expect(
      fixture.debugElement.query(By.css('.create-report-step')).nativeElement
    ).not.toBe(null);
    expect(
      fixture.debugElement.query(By.css('.save-share-report-step'))
    ).toBeFalsy();

    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.back.arrow')).nativeElement
      )
    ).toBe(true);
    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.forward.arrow')).nativeElement
      )
    ).toBe(true);

    fixture.debugElement.query(By.css('.back.arrow')).nativeElement.click();
    fixture.detectChanges();

    expect(component.introSteps[component.currentStepIndex]).toEqual(
      IntroStep.INTRO
    );
    expect(
      fixture.debugElement.query(By.css('.intro-step')).nativeElement
    ).not.toBe(null);
    expect(
      fixture.debugElement.query(By.css('.create-report-step'))
    ).toBeFalsy();
    expect(
      fixture.debugElement.query(By.css('.save-share-report-step'))
    ).toBeFalsy();

    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.back.arrow')).nativeElement
      )
    ).toBe(false);
    expect(
      getIsVisible(
        fixture.debugElement.query(By.css('.forward.arrow')).nativeElement
      )
    ).toBe(true);
  });
});
