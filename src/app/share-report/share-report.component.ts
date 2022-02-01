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

import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { csvFormatRows } from 'd3-dsv';
import { take } from 'rxjs/operators';
import { CreatePdfResponse, CsvFileTemplate, Tweet } from '../../common-types';
import { ActionWarningDialogComponent } from '../action-warning-dialog/action-warning-dialog.component';
import { ActionService } from '../action.service';
import { ApiErrorDialogComponent } from '../api-error-dialog/api-error-dialog.component';
import { ActionButtonOption } from '../dropdown-button/dropdown-button.component';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import {
  EventCategory,
  GoogleAnalyticsService,
} from '../google_analytics.service';
import { OauthApiService } from '../oauth_api.service';
import { PdfService } from '../pdf_service';
import { ReportPdfComponent } from '../report-pdf/report-pdf.component';
import { ReportAction, ReportService } from '../report.service';
import { SheetsApiService } from '../sheets_api.service';
import { TwitterApiService } from '../twitter_api.service';

// Gets all CSS from the document.
// Adapted from https://developer.mozilla.org/en-US/docs/Web/API/StyleSheetList
function getAllCss(): string {
  const styles: string[] = [];
  // Index loop is required, no iterator for document.styleSheets.
  for (let i = 0; i < document.styleSheets.length; i++) {
    const styleSheet = document.styleSheets[i];
    try {
      for (let j = 0; j < styleSheet.cssRules.length; j++) {
        styles.push(styleSheet.cssRules[j].cssText);
      }
    } catch (e) {
      // Skipping stylesheet, access was denied.
    }
  }
  return styles.join('\n');
}

@Component({
  selector: 'app-share-report',
  templateUrl: './share-report.component.html',
  styleUrls: ['./share-report.component.scss'],
})
export class ShareReportComponent implements AfterViewInit {
  @ViewChild(ReportPdfComponent) reportPdfComponent!: ReportPdfComponent;

  csvFile?: SafeUrl;
  csvFileName?: string;
  signedInWithTwitter = false;
  pdfLoading = true;

  readonly ReportAction = ReportAction;
  actions: ReportAction[];

  readonly downloadPdfOptionIndex = 0;
  readonly downloadCsvOptionIndex = 1;
  readonly printOptionIndex = 2;
  // Save option index to initialize with. Note that this is only one-way binding.
  selectedSaveOptionIndex = this.downloadPdfOptionIndex;
  readonly saveOptions: ActionButtonOption[] = [
    {
      action: ReportAction.DOWNLOAD_PDF,
      text: 'Download PDF',
      svgIcon: 'pdf_icon',
    },
    {
      action: ReportAction.DOWNLOAD_CSV,
      text: 'Download CSV',
      svgIcon: 'csv_icon',
    },

    {
      action: ReportAction.PRINT,
      text: 'Print Report',
      iconText: 'print',
    },
  ];

  readonly twitterActionOptions: ActionButtonOption[] = [
    {
      action: ReportAction.BLOCK_TWITTER,
      text: 'Block accounts',
      actionCompletedText: 'Accounts blocked',
      actionInProgressText: 'Blocking...',
      iconText: 'block',
    },
    {
      action: ReportAction.MUTE_TWITTER,
      text: 'Mute accounts',
      actionCompletedText: 'Accounts muted',
      actionInProgressText: 'Muting...',
      iconText: 'volume_off',
    },
  ];
  selectedTwitterActionOptionIndex = 0;

  adblockErrorOpen = false;

  driveReportUrl: SafeUrl | null = null;

  muteActionInProgress = false;

