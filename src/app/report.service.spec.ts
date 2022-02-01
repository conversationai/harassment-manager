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

import { TestBed } from '@angular/core/testing';
import { ReplaySubject } from 'rxjs';
import { BuildReportStep, ScoredItem, SocialMediaItem } from '../common-types';
import { MockFirestoreService, MockOauthApiService } from './common/test_utils';
import { FirestoreService } from './firestore.service';
import { OauthApiService } from './oauth_api.service';
import { ReportAction, ReportService } from './report.service';
import { TWITTER_ENTRIES } from './test_constants';

const COMMENTS: Array<ScoredItem<SocialMediaItem>> = [
  {
    item: {
      id_str: 'a',
      text: 'your mother was a hamster',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.8,
    },
  },
  {
    item: {
      id_str: 'b',
      text: 'and your father smelt of elderberries',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.9,
    },
  },
];

describe('ReportService', () => {
  let service: ReportService;
  let twitterSignInTestSubject: ReplaySubject<boolean>;
  let mockOauthApiService: MockOauthApiService;
  let mockFirestoreService: MockFirestoreService;

  beforeEach(() => {
    twitterSignInTestSubject = new ReplaySubject<boolean>(1);
    mockOauthApiService = {
      twitterSignInChange: twitterSignInTestSubject.asObservable(),
      getTwitterCredentials: () => undefined,
    };
    mockFirestoreService = new MockFirestoreService();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: FirestoreService,
          useValue: mockFirestoreService,
        },
        {
          provide: OauthApiService,
          useValue: mockOauthApiService,
        },
      ],
    });
    service = TestBed.inject(ReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('adds comments to the report', () => {
    expect(service.getCommentsForReport()).toEqual([]);

    service.addCommentsToReport(COMMENTS);

    expect(service.getCommentsForReport()).toEqual(COMMENTS);
  });

  it('removes comments from the report', () => {
    service.addCommentsToReport(COMMENTS);
    expect(service.getCommentsForReport()).toEqual(COMMENTS);

    service.removeCommentFromReport(COMMENTS[0]);
    expect(service.getCommentsForReport()).toEqual([COMMENTS[1]]);

    service.removeCommentFromReport(COMMENTS[1]);
    expect(service.getCommentsForReport()).toEqual([]);
  });

  it('sets report values', () => {
    service.setReportReasons(['This is a reason']);
    expect(service.getReportReasons()).toEqual(['This is a reason']);

    service.setContext('This is some context');
    expect(service.getContext()).toEqual('This is some context');

    service.setReportActions([ReportAction.PRINT, ReportAction.DOWNLOAD_CSV]);
    expect(service.getReportActions()).toEqual([
      ReportAction.DOWNLOAD_CSV,
      ReportAction.PRINT,
    ]);
  });

  it('emits comments on changes', () => {
    let comments: Array<ScoredItem<SocialMediaItem>> = [];
    service.reportCommentsChanged.subscribe((reportComments) => {
      comments = reportComments;
    });

    expect(comments).toEqual([]);
    service.addCommentsToReport(COMMENTS);
    expect(comments).toEqual(COMMENTS);
    service.removeCommentFromReport(COMMENTS[1]);
    expect(comments).toEqual([COMMENTS[0]]);
  });

  it('emits report step changes', () => {
    // Note: It's necessary to cast to type BuildReportStep to work around
    // a bug where TypeScript will infer the incorrect type and cause the
    // expect statement to not compile.
    // See https://github.com/jasmine/jasmine/issues/1723
    let reportStep = BuildReportStep.NONE as BuildReportStep;
    service.reportStepChanged.subscribe((step) => {
      reportStep = step;
    });
    expect(reportStep).toEqual(BuildReportStep.NONE);

    service.setReportStep(BuildReportStep.TAKE_ACTION);
    expect(reportStep).toEqual(BuildReportStep.TAKE_ACTION);

    service.clearReport();
    expect(reportStep).toEqual(BuildReportStep.NONE);

    mockFirestoreService.updateReport({
      reportStep: BuildReportStep.ADD_COMMENTS,
    });
    expect(reportStep).toEqual(BuildReportStep.ADD_COMMENTS);
  });

  it('creates a summary of comment scores', () => {
    // For comments with and without scores
    service.addCommentsToReport(TWITTER_ENTRIES);
    expect(service.getReportSummary()).toEqual(
      'Toxicity (7%); Severe Toxicity (3%); Insult (6%); Profanity (3%); Threat (9%); Identity Attack (7%)'
    );

    service.clearReport();
    // For a one comment report
    service.addCommentsToReport([TWITTER_ENTRIES[2]]);
    expect(service.getReportSummary()).toEqual(
      'Toxicity (9%); Severe Toxicity (4%); Insult (8%); Profanity (5%); Threat (11%); Identity Attack (10%)'
    );

    service.clearReport();
    // For a report of all unscored comments
    service.addCommentsToReport([TWITTER_ENTRIES[0], TWITTER_ENTRIES[1]]);
    expect(service.getReportSummary()).toEqual('');
  });
});
