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

import {
  ConnectedPosition,
  Overlay,
  OverlayConfig,
  OverlayRef,
  ScrollStrategy,
  ScrollStrategyOptions,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  NavigationEnd,
  NavigationStart,
  Params,
  Router,
} from '@angular/router';
import { combineLatest, merge, Subscription } from 'rxjs';
import { filter, finalize, map, skip, take, takeUntil } from 'rxjs/operators';
import { ScoredItem, Tweet } from '../../common-types';
import { ClearReportDialogComponent } from '../clear-report-dialog/clear-report-dialog.component';
import { TOXICITY_FILTER_NAME_QUERY_PARAM } from '../create-report/create-report.component';
import { DateFilterService } from '../date-filter.service';
import { applyCommentFilters, buildDateFilterForNDays } from '../filter_utils';
import {
  EventAction,
  EventCategory,
  GoogleAnalyticsService,
} from '../google_analytics.service';
import { LoadingDialogComponent } from '../loading-dialog/loading-dialog.component';
import { OauthApiService } from '../oauth_api.service';
import { OnboardingService } from '../onboarding.service';
import {
  RecommendedReportData,
  RECOMMENDED_REPORT_TEMPLATES,
  TOXICITY_RANGE_TEMPLATES,
} from '../recommended-report-card/recommended-report-card.component';
import { getRouterLinkForReportStep, ReportService } from '../report.service';
import { SocialMediaItemService } from '../social-media-item.service';

// Width of a card + padding.
const SCROLL_INCREMENT = 444;

// This needs to be long enough for a screenreader to be able to read the dialog
// title and say that we've entered a dialog.
const MIN_LOADING_DIALOG_OPEN_TIME_MS = 8000;

// How many times to reload the RecommendedReportCards if there's an error
const RELOAD_ATTEMPTS = 3;

