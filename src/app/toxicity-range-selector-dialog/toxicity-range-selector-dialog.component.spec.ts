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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToxicityRangeFilterComponent } from '../toxicity-range-filter/toxicity-range-filter.component';
import { ToxicityRangeSelectorDialogComponent } from './toxicity-range-selector-dialog.component';

describe('ToxicityRangeSelectorDialogComponent', () => {
  let component: ToxicityRangeSelectorDialogComponent;
  let fixture: ComponentFixture<ToxicityRangeSelectorDialogComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [
          ToxicityRangeFilterComponent,
          ToxicityRangeSelectorDialogComponent,
        ],
        imports: [
          FormsModule,
          MatCheckboxModule,
          MatDialogModule,
          MatFormFieldModule,
          MatIconModule,
          MatInputModule,
          MatSliderModule,
          NoopAnimationsModule,
          ReactiveFormsModule,
        ],
        providers: [{ provide: MatDialogRef, useValue: {} }],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(ToxicityRangeSelectorDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('input field updates should update the slider position', () => {
    const sliderComponent = fixture.debugElement.query(
      By.css('app-toxicity-range-filter')
    ).componentInstance;
    expect(sliderComponent.toxicityRangeFilter.minScore).toEqual(0);
    expect(sliderComponent.toxicityRangeFilter.maxScore).toEqual(1);
    expect(component.minScoreFormControl.value).toEqual(0);
    expect(component.maxScoreFormControl.value).toEqual(100);

    component.minScoreFormControl.setValue(20);
    component.maxScoreFormControl.setValue(80);
    fixture.detectChanges();

    expect(sliderComponent.toxicityRangeFilter.minScore).toEqual(0.2);
    expect(sliderComponent.toxicityRangeFilter.maxScore).toEqual(0.8);
  });

  it('slider position adjustments should update the input fields', () => {
    const sliderComponent = fixture.debugElement.query(
      By.css('app-toxicity-range-filter')
    ).componentInstance;
    expect(sliderComponent.toxicityRangeFilter.minScore).toEqual(0);
    expect(sliderComponent.toxicityRangeFilter.maxScore).toEqual(1);
    expect(component.minScoreFormControl.value).toEqual(0);
    expect(component.maxScoreFormControl.value).toEqual(100);

    sliderComponent.toxicityRangeFilter = {
      minScore: 0.2,
      maxScore: 0.8,
      includeUnscored: false,
    };
    fixture.detectChanges();

    expect(component.minScoreFormControl.value).toEqual(20);
    expect(component.maxScoreFormControl.value).toEqual(80);
  });
});
