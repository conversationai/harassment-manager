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

import { Injectable } from '@angular/core';
import firebase from 'firebase/compat/app';
import { BehaviorSubject, Subject } from 'rxjs';
import { BuildReportStep, ScoredItem, SocialMediaItem } from '../common-types';
import { FirestoreService, Report } from './firestore.service';
import {
  EventAction,
  EventCategory,
  GoogleAnalyticsService,
} from './google_analytics.service';

export enum ReportAction {
  NONE,
  REPORT_TO_TWITTER = 'Sent to Twitter',
  DOWNLOAD_CSV = 'CSV Downloaded',
  DOWNLOAD_PDF = 'PDF Downloaded',
  PRINT = 'Printed',
  SAVE_TO_DRIVE = 'Saved on Drive',
  BLOCK_TWITTER = 'Blocked users',
  MUTE_TWITTER = 'Muted users',
  HIDE_REPLIES_TWITTER = 'Hid replies',
}

export function getRouterLinkForReportStep(step: number): string {
  switch (step) {
    case BuildReportStep.ADD_COMMENTS:
      return '/create-report';
    case BuildReportStep.EDIT_DETAILS:
      return '/review-report';
    case BuildReportStep.TAKE_ACTION:
      return '/share-report';
    case BuildReportStep.COMPLETE:
      return '/report-complete';
    default:
      return '/home';
  }
}

class ComputeReportSummaryHelper {
  count = 0;
  sum = 0;

  constructor(readonly attribute: string) {}

  getAverageScoreString(): string {
    if (this.count < 1) {
      return '';
    }
    return `${this.attribute} (${Math.round(
      (this.sum / this.count) * 100
    )}%); `;
  }

  addScore(score: number) {
    this.sum += score;
    this.count++;
  }
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private comments = new BehaviorSubject<Array<ScoredItem<SocialMediaItem>>>(
    []
  );

  private reportActionsSubject = new BehaviorSubject<ReportAction[]>([]);
  private reportClearedSubject = new Subject<void>();
  private reportContextSubject = new BehaviorSubject<string>('');
  // Value is time in milliseconds since the epoch.
  private reportLastEditedSubject = new BehaviorSubject<number>(Date.now());
  private reportStepSubject = new BehaviorSubject<BuildReportStep>(
    BuildReportStep.NONE
  );
  private reportReasonsSubject = new BehaviorSubject<string[]>([]);

  private report: Report = {};

  readonly reportActionsChanged = this.reportActionsSubject.asObservable();
  readonly reportCleared = this.reportClearedSubject.asObservable();
  readonly reportCommentsChanged = this.comments.asObservable();
  readonly reportContextChanged = this.reportContextSubject.asObservable();
  readonly reportLastEditedChanged = this.reportLastEditedSubject.asObservable();
  readonly reportStepChanged = this.reportStepSubject.asObservable();
  readonly reportReasonsChanged = this.reportReasonsSubject.asObservable();

  constructor(
    private firestoreService: FirestoreService,
    private googleAnalyticsService: GoogleAnalyticsService
  ) {
    this.firestoreService.onReportChange.subscribe((report: Report) => {
      this.report = report;
      this.reportActionsSubject.next(this.getReportActions());
      this.reportContextSubject.next(this.getContext());
      const lastReportEdit = this.getReportLastEdited();
      if (lastReportEdit !== this.reportLastEditedSubject.value) {
        this.reportLastEditedSubject.next(lastReportEdit);
      }
      this.reportReasonsSubject.next(this.getReportReasons());
      this.reportStepSubject.next(this.getReportStep());
    });

    this.firestoreService.onCommentsChange.subscribe(comments => {
      this.comments.next(comments);
    });
  }

  addCommentsToReport(comments: Array<ScoredItem<SocialMediaItem>>) {
    if (this.getCommentsForReport().length === 0) {
      this.googleAnalyticsService.emitEvent(
        EventCategory.REPORT,
        EventAction.START_REPORT
      );
    }
    this.firestoreService.addComments(comments);
  }

  removeCommentFromReport(comment: ScoredItem<SocialMediaItem>) {
    this.firestoreService.deleteComment(comment);
  }

  clearReport() {
    this.firestoreService.clearReport();
    this.reportClearedSubject.next();
    this.reportStepSubject.next(BuildReportStep.NONE);
  }

  getCommentsForReport(): Array<ScoredItem<SocialMediaItem>> {
    return this.comments.value;
  }

