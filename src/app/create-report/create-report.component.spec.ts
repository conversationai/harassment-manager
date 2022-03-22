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
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AngularFireModule } from '@angular/fire/compat';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  ActivatedRoute,
  convertToParamMap,
  NavigationEnd,
  ParamMap,
  Params,
  Router,
  RouterEvent,
} from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  of,
  ReplaySubject,
  Subject,
  throwError,
} from 'rxjs';
import {
  ScoredItem,
  SelectableItem,
  SocialMediaItem,
  Tweet,
} from '../../common-types';
import { environment } from '../../environments/environment';
import { CommentInfoExpansionComponent } from '../comment-info-expansion/comment-info-expansion.component';
import { CommentInfoComponent } from '../comment-info/comment-info.component';
import { CommentLinkComponent } from '../comment-link/comment-link.component';
import { DialogRefStub, MockFirestoreService } from '../common/test_utils';
import { ExpansionBoxComponent } from '../expansion-box/expansion-box.component';
import { FilterDropdownComponent } from '../filter-dropdown/filter-dropdown.component';
import { DateFilter, ToxicityRangeFilter } from '../filter_utils';
import { FirestoreService } from '../firestore.service';
import { OnboardingService } from '../onboarding.service';
import { PerspectiveApiService } from '../perspectiveapi.service';
import { RegularExpressionFilterComponent } from '../regular-expression-filter/regular-expression-filter.component';
import { ReportService } from '../report.service';
import { SearchBoxComponent } from '../search-box/search-box.component';
import { SheetsApiService } from '../sheets_api.service';
import { SocialMediaItemService } from '../social-media-item.service';
import { ToxicityRangeFilterComponent } from '../toxicity-range-filter/toxicity-range-filter.component';
import { TweetImageComponent } from '../tweet-image/tweet-image.component';
import { TwitterApiService } from '../twitter_api.service';
import {
  CreateReportComponent,
  SortOption,
  ToxicityRangeFilterDropdownOption,
  TOXICITY_FILTER_NAME_QUERY_PARAM,
} from './create-report.component';

function verifyExpectedCommentsDisplayed(
  fixture: ComponentFixture<CreateReportComponent>,
  expectedTweets: Array<ScoredItem<SocialMediaItem>>
) {
  const tweetInfoComponents = fixture.debugElement.queryAll(
    By.css('app-comment-info')
  );
  expect(tweetInfoComponents.length).toEqual(expectedTweets.length);
  for (let i = 0; i < tweetInfoComponents.length; i++) {
    const componentInstance = tweetInfoComponents[i].componentInstance;
    expect(componentInstance.comment.item).toEqual(expectedTweets[i].item);
    expect(componentInstance.comment.scores).toEqual(expectedTweets[i].scores);
    expect(tweetInfoComponents[i].nativeElement.textContent).toContain(
      expectedTweets[i].item.text
    );
  }
}

function verifyExpectedSelectedTweetsDisplayed(
  fixture: ComponentFixture<CreateReportComponent>,
  expectedTweets: Array<SelectableItem<Tweet>>
) {
  verifyExpectedCommentsDisplayed(fixture, expectedTweets);
  const tweetInfoComponents = fixture.debugElement
    .queryAll(By.css('app-comment-info'))
    .map(item => item.componentInstance);
  for (let i = 0; i < tweetInfoComponents.length; i++) {
    expect(tweetInfoComponents[i].tweet.selected).toEqual(
      expectedTweets[i].selected
    );
    expect(tweetInfoComponents[i].selected).toEqual(expectedTweets[i].selected);
  }
}

const toxicitySortFn = (a: ScoredItem<Tweet>, b: ScoredItem<Tweet>) => {
  if (a.scores.TOXICITY === b.scores.TOXICITY) {
    return 0;
  } else {
    return a.scores.TOXICITY! > b.scores.TOXICITY! ? -1 : 1;
  }
};

class MockActivatedRoute {
  private snapshot: { queryParamMap: ParamMap | null } = {
    queryParamMap: null,
  };

  constructor(queryParams: Params) {
    this.setQueryParams(queryParams);
  }

  setQueryParams(queryParams: Params) {
    this.snapshot.queryParamMap = convertToParamMap(queryParams);
  }
}

