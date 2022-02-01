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
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReportAction, ReportService } from '../report.service';
import { ReportCompleteComponent } from './report-complete.component';

describe('ReportCompleteComponent', () => {
  let component: ReportCompleteComponent;
  let fixture: ComponentFixture<ReportCompleteComponent>;
  let mockReportService: jasmine.SpyObj<ReportService>;

  beforeEach(
    waitForAsync(() => {
      mockReportService = jasmine.createSpyObj<ReportService>('reportService', [
        'getReportActions',
      ]);
      mockReportService.getReportActions.and.returnValue([
        ReportAction.REPORT_TO_TWITTER,
        ReportAction.PRINT,
      ]);

      TestBed.configureTestingModule({
        declarations: [ReportCompleteComponent],
        imports: [
          MatChipsModule,
          MatExpansionModule,
          MatIconModule,
          NoopAnimationsModule,
        ],
        providers: [
          {
            provide: ReportService,
            useValue: mockReportService,
          },
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the report actions', () => {
    const reportActionsContainer = fixture.debugElement.query(
      By.css('.report-actions')
    ).nativeElement;

    expect(reportActionsContainer.textContent).toContain(
      ReportAction.REPORT_TO_TWITTER
    );
    expect(reportActionsContainer.textContent).toContain(ReportAction.PRINT);
  });
});
