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
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, single } from 'rxjs/operators';

import {
  Attributes,
  AnalyzeCommentData,
  AnalyzeCommentResponse,
  AttributeScores,
  AttributeSummaryScores,
} from '../perspectiveapi-types';
import {
  GoogleAnalyticsService,
  EventCategory,
  EventAction,
} from './google_analytics.service';

@Injectable()
export class PerspectiveApiService {
  constructor(
    private httpClient: HttpClient,
    private googleAnalyticsService: GoogleAnalyticsService
  ) {}

  checkText(
    text: string,
    serverUrl?: string
  ): Observable<AttributeSummaryScores> {
    if (serverUrl === undefined) {
      serverUrl = '';
    }

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');

    const data: AnalyzeCommentData = {
      comment: text,
      // This should be unique per user.
      sessionId: 'harassment-manager-user',
      doNotStore: true,
      attributes: Object.keys(Attributes),
    };

    return this.httpClient
      .post<AnalyzeCommentResponse>(serverUrl + '/check', data, { headers })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.googleAnalyticsService.emitEvent(
            EventCategory.ERROR,
            EventAction.PERSPECTIVE_ERROR
          );
          return of(null);
        }),
        single(),
        map(response => this.getAttributeSummaryScores(response))
      );
  }

  getAttributeSummaryScores(
    response: AnalyzeCommentResponse | null
  ): AttributeSummaryScores {
    if (!response) return {};
    const scores = response.attributeScores;
    if (!scores) return {};

    return {
      TOXICITY: this.getAttributeSummaryScore(scores, Attributes.TOXICITY),
      SEVERE_TOXICITY: this.getAttributeSummaryScore(
        scores,
        Attributes.SEVERE_TOXICITY
      ),
      INSULT: this.getAttributeSummaryScore(scores, Attributes.INSULT),
      PROFANITY: this.getAttributeSummaryScore(scores, Attributes.PROFANITY),
      THREAT: this.getAttributeSummaryScore(scores, Attributes.THREAT),
      IDENTITY_ATTACK: this.getAttributeSummaryScore(
        scores,
        Attributes.IDENTITY_ATTACK
      ),
    };
  }

  getAttributeSummaryScore(
    scores: AttributeScores,
    attribute: Attributes
  ): number | undefined {
    return scores[attribute].summaryScore?.value;
  }
}
