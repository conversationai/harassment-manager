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
import { ScrollingModule } from '@angular/cdk/scrolling';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MatSnackBar,
  MatSnackBarDismiss,
  MatSnackBarRef,
  SimpleSnackBar,
} from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterEvent,
} from '@angular/router';
import { BehaviorSubject, of, ReplaySubject, Subject } from 'rxjs';
import {
  BuildReportStep,
  ScoredItem,
  SocialMediaItem,
  Tweet,
} from 'src/common-types';
import { DialogRefStub, MockFirestoreService } from '../common/test_utils';
import { FirestoreService } from '../firestore.service';
import { OauthApiService } from '../oauth_api.service';
import { OnboardingService } from '../onboarding.service';
import { PerspectiveApiService } from '../perspectiveapi.service';
import {
  RecommendedReportCardComponent,
  RECOMMENDED_REPORT_TEMPLATES,
} from '../recommended-report-card/recommended-report-card.component';
import { ReportProgressBarComponent } from '../report-progress-bar/report-progress-bar.component';
import { ReportService } from '../report.service';
import { SocialMediaItemService } from '../social-media-item.service';
import { TwitterApiService } from '../twitter_api.service';
import { HomePageComponent } from './home-page.component';

const tweets: Array<ScoredItem<Tweet>> = [
  {
    item: {
      id_str: 'a',
      text: 'She turned me into a newt!',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.5,
    },
  },
  {
    item: {
      id_str: 'b',
      text: 'Strange women lying in ponds distributing swords is no basis for a system of government.',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.2,
    },
  },
  {
    item: {
      id_str: 'c',
      text: 'Supreme executive power derives from a mandate from the masses.',
      date: new Date(),
    },
    scores: {
      // Represents an 'unable to be scored' comment.
    },
  },
  {
    item: {
      id_str: 'd',
      text: 'What is your favorite color?',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.3,
    },
  },
  {
    item: {
      id_str: 'e',
      text: 'What is the airspeed velocity of an unladen swallow?',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.4,
    },
  },
  {
    item: {
      id_str: 'f',
      text: 'your mother was a hamster',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.8,
    },
  },
  {
    item: {
      id_str: 'g',
      text: 'and your father smelt of elderberries',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.9,
    },
  },
  {
    item: {
      id_str: 'h',
      text: 'Now go away or I will taunt you a second time!',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.7,
    },
  },
];

