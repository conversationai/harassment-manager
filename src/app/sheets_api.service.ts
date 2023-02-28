/*
Copyright 2017 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, single } from 'rxjs/operators';
import {
  CreateSpreadsheetRequest,
  CreateSpreadsheetResponse,
  CsvFileTemplate,
  ScoredItem,
  SocialMediaItem,
} from '../common-types';
import { OauthApiService } from './oauth_api.service';

@Injectable()
export class SheetsApiService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly oauthApiService: OauthApiService
  ) {}

  private getUsername(): string {
    const twitterCredentials = this.oauthApiService.getTwitterCredentials();
    if (!twitterCredentials) {
      throw new Error('Twitter credentials not found');
    }
    if (
      twitterCredentials.additionalUserInfo &&
      twitterCredentials.additionalUserInfo.username
    ) {
      return twitterCredentials.additionalUserInfo.username;
    } else {
      throw new Error('Twitter credentials found, but no username is present');
    }
  }

  /**
   * Creates a CSV file template without calling the Google sheets API.
   */
  createCsvTemplate(
    scoredItems: Array<ScoredItem<SocialMediaItem>>,
    reportReasons: string[],
    context: string
  ): Observable<CsvFileTemplate> {
    const twitterCredentials = this.oauthApiService.getTwitterCredentials();
    if (!twitterCredentials) {
      throw new Error('Twitter credentials not found');
    }

    const request: CreateSpreadsheetRequest<SocialMediaItem> = {
      entries: scoredItems,
      username: this.getUsername(),
      reportReasons,
      context,
    };

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');

    return this.httpClient
      .post<CsvFileTemplate>('/save_twitter_report_csv', request, {
        headers,
      })
      .pipe(single());
  }

  // Sends a request to the server to create a spreadsheet and returns an
  // Observable containing the URL of the newly created spreadsheet.
  createSpreadsheet(
    scoredItems: Array<ScoredItem<SocialMediaItem>>,
    reportReasons: string[],
    context: string
  ): Observable<string> {
    const twitterCredentials = this.oauthApiService.getTwitterCredentials();
    if (!twitterCredentials) {
      throw new Error('Twitter credentials not found');
    }
    const googleCredentials = this.oauthApiService.getGoogleCredentials();
    if (!googleCredentials) {
      throw new Error('Missing Google credentials in createSpreadsheet()');
    }

    const request: CreateSpreadsheetRequest<SocialMediaItem> = {
      entries: scoredItems,
      credentials: googleCredentials,
      username: this.getUsername(),
      reportReasons,
      context,
    };

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');
    return this.httpClient
      .post<CreateSpreadsheetResponse>('/create_twitter_report', request, {
        headers,
      })
      .pipe(
        single(),
        map((response: CreateSpreadsheetResponse) => {
          return response.spreadsheetUrl;
        })
      );
  }
}
