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

import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToxicityRangeFilterComponent } from './toxicity-range-filter.component';


function getIsElementVisible(element: HTMLElement): boolean {
  return (
    element != null &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0 &&
    window.getComputedStyle(element).display !== 'none'
  );
}

describe('ToxicityRangeFilterComponent', () => {
  let component: ToxicityRangeFilterComponent;
  let fixture: ComponentFixture<ToxicityRangeFilterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ToxicityRangeFilterComponent],
      imports: [
        FormsModule,
        MatIconModule,
        MatSliderModule,
        NoopAnimationsModule,
        OverlayModule,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ToxicityRangeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('slider renders', () => {
    expect(component.sliderElement.nativeElement.noUiSlider).toBeTruthy();
    // Double check that the slider elements are visible. If the CSS file is
    // missing, the elements will appear in the DOM but will not be visible.
    expect(
      getIsElementVisible(
        fixture.debugElement.query(By.css('.noUi-base')).nativeElement
      )
    ).toBe(true);
  });
});
