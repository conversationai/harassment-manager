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

import { Component, Input } from '@angular/core';

import { BuildReportStep } from '../../common-types';
import { ReportService } from '../report.service';

@Component({
  selector: 'app-report-progress-bar',
  templateUrl: './report-progress-bar.component.html',
  styleUrls: ['./report-progress-bar.component.scss'],
})
export class ReportProgressBarComponent {
  readonly BuildReportStep = BuildReportStep;

  @Input() inNavigation = false;

  currentStep = BuildReportStep.NONE;

  constructor(private readonly reportService: ReportService) {
    this.reportService.reportStepChanged.subscribe(reportStep => {
      this.currentStep = reportStep;
    });
  }
}
