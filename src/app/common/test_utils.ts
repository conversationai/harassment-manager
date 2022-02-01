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

import firebase from 'firebase/app';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ScoredItem, SocialMediaItem } from '../../common-types';
import { Report } from '../firestore.service';

export interface MockOauthApiService {
  twitterSignInChange: Observable<boolean>;
  getTwitterCredentials: () => firebase.auth.UserCredential | undefined;
}

export class MockFirestoreService {
  private comments$ = new BehaviorSubject<Array<ScoredItem<SocialMediaItem>>>(
    []
  );
  private report$ = new BehaviorSubject<Report>({});

  readonly onCommentsChange = this.comments$.asObservable();
  readonly onReportChange = this.report$.asObservable();

  addComments(comments: Array<ScoredItem<SocialMediaItem>>) {
    this.comments$.next(comments);
  }

  deleteComment(comment: ScoredItem<SocialMediaItem>) {
    const updatedComments = this.comments$
      .getValue()
      .filter(c => c.item.id_str !== comment.item.id_str);
    this.comments$.next(updatedComments);
  }

  clearReport() {
    this.comments$.next([]);
    this.report$.next({});
  }

  updateReport(report: Partial<Report>) {
    const updatedReport = { ...this.report$.getValue(), ...report };
    this.report$.next(updatedReport);
  }
}

/**
 * Stub for MatDialogRef. The constructor takes a Subject that should be
 * triggered when we want the dialog to close with the value it should send
 * back.
 */
export class DialogRefStub<T> {
  constructor(private dialogCloseTrigger: Subject<T>) {}

  afterClosed() {
    return this.dialogCloseTrigger.asObservable();
  }
}
