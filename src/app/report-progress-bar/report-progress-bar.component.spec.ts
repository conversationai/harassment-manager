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
import { Observable, of } from 'rxjs';
import { BuildReportStep } from 'src/common-types';
import { MockFirestoreService } from '../common/test_utils';
import { FirestoreService } from '../firestore.service';
import { ReportService } from '../report.service';
import { ReportProgressBarComponent } from './report-progress-bar.component';

describe('ReportProgressBarComponent', () => {
  let component: ReportProgressBarComponent;
  let fixture: ComponentFixture<ReportProgressBarComponent>;

  const mockReportService = {
    reportStepChanged: of(BuildReportStep.NONE),
  };

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [ReportProgressBarComponent],
        imports: [MatIconModule],
        providers: [
          {
            provide: FirestoreService,
            useValue: jasmine.createSpy(),
          },
          {
            provide: ReportService,
            useValue: mockReportService,
          },
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportProgressBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
