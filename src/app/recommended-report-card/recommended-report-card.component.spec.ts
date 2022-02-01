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

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReplaySubject } from 'rxjs';
import { MockFirestoreService } from '../common/test_utils';
import { FirestoreService } from '../firestore.service';
import { OauthApiService } from '../oauth_api.service';
import { RecommendedReportCardComponent } from './recommended-report-card.component';

describe('RecommendedReportCardComponent', () => {
  let component: RecommendedReportCardComponent;
  let fixture: ComponentFixture<RecommendedReportCardComponent>;
  const twitterSignInTestSubject = new ReplaySubject<boolean>(1);
  const mockOauthApiService = {
    twitterSignInChange: twitterSignInTestSubject.asObservable(),
  };

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [RecommendedReportCardComponent],
        imports: [
          HttpClientTestingModule,
          MatButtonModule,
          MatCardModule,
          MatIconModule,
          MatProgressSpinnerModule,
        ],
        providers: [
          {
            provide: FirestoreService,
            useClass: MockFirestoreService,
          },
          {
            provide: OauthApiService,
            useValue: mockOauthApiService,
          },
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(RecommendedReportCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
