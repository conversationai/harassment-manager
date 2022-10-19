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

import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import firebase from 'firebase/compat/app';
import { ScoredItem, SocialMediaItem } from '../common-types';
import { OauthApiService } from './oauth_api.service';
import { SheetsApiService } from './sheets_api.service';

const COMMENTS: Array<ScoredItem<SocialMediaItem>> = [
  {
    item: {
      id_str: 'a',
      text: 'your mother was a hamster',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.8,
    },
  },
  {
    item: {
      id_str: 'b',
      text: 'and your father smelt of elderberries',
      date: new Date(),
    },
    scores: {
      TOXICITY: 0.9,
    },
  },
];

const MOCK_FIREBASE_CREDENTIALS = {
  accessToken: 'a',
  idToken: 'b',
  providerId: 'c',
  secret: 'd',
  signInMethod: 'e',
  toJSON: () => 'abcde',
};

const MOCK_GOOGLE_CREDENTIALS = {
  access_token: 'test',
};

const MOCK_FIREBASE_USER_CREDENTIALS = {
  credential: {
    providerId: 'a',
    signInMethod: 'b',
    toJSON: () => 'ab',
    fromJSON: (json: {} | string) => null,
  },
  user: jasmine.createSpyObj<firebase.User>('firebaseUser', ['displayName']),
  additionalUserInfo: {
    username: 'test',
    isNewUser: false,
    profile: null,
    providerId: 'a',
  },
};

describe('SheetsApiService', () => {
  let service: SheetsApiService;
  let mockOauthApiService: jasmine.SpyObj<OauthApiService>;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    mockOauthApiService = jasmine.createSpyObj<OauthApiService>(
      'oauthApiService',
      ['getGoogleCredentials', 'getTwitterCredentials']
    );
    mockOauthApiService.getTwitterCredentials.and.returnValue(undefined);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: OauthApiService,
          useValue: mockOauthApiService,
        },
        SheetsApiService,
      ],
    });
    service = TestBed.inject(SheetsApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verifies that there are no pending HTTP requests.
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('creates Google sheet report using gapi credentials for Twitter user', async () => {
    mockOauthApiService.getTwitterCredentials.and.returnValue(
      MOCK_FIREBASE_USER_CREDENTIALS
    );
    mockOauthApiService.getGoogleCredentials.and.returnValue(
      MOCK_GOOGLE_CREDENTIALS
    );
    service
      .createSpreadsheet(COMMENTS, ['reportReason1'], 'some context')
      .subscribe((url: string) => {
        expect(url).toEqual('a');
      });
    expect(mockOauthApiService.getGoogleCredentials).toHaveBeenCalled();
    const req = httpTestingController.expectOne('/create_twitter_report');
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.credentials).toEqual(MOCK_GOOGLE_CREDENTIALS);

    req.flush({
      spreadsheetUrl: 'a',
    });
  });
});
