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

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { ReplaySubject } from 'rxjs';
import { CreatePdfRequest, SocialMediaItem } from '../../common-types';
import { OauthApiService } from '../oauth_api.service';
import { PdfService } from '../pdf_service';
import { ReportService } from '../report.service';
import { TWITTER_ENTRIES } from '../test_constants';
import { ReportPdfComponent } from './report-pdf.component';

describe('ReportPdfComponent', () => {
  let component: ReportPdfComponent;
  let fixture: ComponentFixture<ReportPdfComponent>;
  let mockOauthApiService: jasmine.SpyObj<OauthApiService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockReportService: jasmine.SpyObj<ReportService>;
  const createPdfRequest: CreatePdfRequest<SocialMediaItem> = {
    entries: TWITTER_ENTRIES,
    reportReasons: ['reason1', 'reason2'],
    context: 'some additional context',
    platform: 'Twitter',
  };
  const onCreatePdfRequestSubject = new ReplaySubject<
    CreatePdfRequest<SocialMediaItem>
  >();

  beforeEach(
    waitForAsync(() => {
      mockOauthApiService = jasmine.createSpyObj<OauthApiService>(
        'oauthApiService',
        ['authenticateTwitter']
      );
      mockRouter = jasmine.createSpyObj<Router>('router', ['navigate']);
      const mockPdfService = jasmine.createSpyObj<PdfService>(
        'pdfService',
        [],
        {
          onCreatePdfRequest: onCreatePdfRequestSubject.asObservable(),
        }
      );
      mockReportService = jasmine.createSpyObj<ReportService>('reportService', [
        'getReportSummary',
      ]);

      TestBed.configureTestingModule({
        declarations: [ReportPdfComponent],
        imports: [
          HttpClientTestingModule,
          MatButtonModule,
          MatExpansionModule,
          MatIconModule,
          MatTableModule,
          NoopAnimationsModule,
        ],
        providers: [
          {
            provide: OauthApiService,
            useValue: mockOauthApiService,
          },
          {
            provide: PdfService,
            useValue: mockPdfService,
          },
          {
            provide: ReportService,
            useValue: mockReportService,
          },
          {
            provide: Router,
            useValue: mockRouter,
          },
        ],
      }).compileComponents();
      onCreatePdfRequestSubject.next(createPdfRequest);
    })
  );

  function createComponent(): void {
    fixture = TestBed.createComponent(ReportPdfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('creates the component', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('creates date range string', () => {
    createComponent();

    // Use a regex to match the time because getTimePosted() uses
    // toLocateDateString(), which may vary depending on the US timezone of the
    // machine the test runs on.
    expect(component.getDateRangeString()).toMatch(
      'Thu, Oct 28, 2021 \\d\\d:37:12 [A|P]M to Mon, Jan 24, 2022 \\d\\d:43:25 [A|P]M'
    );
  });

  it('uses Twitter specific columns for Twitter Report', () => {
    createComponent();

    fixture.detectChanges();

    expect(component.dataSource).toEqual(TWITTER_ENTRIES);
    expect(component.displayedColumns).toEqual(
      component.displayedColumnsTwitter
    );
  });

  it('formats the time a comment was posted', () => {
    createComponent();
    // Use a regex to match the time because getTimePosted() uses
    // toLocateDateString(), which may vary depending on the US timezone of the
    // machine the test runs on.
    expect(component.getTimePosted('2020-11-10T17:44:51.000Z')).toMatch(
      '11/10/20 at \\d\\d:44 [A|P]M'
    );
  });

  it('formats the hashtags for a Twitter comment', () => {
    createComponent();

    const fullItem = component.entries[0].item;
    expect(component.formatHashtags(fullItem)).toEqual('#fakehashtag1');

    const truncatedItem = component.entries[1].item;
    expect(component.formatHashtags(truncatedItem)).toEqual(
      '#fakehashtag1, #fakehashtag2'
    );
  });
});
