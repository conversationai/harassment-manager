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

import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ConnectedPosition,
  ScrollStrategy,
  ScrollStrategyOptions,
} from '@angular/cdk/overlay';
import { Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import * as moment from 'moment';
import { take } from 'rxjs/operators';
import { BuildReportStep } from '../../common-types';
import { ExitDialogComponent } from '../exit-dialog/exit-dialog.component';
import {
  EventAction,
  EventCategory,
  GoogleAnalyticsService,
} from '../google_analytics.service';
import { OauthApiService } from '../oauth_api.service';
import { OnboardingService } from '../onboarding.service';
import {
  getRouterLinkForReportStep,
  ReportAction,
  ReportService,
} from '../report.service';
import { SocialMediaItemService } from '../social-media-item.service';

export const ONE_MIN_MS = 60 * 1000;
export const ONE_HOUR_MS = 60 * ONE_MIN_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  // Reference to the dropdown for testing purposes.
  @ViewChild('dropdown') dropdownElement?: ElementRef;

  // Number of comments in the report draft.
  reportDraftCommentCount = 0;
  // Number of comments that were most recently added to the report. This is
  // shown in a notification to the user.
  reportNotificationCommentCount = 0;
  // Whether to show the user a notification about having just added comments to
  // the report.
  reportNotificationOpen = false;

  showBuildReportStepper = false;

  currentStep = BuildReportStep.NONE;
  // Copy of enum to use in the template.
  readonly BuildReportStep = BuildReportStep;

  private reportStarted = false;
  notificationTitleText = '';
  notificationSubtitleText = '';

  private exitDialogOpen = false;

  userIsSignedIn = false;
  onboarding = false;

  reportActions: ReportAction[];
  reportLastEditedMs = Date.now();

  overlayScrollStrategy: ScrollStrategy;

  // This describes how the overlay should be connected to the origin element.
  connectedOverlayPositions: ConnectedPosition[] = [
    {
      originX: 'center',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetY: 24,
    },
    // Secondary positioning strategy
    {
      originX: 'start',
      originY: 'center',
      overlayX: 'end',
      overlayY: 'center',
      offsetX: -24,
    },
  ];

  constructor(
    private oauthApiService: OauthApiService,
    private ngZone: NgZone,
    private router: Router,
    private reportService: ReportService,
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private onboardingService: OnboardingService,
    private readonly scrollStrategyOptions: ScrollStrategyOptions,
    public dialog: MatDialog,
    private googleAnalyticsService: GoogleAnalyticsService,
    private socialMediaItemService: SocialMediaItemService,
    private liveAnnouncer: LiveAnnouncer
  ) {
    this.overlayScrollStrategy = this.scrollStrategyOptions.block();

    this.iconRegistry.addSvgIcon(
      'report_icon',
      this.sanitizer.bypassSecurityTrustResourceUrl('/report.svg')
    );
    this.iconRegistry.addSvgIcon(
      'report_icon_white',
      this.sanitizer.bypassSecurityTrustResourceUrl('/report_white.svg')
    );
    this.iconRegistry.addSvgIcon(
      'report_back_icon',
      this.sanitizer.bypassSecurityTrustResourceUrl('/back-icon.svg')
    );
    this.iconRegistry.addSvgIcon(
      'report_forward_icon',
      this.sanitizer.bypassSecurityTrustResourceUrl('/forward-icon.svg')
    );
    this.iconRegistry.addSvgIcon(
      'report_close_icon',
      this.sanitizer.bypassSecurityTrustResourceUrl('/close_icon.svg')
    );

    this.reportService.reportLastEditedChanged.subscribe(lastEditedMs => {
      this.reportLastEditedMs = lastEditedMs;
    });

    this.reportService.reportCommentsChanged.subscribe(reportComments => {
      this.reportNotificationCommentCount = Math.max(
        0,
        reportComments.length - this.reportDraftCommentCount
      );
      if (this.reportNotificationCommentCount > 0) {
        this.reportNotificationOpen = true;
        this.notificationTitleText = this.getNotificationTitleText();
        this.notificationSubtitleText = this.getNotificationSubtitleText();
        this.reportStarted = true;
        setTimeout(() => {
          this.reportNotificationOpen = false;
        }, 5000);
      }
      this.reportDraftCommentCount = reportComments.length;
    });

    this.reportActions = this.reportService.getReportActions();
    this.reportService.reportActionsChanged.subscribe(reportActions => {
      this.reportActions = reportActions;
    });

    this.reportService.reportCleared.subscribe(() => {
      this.router.navigate(['/home']);
    });

    this.oauthApiService.twitterSignInChange.subscribe(signedIn => {
      this.userIsSignedIn = signedIn;
    });

    this.onboardingService.highlightReviewReportButton.subscribe(() => {
      this.nextOnboardingStep();
    });

    this.reportService.reportStepChanged.subscribe(
      (reportStep: BuildReportStep) => {
        this.currentStep = reportStep;
      }
    );

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (event.url.includes('/create-report')) {
          this.reportService.setReportStep(BuildReportStep.ADD_COMMENTS);
          this.showBuildReportStepper = true;
        } else if (event.url === '/review-report') {
          this.reportService.setReportStep(BuildReportStep.EDIT_DETAILS);
          this.showBuildReportStepper = true;
        } else if (event.url === '/share-report') {
          this.reportService.setReportStep(BuildReportStep.TAKE_ACTION);
          this.showBuildReportStepper = true;
        } else if (event.url === '/report-complete') {
          this.reportService.setReportStep(BuildReportStep.COMPLETE);
          this.showBuildReportStepper = false;
        } else {
          this.showBuildReportStepper = false;
        }
      }
    });
  }

  /**
   * Returns a string describing the time the report was last edited:
   * If the edit was less than a minute ago, it returns 'Last edit less than 1
   * min ago'.
   * If the edit was less than a day ago, it returns 'Last edit ' + the number
   * of hours and minutes since the last edit.
   * If the edit was more than a day ago, it returns 'Last edit ' + the month
   * and day of the last edit.
   */
  getTimeSinceLastReportEditString(): string {
    const now = Date.now();
    const msSinceLastReportEdit = now - this.reportLastEditedMs;
    let timeStr = 'Last edit';
    if (msSinceLastReportEdit < ONE_MIN_MS) {
      timeStr += ' less than 1 min ago';
    } else {
      const days =
        msSinceLastReportEdit >= ONE_DAY_MS
          ? Math.floor(msSinceLastReportEdit / ONE_DAY_MS)
          : 0;
      const hours =
        msSinceLastReportEdit >= ONE_HOUR_MS
          ? Math.floor(
            (msSinceLastReportEdit - ONE_DAY_MS * days) / ONE_HOUR_MS
          )
          : 0;
      const minutes = Math.floor(
        (msSinceLastReportEdit - (ONE_DAY_MS * days + ONE_HOUR_MS * hours)) /
        ONE_MIN_MS
      );
      if (days >= 1) {
        const date = moment(this.reportLastEditedMs);
        timeStr += ` on ${date.format('MMM D')}`;
      } else {
        if (hours >= 1) {
          timeStr += ` ${hours} hr`;
        }
        if (minutes > 0) {
          timeStr += ` ${minutes} min`;
        }
        timeStr += ' ago';
      }
    }
    return timeStr;
  }

  getStepperButtonActive(): boolean {
    if (this.currentStep === BuildReportStep.ADD_COMMENTS) {
      return this.reportDraftCommentCount > 0;
    } else if (this.currentStep === BuildReportStep.TAKE_ACTION) {
      return !this.exitDialogOpen;
    } else {
      return true;
    }
  }

  getStepperButtonRouterLink(): string {
    return getRouterLinkForReportStep(this.currentStep + 1);
  }

  onStepperButtonClick(): void {
    const nextPage = this.getStepperButtonRouterLink();
    if (nextPage === '/report-complete') {
      if (this.exitDialogOpen) {
        return;
      }
      const dialogRef = this.dialog.open(ExitDialogComponent, {
        panelClass: 'exit-dialog-container',
      });
      this.exitDialogOpen = true;
      dialogRef
        .afterClosed()
        .pipe(take(1))
        .subscribe(exitReport => {
          this.exitDialogOpen = false;
          if (exitReport) {
            // Log that we've finished the report.
            this.googleAnalyticsService.emitEvent(
              EventCategory.REPORT,
              EventAction.FINISH_REPORT
            );
            this.reportService.clearReport();
            if (this.reportActions.length > 0) {
              // Show 'report complete' page only if user took action on report.
              this.router.navigate([nextPage]);
            } else {
              this.router.navigate(['/home']);
            }
          }
        });
    } else {
      this.router.navigate([nextPage]);
    }
  }

  getExitDialogOpen(): boolean {
    return this.exitDialogOpen;
  }

  getBackButtonText(): string {
    if (this.currentStep === BuildReportStep.EDIT_DETAILS) {
      return 'Back to Comments';
    } else if (this.currentStep === BuildReportStep.TAKE_ACTION) {
      return 'Back to Details';
    } else {
      return '';
    }
  }

  getBackButtonRouterLink(): string {
    if (this.currentStep === BuildReportStep.EDIT_DETAILS) {
      return '/create-report';
    } else if (this.currentStep === BuildReportStep.TAKE_ACTION) {
      return '/review-report';
    } else {
      // We shouldn't get here, but if we do, navigate to home.
      return '/home';
    }
  }

  getCreateReportRouterLink(): string {
    if (this.currentStep === BuildReportStep.EDIT_DETAILS) {
      return '/review-report';
    } else if (this.currentStep === BuildReportStep.TAKE_ACTION) {
      return '/share-report';
    } else {
      return '/create-report';
    }
  }

  getReportButtonText(): string {
    if (this.currentStep === BuildReportStep.TAKE_ACTION) {
      return 'Close report';
    } else {
      return 'Continue';
    }
  }

  getReportButtonA11yLabel(): string {
    if (this.currentStep === BuildReportStep.ADD_COMMENTS) {
      return this.reportDraftCommentCount + (
        this.reportDraftCommentCount === 1 ? ' Comment' : ' Comments')
        + ' in Report Draft. Continue.'
    } else if (this.currentStep === BuildReportStep.EDIT_DETAILS) {
      return 'Continue';
    } else if (this.currentStep === BuildReportStep.TAKE_ACTION) {
      return 'Close report';
    } else {
      return '';
    }
  }

  nextOnboardingStep() {
    this.onboarding = !this.onboarding;
    if (!this.onboarding) {
      this.liveAnnouncer.announce('Exited onboarding walkthrough dialog');
      this.onboardingService.setCreateReportPageOnboardingComplete();
    }
  }

  revokeAuthorization(): void {
    this.oauthApiService.revokeAuth().then(() => {
      this.reportStarted = false;
      this.ngZone.run(() => {
        this.router.navigate(['/']);
      });
    });
  }

  getNotificationTitleText(): string {
    if (!this.reportStarted) {
      return 'Nice work! You\'ve started your report.';
    } else if (this.reportNotificationCommentCount === 1) {
      return 'Comment added to report';
    } else {
      return `${this.reportNotificationCommentCount} comments added to report`;
    }
  }

  getNotificationSubtitleText(): string {
    if (!this.reportStarted) {
      return (
        'Review your report draft or continue adding comments at your ' +
        'own pace.'
      );
    } else {
      return (
        'Processing harmful content can be taxing. Take a break and come ' +
        'back anytime. Your work will be saved.'
      );
    }
  }
}