  getReportSummary(): string {
    let reportSummary = '';
    const attributeScores: Map<string, ComputeReportSummaryHelper> = new Map([
      ['Toxicity', new ComputeReportSummaryHelper('Toxicity')],
      ['Severe Toxicity', new ComputeReportSummaryHelper('Severe Toxicity')],
      ['Insult', new ComputeReportSummaryHelper('Insult')],
      ['Profanity', new ComputeReportSummaryHelper('Profanity')],
      ['Threat', new ComputeReportSummaryHelper('Threat')],
      ['Identity Attack', new ComputeReportSummaryHelper('Identity Attack')],
    ]);

    for (const entry of this.getCommentsForReport()) {
      const scores = entry.scores;
      if (scores.TOXICITY) {
        attributeScores.get('Toxicity')?.addScore(scores.TOXICITY);
      }
      if (scores.SEVERE_TOXICITY) {
        attributeScores
          .get('Severe Toxicity')
          ?.addScore(scores.SEVERE_TOXICITY);
      }
      if (scores.INSULT) {
        attributeScores.get('Insult')?.addScore(scores.INSULT);
      }
      if (scores.PROFANITY) {
        attributeScores.get('Profanity')?.addScore(scores.PROFANITY);
      }
      if (scores.THREAT) {
        attributeScores.get('Threat')?.addScore(scores.THREAT);
      }
      if (scores.IDENTITY_ATTACK) {
        attributeScores
          .get('Identity Attack')
          ?.addScore(scores.IDENTITY_ATTACK);
      }
    }
    for (const [attribute, attributeScore] of attributeScores) {
      reportSummary += attributeScore.getAverageScoreString();
    }
    // Remove trailing whitespace and comma.
    return reportSummary.slice(0, -2);
  }

  setReportReasons(reportReasons: string[]) {
    this.firestoreService.updateReport({ reportReasons });
  }

  setContext(context: string) {
    this.firestoreService.updateReport({ context });
  }

  // General report actions taken by the user.
  setReportActions(actions: ReportAction[]) {
    this.firestoreService.updateReport({
      reportActionStatus: {
        reportedToTwitter: actions.includes(ReportAction.REPORT_TO_TWITTER),
        csvDownloaded: actions.includes(ReportAction.DOWNLOAD_CSV),
        pdfDownloaded: actions.includes(ReportAction.DOWNLOAD_PDF),
        printed: actions.includes(ReportAction.PRINT),
        savedToDrive: actions.includes(ReportAction.SAVE_TO_DRIVE),
        blockedUsersTwitter: actions.includes(ReportAction.BLOCK_TWITTER),
        mutedUsersTwitter: actions.includes(ReportAction.MUTE_TWITTER),
        hidRepliesTwitter: actions.includes(ReportAction.HIDE_REPLIES_TWITTER),
      },
    });
  }

  setReportStep(reportStep: BuildReportStep) {
    this.firestoreService.updateReport(
      { reportStep },
      false /* updateLastEdited */
    );
  }

  getReportReasons(): string[] {
    return this.report.reportReasons ?? [];
  }

  getContext(): string {
    return this.report.context ?? '';
  }

  getReportStep(): BuildReportStep {
    if (!this.report.reportStep) {
      return BuildReportStep.NONE;
    } else {
      // Convert from number back to enum.
      switch (this.report.reportStep) {
        case BuildReportStep.ADD_COMMENTS:
          return BuildReportStep.ADD_COMMENTS;
        case BuildReportStep.EDIT_DETAILS:
          return BuildReportStep.EDIT_DETAILS;
        case BuildReportStep.TAKE_ACTION:
          return BuildReportStep.TAKE_ACTION;
        case BuildReportStep.COMPLETE:
          return BuildReportStep.COMPLETE;
        default:
          return BuildReportStep.NONE;
      }
    }
  }

  private getReportLastEdited(): number {
    return (
      (this.report.lastEdited as firebase.firestore.Timestamp)?.toMillis() ||
      Date.now()
    );
  }

  // General report actions taken by the user.
  getReportActions(): ReportAction[] {
    if (!this.report.reportActionStatus) {
      return [];
    }
    const reportActionStatus = this.report.reportActionStatus;
    const actions = [];
    if (reportActionStatus.reportedToTwitter) {
      actions.push(ReportAction.REPORT_TO_TWITTER);
    }
    if (reportActionStatus.csvDownloaded) {
      actions.push(ReportAction.DOWNLOAD_CSV);
    }
    if (reportActionStatus.pdfDownloaded) {
      actions.push(ReportAction.DOWNLOAD_PDF);
    }
    if (reportActionStatus.printed) {
      actions.push(ReportAction.PRINT);
    }
    if (reportActionStatus.savedToDrive) {
      actions.push(ReportAction.SAVE_TO_DRIVE);
    }
    if (reportActionStatus.blockedUsersTwitter) {
      actions.push(ReportAction.BLOCK_TWITTER);
    }
    if (reportActionStatus.mutedUsersTwitter) {
      actions.push(ReportAction.MUTE_TWITTER);
    }
    if (reportActionStatus.hidRepliesTwitter) {
      actions.push(ReportAction.HIDE_REPLIES_TWITTER);
    }
    return actions;
  }
}
