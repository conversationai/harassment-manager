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
import { Observable, Subject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirestoreService } from './firestore.service';

/**
 * Small service to help notify the toolbar when it needs to start showing the
 * onboarding step for highlighting the report cart.
 */
@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  private triggerHighlightReviewReportButtonSubject = new Subject<void>();
  highlightReviewReportButton = this.triggerHighlightReviewReportButtonSubject.asObservable();

  constructor(private firestoreService: FirestoreService) {}

  triggerHighlightReviewReportButton() {
    this.triggerHighlightReviewReportButtonSubject.next();
  }

  getHomePageOnboardingComplete(): Observable<boolean> {
    return this.firestoreService
      .getUserFlags()
      .pipe(map(flags => flags.homePageOnboardingComplete));
  }

  setHomePageOnboardingComplete(): Promise<void> {
    return this.firestoreService.setUserFlags({
      homePageOnboardingComplete: true,
    });
  }

  getCreateReportPageOnboardingComplete(): Observable<boolean> {
    return this.firestoreService
      .getUserFlags()
      .pipe(map(flags => flags.createPageOnboardingComplete));
  }

  setCreateReportPageOnboardingComplete(): void {
    this.firestoreService.setUserFlags({ createPageOnboardingComplete: true });
  }
}
