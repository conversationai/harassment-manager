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

import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

import { ToxicityRangeFilter } from '../filter_utils';

@Component({
  selector: 'app-toxicity-range-selector-dialog',
  templateUrl: './toxicity-range-selector-dialog.component.html',
  styleUrls: ['./toxicity-range-selector-dialog.component.scss'],
})
export class ToxicityRangeSelectorDialogComponent {
  toxicityFilter: ToxicityRangeFilter = {
    minScore: 0,
    maxScore: 1,
    includeUnscored: false,
  };

  private readonly min = 0;
  private readonly max = 100;

  minScoreFormControl: FormControl;
  maxScoreFormControl: FormControl;
  unscoredFormControl: FormControl;

  constructor(
    public dialogRef: MatDialogRef<ToxicityRangeSelectorDialogComponent>
  ) {
    this.minScoreFormControl = new FormControl(
      this.toxicityFilter.minScore * 100,
      [
        Validators.min(this.min),
        Validators.max(this.toxicityFilter.maxScore),
        Validators.required,
      ]
    );
    this.maxScoreFormControl = new FormControl(
      this.toxicityFilter.maxScore * 100,
      [
        Validators.min(this.toxicityFilter.minScore),
        Validators.max(this.max),
        Validators.required,
      ]
    );
    this.unscoredFormControl = new FormControl(
      this.toxicityFilter.includeUnscored,
      [
        Validators.min(this.toxicityFilter.minScore),
        Validators.max(this.toxicityFilter.maxScore),
        Validators.required,
      ]
    );

    this.minScoreFormControl.valueChanges.subscribe(value => {
      this.toxicityFilter = {
        minScore: value / 100,
        maxScore: this.toxicityFilter.maxScore,
        includeUnscored: this.toxicityFilter.includeUnscored,
      };
      this.updateFormControlValidators();
    });
    this.maxScoreFormControl.valueChanges.subscribe(value => {
      this.toxicityFilter = {
        minScore: this.toxicityFilter.minScore,
        maxScore: value / 100,
        includeUnscored: this.toxicityFilter.includeUnscored,
      };
      this.updateFormControlValidators();
    });
    this.unscoredFormControl.valueChanges.subscribe(includeUnscored => {
      this.toxicityFilter = {
        minScore: this.toxicityFilter.minScore,
        maxScore: this.toxicityFilter.maxScore,
        includeUnscored,
      };
      this.updateFormControlValidators();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  updateFormControlValidators() {
    this.minScoreFormControl.setValidators([
      Validators.min(this.min),
      Validators.max(this.maxScoreFormControl.value),
      Validators.required,
    ]);
    this.maxScoreFormControl.setValidators([
      Validators.min(this.minScoreFormControl.value),
      Validators.max(this.max),
      Validators.required,
    ]);
  }

  toxicityFilterChanged(toxicityFilter: ToxicityRangeFilter) {
    this.toxicityFilter.minScore = toxicityFilter.minScore;
    this.toxicityFilter.maxScore = toxicityFilter.maxScore;

    if (toxicityFilter.minScore !== this.minScoreFormControl.value) {
      this.minScoreFormControl.setValue(toxicityFilter.minScore * 100);
    }
    if (toxicityFilter.maxScore !== this.maxScoreFormControl.value) {
      this.maxScoreFormControl.setValue(toxicityFilter.maxScore * 100);
    }
  }
}