describe('HomePageComponent', () => {
  const mockSocialMediaItemsService =
    jasmine.createSpyObj<SocialMediaItemService>('socialMediaItemsService', [
      'fetchItems',
    ]);
  const twitterSignInTestSubject = new ReplaySubject<boolean>(1);
  const mockOauthApiService = {
    twitterSignInChange: twitterSignInTestSubject.asObservable(),
    getTwitterCredentials: () => undefined,
  };
  const mockOnboardingService = jasmine.createSpyObj<OnboardingService>(
    'onboardingService',
    ['getHomePageOnboardingComplete', 'setHomePageOnboardingComplete']
  );

  const reportCommentsSubject = new BehaviorSubject<
    Array<ScoredItem<SocialMediaItem>>
  >([]);
  const reportClearedSubject = new Subject<void>();
  const reportStepChangedSubject = new BehaviorSubject<BuildReportStep>(
    BuildReportStep.NONE
  );
  const reportContextChangedSubject = new BehaviorSubject<string>('');
  const reportReasonsChangedSubject = new BehaviorSubject<string[]>([]);
  const mockReportService = jasmine.createSpyObj<ReportService>(
    'reportService',
    ['clearReport', 'getReportStep'],
    {
      reportCleared: reportClearedSubject.asObservable(),
      reportCommentsChanged: reportCommentsSubject.asObservable(),
      reportContextChanged: reportContextChangedSubject.asObservable(),
      reportReasonsChanged: reportReasonsChangedSubject.asObservable(),
      reportStepChanged: reportStepChangedSubject.asObservable(),
    }
  );

  const mockSnackBarRef = jasmine.createSpyObj<MatSnackBarRef<SimpleSnackBar>>(
    'matSnackBarRef',
    ['onAction', 'dismiss', 'afterDismissed']
  );
  const mockSnackBarActionSubject = new Subject<void>();
  mockSnackBarRef.onAction.and.returnValue(
    mockSnackBarActionSubject.asObservable()
  );
  const mockSnackBarDismissedSubject = new Subject<MatSnackBarDismiss>();
  mockSnackBarRef.afterDismissed.and.returnValue(
    mockSnackBarDismissedSubject.asObservable()
  );

  const mockSnackBar = jasmine.createSpyObj<MatSnackBar>('matSnackBar', [
    'open',
  ]);
  mockSnackBar.open.and.returnValue(mockSnackBarRef);

  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;

  const eventsSubject = new ReplaySubject<RouterEvent>(1);
  const mockRouter = {
    navigate: jasmine.createSpy('navigate'),
    events: eventsSubject.asObservable(),
  };

  const dialogCloseTrigger = new Subject<boolean>();

  beforeEach(() => {
    eventsSubject.next(new NavigationEnd(0, '/home', '/home'));
    mockOnboardingService.getHomePageOnboardingComplete.and.returnValue(
      of(true)
    );
    mockSocialMediaItemsService.fetchItems.and.returnValue(of([]));
    mockReportService.getReportStep.and.returnValue(BuildReportStep.NONE);
    mockRouter.navigate.calls.reset();
    mockSnackBar.open.calls.reset();
  });

  function createComponent(providers: Provider[] = []) {
    // This imports all the dependencies of the components this component uses.
    TestBed.configureTestingModule({
      declarations: [
        HomePageComponent,
        RecommendedReportCardComponent,
        ReportProgressBarComponent,
      ],
      imports: [
        HttpClientTestingModule,
        MatButtonModule,
        MatCardModule,
        MatDialogModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        OverlayModule,
        ScrollingModule,
      ],
      providers: [
        {
          provide: FirestoreService,
          useClass: MockFirestoreService,
        },
        {
          provide: MatSnackBar,
          useValue: mockSnackBar,
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
          provide: PerspectiveApiService,
          useValue: jasmine.createSpy(),
        },
        {
          provide: ReportService,
          useValue: mockReportService,
        },
        {
          provide: Router,
          useValue: mockRouter,
        },
        {
          provide: SocialMediaItemService,
          useValue: mockSocialMediaItemsService,
        },
        {
          provide: TwitterApiService,
          useValue: jasmine.createSpy(),
        },
        {
          provide: MatDialog,
          useValue: {
            open(componentName: string) {
              return new DialogRefStub<boolean>(dialogCloseTrigger);
            },
            closeAll() {
              return new DialogRefStub<boolean>(dialogCloseTrigger);
            },
          },
        },
        ...providers,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    expect(component).toBeTruthy();
  });

  it('navigates to the Create Report page when the "All Comments" view comments button is clicked', () => {
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    // Of the four recommended report cards the last one is to view all
    // comments.
    fixture.nativeElement.querySelectorAll('.view-comments-button')[3].click();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/create-report'], {
      queryParams: { toxicityFilterName: 'All' },
    });
  });

  it('navigates to the Create Report page when the View "Unknown priority" comments button is clicked', () => {
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    // Of the four recommended report cards the third one is to view all
    // comments.
    fixture.nativeElement.querySelectorAll('.view-comments-button')[2].click();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/create-report'], {
      queryParams: { toxicityFilterName: ['Unsure', 'Unable to score'] },
    });
  });

  it('creates recommended report cards', () => {
    const tweetsSubject = new Subject<Array<ScoredItem<Tweet>>>();
    const expectedCardCount = 4;
    mockSocialMediaItemsService.fetchItems.and.returnValue(
      tweetsSubject.asObservable()
    );
    createComponent();
    let recommendedReportCards = fixture.debugElement.queryAll(
      By.css('app-recommended-report-card')
    );

    expect(recommendedReportCards.length).toEqual(expectedCardCount);
    for (let i = 0; i < expectedCardCount; i++) {
      const cardComponent = recommendedReportCards[i].componentInstance;
      expect(cardComponent.loading).toBe(true);
      expect(cardComponent.reportData.comments).toEqual([]);
    }

    tweetsSubject.next(tweets);
    fixture.detectChanges();

    recommendedReportCards = fixture.debugElement.queryAll(
      By.css('app-recommended-report-card')
    );

    expect(recommendedReportCards.length).toEqual(expectedCardCount);

    for (let i = 0; i < expectedCardCount; i++) {
      const cardComponent = recommendedReportCards[i].componentInstance;
      expect(cardComponent.loading).toBe(false);
      const template = RECOMMENDED_REPORT_TEMPLATES[i];
      expect(cardComponent.reportData.toxicityRangeFilter).toEqual(
        template.toxicityRangeFilter
      );
      expect(cardComponent.reportData.name).toEqual(template.name);
      expect(cardComponent.reportData.description).toEqual(
        template.description
      );
    }

    // Verify that the cards render as per the toxicity filter thresholds
    // defined in the recommended reports.
    expect(
      recommendedReportCards[0].componentInstance.reportData.comments
    ).toEqual([tweets[6]]);
    expect(
      recommendedReportCards[1].componentInstance.reportData.comments
    ).toEqual([tweets[5], tweets[7]]);
    expect(
      recommendedReportCards[2].componentInstance.reportData.comments
    ).toEqual([tweets[0], tweets[2], tweets[4]]);
    expect(
      recommendedReportCards[3].componentInstance.reportData.comments.length
    ).toEqual(tweets.length);
  });

  it('navigates to the Create Report page with recommended report name', () => {
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    const highToxicityRecommendedReportCard = fixture.debugElement.query(
      By.css('app-recommended-report-card')
    );
    highToxicityRecommendedReportCard.nativeElement
      .querySelector('.view-comments-button')
      .click();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/create-report'], {
      queryParams: { toxicityFilterName: 'Likely' },
    });
  });

  it('shows the welcome back card on login if there is a report with comments', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    reportCommentsSubject.next(tweets);
    fixture.detectChanges();

    const welcomeBackCard = fixture.debugElement.query(
      By.css('.welcome-back-card')
    );
    expect(welcomeBackCard).toBeTruthy();
  });

  it('shows the welcome back card on login if there is a report with context', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    reportContextChangedSubject.next('some context');
    fixture.detectChanges();

    const welcomeBackCard = fixture.debugElement.query(
      By.css('.welcome-back-card')
    );
    expect(welcomeBackCard).toBeTruthy();
  });

  it('shows the welcome back card on login if there is a report with reasons', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    reportReasonsChangedSubject.next(['some reason']);
    fixture.detectChanges();

    const welcomeBackCard = fixture.debugElement.query(
      By.css('.welcome-back-card')
    );
    expect(welcomeBackCard).toBeTruthy();
  });

  it('shows the welcome back card on login if there is a report with data for all fields', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    reportCommentsSubject.next(tweets);
    reportContextChangedSubject.next('some context');
    reportReasonsChangedSubject.next(['some reason']);
    fixture.detectChanges();

    const welcomeBackCard = fixture.debugElement.query(
      By.css('.welcome-back-card')
    );
    expect(welcomeBackCard).toBeTruthy();
  });

  it('does not show the welcome back card on login if there is not a report with data', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    reportCommentsSubject.next([]);
    reportContextChangedSubject.next('');
    reportReasonsChangedSubject.next([]);
    fixture.detectChanges();

    const welcomeBackCard = fixture.debugElement.query(
      By.css('.welcome-back-card')
    );
    expect(welcomeBackCard).toBeFalsy();
  });

  it('does not show the welcome back card if a user navigates away from the home page', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    reportCommentsSubject.next(tweets);
    fixture.detectChanges();

    let welcomeBackCard = fixture.debugElement.query(
      By.css('.welcome-back-card')
    );
    expect(welcomeBackCard).toBeTruthy();

    eventsSubject.next(new NavigationStart(1, '/create-report'));
    fixture.detectChanges();

    welcomeBackCard = fixture.debugElement.query(By.css('.welcome-back-card'));
    expect(welcomeBackCard).toBeFalsy();

    eventsSubject.next(new NavigationStart(1, '/home'));
    welcomeBackCard = fixture.debugElement.query(By.css('.welcome-back-card'));
    expect(welcomeBackCard).toBeFalsy();
  });

  it('does not show the welcome back card if a user clears the report', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    reportCommentsSubject.next(tweets);
    fixture.detectChanges();

    let welcomeBackCard = fixture.debugElement.query(
      By.css('.welcome-back-card')
    );
    expect(welcomeBackCard).toBeTruthy();

    reportClearedSubject.next();
    fixture.detectChanges();

    welcomeBackCard = fixture.debugElement.query(By.css('.welcome-back-card'));
    expect(welcomeBackCard).toBeFalsy();
  });

  it('does not show the welcome back card if a user adds comments to a previously empty report after login', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    reportCommentsSubject.next([]);
    fixture.detectChanges();

    let welcomeBackCard = fixture.debugElement.query(
      By.css('.welcome-back-card')
    );
    expect(welcomeBackCard).toBeFalsy();

    reportCommentsSubject.next(tweets);
    fixture.detectChanges();

    welcomeBackCard = fixture.debugElement.query(By.css('.welcome-back-card'));
    expect(welcomeBackCard).toBeFalsy();
  });

  it(
    'navigates to the corresponding page for the current step on Continue ' +
      'Report click',
    () => {
      createComponent();
      twitterSignInTestSubject.next(true);
      reportCommentsSubject.next(tweets);
      fixture.detectChanges();
      mockReportService.getReportStep.and.returnValue(
        BuildReportStep.EDIT_DETAILS
      );
      const continueReportButton = fixture.debugElement.query(
        By.css('.continue-report-button')
      ).nativeElement;
      continueReportButton.click();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/review-report']);
    }
  );

  it('shows dialog when clear report button is clicked', () => {
    createComponent();
    twitterSignInTestSubject.next(true);
    reportCommentsSubject.next(tweets);
    fixture.detectChanges();

    const clearReportButton = fixture.debugElement.query(
      By.css('.start-over-button')
    );

    clearReportButton.nativeElement.click();
    fixture.detectChanges();

    expect(component.clearReportDialogOpen).toBe(true);
    dialogCloseTrigger.next(true);
    fixture.detectChanges();

    expect(component.clearReportDialogOpen).toBe(false);
    expect(mockReportService.clearReport).toHaveBeenCalled();
  });

  it('does not show loading dialog if comments are already loaded', () => {
    const tweetsSubject = new ReplaySubject<Array<ScoredItem<Tweet>>>(1);
    mockSocialMediaItemsService.fetchItems.and.returnValue(
      tweetsSubject.asObservable()
    );
    tweetsSubject.next(tweets);

    createComponent();
    twitterSignInTestSubject.next(true);
    fixture.detectChanges();
    expect(component.loadingDialogOpen).toBe(false);
  });

  it('close loading dialog when comments load', () => {
    const tweetsSubject = new ReplaySubject<Array<ScoredItem<Tweet>>>(1);
    mockSocialMediaItemsService.fetchItems.and.returnValue(
      tweetsSubject.asObservable()
    );
    createComponent();
    twitterSignInTestSubject.next(true);
    fixture.detectChanges();
    expect(component.loadingDialogOpen).toBe(true);

    tweetsSubject.next(tweets);
    fixture.detectChanges();

    expect(component.clearReportDialogOpen).toBe(false);
  });

  it('shows snack bar when add all to report gets clicked', () => {
    const tweetsSubject = new Subject<Array<ScoredItem<Tweet>>>();
    mockSocialMediaItemsService.fetchItems.and.returnValue(
      tweetsSubject.asObservable()
    );
    createComponent();
    twitterSignInTestSubject.next(true);
    tweetsSubject.next(tweets);
    fixture.detectChanges();

    const addAllToReportButton = fixture.debugElement.query(
      By.css('app-recommended-report-card .add-all-to-report-button')
    );
    expect(addAllToReportButton.nativeElement.disabled).toBe(false);
    addAllToReportButton.nativeElement.click();
    fixture.detectChanges();

    reportCommentsSubject.next(tweets);
    fixture.detectChanges();

    expect(mockSnackBar.open).toHaveBeenCalled();
  });

  it('clicking snackbar navigates to review report page', async () => {
    const tweetsSubject = new Subject<Array<ScoredItem<Tweet>>>();
    mockSocialMediaItemsService.fetchItems.and.returnValue(
      tweetsSubject.asObservable()
    );
    createComponent();
    twitterSignInTestSubject.next(true);
    tweetsSubject.next(tweets);
    fixture.detectChanges();

    const addAllToReportButton = fixture.debugElement.query(
      By.css('app-recommended-report-card .add-all-to-report-button')
    );
    expect(addAllToReportButton.nativeElement.disabled).toBe(false);
    addAllToReportButton.nativeElement.click();
    fixture.detectChanges();

    reportCommentsSubject.next(tweets);
    fixture.detectChanges();

    expect(mockSnackBar.open).toHaveBeenCalled();
    mockSnackBarActionSubject.next();
    mockSnackBarDismissedSubject.next({ dismissedByAction: true });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/review-report']);
  });

  it(
    'should not show snack bar when comments added but add all to report has ' +
      'not been clicked',
    () => {
      const tweetsSubject = new Subject<Array<ScoredItem<Tweet>>>();
      mockSocialMediaItemsService.fetchItems.and.returnValue(
        tweetsSubject.asObservable()
      );
      createComponent();
      twitterSignInTestSubject.next(true);
      tweetsSubject.next(tweets);
      fixture.detectChanges();

      reportCommentsSubject.next(tweets);
      fixture.detectChanges();

      expect(mockSnackBar.open).not.toHaveBeenCalled();
    }
  );
});