describe('CreateReportComponent', () => {
  let component: CreateReportComponent;
  let fixture: ComponentFixture<CreateReportComponent>;
  let mockActivatedRoute: MockActivatedRoute;
  let mockFireStoreService: MockFirestoreService;
  let routerEventSubject: Subject<NavigationEnd>;
  let mockRouter: { events: Observable<RouterEvent> };
  // Global because we often need to define what items will be loaded before
  // component initialization.
  const socialMediaItemsLoadedSubject = new ReplaySubject<number>(0);
  const mockSocialMediaItemsService = jasmine.createSpyObj<
    SocialMediaItemService
  >('socialMediaItemsService', ['fetchItems', 'getTotalCommentFetchCount'], {
    onSocialMediaItemsLoaded: socialMediaItemsLoadedSubject,
  });
  mockSocialMediaItemsService.fetchItems.and.returnValue(of([]));
  let reportCommentsSubject: BehaviorSubject<Array<
    ScoredItem<SocialMediaItem>
  >>;
  let reportClearedSubject: Subject<void>;
  let mockReportService: jasmine.SpyObj<ReportService>;

  const mockOnboardingService = jasmine.createSpyObj<OnboardingService>(
    'onboardingService',
    [
      'getCreateReportPageOnboardingComplete',
      'triggerHighlightReviewReportButton',
    ]
  );

  const now = Date.now();

  beforeEach(() => {
    // Clear all tracking of fetchItems() from previous tests so we can
    // accurately verify the call count in individual tests.
    mockSocialMediaItemsService.fetchItems.calls.reset();

    // Reset the fetchItems return value, as we modify it in many tests.
    mockSocialMediaItemsService.fetchItems.and.returnValue(of([]));

    mockOnboardingService.triggerHighlightReviewReportButton.calls.reset();
  });

  function createComponent(providers: Provider[] = []) {
    mockFireStoreService = new MockFirestoreService();

    const mockPerspectiveApiService = jasmine.createSpyObj<
      PerspectiveApiService
    >('perspectiveApiService', ['checkText']);

    const mockTwitterApiService = jasmine.createSpyObj<TwitterApiService>(
      'twitterApiService',
      ['getTweets']
    );
    mockTwitterApiService.getTweets.and.returnValue(
      Promise.resolve({ tweets: [] })
    );

    mockOnboardingService.getCreateReportPageOnboardingComplete.and.returnValue(
      of(true)
    );

    reportClearedSubject = new Subject<void>();
    reportCommentsSubject = new BehaviorSubject<
      Array<ScoredItem<SocialMediaItem>>
    >([]);
    mockReportService = jasmine.createSpyObj<ReportService>(
      'reportService',
      [
        'getCommentsForReport',
        'removeCommentFromReport',
        'addCommentsToReport',
      ],
      {
        reportCleared: reportClearedSubject.asObservable(),
        reportCommentsChanged: reportCommentsSubject.asObservable(),
      }
    );
    mockReportService.getCommentsForReport.and.returnValue(
      reportCommentsSubject.value
    );

    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = 'Likely';
    mockActivatedRoute = new MockActivatedRoute(params);
    routerEventSubject = new Subject<NavigationEnd>();
    mockRouter = {
      events: routerEventSubject.asObservable(),
    };

    TestBed.configureTestingModule({
      declarations: [
        CommentInfoComponent,
        CommentInfoExpansionComponent,
        CommentLinkComponent,
        CreateReportComponent,
        ExpansionBoxComponent,
        FilterDropdownComponent,
        RegularExpressionFilterComponent,
        SearchBoxComponent,
        ToxicityRangeFilterComponent,
        TweetImageComponent,
      ],
      imports: [
        AngularFireModule.initializeApp(environment.firebase),
        FormsModule,
        HttpClientTestingModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatCardModule,
        MatCheckboxModule,
        MatChipsModule,
        MatDatepickerModule,
        MatDialogModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatNativeDateModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatSnackBarModule,
        MatTabsModule,
        NoopAnimationsModule,
        OverlayModule,
        ReactiveFormsModule,
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: mockActivatedRoute,
        },
        {
          provide: FirestoreService,
          useValue: mockFireStoreService,
        },
        {
          provide: OnboardingService,
          useValue: mockOnboardingService,
        },
        {
          provide: PerspectiveApiService,
          useValue: mockPerspectiveApiService,
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
          useValue: mockTwitterApiService,
        },
        SheetsApiService,
        ...providers,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateReportComponent);
    component = fixture.debugElement.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('correctly initializes default date filters of time: since yesterday', async () => {
    const nowDate = new Date(now);
    const midnightToday = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      nowDate.getDate()
    );
    const midnightYesterday = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      nowDate.getDate() - 1
    );
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'She turned me into a newt!',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.5,
        },
      },
      {
        item: {
          id_str: 'b',
          text:
            'Strange women lying in ponds distributing swords is no basis for a system of government.',
          date: midnightToday,
        },
        scores: {
          TOXICITY: 0.2,
        },
      },
      {
        item: {
          id_str: 'c',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: midnightYesterday,
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      {
        item: {
          id_str: 'd',
          text: 'What is your favorite color?',
          date: new Date(midnightYesterday.getTime() - 1),
        },
        scores: {
          TOXICITY: 0.3,
        },
      },
      {
        item: {
          id_str: 'e',
          text: 'What is the airspeed velocity of an unladen swallow?',
          date: new Date(midnightYesterday.getTime() - 10000000),
        },
        scores: {
          TOXICITY: 0.4,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(
      fixture,
      [tweets[0], tweets[1], tweets[2]].sort(toxicitySortFn)
    );
  });

  it('updates UI comment view when filters change', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'She turned me into a newt!',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.5,
        },
      },
      {
        item: {
          id_str: 'b',
          text:
            'Strange women lying in ponds distributing swords is no basis for a system of government.',
          date: new Date(now - 1001),
        },
        scores: {
          TOXICITY: 0.2,
        },
      },
      {
        item: {
          id_str: 'c',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: new Date(now - 20),
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      {
        item: {
          id_str: 'd',
          text: 'What is your favorite color?',
          date: new Date(now - 1000),
        },
        scores: {
          TOXICITY: 0.3,
        },
      },
      {
        item: {
          id_str: 'e',
          text: 'What is the airspeed velocity of an unladen swallow?',
          date: new Date(now - 1000.1),
        },
        scores: {
          TOXICITY: 0.4,
        },
      },
      {
        item: {
          id_str: 'f',
          text: 'your mother was a hamster',
          date: new Date(now - 500),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'g',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 30),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'h',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(
      fixture,
      tweets.slice().sort(toxicitySortFn)
    );

    component.includeRegexFilters = [
      {
        regex: 'your',
        include: true,
      },
    ];
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(
      fixture,
      [tweets[3], tweets[5], tweets[6]].sort(toxicitySortFn)
    );

    component.includeRegexFilters = [];
    component.toxicityRangeFilters = [
      {
        minScore: 0.5,
        maxScore: 1,
        includeUnscored: false,
      },
    ];
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(
      fixture,
      [tweets[0], tweets[5], tweets[6], tweets[7]].sort(toxicitySortFn)
    );

    component.includeRegexFilters = [];
    component.toxicityRangeFilters = [
      {
        minScore: 0,
        maxScore: 1,
        includeUnscored: false,
      },
    ];
    component.dateFilter = {
      startDateTimeMs: now - 1000,
      endDateTimeMs: now,
    };
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(
      fixture,
      [tweets[0], tweets[2], tweets[3], tweets[5], tweets[6]].sort(
        toxicitySortFn
      )
    );

    component.includeRegexFilters = [
      {
        regex: 'your',
        include: true,
      },
    ];
    component.toxicityRangeFilters = [
      {
        minScore: 0.5,
        maxScore: 1,
        includeUnscored: false,
      },
    ];
    component.dateFilter = {
      startDateTimeMs: now - 1000,
      endDateTimeMs: now,
    };
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(
      fixture,
      [tweets[5], tweets[6]].sort(toxicitySortFn)
    );
  });

  it('updates UI comment view when sorting changes', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
          favorite_count: 2,
          reply_count: 0,
          retweet_count: 0,
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
          favorite_count: 500,
          reply_count: 20,
          retweet_count: 100,
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
          favorite_count: 50,
          reply_count: 4,
          retweet_count: 10,
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);

    component.selectedSortOption = SortOption.TIME;
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[2], tweets[1], tweets[0]]);

    component.selectedSortOption = SortOption.POPULARITY;
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[2], tweets[0]]);

    component.selectedSortOption = SortOption.PRIORITY;
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);
  });

  it('preserves selected state when sorting changes', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
          favorite_count: 2,
          reply_count: 0,
          retweet_count: 0,
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
          favorite_count: 500,
          reply_count: 20,
          retweet_count: 100,
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
          favorite_count: 50,
          reply_count: 4,
          retweet_count: 10,
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    fixture.detectChanges();
    const comments = component.comments;
    expect(comments).toEqual(
      tweets.map(tweet => ({
        item: tweet.item,
        scores: tweet.scores,
        selected: false,
      }))
    );
    comments[0].selected = true;
    comments[2].selected = true;
    fixture.detectChanges();
    verifyExpectedSelectedTweetsDisplayed(fixture, [
      { item: tweets[1].item, scores: tweets[1].scores, selected: false },
      { item: tweets[0].item, scores: tweets[0].scores, selected: true },
      { item: tweets[2].item, scores: tweets[2].scores, selected: true },
    ]);

    component.selectedSortOption = SortOption.TIME;
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedSelectedTweetsDisplayed(fixture, [
      { item: tweets[2].item, scores: tweets[2].scores, selected: true },
      { item: tweets[1].item, scores: tweets[1].scores, selected: false },
      { item: tweets[0].item, scores: tweets[0].scores, selected: true },
    ]);

    component.selectedSortOption = SortOption.PRIORITY;
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedSelectedTweetsDisplayed(fixture, [
      { item: tweets[1].item, scores: tweets[1].scores, selected: false },
      { item: tweets[0].item, scores: tweets[0].scores, selected: true },
      { item: tweets[2].item, scores: tweets[2].scores, selected: true },
    ]);
  });

  it('renders comments correctly when a custom date filter is selected', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    const dialogCloseTrigger = new Subject<DateFilter | null>();
    createComponent([
      {
        provide: MatDialog,
        useValue: {
          open(componentName: string) {
            return new DialogRefStub<DateFilter | null>(dialogCloseTrigger);
          },
        },
      },
    ]);
    const customDateFilter = {
      startDateTimeMs: now - 100,
      endDateTimeMs: now - 9,
    };
    fixture.detectChanges();
    expect(component.getDatePickerDialogOpen()).toBe(false);
    expect(component.dateFilter).not.toEqual(customDateFilter);
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);

    const customDateOption =
      component.dateDropdownOptions[component.dateDropdownOptions.length - 1];
    component.dateFilterDropdown.selectedOption.setValue(customDateOption);
    fixture.detectChanges();

    expect(component.getDatePickerDialogOpen()).toBe(true);

    dialogCloseTrigger.next(customDateFilter);

    fixture.detectChanges();
    expect(component.getDatePickerDialogOpen()).toBe(false);
    expect(component.dateFilter).toEqual(customDateFilter);
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0]]);
  });

  it('issues requests for comments when the date selection is out of range of the previous selection', () => {
    const dialogCloseTrigger = new Subject<DateFilter | null>();
    createComponent([
      {
        provide: MatDialog,
        useValue: {
          open(componentName: string) {
            return new DialogRefStub<DateFilter | null>(dialogCloseTrigger);
          },
        },
      },
    ]);

    // The component fetches comments once on load.
    expect(mockSocialMediaItemsService.fetchItems).toHaveBeenCalledTimes(1);

    // Select 'Last week'.
    component.dateFilterDropdown.selectedOption.setValue(
      component.dateDropdownOptions[2]
    );
    fixture.detectChanges();
    expect(mockSocialMediaItemsService.fetchItems).toHaveBeenCalledTimes(2);

    // Select 'Last two days'.
    component.dateFilterDropdown.selectedOption.setValue(
      component.dateDropdownOptions[1]
    );
    fixture.detectChanges();
    expect(mockSocialMediaItemsService.fetchItems).toHaveBeenCalledTimes(2);

    // Select 'Since yesterday'.
    component.dateFilterDropdown.selectedOption.setValue(
      component.dateDropdownOptions[0]
    );
    fixture.detectChanges();
    expect(mockSocialMediaItemsService.fetchItems).toHaveBeenCalledTimes(2);

    // Select a custom date option out of the current range.
    const customDateOption =
      component.dateDropdownOptions[component.dateDropdownOptions.length - 1];
    component.dateFilterDropdown.selectedOption.setValue(customDateOption);
    fixture.detectChanges();
    const customDateFilter = {
      startDateTimeMs: now - 10000000000,
      endDateTimeMs: now,
    };
    dialogCloseTrigger.next(customDateFilter);
    fixture.detectChanges();
    expect(mockSocialMediaItemsService.fetchItems).toHaveBeenCalledTimes(3);
  });

  it('renders comments correctly when select custom date filter is cancelled', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    const dialogCloseTrigger = new Subject<DateFilter | null>();
    createComponent([
      {
        provide: MatDialog,
        useValue: {
          open(componentName: string) {
            return new DialogRefStub<DateFilter | null>(dialogCloseTrigger);
          },
        },
      },
    ]);
    fixture.detectChanges();
    expect(component.getDatePickerDialogOpen()).toBe(false);
    const displayedTweets = fixture.nativeElement.querySelectorAll(
      'app-comment-info'
    );
    expect(displayedTweets.length).toEqual(3);
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);

    const customDateOption =
      component.dateDropdownOptions[component.dateDropdownOptions.length - 1];
    component.dateFilterDropdown.selectedOption.setValue(customDateOption);
    fixture.detectChanges();

    expect(component.getDatePickerDialogOpen()).toBe(true);

    dialogCloseTrigger.next(null);

    fixture.detectChanges();
    expect(component.getDatePickerDialogOpen()).toBe(false);
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);
  });

  it('renders comments correctly when a custom toxicity filter is selected', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    const dialogCloseTrigger = new Subject<ToxicityRangeFilter | null>();
    createComponent([
      {
        provide: MatDialog,
        useValue: {
          open(componentName: string) {
            return new DialogRefStub<ToxicityRangeFilter | null>(
              dialogCloseTrigger
            );
          },
        },
      },
    ]);
    fixture.detectChanges();
    expect(component.getToxicityRangeDialogOpen()).toBe(false);
    const toxicityRangeFilter =
      component.toxicityRangeDropdownOptions[0].toxicityRangeFilter;
    expect(toxicityRangeFilter).toBeDefined();
    expect(component.toxicityRangeFilters).toEqual(
      component.toxicityRangeDropdownOptions
        .filter(option => !option.customOption)
        .map(option => option.toxicityRangeFilter!)
    );
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);

    const customToxicityRangeOption =
      component.toxicityRangeDropdownOptions[
        component.toxicityRangeDropdownOptions.length - 1
      ];
    component.toxicityRangeDropdown.selectedOptions.setValue([
      customToxicityRangeOption,
    ]);
    fixture.detectChanges();

    expect(component.getToxicityRangeDialogOpen()).toBe(true);

    const customToxicityRangeFilter = {
      minScore: 0.75,
      maxScore: 0.9,
      includeUnscored: false,
    };
    dialogCloseTrigger.next(customToxicityRangeFilter);

    fixture.detectChanges();
    expect(component.getToxicityRangeDialogOpen()).toBe(false);
    expect(component.toxicityRangeFilters).toEqual([customToxicityRangeFilter]);
    verifyExpectedCommentsDisplayed(fixture, [tweets[0]]);
  });

  it('renders comments correctly when select custom toxicity range filter is cancelled', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    const dialogCloseTrigger = new Subject<ToxicityRangeFilter | null>();
    createComponent([
      {
        provide: MatDialog,
        useValue: {
          open(componentName: string) {
            return new DialogRefStub<ToxicityRangeFilter | null>(
              dialogCloseTrigger
            );
          },
        },
      },
    ]);
    fixture.detectChanges();
    expect(component.getToxicityRangeDialogOpen()).toBe(false);
    expect(component.toxicityRangeFilters).toEqual(
      component.toxicityRangeDropdownOptions
        .filter(option => !option.customOption)
        .map(option => option.toxicityRangeFilter!)
    );
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);

    // Select "likely" and "somewhat likely"
    component.toxicityRangeDropdown.selectedOptions.setValue([
      component.toxicityRangeDropdownOptions[1],
      component.toxicityRangeDropdownOptions[2],
    ]);
    fixture.detectChanges();
    expect(component.toxicityRangeFilters).toEqual([
      component.toxicityRangeDropdownOptions[1].toxicityRangeFilter!,
      component.toxicityRangeDropdownOptions[2].toxicityRangeFilter!,
    ]);
    verifyExpectedCommentsDisplayed(fixture, [tweets[0], tweets[2]]);

    // Select a custom range, but then cancel the dialog.
    const customToxicityRangeOption =
      component.toxicityRangeDropdownOptions[
        component.toxicityRangeDropdownOptions.length - 1
      ];
    component.toxicityRangeDropdown.selectedOptions.setValue([
      customToxicityRangeOption,
    ]);
    fixture.detectChanges();

    expect(component.getToxicityRangeDialogOpen()).toBe(true);

    dialogCloseTrigger.next(null);

    fixture.detectChanges();
    expect(component.getToxicityRangeDialogOpen()).toBe(false);

    // "likely" and "somewhat likely" should still be selected.
    expect(component.toxicityRangeDropdown.selectedOptions.value).toEqual([
      component.toxicityRangeDropdownOptions[1],
      component.toxicityRangeDropdownOptions[2],
    ]);
    expect(component.toxicityRangeFilters).toEqual([
      component.toxicityRangeDropdownOptions[1].toxicityRangeFilter!,
      component.toxicityRangeDropdownOptions[2].toxicityRangeFilter!,
    ]);
    verifyExpectedCommentsDisplayed(fixture, [tweets[0], tweets[2]]);
  });

  it('paginates through comments correctly', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      {
        item: {
          id_str: 'd',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: new Date(now - 20),
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      {
        item: {
          id_str: 'e',
          text: 'What is your favorite color?',
          date: new Date(now - 1000),
        },
        scores: {
          TOXICITY: 0.3,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    component.pageSize = 2;
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0]]);

    const componentElement = fixture.debugElement.nativeElement;
    componentElement.querySelector('.mat-paginator-navigation-next').click();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[2], tweets[4]]);

    componentElement.querySelector('.mat-paginator-navigation-next').click();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[3]]);
  });

  it('resets page to 0 if filters change when on an out of range page', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      {
        item: {
          id_str: 'd',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      {
        item: {
          id_str: 'e',
          text: 'What is your favorite color?',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.3,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    component.setPageSize(2);
    fixture.detectChanges();

    expect(component.paginator.getNumberOfPages()).toEqual(3);
    expect(component.filteredComments.length).toEqual(5);

    // Go to the third page.
    const componentElement = fixture.debugElement.nativeElement;
    componentElement.querySelector('.mat-paginator-navigation-next').click();
    fixture.detectChanges();
    componentElement.querySelector('.mat-paginator-navigation-next').click();
    fixture.detectChanges();

    expect(component.getPageIndex()).toEqual(2);

    // Change filters so that there will only be two pages.
    fixture.debugElement
      .query(By.css('.toxicity-range-dropdown'))
      .componentInstance.selectedOptionsChange.emit([
        {
          toxicityRangeFilter: {
            minScore: 0.1,
            maxScore: 0.71,
            includeUnscored: false,
          },
        },
      ]);
    fixture.detectChanges();
    expect(component.paginator.getNumberOfPages()).toEqual(2);
    expect(component.filteredComments.length).toEqual(3);
    expect(component.getPageIndex()).toEqual(0);
  });

  it('does not reset page to 0 if filters change when on an in range page', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      {
        item: {
          id_str: 'd',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      {
        item: {
          id_str: 'e',
          text: 'What is your favorite color?',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.3,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    component.setPageSize(2);
    fixture.detectChanges();

    expect(component.paginator.getNumberOfPages()).toEqual(3);
    expect(component.filteredComments.length).toEqual(5);

    // Go to the second page.
    const componentElement = fixture.debugElement.nativeElement;
    componentElement.querySelector('.mat-paginator-navigation-next').click();
    fixture.detectChanges();

    expect(component.getPageIndex()).toEqual(1);

    // Change filters so that there will only be two pages.
    fixture.debugElement
      .query(By.css('.toxicity-range-dropdown'))
      .componentInstance.selectedOptionsChange.emit([
        {
          toxicityRangeFilter: {
            minScore: 0.1,
            maxScore: 0.71,
            includeUnscored: false,
          },
        },
      ]);
    fixture.detectChanges();
    expect(component.paginator.getNumberOfPages()).toEqual(2);
    expect(component.filteredComments.length).toEqual(3);
    expect(component.getPageIndex()).toEqual(1);
  });

  it('correctly sorts when paginating', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
          favorite_count: 2,
          reply_count: 0,
          retweet_count: 0,
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
          favorite_count: 500,
          reply_count: 20,
          retweet_count: 100,
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
          favorite_count: 50,
          reply_count: 4,
          retweet_count: 10,
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    component.setPageSize(2);
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0]]);
    const componentElement = fixture.debugElement.nativeElement;
    componentElement.querySelector('.mat-paginator-navigation-next').click();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[2]]);

    componentElement
      .querySelector('.mat-paginator-navigation-previous')
      .click();
    component.selectedSortOption = SortOption.TIME;
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[2], tweets[1]]);
    componentElement.querySelector('.mat-paginator-navigation-next').click();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[0]]);

    componentElement
      .querySelector('.mat-paginator-navigation-previous')
      .click();
    component.selectedSortOption = SortOption.POPULARITY;
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[2]]);
    componentElement.querySelector('.mat-paginator-navigation-next').click();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[0]]);

    componentElement
      .querySelector('.mat-paginator-navigation-previous')
      .click();
    component.selectedSortOption = SortOption.PRIORITY;
    component.applyFilters();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0]]);
    componentElement.querySelector('.mat-paginator-navigation-next').click();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[2]]);
  });

  it('handles regexFilterChange', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, tweets);
    fixture.debugElement
      .query(By.css('app-search-box'))
      .componentInstance.regexFiltersChange.emit([
        { regex: 'hamster', include: true },
      ]);
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[0]]);
  });

  it('handles toxicityRangeFilterChange', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.6,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0]]);
    fixture.debugElement
      .query(By.css('.toxicity-range-dropdown'))
      .componentInstance.selectedOptionsChange.emit([
        {
          toxicityRangeFilter: {
            minScore: 0.8,
            maxScore: 1,
            includeUnscored: false,
          },
        },
      ]);
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1]]);
  });

  it('handles dateFilterSelectionChange', () => {
    const midnightToday = new Date(new Date().setHours(0, 0, 0, 0));
    const twoDaysAgo = new Date(
      new Date(midnightToday).setDate(midnightToday.getDate() - 2)
    );
    const justBeforeTwoDaysAgo = new Date(
      new Date(twoDaysAgo).setMinutes(twoDaysAgo.getMinutes() - 1)
    );
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: midnightToday,
        },
        scores: {
          TOXICITY: 0.6,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: twoDaysAgo,
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: justBeforeTwoDaysAgo,
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[0]]);
    fixture.debugElement
      .query(By.css('.date-filter-dropdown'))
      .componentInstance.selectedOptionChange.emit({
        numDays: 2,
      });
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0]]);
  });

  it('sets the toxicity filter on load if toxicityFilterName queryParam is set', async () => {
    const comments = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.6,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.86,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(comments));
    createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const toxicityDropdown = component.toxicityRangeDropdown;
    expect(toxicityDropdown.selectedOptions.value.length).toEqual(1);
    expect(toxicityDropdown.selectedOptions.value[0].displayText).toEqual(
      'Likely harmful (85 - 100%)'
    );

    verifyExpectedCommentsDisplayed(fixture, [comments[1]]);
  });

  it('defaults to selecting all toxicity filters on load if toxicityFilterName queryParam is not set', async () => {
    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = null;
    const mockActivatedRouteWithNullParams = new MockActivatedRoute(params);
    const comments = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.6,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(comments));
    // Need to pass this in here, otherwise createComponent will override the
    // null value we just set.
    createComponent([
      {
        provide: ActivatedRoute,
        useValue: mockActivatedRouteWithNullParams,
      },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const expectedOptions = component.toxicityRangeDropdownOptions.filter(
      option => !option.customOption
    );
    expect(component.toxicityRangeFilters).toEqual(
      expectedOptions.map(option => option.toxicityRangeFilter!)
    );

    const toxicityDropdown = component.toxicityRangeDropdown;
    const selectedFilterNames = toxicityDropdown.selectedOptions.value.map(
      (value: ToxicityRangeFilterDropdownOption) => value.name
    );

    expect(selectedFilterNames).toEqual(
      expectedOptions.map(value => value.name)
    );

    verifyExpectedCommentsDisplayed(fixture, [comments[1], comments[0]]);
  });

  it('changes the toxicity filter if toxicityFilterName queryParam changes', async () => {
    const comments = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.5,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(comments));
    createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const toxicityDropdown = component.toxicityRangeDropdown;
    expect(toxicityDropdown.selectedOptions.value.length).toEqual(1);
    expect(toxicityDropdown.selectedOptions.value[0].displayText).toEqual(
      'Likely harmful (85 - 100%)'
    );
    verifyExpectedCommentsDisplayed(fixture, [comments[2]]);

    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = 'Potentially';
    mockActivatedRoute.setQueryParams(params);
    routerEventSubject.next(
      new NavigationEnd(0, 'testUrl', 'testUrlAfterRedirects')
    );
    fixture.detectChanges();

    expect(toxicityDropdown.selectedOptions.value.length).toEqual(1);
    expect(toxicityDropdown.selectedOptions.value[0].displayText).toEqual(
      'Potentially harmful (60 - 84%)'
    );
    verifyExpectedCommentsDisplayed(fixture, [comments[1]]);
  });

  it('does not changes the toxicity filter if toxicityFilterName queryParam changes to null', async () => {
    const comments = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.6,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(comments));
    createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const toxicityDropdown = component.toxicityRangeDropdown;
    expect(toxicityDropdown.selectedOptions.value.length).toEqual(1);
    expect(toxicityDropdown.selectedOptions.value[0].displayText).toEqual(
      'Likely harmful (85 - 100%)'
    );
    verifyExpectedCommentsDisplayed(fixture, [comments[2]]);

    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = null;
    mockActivatedRoute.setQueryParams(params);
    routerEventSubject.next(
      new NavigationEnd(0, 'testUrl', 'testUrlAfterRedirects')
    );
    fixture.detectChanges();

    expect(toxicityDropdown.selectedOptions.value.length).toEqual(1);
    expect(toxicityDropdown.selectedOptions.value[0].displayText).toEqual(
      'Likely harmful (85 - 100%)'
    );
    verifyExpectedCommentsDisplayed(fixture, [comments[2]]);
  });

  it('shows an error when comments fail to load', () => {
    mockSocialMediaItemsService.fetchItems.and.returnValue(
      throwError('Oh no!')
    );
    createComponent();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, []);
    expect(fixture.debugElement.nativeElement.textContent).toContain(
      'Error loading comments. Please try again.'
    );
  });

  it('does not show comments as selected when they are filtered out', () => {
    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = null;
    const mockActivatedRouteWithNullParams = new MockActivatedRoute(params);
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.5,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent([
      {
        provide: ActivatedRoute,
        // Include all scores
        useValue: mockActivatedRouteWithNullParams,
      },
    ]);
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);

    // Select the tweets with the two highest scores.
    const tweetInfoCheckboxes = fixture.debugElement.queryAll(
      By.css('app-comment-info .checkbox label')
    );
    tweetInfoCheckboxes[0].nativeElement.click(); // tweets[1]
    tweetInfoCheckboxes[1].nativeElement.click(); // tweets[0]

    fixture.detectChanges();
    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
    ]);

    // Update the filters to exclude the higher scores, and check that the
    // previously selected comments are no longer selected..
    component.toxicityRangeDropdown.selectedOptions.setValue([
      component.toxicityRangeDropdownOptions[2], // Unsure if harmful (0.4-0.6)
    ]);
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[2]]);
    expect(component.getSelectedComments()).toEqual([]);

    // Change back to view all comments, and check that the previously selected
    // comments are selected again.
    component.toxicityRangeDropdown.selectedOptions.setValue(
      // All toxicity values except the custom option.
      component.toxicityRangeDropdownOptions.filter(item => !item.customOption)
    );
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);
    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
    ]);
  });

  it('select all works', async () => {
    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = null;
    const mockActivatedRouteWithNullParams = new MockActivatedRoute(params);
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent([
      {
        provide: ActivatedRoute,
        // Include all scores
        useValue: mockActivatedRouteWithNullParams,
      },
    ]);
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);
    expect(component.getSelectedComments()).toEqual([]);

    let commentInfos = fixture.debugElement.queryAll(
      By.css('app-comment-info')
    );
    let tweetInfoCheckboxes = fixture.debugElement.queryAll(
      By.css('app-comment-info mat-checkbox label')
    );
    tweetInfoCheckboxes[0].nativeElement.click(); // tweets[1]
    fixture.detectChanges();
    await fixture.whenStable();

    // The first checkbox should be checked
    tweetInfoCheckboxes = fixture.debugElement.queryAll(
      By.css('app-comment-info mat-checkbox')
    );
    expect(commentInfos[0].componentInstance.selected).toBe(true);
    expect(commentInfos[1].componentInstance.selected).toBe(false);
    expect(commentInfos[2].componentInstance.selected).toBe(false);
    // This expectation fails even though selected = true and changing
    // fixture.detectChanges() doesn't seem to affect this. It works in the
    // real code.
    // expect(tweetInfoCheckboxes[0].componentInstance.checked).toBe(true);
    expect(tweetInfoCheckboxes[1].componentInstance.checked).toBe(false);
    expect(tweetInfoCheckboxes[2].componentInstance.checked).toBe(false);

    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
    ]);

    const selectAllCheckbox = fixture.debugElement.query(
      By.css('.select-all mat-checkbox label')
    );
    selectAllCheckbox.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // The rest of the checkboxes should be checked.
    commentInfos = fixture.debugElement.queryAll(By.css('app-comment-info'));
    tweetInfoCheckboxes = fixture.debugElement.queryAll(
      By.css('app-comment-info .checkbox label')
    );
    expect(commentInfos[0].componentInstance.selected).toBe(true);
    expect(commentInfos[1].componentInstance.selected).toBe(true);
    expect(commentInfos[2].componentInstance.selected).toBe(true);
    // This expectation fails even though selected = true and changing
    // fixture.detectChanges() doesn't seem to affect this. It works in the
    // real code.
    // expect(tweetInfoCheckboxes[0].componentInstance.checked).toBe(true);
    expect(tweetInfoCheckboxes[1].componentInstance.checked).toBe(true);
    expect(tweetInfoCheckboxes[2].componentInstance.checked).toBe(true);

    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
      {
        item: tweets[2].item,
        scores: tweets[2].scores,
        selected: true,
      },
    ]);
  });

  it('toggleItemsInReport checks boxes of comments already in report', async () => {
    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = null;
    const mockActivatedRouteWithNullParams = new MockActivatedRoute(params);
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent([
      {
        provide: ActivatedRoute,
        // Include all scores
        useValue: mockActivatedRouteWithNullParams,
      },
    ]);
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);
    expect(component.getSelectedComments()).toEqual([]);

    let tweetInfoCheckboxes = fixture.debugElement.queryAll(
      By.css('app-comment-info .checkbox label')
    );
    tweetInfoCheckboxes[0].nativeElement.click(); // tweets[1]
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
    ]);

    mockReportService.getCommentsForReport.and.returnValue([tweets[2]]);
    reportCommentsSubject.next([tweets[2]]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[2].item,
        scores: tweets[2].scores,
        selected: true,
      },
    ]);
    tweetInfoCheckboxes = fixture.debugElement.queryAll(
      By.css('app-comment-info .checkbox label')
    );
    expect(tweetInfoCheckboxes[0].componentInstance.checked).toBe(false);
    expect(tweetInfoCheckboxes[1].componentInstance.checked).toBe(false);
    expect(tweetInfoCheckboxes[2].componentInstance.checked).toBe(true);
  });

  it('calls reportService when comments are selected and unselected', async () => {
    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = null;
    const mockActivatedRouteWithNullParams = new MockActivatedRoute(params);
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent([
      {
        provide: ActivatedRoute,
        // Include all scores
        useValue: mockActivatedRouteWithNullParams,
      },
    ]);
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);
    expect(component.getSelectedComments()).toEqual([]);

    let tweetInfoCheckboxes = fixture.debugElement.queryAll(
      By.css('app-comment-info .checkbox label')
    );
    tweetInfoCheckboxes[0].nativeElement.click(); // tweets[1]
    fixture.detectChanges();

    expect(mockReportService.addCommentsToReport).toHaveBeenCalledWith([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      } as ScoredItem<SocialMediaItem>,
    ]);

    mockReportService.addCommentsToReport.calls.reset();
    const selectAllCheckbox = fixture.debugElement.query(
      By.css('.select-all mat-checkbox label')
    );
    selectAllCheckbox.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockReportService.addCommentsToReport).toHaveBeenCalledWith([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      } as ScoredItem<SocialMediaItem>,
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      } as ScoredItem<SocialMediaItem>,

      {
        item: tweets[2].item,
        scores: tweets[2].scores,
        selected: true,
      } as ScoredItem<SocialMediaItem>,
    ]);

    tweetInfoCheckboxes = fixture.debugElement.queryAll(
      By.css('app-comment-info .checkbox label')
    );
    tweetInfoCheckboxes[2].nativeElement.click(); // tweets[2]
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockReportService.removeCommentFromReport).toHaveBeenCalledWith({
      item: tweets[2].item,
      scores: tweets[2].scores,
      selected: false,
    } as ScoredItem<SocialMediaItem>);
  });

  it('can select all on more than one page', () => {
    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = null;
    const mockActivatedRouteWithNullParams = new MockActivatedRoute(params);
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent([
      {
        provide: ActivatedRoute,
        // Include all scores
        useValue: mockActivatedRouteWithNullParams,
      },
    ]);
    fixture.detectChanges();
    component.setPageSize(2);
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0]]);
    expect(component.getSelectedComments()).toEqual([]);

    // Select all items on the first page.
    // Note that we have to click on the label of the checkbox to trigger the
    // change event in tests; see https://stackoverflow.com/a/44935499
    let selectAllCheckbox = fixture.debugElement.query(
      By.css('.select-all mat-checkbox label')
    );
    selectAllCheckbox.nativeElement.click();
    fixture.detectChanges();

    expect(selectAllCheckbox.componentInstance.checked).toBe(true);
    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
    ]);

    // Navigate to the second page and check that the first page items are still
    // selected, and that the select all checkbox has been unchecked.
    fixture.debugElement
      .query(By.css('.mat-paginator-navigation-next'))
      .nativeElement.click();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[2]]);
    expect(selectAllCheckbox.componentInstance.checked).toBe(false);
    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
    ]);

    // Check the select all checkbox on the second page and assert that all
    // comments are selected.
    selectAllCheckbox = fixture.debugElement.query(
      By.css('.select-all mat-checkbox label')
    );
    selectAllCheckbox.nativeElement.click();
    fixture.detectChanges();
    expect(selectAllCheckbox.componentInstance.checked).toBe(true);
    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
      {
        item: tweets[2].item,
        scores: tweets[2].scores,
        selected: true,
      },
    ]);
  });

  it('can deselect all on one page while maintaining state', () => {
    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = null;
    const mockActivatedRouteWithNullParams = new MockActivatedRoute(params);
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent([
      {
        provide: ActivatedRoute,
        // Include all scores
        useValue: mockActivatedRouteWithNullParams,
      },
    ]);
    fixture.detectChanges();
    component.setPageSize(2);
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0]]);
    expect(component.getSelectedComments()).toEqual([]);

    // Select all items on the first page.
    // Note that we have to click on the label of the checkbox to trigger the
    // change event in tests; see https://stackoverflow.com/a/44935499
    let selectAllCheckbox = fixture.debugElement.query(
      By.css('.select-all mat-checkbox label')
    );
    selectAllCheckbox.nativeElement.click();
    fixture.detectChanges();

    expect(selectAllCheckbox.componentInstance.checked).toBe(true);
    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
    ]);

    // Navigate to the second page and check that the first page items are still
    // selected, and then select all on the second page.
    fixture.debugElement
      .query(By.css('.mat-paginator-navigation-next'))
      .nativeElement.click();
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[2]]);
    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
    ]);

    selectAllCheckbox = fixture.debugElement.query(
      By.css('.select-all mat-checkbox label')
    );
    selectAllCheckbox.nativeElement.click();
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[2]]);
    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
      {
        item: tweets[2].item,
        scores: tweets[2].scores,
        selected: true,
      },
    ]);

    // Click the checkbox again to deselect all on the second page and assert
    // that only the second page comments have been deselected.
    selectAllCheckbox = fixture.debugElement.query(
      By.css('.select-all mat-checkbox label')
    );
    selectAllCheckbox.nativeElement.click();
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, [tweets[2]]);
    expect(component.getSelectedComments()).toEqual([
      {
        item: tweets[1].item,
        scores: tweets[1].scores,
        selected: true,
      },
      {
        item: tweets[0].item,
        scores: tweets[0].scores,
        selected: true,
      },
    ]);
  });

  it('renders new data when the refresh button is clicked', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, tweets);

    tweets.push({
      item: {
        id_str: 'c',
        text: 'Now go away or I will taunt you a second time!',
        date: new Date(now),
      },
      scores: {
        TOXICITY: 0.6,
      },
    });
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    const componentElement = fixture.debugElement.nativeElement;
    componentElement.querySelector('.refresh-button').click();
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, tweets);
  });

  it('maintains the index of the date filter on refresh', () => {
    createComponent();
    fixture.detectChanges();
    expect(component.dateFilterDropdown.selectedOption.value.displayText).toBe(
      'Since yesterday'
    );

    const componentElement = fixture.debugElement.nativeElement;
    componentElement.querySelector('.refresh-button').click();
    fixture.detectChanges();
    expect(component.dateFilterDropdown.selectedOption.value.displayText).toBe(
      'Since yesterday'
    );
  });

  it('Updates UI when image and verified filters change', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now),
          hasImage: true,
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now),
          verified: true,
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'd',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: new Date(now),
          hasImage: true,
          verified: true,
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    fixture.detectChanges();

    verifyExpectedCommentsDisplayed(fixture, tweets);

    fixture.debugElement
      .query(By.css('.more-filters-dropdown'))
      .componentInstance.selectedOptionsChange.emit([{ hasImage: true }]);
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[3]]);

    fixture.debugElement
      .query(By.css('.more-filters-dropdown'))
      .componentInstance.selectedOptionsChange.emit([{ verified: true }]);
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[2], tweets[3]]);

    fixture.debugElement
      .query(By.css('.more-filters-dropdown'))
      .componentInstance.selectedOptionsChange.emit([
        { verified: true },
        { hasImage: true },
      ]);
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[3]]);
  });

  it('clicks through onboarding', async () => {
    const mockOnboardingService = jasmine.createSpyObj<OnboardingService>(
      'onboardingService',
      [
        'getCreateReportPageOnboardingComplete',
        'triggerHighlightReviewReportButton',
      ]
    );
    mockOnboardingService.getCreateReportPageOnboardingComplete.and.returnValue(
      of(false)
    );
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now),
        },
        scores: {
          TOXICITY: 0.85,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent([
      {
        provide: OnboardingService,
        useValue: mockOnboardingService,
      },
    ]);
    // The whenStable() is necessary to wait for the AfterViewInit()
    await fixture.whenStable();
    fixture.detectChanges();
    // Note: Compiler doesn't allow comparing DebugElement to null, so we have
    // to use falsy and truthy.
    let highlightViewSettings = fixture.debugElement.query(
      By.css('.highlight-blur-toggle')
    );
    expect(highlightViewSettings).toBeTruthy();

    let nextButton = document.querySelector(
      '.cdk-overlay-container .onboarding-view-settings button'
    );
    expect(nextButton).toBeTruthy();
    (nextButton! as HTMLElement).click();

    fixture.detectChanges();

    highlightViewSettings = fixture.debugElement.query(
      By.css('.highlight-blur-toggle')
    );
    expect(highlightViewSettings).toBeFalsy();

    let highlightFilters = fixture.debugElement.query(
      By.css('.highlight-filters')
    );
    expect(highlightFilters).toBeTruthy();

    nextButton = document.querySelector(
      '.cdk-overlay-container .onboarding-filters button'
    );
    expect(nextButton).toBeTruthy();
    (nextButton! as HTMLElement).click();

    fixture.detectChanges();

    const highlightPagination = fixture.debugElement.query(
      By.css('.highlight-pagination')
    );
    expect(highlightPagination).toBeTruthy();

    nextButton = document.querySelector(
      '.cdk-overlay-container .onboarding-pagination button'
    );
    expect(nextButton).toBeTruthy();
    (nextButton! as HTMLElement).click();

    fixture.detectChanges();

    const highlightCommentCard = fixture.debugElement.query(
      By.css('.highlight-comment-card')
    );
    expect(highlightCommentCard).toBeTruthy();

    nextButton = document.querySelector(
      '.cdk-overlay-container .onboarding-comment-card button'
    );
    expect(nextButton).toBeTruthy();
    (nextButton! as HTMLElement).click();

    fixture.detectChanges();

    expect(
      mockOnboardingService.triggerHighlightReviewReportButton
    ).toHaveBeenCalledTimes(1);

    highlightFilters = fixture.debugElement.query(By.css('.highlight-filters'));
    expect(highlightFilters).toBeFalsy();

    highlightViewSettings = fixture.debugElement.query(
      By.css('.highlight-blur-toggle')
    );
    expect(highlightViewSettings).toBeFalsy();
  });

  it('abbreviated pagination label behaves correctly', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'She turned me into a newt!',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.5,
        },
      },
      {
        item: {
          id_str: 'b',
          text:
            'Strange women lying in ponds distributing swords is no basis for a system of government.',
          date: new Date(now - 1001),
        },
        scores: {
          TOXICITY: 0.2,
        },
      },
      {
        item: {
          id_str: 'c',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: new Date(now - 20),
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      {
        item: {
          id_str: 'd',
          text: 'What is your favorite color?',
          date: new Date(now - 1000),
        },
        scores: {
          TOXICITY: 0.3,
        },
      },
      {
        item: {
          id_str: 'e',
          text: 'What is the airspeed velocity of an unladen swallow?',
          date: new Date(now - 1000.1),
        },
        scores: {
          TOXICITY: 0.4,
        },
      },
      {
        item: {
          id_str: 'f',
          text: 'your mother was a hamster',
          date: new Date(now - 500),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'g',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 30),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'h',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      {
        item: {
          id_str: 'i',
          text:
            'Strange women lying in ponds distributing swords is no basis for a system of government',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      {
        item: {
          id_str: 'j',
          text:
            'Supreme executive power derives from a mandate from the masses',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    // 10 pages
    component.setPageSize(1);
    component.toxicityRangeDropdown.selectedOptions.setValue(
      // All toxicity values except the custom option.
      component.toxicityRangeDropdownOptions.filter(item => !item.customOption)
    );
    fixture.detectChanges();

    component.page({ pageIndex: 0 });
    expect(component.getStartAbbreviatedPages()).toEqual([1, 2, 3, 4, 5]);
    expect(component.getEndAbbreviatedPages()).toEqual([10]);

    component.page({ pageIndex: 1 });
    expect(component.getStartAbbreviatedPages()).toEqual([2, 3, 4, 5, 6]);
    expect(component.getEndAbbreviatedPages()).toEqual([10]);

    component.page({ pageIndex: 3 });
    expect(component.getStartAbbreviatedPages()).toEqual([4, 5, 6, 7, 8]);
    expect(component.getEndAbbreviatedPages()).toEqual([10]);

    component.page({ pageIndex: 4 });
    expect(component.getStartAbbreviatedPages()).toEqual([5, 6, 7, 8]);
    expect(component.getEndAbbreviatedPages()).toEqual([10]);

    component.page({ pageIndex: 5 });
    expect(component.getStartAbbreviatedPages()).toEqual([1]);
    expect(component.getEndAbbreviatedPages()).toEqual([6, 7, 8, 9, 10]);
  });

  it('shows abbreviated pagination label for > 6 pages', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'She turned me into a newt!',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.5,
        },
      },
      {
        item: {
          id_str: 'b',
          text:
            'Strange women lying in ponds distributing swords is no basis for a system of government.',
          date: new Date(now - 1001),
        },
        scores: {
          TOXICITY: 0.2,
        },
      },
      {
        item: {
          id_str: 'c',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: new Date(now - 20),
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      {
        item: {
          id_str: 'd',
          text: 'What is your favorite color?',
          date: new Date(now - 1000),
        },
        scores: {
          TOXICITY: 0.3,
        },
      },
      {
        item: {
          id_str: 'e',
          text: 'What is the airspeed velocity of an unladen swallow?',
          date: new Date(now - 1000.1),
        },
        scores: {
          TOXICITY: 0.4,
        },
      },
      {
        item: {
          id_str: 'f',
          text: 'your mother was a hamster',
          date: new Date(now - 500),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'g',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 30),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'h',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      {
        item: {
          id_str: 'i',
          text:
            'Strange women lying in ponds distributing swords is no basis for a system of government',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      {
        item: {
          id_str: 'j',
          text:
            'Supreme executive power derives from a mandate from the masses',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    // 10 pages
    component.setPageSize(1);
    component.toxicityRangeDropdown.selectedOptions.setValue(
      // All toxicity values except the custom option.
      component.toxicityRangeDropdownOptions.filter(item => !item.customOption)
    );
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.page-numbers')).nativeElement
        .textContent
    ).toContain('...');

    // 5 pages
    component.setPageSize(2);
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.css('.page-numbers')).nativeElement
        .textContent
    ).not.toContain('...');
  });

  it('changes pages by clicking on bottom pagination buttons', () => {
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'She turned me into a newt!',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.5,
        },
      },
      {
        item: {
          id_str: 'b',
          text:
            'Strange women lying in ponds distributing swords is no basis for a system of government.',
          date: new Date(now - 1001),
        },
        scores: {
          TOXICITY: 0.2,
        },
      },
      {
        item: {
          id_str: 'c',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: new Date(now - 20),
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      {
        item: {
          id_str: 'd',
          text: 'What is your favorite color?',
          date: new Date(now - 1000),
        },
        scores: {
          TOXICITY: 0.3,
        },
      },
      {
        item: {
          id_str: 'e',
          text: 'What is the airspeed velocity of an unladen swallow?',
          date: new Date(now - 1000.1),
        },
        scores: {
          TOXICITY: 0.4,
        },
      },
      {
        item: {
          id_str: 'f',
          text: 'your mother was a hamster',
          date: new Date(now - 500),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'g',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 30),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'h',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      {
        item: {
          id_str: 'i',
          text:
            'Strange women lying in ponds distributing swords is no basis for a system of government',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      {
        item: {
          id_str: 'j',
          text:
            'Supreme executive power derives from a mandate from the masses',
          date: new Date(now - 5000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
    ];
    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent();
    // 5 pages
    component.setPageSize(2);
    component.toxicityRangeDropdown.selectedOptions.setValue(
      // All toxicity values except the custom option.
      component.toxicityRangeDropdownOptions.filter(item => !item.customOption)
    );
    fixture.detectChanges();

    const pageElements = fixture.debugElement.queryAll(
      By.css('.page-numbers .page-number-button')
    );
    pageElements[1].nativeElement.click();
    fixture.detectChanges();
    expect(component.getPageIndex()).toEqual(1);

    pageElements[4].nativeElement.click();
    fixture.detectChanges();
    expect(component.getPageIndex()).toEqual(4);

    const prevButton = fixture.debugElement.query(By.css('.page-button.prev'));
    prevButton.nativeElement.click();
    fixture.detectChanges();
    expect(component.getPageIndex()).toEqual(3);

    const nextButton = fixture.debugElement.query(By.css('.page-button.next'));
    nextButton.nativeElement.click();
    fixture.detectChanges();
    expect(component.getPageIndex()).toEqual(4);
  });

  it('resets the UI when the report is cleared', () => {
    const params: Params = {};
    params[TOXICITY_FILTER_NAME_QUERY_PARAM] = null;
    const mockActivatedRouteWithNullParams = new MockActivatedRoute(params);
    const tweets: Array<ScoredItem<Tweet>> = [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(now - 1),
        },
        scores: {
          TOXICITY: 0.5,
        },
      },
    ];

    mockSocialMediaItemsService.fetchItems.and.returnValue(of(tweets));
    createComponent([
      {
        provide: ActivatedRoute,
        // Include all scores
        useValue: mockActivatedRouteWithNullParams,
      },
    ]);
    fixture.detectChanges();
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);

    // Update the toxicity filters to exclude the higher scored comments.
    component.toxicityRangeDropdown.setSelectedOptions([
      component.toxicityRangeDropdownOptions[2], // Unsure if harmful (0.4-0.6)
    ]);
    fixture.detectChanges();

    // Select 'Last two days' to select comments from the past two days.
    component.dateFilterDropdown.setSelectedOption(
      component.dateDropdownOptions[1]
    );
    fixture.detectChanges();

    // Set a "more options" filter.
    component.moreFiltersDropdown.setSelectedOptions([
      component.moreDropdownOptions[0],
    ]);
    fixture.detectChanges();

    // Add a regex filter.
    component.includeRegexFilters = [
      {
        regex: 'your',
        include: true,
      },
    ];
    component.applyFilters();

    verifyExpectedCommentsDisplayed(fixture, []);

    // Clear the report
    reportClearedSubject.next();
    fixture.detectChanges();

    // Dropdown menus should contain the default values.
    expect(component.toxicityRangeDropdown.selectedOptions.value).toEqual(
      // All toxicity values except the custom option.
      component.toxicityRangeDropdownOptions.filter(item => !item.customOption)
    );
    expect(component.dateFilterDropdown.selectedOption.value).toEqual(
      component.dateDropdownOptions[0]
    );
    expect(component.moreFiltersDropdown.selectedOptions.value).toEqual([]);
    expect(component.includeRegexFilters).toEqual([]);
    verifyExpectedCommentsDisplayed(fixture, [tweets[1], tweets[0], tweets[2]]);
  });
});