enum OnboardingStep {
  NONE,
  INTRO_STEPPER,
  HIGHLIGHT_CARD,
}

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent implements AfterViewInit, OnDestroy {
  // Copy of enum for use in the template.
  readonly OnboardingStep = OnboardingStep;

  currentOnboardingStep = OnboardingStep.NONE;

  overlayScrollStrategy: ScrollStrategy;
  routeSubscription: Subscription = new Subscription();

  // This describes how the overlay should be connected to the origin element.
  // We want it centered below the card.
  connectedOverlayPositions: ConnectedPosition[] = [
    {
      originX: 'center',
      originY: 'bottom',
      overlayX: 'center',
      overlayY: 'top',
      offsetY: 24,
    },
    // Alternate position if the first doesn't fit onscreen.
    {
      originX: 'center',
      originY: 'top',
      overlayX: 'center',
      overlayY: 'bottom',
      offsetY: -24,
    },
  ];

  @ViewChild('templatePortalContent')
  templatePortalContent!: TemplateRef<unknown>;
  private overlayRef: OverlayRef | null = null;

  private comments?: Array<ScoredItem<Tweet>>;
  recommendedReports: RecommendedReportData[] = RECOMMENDED_REPORT_TEMPLATES.map(
    template => ({
      toxicityRangeFilter: template.toxicityRangeFilter,
      name: template.name,
      routing_name: template.routing_name,
      description: template.description,
      icon: template.icon,
      comments: [],
    })
  );

  loadingRecommendedReports = false;
  loadingRecommendedReportsAttempts = 0;
  loadingDialogOpen = false;
  loadingDialogOpenTime: number | null = null;
  errorRecommendedReports = true;
  shouldShowWelcomeBackCard = false;
  @ViewChild('cardsContainer') cardsContainer!: ElementRef;

  clearReportDialogOpen = false;
  name = '';
  onboardingComplete = false;
  reportDraftCommentCount = 0;
  snackBarSubscription?: Subscription;
  // Set to true when the user has clicked the "add all to report" button on one
  // of the priority cards.
  userClickedAddAllToReport = false;

  constructor(
    private readonly dateFilterService: DateFilterService,
    private readonly dialog: MatDialog,
    private readonly oauthApiService: OauthApiService,
    private readonly onboardingService: OnboardingService,
    private readonly overlay: Overlay,
    private readonly reportService: ReportService,
    private readonly router: Router,
    private readonly scrollStrategyOptions: ScrollStrategyOptions,
    private readonly socialMediaItemService: SocialMediaItemService,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly snackBar: MatSnackBar,
    private readonly googleAnalyticsService: GoogleAnalyticsService
  ) {
    this.overlayScrollStrategy = this.scrollStrategyOptions.block();

    // If there's an error loading the RecommendedReportCards attempt
    // to reload them each time the user renavigates to the home page
    // until the max RELOAD_ATTEMPTS is reached.
    this.routeSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd && event.url === '/home')
      )
      .subscribe(event => {
        if (
          this.errorRecommendedReports &&
          this.loadingRecommendedReportsAttempts < RELOAD_ATTEMPTS
        ) {
          this.getRecommendedReports();
        } else {
          this.routeSubscription.unsubscribe();
        }
      });

    this.reportService.reportCommentsChanged.subscribe(reportComments => {
      const reportNotificationCommentCount = Math.max(
        0,
        reportComments.length - this.reportDraftCommentCount
      );
      // Without this guard this shows up when the user re-logs in; it should
      // only show up after the user has directly triggered the event via
      // clicking the "Add all to report" button.
      if (this.userClickedAddAllToReport) {
        const singular = reportNotificationCommentCount === 1;
        const message =
          reportNotificationCommentCount > 0
            ? `${reportNotificationCommentCount} ${
                singular ? 'comment' : 'comments'
              } added to report`
            : 'Comments already added to report';
        const snackBarRef = snackBar.open(message, 'Edit Details', {
          duration: 10000,
        });

        // Navigate to the review report (edit details) page when the user
        // clicks on the action on the snackbar.
        this.snackBarSubscription = snackBarRef
          .onAction()
          .pipe(take(1))
          .subscribe(() => {
            snackBarRef.dismiss();
            snackBarRef
              .afterDismissed()
              .pipe(take(1))
              .subscribe(() => {
                this.router.navigate(['/review-report']);
              });
          });
        this.userClickedAddAllToReport = false;
      }
      this.reportDraftCommentCount = reportComments.length;
    });

    this.showWelcomeBackCard();
  }

  ngOnDestroy() {
    if (this.snackBarSubscription) {
      this.snackBarSubscription.unsubscribe();
    }
  }

  openLoadingDialog() {
    if (this.comments || this.loadingDialogOpen) {
      return;
    }
    const dialogRef = this.dialog.open(LoadingDialogComponent, {
      panelClass: 'loading-dialog-container',
    });
    this.loadingDialogOpen = true;
    this.loadingDialogOpenTime = Date.now();
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe(() => {
        this.loadingDialogOpen = false;
      });
  }

  closeLoadingDialog() {
    if (!this.loadingDialogOpen || !this.loadingDialogOpenTime) {
      return;
    }

    const timeSinceLoadingDialogOpen = Date.now() - this.loadingDialogOpenTime;
    const timeToCloseLoadingDialog = Math.max(
      0,
      MIN_LOADING_DIALOG_OPEN_TIME_MS - timeSinceLoadingDialogOpen
    );
    setTimeout(() => {
      this.dialog.closeAll();
      this.loadingDialogOpen = false;
    }, timeToCloseLoadingDialog);
  }

  handleAddAllToReportClicked() {
    this.userClickedAddAllToReport = true;
  }

  /** Navigate to the page where the user left off on the report. */
  continueReport() {
    this.router.navigate([
      getRouterLinkForReportStep(this.reportService.getReportStep()),
    ]);
  }

  openClearReportDialog() {
    // Open confirmation dialog.
    if (this.clearReportDialogOpen) {
      return;
    }
    const dialogRef = this.dialog.open(ClearReportDialogComponent, {
      panelClass: 'clear-report-dialog-container',
    });
    this.clearReportDialogOpen = true;
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe(result => {
        this.clearReportDialogOpen = false;
        if (result) {
          this.reportService.clearReport();
        }
      });
  }

  getRecommendedReports() {
    const dateFilter = buildDateFilterForNDays(
      new Date(this.dateFilterService.getStartTimeMs()),
      1
    );
    this.loadingRecommendedReports = true;
    this.socialMediaItemService
      .fetchItems(dateFilter.startDateTimeMs, dateFilter.endDateTimeMs)
      .subscribe(
        comments => {
          this.closeLoadingDialog();
          this.comments = comments;
          this.generateRecommendedReports();
          this.loadingRecommendedReports = false;
          this.errorRecommendedReports = false;
        },
        error => {
          this.closeLoadingDialog();
          this.loadingRecommendedReportsAttempts++;
          this.errorRecommendedReports = true;
          this.loadingRecommendedReports = false;
        }
      );
  }

  ngAfterViewInit() {
    // We have to wait for the ViewChild to load to start onboarding, so we do
    // this in ngAfterViewInit.
    this.onboardingService
      .getHomePageOnboardingComplete()
      .subscribe((onboarded: boolean) => {
        if (onboarded) {
          this.onboardingComplete = true;
          this.openLoadingDialog();
        } else {
          this.nextOnboardingStep();
        }
      });
  }

  openStepper() {
    const overlayConfig = new OverlayConfig({
      positionStrategy: this.overlay
        .position()
        .global()
        .centerHorizontally()
        .centerVertically(),
      scrollStrategy: this.overlayScrollStrategy,
      hasBackdrop: true,
      backdropClass: 'onboarding-backdrop',
      minWidth: 748,
      minHeight: 582,
    });

    this.overlayRef = this.overlay.create(overlayConfig);
    const introStepperPortal = new TemplatePortal(
      this.templatePortalContent,
      this.viewContainerRef
    );
    this.overlayRef.attach(introStepperPortal);
  }

  closeStepper() {
    if (!this.overlayRef) {
      throw new Error('Requesting to close a null overlayRef');
    }
    this.overlayRef.detach();
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.nextOnboardingStep();
  }

  async nextOnboardingStep() {
    if (this.onboardingComplete) {
      return;
    }
    if (this.currentOnboardingStep === OnboardingStep.NONE) {
      this.currentOnboardingStep = OnboardingStep.INTRO_STEPPER;
      this.openStepper();
    } else if (this.currentOnboardingStep === OnboardingStep.INTRO_STEPPER) {
      this.currentOnboardingStep = OnboardingStep.HIGHLIGHT_CARD;
    } else if (this.currentOnboardingStep === OnboardingStep.HIGHLIGHT_CARD) {
      this.currentOnboardingStep = OnboardingStep.NONE;
      await this.onboardingService.setHomePageOnboardingComplete();
      this.onboardingComplete = true;
      this.openLoadingDialog();
    }
  }

  async handleHighlightedCardViewCommentsClick() {
    // We need to await the completion of nextOnboardingStep() before
    // navigating, otherwise we can end up in a buggy state where the overlay is
    // still visible.
    await this.nextOnboardingStep();
    this.viewCommentsWithToxicityFilter(this.recommendedReports[1]);
  }

  viewCommentsWithToxicityFilter(filter: RecommendedReportData) {
    const queryParams: Params = {};
    if (filter.name === 'Unknown') {
      queryParams[TOXICITY_FILTER_NAME_QUERY_PARAM] = [
        // Unsure
        TOXICITY_RANGE_TEMPLATES[2].name,
        // Unable to score
        TOXICITY_RANGE_TEMPLATES[4].name,
      ];
    } else {
      queryParams[TOXICITY_FILTER_NAME_QUERY_PARAM] =
        filter.routing_name || filter.name;
    }
    if (filter.name === 'All') {
      this.googleAnalyticsService.emitEvent(
        EventCategory.VIEW_ALL_COMMENTS_BUTTON,
        EventAction.CLICK
      );
    }
    this.router.navigate(['/create-report'], { queryParams });
  }

  generateRecommendedReports() {
    if (this.comments) {
      for (const report of this.recommendedReports) {
        report.comments = applyCommentFilters(this.comments, {
          toxicityRangeFilters: [report.toxicityRangeFilter],
        });
      }
    }
  }

  private showWelcomeBackCard() {
    // Listen for the initial data load for all report fields and emit a boolean
    // indicating whether the field has any data. We `skip(1)` because the
    // Observables exposed by ReportService always emit once for the default
    // (empty) value of the underlying BehaviorSubjects. We then `take(1)`
    // because the second emission should occur only if/when any data is
    // actually loaded from an in-progress report.
    const reportHasComments = this.reportService.reportCommentsChanged.pipe(
      skip(1),
      take(1),
      map(comments => comments.length > 0)
    );
    const reportHasContext = this.reportService.reportContextChanged.pipe(
      skip(1),
      take(1),
      map(context => !!context.length)
    );
    const reportHasReasons = this.reportService.reportReasonsChanged.pipe(
      skip(1),
      take(1),
      map(reasons => !!reasons.length)
    );

    // Emit whenever any of the report data fields emit.
    const reportFieldsHaveData = merge(
      reportHasComments,
      reportHasContext,
      reportHasReasons
    );

    // Listen for when a user navigates away from the home page.
    const userNavigatedAway = this.router.events.pipe(
      filter(event => event instanceof NavigationStart && event.url !== '/home')
    );

    // Listen for when a user signs in and any in-progress report data is
    // loaded. We display the welcome back tile if the user has signed in and
    // the user has an existing report with non-empty actions, comments, or
    // reasons.
    //
    // We stop listening if:
    // 1) The user navigates away from the home page, or
    // 2) The user clears the report on the home page
    //
    // We finally hide the card whenever we stop listening.
    combineLatest([
      this.oauthApiService.twitterSignInChange,
      reportFieldsHaveData,
    ])
      .pipe(
        filter(
          ([signedIn, reportFieldsHaveData]) => signedIn && reportFieldsHaveData
        ),
        takeUntil(userNavigatedAway),
        takeUntil(this.reportService.reportCleared),
        finalize(() => {
          this.shouldShowWelcomeBackCard = false;
        })
      )
      .subscribe(() => {
        this.shouldShowWelcomeBackCard = true;
        this.name =
          this.oauthApiService.getTwitterCredentials()?.user?.displayName ?? '';
      });
  }
}
