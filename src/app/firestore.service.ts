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

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  BuildReportStep,
  ClearReportRequest,
  Platform,
  ScoredItem,
  SocialMediaItem,
} from '../common-types';
import { OauthApiService } from './oauth_api.service';

export interface UserFlags {
  homePageOnboardingComplete: boolean;
  createPageOnboardingComplete: boolean;
}

// Status on different actions a user can take for a given report. True means
// the action was taken.
export interface ReportActionStatus {
  reportedToTwitter: boolean;
  csvDownloaded: boolean;
  pdfDownloaded: boolean;
  printed: boolean;
  savedToDrive: boolean;
  blockedUsersTwitter: boolean;
  mutedUsersTwitter: boolean;
  hidRepliesTwitter: boolean;
}

interface User {
  flags: UserFlags;
}

export interface Report {
  created_at?: firebase.firestore.FieldValue;
  context?: string;
  reportReasons?: string[];
  reportActionStatus?: ReportActionStatus;
  // We write the timestamp as a FieldValue but when it's fetched it's a
  // Timestamp object.
  lastEdited?: firebase.firestore.FieldValue | firebase.firestore.Timestamp;
  // Value of the BuildReportStep enum
  reportStep?: BuildReportStep;
}

/**
 * Manages interactions with Firestore.
 *
 * We define our Firestore schema as:
 *
 * users (collection)
 *   someuserid (document)
 *      flags (map of string -> boolean values)
 *      twitter_reports (collection)
 *        somereportid (document)
 *          created_at (timestamp)
 *          context (string)
 *          report_reasons (string [])
 *          reportActionStatus (map of string -> boolean values)
 *          lastEdited (timestamp)
 *          reportStep (number)
 *          comments (collection)
 *            somecommentid (document)
 *              item (map of data for a Tweet)
 *              scores (map of Perspective scores for the comment)
 */
