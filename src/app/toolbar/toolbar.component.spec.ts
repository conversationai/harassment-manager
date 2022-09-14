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
import { Location } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { By } from '@angular/platform-browser';
import { Params, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import {
  BuildReportStep,
  ScoredItem,
  SocialMediaItem,
} from '../../common-types';
import { routes } from '../app-routing.module';
import { AuthGuardService } from '../auth-guard.service';
import { TOXICITY_FILTER_NAME_QUERY_PARAM } from '../create-report/create-report.component';
import { OauthApiService } from '../oauth_api.service';
import { OnboardingService } from '../onboarding.service';
import { ReportProgressBarComponent } from '../report-progress-bar/report-progress-bar.component';
import { ReportAction, ReportService } from '../report.service';
import { SocialMediaItemService } from '../social-media-item.service';
import { ONE_HOUR_MS, ONE_MIN_MS, ToolbarComponent } from './toolbar.component';

/**
 * Stub for MatDialogRef. The constructor takes a Subject that should be
 * triggered when we want the dialog to close with the value it should send
 * back.
 */
class DialogRefStub<T> {
  constructor(private dialogCloseTrigger: Subject<T>) { }

  afterClosed() {
    return this.dialogCloseTrigger.asObservable();
  }
}

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;
  let location: Location;
  let mockOauthApiService: jasmine.SpyObj<OauthApiService>;
  let mockSocialMediaItemService: jasmine.SpyObj<SocialMediaItemService>;
  let commentsSubject: ReplaySubject<Array<ScoredItem<SocialMediaItem>>>;
  let reportActionsSubject: BehaviorSubject<ReportAction[]>;
  let reportLastEditedSubject: BehaviorSubject<number>;
  let reportClearedSubject: Subject<void>;
  let reportStepSubject: BehaviorSubject<BuildReportStep>;
  let mockReportService: jasmine.SpyObj<ReportService>;
  let router: Router;
  let mockAuthGuardService: jasmine.SpyObj<AuthGuardService>;
  const twitterSignInTestSubject = new ReplaySubject<boolean>(1);

  const highlightReviewReportButtonTestSubject = new Subject<void>();
  const dialogCloseTrigger = new Subject<boolean>();

  const mockOnboardingService = jasmine.createSpyObj<OnboardingService>(
    'onboardingService',
    ['setCreateReportPageOnboardingComplete'],
    { highlightReviewReportButton: highlightReviewReportButtonTestSubject }
  );

  beforeEach(
    waitForAsync(() => {
      mockOauthApiService = jasmine.createSpyObj<OauthApiService>(
        'oauthApiService',
        ['revokeAuth', 'twitterSignInChange']
      );

      mockOauthApiService.twitterSignInChange = twitterSignInTestSubject.asObservable();

      mockAuthGuardService = jasmine.createSpyObj<AuthGuardService>(
        'authGuardService',
        ['canActivate']
      );
      mockAuthGuardService.canActivate.and.returnValue(true);

      mockSocialMediaItemService = jasmine.createSpyObj<SocialMediaItemService>(
        'socialMediaItemService',
        ['getTotalCommentFetchCount']
      );

      commentsSubject = new ReplaySubject(1);
      reportActionsSubject = new BehaviorSubject<ReportAction[]>([]);
      reportLastEditedSubject = new BehaviorSubject<number>(0);
      reportClearedSubject = new Subject<void>();
      reportStepSubject = new BehaviorSubject<BuildReportStep>(
        BuildReportStep.NONE
      );
      mockReportService = jasmine.createSpyObj<ReportService>(
        'reportService',
        [
          'addCommentsToReport',
          'clearReport',
          'getReportActions',
          'setReportStep',
          'getCommentsForReport',
          'getReportReasons',
          'getReportSummary',
        ],
        {
          reportCommentsChanged: commentsSubject.asObservable(),
          reportActionsChanged: reportActionsSubject.asObservable(),
          reportLastEditedChanged: reportLastEditedSubject.asObservable(),
          reportCleared: reportClearedSubject.asObservable(),
          reportStepChanged: reportStepSubject.asObservable(),
        }
      );

      TestBed.configureTestingModule({
        declarations: [ReportProgressBarComponent, ToolbarComponent],
        imports: [
          HttpClientTestingModule,
          MatButtonModule,
          MatDialogModule,
          MatIconModule,
          MatToolbarModule,
          OverlayModule,
          RouterTestingModule.withRoutes(routes),
        ],
        providers: [
          {
            provide: AuthGuardService,
            useValue: mockAuthGuardService,
          },
          {
            provide: OauthApiService,
            useValue: mockOauthApiService,
          },
          {
            provide: OnboardingService,
            useValue: mockOnboardingService,
          },
          {
            provide: ReportService,
            useValue: mockReportService,
          },
          {
            provide: MatDialog,
            useValue: {
              open(componentName: string) {
                return new DialogRefStub<boolean>(dialogCloseTrigger);
              },
            },
          },
          {
            provide: SocialMediaItemService,
            useValue: mockSocialMediaItemService,
          },
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    location = TestBed.inject(Location);
    fixture.detectChanges();

    router = TestBed.inject(Router);
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
    const componentElement = fixture.debugElement.nativeElement;

    expect(componentElement.querySelector('.title').textContent).toContain(
      'SafeNet'
    );
  });

  it('shows the correct elements depending on user sign-in state', () => {
    twitterSignInTestSubject.next(true);
    fixture.detectChanges();
    let getStartedButton = fixture.debugElement.query(
      By.css('.get-started-button')
    );
    let navigationLinks = fixture.debugElement.query(
      By.css('.navigation-links')
    );
    let signOutButton = fixture.debugElement.query(By.css('.sign-out-button'));
    expect(getStartedButton).toBeFalsy();
    expect(navigationLinks).toBeTruthy();
    expect(signOutButton).toBeTruthy();

    twitterSignInTestSubject.next(false);
    fixture.detectChanges();
    getStartedButton = fixture.debugElement.query(
      By.css('.get-started-button')
    );
    navigationLinks = fixture.debugElement.query(By.css('.navigation-links'));
    signOutButton = fixture.debugElement.query(By.css('.sign-out-button'));
    expect(getStartedButton).toBeTruthy();
    expect(navigationLinks).toBeFalsy();
    expect(signOutButton).toBeFalsy();
  });

  it('highlights the review report button for onboarding', fakeAsync(() => {
    twitterSignInTestSubject.next(true);
    router.navigate(['/create-report']);
    tick();

    let highlightReviewReportButton = fixture.debugElement.query(
      By.css('.highlight-continue-button')
    );
    expect(highlightReviewReportButton).toBeFalsy();

    highlightReviewReportButtonTestSubject.next();
    fixture.detectChanges();

    highlightReviewReportButton = fixture.debugElement.query(
      By.css('.highlight-continue-button')
    );
    expect(highlightReviewReportButton).toBeTruthy();

    const doneButton = document.querySelector(
      '.cdk-overlay-container .onboarding-review-report button'
    );
    expect(doneButton).toBeTruthy();
    (doneButton! as HTMLElement).click();
    fixture.detectChanges();

    highlightReviewReportButton = fixture.debugElement.query(
      By.css('.highlight-continue-button')
    );
    expect(highlightReviewReportButton).toBeFalsy();

    // Clear microtask queue.
    flush();
  }));

  it('revokes auth on user sign-out', async () => {
    twitterSignInTestSubject.next(true);
    fixture.detectChanges();
    mockOauthApiService.revokeAuth.and.returnValue(Promise.resolve());
    const componentElement = fixture.debugElement.nativeElement;
    componentElement.querySelector('.sign-out-button').click();
    await fixture.whenStable();

    expect(mockOauthApiService.revokeAuth).toHaveBeenCalled();
    expect(location.path()).toBe('/');
  });

  it('shows a notification when comments are added to the report', fakeAsync(() => {
    router.navigate(['/create-report']);
    tick();

    let dropdownElement = document.querySelector('.dropdown');
    expect(dropdownElement).toBe(null);
    const comments = [
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
    commentsSubject.next([comments[0]]);
    fixture.detectChanges();
    dropdownElement = document.querySelector('.dropdown');
    expect(component.dropdownElement!.nativeElement.textContent).toContain(
      "Nice work! You've started your report."
    );
    tick(5000);

    commentsSubject.next(comments);
    fixture.detectChanges();
    dropdownElement = document.querySelector('.dropdown');
    expect(dropdownElement!.textContent).toContain('Comment added to report');
    tick(5000);
  }));

  it('resets notification state when a user logs out', fakeAsync(() => {
    twitterSignInTestSubject.next(true);
    fixture.detectChanges();
    router.navigate(['/create-report']);
    tick();

    let dropdownElement = document.querySelector('.dropdown');
    expect(dropdownElement).toBe(null);

    const comments = [
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
    commentsSubject.next([comments[0]]);
    fixture.detectChanges();
    dropdownElement = document.querySelector('.dropdown');
    expect(dropdownElement!.textContent).toContain(
      "Nice work! You've started your report."
    );
    tick(5000);

    mockOauthApiService.revokeAuth.and.returnValue(Promise.resolve());
    const componentElement = fixture.debugElement.nativeElement;
    componentElement.querySelector('.sign-out-button').click();
    tick();
    expect(mockOauthApiService.revokeAuth).toHaveBeenCalled();

    router.navigate(['/create-report']);
    tick();

    commentsSubject.next(comments);
    fixture.detectChanges();
    dropdownElement = document.querySelector('.dropdown');
    expect(dropdownElement!.textContent).toContain(
      "Nice work! You've started your report."
    );
    tick(5000);
  }));

  it('clicks forward through report flow', fakeAsync(() => {
    const queryParams: Params = {};
    queryParams[TOXICITY_FILTER_NAME_QUERY_PARAM] = 'test';
    // We have to be on the create page, but make sure it works with query
    // params.
    router.navigate(['/create-report', queryParams]);
    reportStepSubject.next(BuildReportStep.ADD_COMMENTS);
    tick();
    fixture.detectChanges();

    let continueButton = fixture.debugElement.query(By.css('.continue-button'));
    let backButton = fixture.debugElement.query(By.css('.back-button'));
    expect(continueButton).toBeTruthy();
    expect(backButton).toBeFalsy();

    // Continue button should be disabled.
    expect(continueButton.componentInstance.disabled).toBe(true);

    const comments = [
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
    // Once we add comments to the report, the continue button should be
    // enabled.
    commentsSubject.next([comments[0]]);
    mockReportService.getCommentsForReport.and.returnValue([comments[0]]);
    fixture.detectChanges();
    expect(continueButton.componentInstance.disabled).toBe(false);

    continueButton.nativeElement.click();
    flush();
    fixture.detectChanges();
    // Trying to spy on the 'navigate' call for the router doesn't seem to work
    // here. Instead we check the URL to verify that navigation completed.
    expect(router.url).toBe('/review-report');

    reportStepSubject.next(BuildReportStep.EDIT_DETAILS);
    fixture.detectChanges();

    continueButton = fixture.debugElement.query(By.css('.continue-button'));
    backButton = fixture.debugElement.query(By.css('.back-button'));
    expect(continueButton).toBeTruthy();
    expect(backButton).toBeTruthy();
    expect(continueButton.componentInstance.disabled).toBe(false);

    continueButton.nativeElement.click();
    flush();
    fixture.detectChanges();
    expect(router.url).toBe('/share-report');

    reportStepSubject.next(BuildReportStep.TAKE_ACTION);
    fixture.detectChanges();

    continueButton = fixture.debugElement.query(By.css('.continue-button'));
    backButton = fixture.debugElement.query(By.css('.back-button'));
    expect(continueButton).toBeTruthy();
    expect(backButton).toBeTruthy();
    expect(continueButton.componentInstance.disabled).toBe(false);

    reportActionsSubject.next([ReportAction.SAVE_TO_DRIVE]);
    fixture.detectChanges();
    expect(continueButton.componentInstance.disabled).toBe(false);

    mockReportService.getReportReasons.and.returnValue(['Reason 1']);

    // The continue button brings up the exit dialog, and doesn't change the
    // page.
    continueButton.nativeElement.click();
    flush();
    fixture.detectChanges();
    expect(router.url).toBe('/share-report');
    expect(component.getExitDialogOpen()).toBe(true);
    // If the user continues from the exit dialog then continue to the next
    // page.
    dialogCloseTrigger.next(/* exitReport = */ true);
    flush();
    fixture.detectChanges();
    expect(router.url).toBe('/report-complete');
    expect(component.getExitDialogOpen()).toBe(false);
  }));

  it('allows user to finish report without taking action', fakeAsync(() => {
    router.navigate(['/create-report']);
    tick();
    reportStepSubject.next(BuildReportStep.ADD_COMMENTS);
    fixture.detectChanges();

    let continueButton = fixture.debugElement.query(By.css('.continue-button'));
    const comment = {
      item: {
        id_str: 'a',
        text: 'your mother was a hamster',
        date: new Date(),
      },
      scores: {
        TOXICITY: 0.8,
      },
    };
    commentsSubject.next([comment]);
    fixture.detectChanges();
    continueButton.nativeElement.click();
    reportStepSubject.next(BuildReportStep.EDIT_DETAILS);
    flush();
    fixture.detectChanges();
    continueButton = fixture.debugElement.query(By.css('.continue-button'));
    continueButton.nativeElement.click();
    reportStepSubject.next(BuildReportStep.TAKE_ACTION);
    flush();
    fixture.detectChanges();
    continueButton = fixture.debugElement.query(By.css('.continue-button'));
    mockReportService.getReportReasons.and.returnValue(['Reason 1']);
    mockReportService.getCommentsForReport.and.returnValue([comment]);
    continueButton.nativeElement.click();
    flush();
    fixture.detectChanges();

    dialogCloseTrigger.next(/* exitReport = */ true);
    flush();
    fixture.detectChanges();
    expect(router.url).toBe('/home');
    expect(component.getExitDialogOpen()).toBe(false);
  }));

  it('clicks backward through report flow', fakeAsync(() => {
    router.navigate(['/share-report']);
    tick();
    fixture.detectChanges();
    expect(router.url).toBe('/share-report');
    reportStepSubject.next(BuildReportStep.TAKE_ACTION);
    fixture.detectChanges();

    let continueButton = fixture.debugElement.query(By.css('.continue-button'));
    let backButton = fixture.debugElement.query(By.css('.back-button'));
    expect(continueButton).toBeTruthy();
    expect(backButton).toBeTruthy();

    backButton.nativeElement.click();
    flush();
    fixture.detectChanges();
    expect(router.url).toBe('/review-report');

    reportStepSubject.next(BuildReportStep.EDIT_DETAILS);
    fixture.detectChanges();

    continueButton = fixture.debugElement.query(By.css('.continue-button'));
    backButton = fixture.debugElement.query(By.css('.back-button'));
    expect(continueButton).toBeTruthy();
    expect(backButton).toBeTruthy();

    backButton.nativeElement.click();
    flush();
    fixture.detectChanges();
    expect(router.url).toBe('/create-report');

    reportStepSubject.next(BuildReportStep.ADD_COMMENTS);
    fixture.detectChanges();

    continueButton = fixture.debugElement.query(By.css('.continue-button'));
    backButton = fixture.debugElement.query(By.css('.back-button'));
    expect(continueButton).toBeTruthy();
    expect(backButton).toBeFalsy();
  }));

  it('shows the last edited time', fakeAsync(() => {
    const now = Date.now();
    reportLastEditedSubject.next(now);
    router.navigate(['/create-report']);
    tick();
    fixture.detectChanges();
    let lastEditedText = fixture.debugElement.query(By.css('.last-edited'));
    expect(lastEditedText.nativeElement.textContent).toContain(
      'Last edit less than 1 min ago'
    );

    reportLastEditedSubject.next(now - (ONE_HOUR_MS * 5 + ONE_MIN_MS * 20));
    tick();
    fixture.detectChanges();
    lastEditedText = fixture.debugElement.query(By.css('.last-edited'));
    expect(lastEditedText.nativeElement.textContent).toContain(
      'Last edit 5 hr 20 min ago'
    );

    reportLastEditedSubject.next(1604206800000);
    tick();
    fixture.detectChanges();
    lastEditedText = fixture.debugElement.query(By.css('.last-edited'));
    expect(lastEditedText.nativeElement.textContent).toContain(
      'Last edit on Nov 1'
    );
  }));

  it('navigates to home when report is cleared', fakeAsync(() => {
    router.navigate(['/create-report']);
    tick();
    expect(router.url).toEqual('/create-report');

    reportClearedSubject.next();
    tick();
    expect(router.url).toEqual('/home');
  }));
});
