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

import { Component, EventEmitter, Output } from '@angular/core';

export enum IntroStep {
  INTRO,
  CREATE_REPORT,
  SAVE_SHARE_REPORT,
}

/**
 * Stepper UI for onboarding that walks the user through some basic app
 * functionality.
 */
@Component({
  selector: 'app-intro-stepper',
  templateUrl: './intro-stepper.component.html',
  styleUrls: ['./intro-stepper.component.scss'],
})
export class IntroStepperComponent {
  // Copy of the enum for use in the template.
  readonly IntroStep = IntroStep;

  readonly introSteps = [
    IntroStep.INTRO,
    IntroStep.CREATE_REPORT,
    IntroStep.SAVE_SHARE_REPORT,
  ];

  currentStepIndex = 0;

  @Output() introCompleted = new EventEmitter<void>();

  nextStep() {
    this.currentStepIndex++;
  }

  previousStep() {
    this.currentStepIndex--;
  }

  getStartedClicked() {
    this.introCompleted.emit();
  }
}
