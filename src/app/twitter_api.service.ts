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
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  GetTweetsRequest,
  GetTweetsResponse,
  BlockTwitterUsersRequest,
  BlockTwitterUsersResponse,
  MuteTwitterUsersRequest,
  MuteTwitterUsersResponse,
  HideRepliesTwitterRequest,
  HideRepliesTwitterResponse,
} from '../common-types';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { take } from 'rxjs/operators';
import { OauthApiService } from './oauth_api.service';
import RateLimiter from 'rxjs-ratelimiter';

// Number of times to retry getting Tweets after error. This is per batch.
const MAX_RETRIES = 25;

@Injectable()
export class TwitterApiService {
  private onTweetsLoadedSource: BehaviorSubject<number> = new BehaviorSubject(
    0
  );
  onTweetsLoaded = this.onTweetsLoadedSource.asObservable();
  // 2 requests per 1000ms.
  // Twitter's API has a limit of 2 QPS.
  private rateLimiter = new RateLimiter(2, 1000);

  constructor(
    private readonly httpClient: HttpClient,
    private readonly oauthApiService: OauthApiService
  ) {}

  async getTweets(request: GetTweetsRequest): Promise<GetTweetsResponse> {
    const twitterCredentials = this.oauthApiService.getTwitterCredentials();

    if (!twitterCredentials) {
      throw new Error('Missing twitter credentials in getTweets()');
    }

    request.credentials = twitterCredentials;

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');

    // Continue getting more Tweets until there are no more to fetch.
    let haveFullResponse = false;
    const fullResponse: GetTweetsResponse = { tweets: [] };
    let curResponse;
    let retryCount = 0;
    while (!haveFullResponse) {
      try {
        curResponse = await this.rateLimiter
          .limit(
            this.httpClient.post<GetTweetsResponse>('/get_tweets', request, {
              headers,
            })
          )
          .toPromise();
      } catch (error) {
        // If there's an error with a batch, retry it up to MAX_RETRIES times.
        retryCount += 1;
        if (retryCount >= MAX_RETRIES) {
          throw new Error('Error getting Tweets');
        }
        continue;
      }
      retryCount = 0;
      fullResponse.tweets = fullResponse.tweets.concat(curResponse.tweets);

      if (curResponse.nextPageToken) {
        request.nextPageToken = curResponse.nextPageToken;
      } else {
        haveFullResponse = true;
      }
      this.onTweetsLoadedSource.next(fullResponse.tweets.length);
    }
    return fullResponse;
  }

  blockUsers(users: string[]): Observable<BlockTwitterUsersResponse> {
    const request: Partial<BlockTwitterUsersRequest> = { users };
    const credential = this.oauthApiService.getTwitterOauthCredential();

    if (!credential) {
      throw new Error('Missing Twitter credentials in blockUsers()');
    }

    request.credential = credential;

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');

    return this.httpClient
      .post<BlockTwitterUsersResponse>('/block_twitter_users', request, {
        headers,
      })
      .pipe(take(1));
  }

  muteUsers(users: string[]): Observable<MuteTwitterUsersResponse> {
    const request: Partial<MuteTwitterUsersRequest> = { users };
    const credential = this.oauthApiService.getTwitterOauthCredential();

    if (!credential) {
      throw new Error('Missing Twitter credentials in muteUsers()');
    }

    request.credential = credential;

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');

    return this.httpClient
      .post<MuteTwitterUsersResponse>('/mute_twitter_users', request, {
        headers,
      })
      .pipe(take(1));
  }

  hideReplies(tweetIds: string[]): Observable<HideRepliesTwitterResponse> {
    const request: Partial<HideRepliesTwitterRequest> = { tweetIds };
    const credential = this.oauthApiService.getTwitterOauthCredential();

    if (!credential) {
      throw new Error('Missing Twitter credentials in muteUsers()');
    }

    request.credential = credential;

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');

    return this.httpClient
      .post<HideRepliesTwitterResponse>('/hide_replies_twitter', request, {
        headers,
      })
      .pipe(take(1));
  }
}
