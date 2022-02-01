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

import { Provider } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ReplaySubject, Subject } from 'rxjs';
import { ScoredItem, SocialMediaItem } from '../../common-types';
import { routes } from '../app-routing.module';
import { AuthGuardService } from '../auth-guard.service';
import { CommentInfoComponent } from '../comment-info/comment-info.component';
import { CommentLinkComponent } from '../comment-link/comment-link.component';
import { DialogRefStub } from '../common/test_utils';
import { OauthApiService } from '../oauth_api.service';
import { ReportService } from '../report.service';
import { TweetImageComponent } from '../tweet-image/tweet-image.component';
import { ReviewReportComponent } from './review-report.component';

describe('ReviewReportComponent', () => {
  let router: Router;
  let component: ReviewReportComponent;
  let fixture: ComponentFixture<ReviewReportComponent>;
  const commentsForReportTestSubject = new ReplaySubject<
    Array<ScoredItem<SocialMediaItem>>
  >(1);
  const reportContextChangedSubject = new Subject<string>();
  const reportReasonsChangedSubject = new Subject<string[]>();
  let mockAuthGuardService: jasmine.SpyObj<AuthGuardService>;
  let mockReportService: jasmine.SpyObj<ReportService>;
  const twitterSignInTestSubject = new ReplaySubject<boolean>(1);
  const mockOauthApiService = {
    twitterSignInChange: twitterSignInTestSubject.asObservable(),
  };
  mockAuthGuardService = jasmine.createSpyObj<AuthGuardService>(
    'authGuardService',
    ['canActivate']
  );
  mockAuthGuardService.canActivate.and.returnValue(true);
  const comments = [
    {
      item: {
        id_str: 'a',
        text: 'your mother was a hamster',
        date: new Date(),
        authorScreenName: 'user1',
        authorName: 'User 1',
      },
      scores: {
        TOXICITY: 0.8,
        INSULT: 0.8,
      },
    },
    {
      item: {
        id_str: 'b',
        text: 'and your father smelt of elderberries',
        date: new Date(),
        authorScreenName: 'user2',
        authorName: 'User 2',
      },
      scores: {
        TOXICITY: 0.88,
        INSULT: 0.5,
      },
    },
    {
      item: {
        id_str: 'c',
        text: 'Now go away or I will taunt you a second time!',
        date: new Date(),
        authorScreenName: 'user1',
        authorName: 'User 1',
      },
      scores: {
        TOXICITY: 0.9,
        INSULT: 0.3,
        PROFANITY: 0.1,
      },
    },
  ];

  function createComponent(providers: Provider[] = []) {
    TestBed.configureTestingModule({
      declarations: [
        CommentInfoComponent,
        CommentLinkComponent,
        ReviewReportComponent,
        TweetImageComponent,
      ],
      imports: [
        FormsModule,
        MatButtonModule,
        MatCheckboxModule,
        MatDialogModule,
        MatExpansionModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatTooltipModule,
        NoopAnimationsModule,
        RouterTestingModule.withRoutes(routes),
      ],
      providers: [
        {
          provide: AuthGuardService,
          useValue: mockAuthGuardService,
        },
        {
          provide: ReportService,
          useValue: mockReportService,
        },
        {
          provide: OauthApiService,
          useValue: mockOauthApiService,
        },
        ...providers,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReviewReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    commentsForReportTestSubject.next(comments);
    router = TestBed.inject(Router);
  }

  beforeEach(() => {
    mockReportService = jasmine.createSpyObj<ReportService>(
      'reportService',
      ['setContext', 'setReportReasons', 'clearReport'],
      {
        reportCommentsChanged: commentsForReportTestSubject,
        reportContextChanged: reportContextChangedSubject,
        reportReasonsChanged: reportReasonsChangedSubject,
      }
    );
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should save context and report reasons on updates (Twitter version)', fakeAsync(() => {
    createComponent();
    // The fixture needs to be updated after setting the platform to twitter
    // so that the other functions can access the filled in reportReasons array.
    twitterSignInTestSubject.next(true);
    fixture.detectChanges();
    // Note that we have to click on the label of the checkbox to trigger the
    // change event in tests; see https://stackoverflow.com/a/44935499
    const reportReasonsCheckboxes = fixture.debugElement.queryAll(
      By.css('.report-reasons-checkbox label')
    );
    reportReasonsCheckboxes[0].nativeElement.click();
    reportReasonsCheckboxes[2].nativeElement.click();

    const contextTextarea = fixture.debugElement.query(By.css('.context'))
      .nativeElement;
    contextTextarea.value = 'Here is some context';
    contextTextarea.dispatchEvent(new Event('input'));
    // Wait for 500 ms to pass so that the input event is handled.
    tick(500);
    fixture.detectChanges();

    expect(component.hasReportReasons).toEqual([
      true,
      false,
      true,
      false,
      false,
    ]);
    expect(component.context).toEqual('Here is some context');

    // Check that the report setContext and setReportReasons was called.
    expect(mockReportService.setReportReasons).toHaveBeenCalledWith([
      'Harassment',
      'Exposed private information or photo',
    ]);
    expect(mockReportService.setContext).toHaveBeenCalledWith(
      'Here is some context'
    );
  }));

  it('should load report reasons and context (Twitter)', () => {
    createComponent();
    // The fixture needs to be updated after setting the platform to Twitter
    // so that the other functions can access the filled in reportReasons array.
    twitterSignInTestSubject.next(true);
    fixture.detectChanges();

    expect(component.hasReportReasons).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    reportReasonsChangedSubject.next(['Harassment']);
    fixture.detectChanges();
    expect(component.hasReportReasons).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);

    expect(component.context).toEqual('');
    reportContextChangedSubject.next('Here is some context');
    fixture.detectChanges();
    expect(component.context).toEqual('Here is some context');
  });

  it('should show twitter only checkboxes', () => {
    createComponent();
    // The fixture needs to be updated after setting the platform to twitter
    // so that the other functions can access the filled in reportReasons array.
    twitterSignInTestSubject.next(true);
    fixture.detectChanges();

    expect(component.reportReasonOptions).toEqual(
      component.reportReasonOptionsTwitter
    );
    expect(component.hasReportReasons).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('should compute report summary for Twitter', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    const expectedUsers = new Map();
    expectedUsers.set('user1', 2);
    expectedUsers.set('user2', 1);
    expect(component.averageToxicity).toBeCloseTo(0.86);
    expect(component.usersInReport).toEqual(expectedUsers);
    expect(component.toxicityTypes).toEqual(new Set(['TOXICITY', 'INSULT']));
  });

  it('shows and hides comments on button click', () => {
    createComponent();
    const nativeElement = fixture.nativeElement;
    const debugElement = fixture.debugElement;

    expect(nativeElement.querySelectorAll('app-comment-info').length).toEqual(
      0
    );
    let commentSummaryElem = debugElement.nativeElement.querySelector(
      '.comment-summary'
    );
    expect(commentSummaryElem.textContent).not.toContain(comments[0].item.text);
    expect(commentSummaryElem.textContent).not.toContain(comments[1].item.text);

    nativeElement.querySelector('.show-comments-button').click();
    fixture.detectChanges();
    expect(nativeElement.querySelectorAll('app-comment-info').length).toEqual(
      3
    );
    commentSummaryElem = debugElement.nativeElement.querySelector(
      '.comment-summary'
    );
    expect(commentSummaryElem.textContent).toContain(comments[0].item.text);
    expect(commentSummaryElem.textContent).toContain(comments[1].item.text);

    nativeElement.querySelector('.show-comments-button').click();
    fixture.detectChanges();
    expect(nativeElement.querySelectorAll('app-comment-info').length).toEqual(
      0
    );
    commentSummaryElem = debugElement.nativeElement.querySelector(
      '.comment-summary'
    );
    expect(commentSummaryElem.textContent).not.toContain(comments[0].item.text);
    expect(commentSummaryElem.textContent).not.toContain(comments[1].item.text);
  });

  it('shows dialog when clear report button is clicked', () => {
    const dialogCloseTrigger = new Subject<boolean>();
    createComponent([
      {
        provide: MatDialog,
        useValue: {
          open(componentName: string) {
            return new DialogRefStub<boolean>(dialogCloseTrigger);
          },
        },
      },
    ]);

    const showCommentsButton = fixture.debugElement.query(
      By.css('.show-comments-button')
    );
    showCommentsButton.nativeElement.click();
    fixture.detectChanges();

    const clearReportButton = fixture.debugElement.query(
      By.css('.remove-all-button')
    );

    clearReportButton.nativeElement.click();
    fixture.detectChanges();

    expect(component.clearReportDialogOpen).toBe(true);
    dialogCloseTrigger.next(true);
    fixture.detectChanges();

    expect(component.clearReportDialogOpen).toBe(false);
    expect(mockReportService.clearReport).toHaveBeenCalled();
  });
});
