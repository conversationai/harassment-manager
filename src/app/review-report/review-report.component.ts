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

import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ScoredItem, SocialMediaItem } from '../../common-types';
import { ClearReportDialogComponent } from '../clear-report-dialog/clear-report-dialog.component';
import { OauthApiService } from '../oauth_api.service';
import { ReportService } from '../report.service';

const TOXICITY_THRESHOLD = 0.5;

@Component({
  selector: 'app-review-report',
  templateUrl: './review-report.component.html',
  styleUrls: ['./review-report.component.scss'],
})
export class ReviewReportComponent {
  showFullReport = false;
  commentsForReport: Array<ScoredItem<SocialMediaItem>> = [];
  usersInReport = new Map<string, number>();
  toxicityTypes: Set<string> = new Set<string>();
  averageToxicity = 0;

  reportReasonOptions: string[] = [];
  readonly reportReasonOptionsTwitter = [
    'Harassment',
    'Specific violent threats involving physical safety or well-being',
    'Exposed private information or photo',
    'Spam',
    'Directs hate against a protected category (for example, race, religion, gender, orientation, or disability)',
  ];
  hasReportReasons: boolean[] = [];
  context = '';

  contextInputSubject: Subject<void> = new Subject();

  clearReportDialogOpen = false;

  constructor(
    private reportService: ReportService,
    private router: Router,
    private oauthApiService: OauthApiService,
    private dialog: MatDialog
  ) {
    this.reportService.reportCommentsChanged.subscribe(comments => {
      this.commentsForReport = comments;
      this.computeReportSummary();
    });
    this.reportService.reportReasonsChanged.subscribe(reasons => {
      this.hasReportReasons = this.reportReasonOptions.map(option =>
        reasons.includes(option)
      );
    });
    this.reportService.reportContextChanged
      .pipe(takeUntil(this.contextInputSubject))
      .subscribe(context => {
        this.context = context;
      });
    this.oauthApiService.twitterSignInChange.subscribe(isSignedIn => {
      if (isSignedIn) {
        this.reportReasonOptions = this.reportReasonOptionsTwitter;
        this.hasReportReasons = new Array(this.reportReasonOptions.length).fill(
          false
        );
        this.computeReportSummary();
      }
    });
    // Debounce the input events in the context text box so that we don't update
    // firestore until the user stops typing.
    this.contextInputSubject.pipe(debounceTime(500)).subscribe(() => {
      this.updateReportContext();
    });
  }

  removeAllCommentsFromReport() {
    // Open confirmation dialog.
    if (this.clearReportDialogOpen) {
      return;
    }
    const dialogRef = this.dialog.open(ClearReportDialogComponent, {
      panelClass: 'clear-report-dialog-container',
    });
    this.clearReportDialogOpen = true;
    dialogRef.afterClosed().subscribe(result => {
      this.clearReportDialogOpen = false;
      if (result) {
        this.reportService.clearReport();
      }
    });
  }

  computeReportSummary() {
    this.toxicityTypes = new Set<string>();
    this.usersInReport.clear();
    this.toxicityTypes.clear();
    let sum = 0;
    for (const comment of this.commentsForReport) {
      const scores = comment.scores;
      if (!scores.TOXICITY) {
        continue;
      }
      sum += scores.TOXICITY;
      for (const [attr, score] of Object.entries(scores)) {
        if (score && score > TOXICITY_THRESHOLD) {
          this.toxicityTypes.add(attr);
        }
      }
      const authorName = comment.item.authorScreenName;
      if (authorName) {
        const currentCount = this.usersInReport.has(authorName)
          ? this.usersInReport.get(authorName)!
          : 0;
        this.usersInReport.set(authorName, currentCount + 1);
      }
    }
    this.averageToxicity = sum / this.commentsForReport.length;
  }

  onContextInputChange() {
    this.contextInputSubject.next();
  }

  updateReportReasons() {
    const reportReasons = this.reportReasonOptions.filter(
      (_, index) => this.hasReportReasons[index]
    );
    this.reportService.setReportReasons(reportReasons);
  }

  removeItemFromReport(item: ScoredItem<SocialMediaItem>) {
    this.reportService.removeCommentFromReport(item);
  }

  formatScore(toxicity?: number): string {
    // When a user manually removes each item from the report (instead of
    // using the 'Remove All' button), toxicity becomes undefined or NaN. This
    // only happens for AverageToxicity.
    if (toxicity === undefined || isNaN(toxicity)) {
      return '-%';
    }
    return `${Math.round(toxicity * 100)}%`;
  }

  private updateReportContext() {
    this.reportService.setContext(this.context);
  }
}