@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private comments = new BehaviorSubject<Array<ScoredItem<SocialMediaItem>>>(
    []
  );
  private platform?: Platform;
  private report = new BehaviorSubject<Report>({});
  private reportId?: string; // ID of the current report.
  private uid?: string; // ID for the logged-in user.
  private users = this.firestore.collection<User>('users');

  readonly onCommentsChange = this.comments.asObservable();
  readonly onReportChange = this.report.asObservable();
  reportDataChangesSubscription: Subscription | null = null;
  reportCommentChangesSubscription: Subscription | null = null;

  constructor(
    private httpClient: HttpClient,
    private firestore: AngularFirestore,
    private oauthApiService: OauthApiService
  ) {
    this.oauthApiService.twitterSignInChange.subscribe(signedIn => {
      if (signedIn) {
        this.platform = Platform.TWITTER;
        this.uid = this.oauthApiService.getTwitterCredentials()?.user?.uid;
      } else {
        this.unsubscribeToChanges();
      }
    });
  }

  async addComments(
    comments: Array<ScoredItem<SocialMediaItem>>
  ): Promise<void> {
    if (!this.reportId) {
      await this.createReportDocument();
    }

    // Write all comments as individual documents in a batched write. This
    // ensures the "added X comments to report" notification has the correct
    // number for X.
    const batch = this.firestore.firestore.batch();
    const commentsCollection = this.firestore.collection<
      ScoredItem<SocialMediaItem>
    >(`${this.getReportsPath()}/${this.reportId}/comments`);

    for (const comment of comments) {
      const commentDoc = commentsCollection.doc(comment.item.id_str);
      batch.set(commentDoc.ref, { item: comment.item, scores: comment.scores });
    }

    batch.commit();
    this.updateLastEdited();
  }

  async createUserDocument(): Promise<void> {
    if (!this.platform) {
      throw new Error('Platform has not been set');
    }
    if (!this.uid) {
      throw new Error('UserCredential is missing uid');
    }

    const user = await this.users.doc(this.uid).ref.get();
    if (user.exists) {
      return this.restoreReport();
    }

    return this.users.doc(this.uid).set({
      flags: {
        homePageOnboardingComplete: false,
        createPageOnboardingComplete: false,
      },
    });
  }

  deleteComment(comment: ScoredItem<SocialMediaItem>): void {
    this.firestore
      .doc<ScoredItem<SocialMediaItem>>(
        `${this.getReportsPath()}/` +
          `${this.reportId}/comments/` +
          `${comment.item.id_str}`
      )
      .delete();
    this.updateLastEdited();
  }

  getUserFlags(): Observable<UserFlags> {
    return this.users
      .doc(this.uid)
      .get()
      .pipe(map(doc => doc.get('flags')));
  }

  setUserFlags(flags: Partial<UserFlags>): Promise<void> {
    // We omit the <User> type from .collection() because TypeScript complains we're
    // not defining values for all the flags in the UserFlags interface.
    return this.firestore
      .collection('users')
      .doc(this.uid)
      .set({ flags }, { merge: true });
  }

  /** Issues a partial update to the fields in a report. */
  async updateReport(
    report: Partial<Report>,
    updateLastEdited = true
  ): Promise<void> {
    if (!this.reportId) {
      await this.createReportDocument();
    }
    this.firestore
      .doc<Report>(`${this.getReportsPath()}/${this.reportId}`)
      .update(report);
    if (updateLastEdited) {
      this.updateLastEdited();
    }
  }

  clearReport() {
    // Get the ID token of the signed-in user to send to the server for
    // verification.
    this.oauthApiService
      .getIdToken()
      .pipe(take(1))
      .subscribe(token => {
        if (!token) {
          throw new Error('ID token is not available');
        }
        if (!this.reportId) {
          throw new Error('Report ID is not valid');
        }
        if (!this.platform) {
          throw new Error('Platform has not been set');
        }

        const request: ClearReportRequest = {
          documentId: this.reportId,
          idToken: token,
          platform: this.platform,
        };
        const headers = new HttpHeaders();
        headers.append('Content-Type', 'application/json');

        this.httpClient
          .post('/clear_report', request, { headers })
          .pipe(take(1))
          .subscribe();

        this.createReportDocument();
      });
  }

  /** Updates the lastEdited field for the report to the current timestamp. */
  private updateLastEdited() {
    this.firestore
      .doc<Report>(`${this.getReportsPath()}/${this.reportId}`)
      .update({
        lastEdited: firebase.firestore.FieldValue.serverTimestamp(),
      });
  }

  private async createReportDocument(): Promise<void> {
    const reportDoc = await this.firestore
      .collection<Report>(this.getReportsPath())
      .add({
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        reportActionStatus: {
          reportedToTwitter: false,
          csvDownloaded: false,
          pdfDownloaded: false,
          printed: false,
          savedToDrive: false,
          blockedUsersTwitter: false,
          mutedUsersTwitter: false,
          hidRepliesTwitter: false,
        },
        lastEdited: firebase.firestore.FieldValue.serverTimestamp(),
        reportStep: BuildReportStep.NONE,
      });

    this.reportId = reportDoc.id;
    this.subscribeToChanges();
  }

  private async restoreReport(): Promise<void> {
    // Fetch the reports collection, sort by the created_at field, and get
    // the top-most collection.
    const reports = await this.firestore
      .collection<Report>(this.getReportsPath(), reports =>
        reports.orderBy('created_at', 'desc').limit(1)
      )
      .ref.get();

    if (!reports.docs.length) {
      // A user should always have a report associated with their Firestore
      // document. If we reach this, a developer has likely cleared part of the
      // database containing this user's data or we've reached an unexpected
      // code path. To be safe, we create a new report document entirely.
      return this.createReportDocument();
    }

    this.reportId = reports.docs[0].id;
    this.subscribeToChanges();
  }

  private subscribeToChanges(): void {
    // Cancel any existing subscriptions.
    this.unsubscribeToChanges();

    // Emit any changes to the report data (excluding comments).
    this.reportDataChangesSubscription = this.firestore
      .doc<Report>(`${this.getReportsPath()}/${this.reportId}`)
      .valueChanges()
      .subscribe(report => {
        // Ensure report has not been deleted.
        if (report) {
          this.report.next(report);
        }
      });

    // Emit any changes to the comments in the report.
    this.reportCommentChangesSubscription = this.firestore
      .collection<ScoredItem<SocialMediaItem>>(
        `${this.getReportsPath()}/${this.reportId}/comments`
      )
      .valueChanges()
      .subscribe(comments => {
        for (const comment of comments) {
          // Firestore converts Date objects to a Timestamp object when data is
          // stored, so we manually convert it back.
          if (comment.item.date instanceof firebase.firestore.Timestamp) {
            comment.item.date = comment.item.date.toDate();
          }
        }
        this.comments.next(comments);
      });
  }

  private unsubscribeToChanges(): void {
    if (this.reportDataChangesSubscription) {
      this.reportDataChangesSubscription.unsubscribe();
      this.reportDataChangesSubscription = null;
    }
    if (this.reportCommentChangesSubscription) {
      this.reportCommentChangesSubscription.unsubscribe();
      this.reportCommentChangesSubscription = null;
    }
  }

  private getReportsPath(): string {
    return `users/${this.uid}/${this.platform}_reports`;
  }
}