  constructor(
    private actionService: ActionService,
    private oauthApiService: OauthApiService,
    private sheetsApiService: SheetsApiService,
    private pdfService: PdfService,
    private reportService: ReportService,
    private matIconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog,
    private googleAnalyticsService: GoogleAnalyticsService,
    private twitterApiService: TwitterApiService
  ) {
    this.sheetsApiService
      .createCsvTemplate(
        this.reportService.getCommentsForReport(),
        this.reportService.getReportReasons(),
        this.reportService.getContext()
      )
      .subscribe((csvFileTemplate: CsvFileTemplate) => {
        // Using encodeURIComponent instead of encodeURI prevents the CSV download
        // from truncating at # characters.
        // See https://stackoverflow.com/a/55267469
        const csvStr =
          csvFormatRows([csvFileTemplate.header]) +
          '\n' +
          csvFormatRows(csvFileTemplate.bodyRows);
        const encodedCsv =
          'data:text/csv;charset=utf-8,' + encodeURIComponent(csvStr);
        // Tell Angular we trust this URL so it doesn't get sanitized out of the
        // template.
        this.csvFile = sanitizer.bypassSecurityTrustUrl(encodedCsv);
        this.csvFileName = csvFileTemplate.title;
        const option = this.saveOptions[this.downloadCsvOptionIndex];
        option.href = this.csvFile;
        option.downloadFilename = this.csvFileName;
      });

    this.matIconRegistry.addSvgIcon(
      'csv_icon',
      this.sanitizer.bypassSecurityTrustResourceUrl('/csv_icon.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'pdf_icon',
      this.sanitizer.bypassSecurityTrustResourceUrl('/pdf_icon.svg')
    );

    // Listen to the service to restore any state.
    this.actions = this.reportService.getReportActions();
    this.reportService.reportActionsChanged.subscribe(
      (reportActions: ReportAction[]) => {
        this.actions = reportActions;
      }
    );

    this.pdfService.updateCreatePdfSource({
      entries: this.reportService.getCommentsForReport(),
      reportReasons: this.reportService.getReportReasons(),
      context: this.reportService.getContext(),
    });
  }

  ngAfterViewInit() {
    const reportElement = this.reportPdfComponent.pdfReportElement
      .nativeElement as HTMLElement;

    this.pdfService
      .createPdf(reportElement)
      .then((response: CreatePdfResponse) => {
        const option = this.saveOptions[this.downloadPdfOptionIndex];
        option.href = response.safeUrl;
        option.downloadFilename = response.title;
        option.buffer = response.buffer;
        this.pdfLoading = false;
      });
  }

  getUsersInReport(): string[] {
    const comments = this.reportService.getCommentsForReport();
    for (const comment of comments) {
      if (!comment.item.authorScreenName) {
        throw new Error('Missing author screenname for comment ' + comment);
      }
    }
    return comments.map(comment => comment.item.authorScreenName!);
  }

  handleClickActionOption(option: ActionButtonOption) {
    this.addAction(option.action);
  }

  async addAction(action: ReportAction) {
    let addAction = true;
    const actionsToAdd = [action];
    if (action === ReportAction.PRINT) {
      this.printReport();
    } else if (action === ReportAction.BLOCK_TWITTER) {
      addAction = await this.blockTwitterUsers();
    } else if (action === ReportAction.MUTE_TWITTER) {
      addAction = await this.muteTwitterUsers();
    } else if (action === ReportAction.HIDE_REPLIES_TWITTER) {
      addAction = await this.hideRepliesTwitter();
    }
    if (!this.actions.includes(action) && addAction) {
      this.actions.push(...actionsToAdd);
      this.reportService.setReportActions(this.actions);
    }
    // Log the report actions that were taken by the user.
    if (addAction) {
      for (const action of actionsToAdd) {
        this.googleAnalyticsService.emitEvent(EventCategory.REPORT, action);
      }
    }
  }

  async blockTwitterUsers(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const dialogRef = this.dialog.open(ActionWarningDialogComponent, {
        panelClass: 'action-warning-dialog-container',
        data: {
          actionTitle: 'Block accounts?',
          actionText:
            'All accounts included in your report will be blocked. This action' +
            ' can be reversed on twitter.com.',
          learnMoreLink:
            'https://help.twitter.com/en/using-twitter#blocking-and-muting',
          confirmationText: 'Block all',
        },
      });
      dialogRef
        .afterClosed()
        .pipe(take(1))
        .subscribe(async (result: boolean) => {
          if (result) {
            this.actionService.startAction(ReportAction.BLOCK_TWITTER);
            await this.twitterApiService
              .blockUsers(this.getUsersInReport())
              .toPromise()
              .then(response => {
                const failures = response.failedScreennames;
                if (failures?.length) {
                  this.dialog.open(ApiErrorDialogComponent, {
                    panelClass: 'api-error-dialog-container',
                    data: {
                      failures,
                      message:
                        'The following users could not be blocked. These accounts ' +
                        'may no longer be active or an unknown error may have ' +
                        'occurred.',
                      title: `${failures.length} ${
                        failures.length === 1 ? 'user' : 'users'
                      } could not be blocked`,
                    },
                  });
                }
                resolve(true);
              })
              .catch(_ => {
                this.dialog.open(ApiErrorDialogComponent, {
                  panelClass: 'api-error-dialog-container',
                  data: {
                    message:
                      'There was a problem connecting with Twitter. ' +
                      'Please try again in a few minutes.',
                    title: `Unable to block users`,
                  },
                });
                resolve(false);
              });
            this.actionService.markActionComplete(ReportAction.BLOCK_TWITTER);
          } else {
            resolve(false);
          }
        });
    });
  }

  async muteTwitterUsers(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const dialogRef = this.dialog.open(ActionWarningDialogComponent, {
        panelClass: 'action-warning-dialog-container',
        data: {
          actionTitle: 'Mute accounts?',
          actionText:
            'All accounts included in your report will be muted. To reverse' +
            ' this action, visit your muted account settings on twitter.com' +
            ' or your apps settings on Twitter for iOS or Android.',
          learnMoreLink:
            'https://help.twitter.com/en/using-twitter#blocking-and-muting',
          confirmationText: 'Mute all',
        },
      });
      dialogRef
        .afterClosed()
        .pipe(take(1))
        .subscribe(async (result: boolean) => {
          if (result) {
            this.actionService.startAction(ReportAction.MUTE_TWITTER);
            await this.twitterApiService
              .muteUsers(this.getUsersInReport())
              .toPromise()
              .then(response => {
                const failures = response.failedScreennames;
                if (failures?.length) {
                  this.dialog.open(ApiErrorDialogComponent, {
                    panelClass: 'api-error-dialog-container',
                    data: {
                      failures,
                      message:
                        'The following users could not be muted. These accounts ' +
                        'may no longer be active or an unknown error may have ' +
                        'occurred.',
                      title: `${failures.length} ${
                        failures.length === 1 ? 'user' : 'users'
                      } could not be muted`,
                    },
                  });
                }
                resolve(true);
              })
              .catch(_ => {
                this.dialog.open(ApiErrorDialogComponent, {
                  panelClass: 'api-error-dialog-container',
                  data: {
                    message:
                      'There was a problem connecting with Twitter. ' +
                      'Please try again in a few minutes.',
                    title: `Unable to mute users`,
                  },
                });
                resolve(false);
              });
            this.actionService.markActionComplete(ReportAction.MUTE_TWITTER);
          } else {
            resolve(false);
          }
        });
    });
  }

  async hideRepliesTwitter(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const dialogRef = this.dialog.open(ActionWarningDialogComponent, {
        panelClass: 'action-warning-dialog-container',
        data: {
          actionTitle: 'Hide replies?',
          actionText:
            'This will apply to all Direct Replies included in your report.' +
            ' Retweets and Quoted Replies will not be hidden.',
          learnMoreLink:
            'https://help.twitter.com/en/using-twitter/mentions-and-replies#:~:text=Hidden%20replies&text=When%20a%20Tweet%20author%20hides,reply%20will%20not%20be%20notified.&text=From%20a%    20reply%20to%20one,right%20of%20your%20original%20Tweet.',
          confirmationText: 'Hide replies',
        },
      });
      dialogRef
        .afterClosed()
        .pipe(take(1))
        .subscribe(async (result: boolean) => {
          if (result) {
            this.muteActionInProgress = true;
            await this.twitterApiService
              .hideReplies(this.getTwitterReplyIds())
              .toPromise()
              .then(response => {
                const numQuotaFailures = response.numQuotaFailures;
                const numOtherFailures = response.numOtherFailures;
                if (numQuotaFailures) {
                  // Some of the errors were quota issues, so we combine those
                  // with any other issues to keep things straightforward for
                  // users.
                  const numFailures =
                    numQuotaFailures + (numOtherFailures ?? 0);
                  this.dialog.open(ApiErrorDialogComponent, {
                    panelClass: 'api-error-dialog-container',
                    data: {
                      message:
                        "Only 50 replies can be hidden every 15 minutes. If you'd " +
                        'like to hide more than 50 replies, you have a couple ' +
                        'of options. You can either divide the replies across ' +
                        'multiple reports or you can resend the report to have ' +
                        'up to another 50 replies removed. Note that with both ' +
                        "options you'll need to wait 15 minutes, remove the " +
                        'previously submitted replies, and select up to 50 ' +
                        'additional new replies.',
                      title: `${numFailures} ${
                        numFailures === 1 ? 'reply' : 'replies'
                      } could not be hidden`,
                    },
                  });
                } else if (numOtherFailures) {
                  // No quota issues, but some replies couldn't be hidden.
                  this.dialog.open(ApiErrorDialogComponent, {
                    panelClass: 'api-error-dialog-container',
                    data: {
                      message:
                        'Some replies could not be hidden. These replies ' +
                        'may no longer exist or an unknown error may have ' +
                        'occurred.',
                      title: `${numOtherFailures} ${
                        numOtherFailures === 1 ? 'reply' : 'replies'
                      } could not be hidden`,
                    },
                  });
                }
                resolve(true);
              })
              .catch(_ => {
                this.dialog.open(ApiErrorDialogComponent, {
                  panelClass: 'api-error-dialog-container',
                  data: {
                    message:
                      'There was a problem connecting with Twitter. ' +
                      'Please try again in a few minutes.',
                    title: `Unable to hide replies`,
                  },
                });
                resolve(false);
              });
            this.muteActionInProgress = false;
          } else {
            resolve(false);
          }
        });
    });
  }

  saveToGoogleSheets() {
    this.oauthApiService
      .authenticateGoogleSheets()
      .then(() => {
        this.sheetsApiService
          .createSpreadsheet(
            this.reportService.getCommentsForReport(),
            this.reportService.getReportReasons(),
            this.reportService.getContext()
          )
          .subscribe((reportUrl: string) => {
            this.driveReportUrl = this.sanitizer.bypassSecurityTrustUrl(
              reportUrl
            );
            this.actions.push(ReportAction.SAVE_TO_DRIVE);
          });
      })
      .catch(error => {
        throw new Error(`Error authenticating with Google sheets: ${error}`);
      });
  }

  printReport() {
    if (!this.reportPdfComponent) {
      return;
    }
    const w = window.open();
    if (w !== null) {
      // Attach HTML and CSS
      // Note: In Chrome, the background color CSS for the header of the report
      // will only appear in the print preview if you select "Background
      // graphics" under options in settings.
      w.document.write(`<style>${getAllCss()}</style>`);
      w.document.write(
        this.reportPdfComponent.pdfReportElement.nativeElement.innerHTML
      );
      // Note that print() doesn't work (on Chrome at least) if an adblocker is
      // enabled!
      // Hacky solution for adblock problem: wait 2 seconds while print is
      // called. We have to do this before print() because print() blocks
      // execution. If after 2 seconds the onbeforeprint callback was not
      // invoked, there's probably something wrong. Notify the user that an
      // adblocker may be preventing print() from working.
      let beforePrintCalled = false;
      w.onbeforeprint = () => {
        beforePrintCalled = true;
      };
      setTimeout(() => {
        if (!beforePrintCalled) {
          this.showAdblockError();
          w.close();
        }
      }, 2000);
      w.print();
      w.close();
    } else {
      this.showAdblockError();
    }
  }

  showAdblockError() {
    if (this.adblockErrorOpen) {
      return;
    }
    this.adblockErrorOpen = true;
    const dialogRef = this.dialog.open(ErrorDialogComponent, {
      data: {
        errorTitle: 'Sorry, we’re unable to print your report',
        errorText:
          'To resolve the issue, temporarily disable ad blocker for' +
          ' the print feature to work. You can always print after downloading' +
          ' or exporting the report as well.',
      },
    });
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe(() => {
        this.adblockErrorOpen = false;
      });
  }

  private getTwitterReplyIds(): string[] {
    const comments = this.reportService.getCommentsForReport();
    return comments
      .filter(comment => !!(comment.item as Tweet).in_reply_to_status_id)
      .map(comment => comment.item.id_str);
  }
}
