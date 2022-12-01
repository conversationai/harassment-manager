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
  BehaviorSubject,
  forkJoin,
  from,
  Observable,
  of,
  throwError,
} from 'rxjs';
import RateLimiter from 'rxjs-ratelimiter';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import {
  GetTweetsResponse,
  ScoredItem,
  SocialMediaItem,
  Tweet,
} from 'src/common-types';
import { stripOutEntitiesFromItemText } from './common/social_media_item_utils';
import { OauthApiService } from './oauth_api.service';
import { PerspectiveApiService } from './perspectiveapi.service';
import { TwitterApiService } from './twitter_api.service';

export interface RequestCache {
  // The key to the cache is startDateTimeMs + '_' + endDateTimeMs.
  [key: string]: Observable<Array<ScoredItem<SocialMediaItem>>>;
}

@Injectable({ providedIn: 'root' })
export class SocialMediaItemService {
  private signedInWithTwitter = false;
  // 800 requests per 1000ms (keep slightly under quota of 1000 QPS)
  private rateLimiter = new RateLimiter(800, 1000);

  // Cache of in-flight requests.
  private requestCache: RequestCache = {};

  // Cached value of the total number of comments fetched so far.
  // This is used for logging purposes.
  private totalCommentFetchCount = 0;

  private onSocialMediaItemsLoadedSource: BehaviorSubject<
    number
  > = new BehaviorSubject(0);
  onSocialMediaItemsLoaded = this.onSocialMediaItemsLoadedSource.asObservable();

  constructor(
    private oauthApiService: OauthApiService,
    private perspectiveApiService: PerspectiveApiService,
    private twitterApiService: TwitterApiService
  ) {
    this.oauthApiService.twitterSignInChange.subscribe(signedIn => {
      this.signedInWithTwitter = signedIn;
      if (!signedIn) {
        this.requestCache = {};
        this.totalCommentFetchCount = 0;
      }
    });
    this.twitterApiService.onTweetsLoaded.subscribe(count => {
      this.onSocialMediaItemsLoadedSource.next(count);
    });
  }

  private getRequestCacheKey(startDateTimeMs: number, endDateTimeMs: number) {
    return `${startDateTimeMs}_${endDateTimeMs}`;
  }

  // Returns a copy. Used primarily for testing.
  getRequestCache(): RequestCache {
    return { ...this.requestCache };
  }

  getTotalCommentFetchCount(): number {
    return this.totalCommentFetchCount;
  }

  fetchItems(
    startDateTimeMs: number,
    endDateTimeMs: number
  ): Observable<Array<ScoredItem<SocialMediaItem>>> {
    if (!this.signedInWithTwitter) {
      return throwError('Not signed in to Twitter.');
    }

    const firstLoad = Object.keys(this.requestCache).length === 0;
    const cacheKey = this.getRequestCacheKey(startDateTimeMs, endDateTimeMs);
    if (this.requestCache.hasOwnProperty(cacheKey)) {
      return this.requestCache[cacheKey];
    }

    const result = this.fetchTweets(startDateTimeMs, endDateTimeMs).pipe(
      switchMap((items: SocialMediaItem[]) => {
        this.totalCommentFetchCount += items.length;
        return this.scoreItems(items);
      }),
      shareReplay(1),
      catchError(err => {
        delete this.requestCache[cacheKey];
        throw err;
      })
    );
    // Store the Observable in a cache so that we can reuse it if someone else
    // makes the same request.
    this.requestCache[cacheKey] = result;
    return result;
  }

  private fetchTweets(
    startDateTimeMs: number,
    endDateTimeMs: number
  ): Observable<Tweet[]> {
    return from(
      this.twitterApiService.getTweets({
        startDateTimeMs,
        // Subtract 1 minute from the end time because the Twitter API sometimes
        // returns an error if we request data for the most recent minute of
        // time.
        endDateTimeMs: endDateTimeMs - 60000,
      })
    ).pipe(map((response: GetTweetsResponse) => response.tweets));
  }

  private scoreItems(
    items: SocialMediaItem[]
  ): Observable<Array<ScoredItem<SocialMediaItem>>> {
    if (!items.length) {
      return of([]);
    }

    return forkJoin(items.map(item => this.scoreItem(item))).pipe(
      map((data: Array<ScoredItem<SocialMediaItem>>) => {
        data.forEach(item => {
          // Date objects created on the server are converted back to
          // string when sent over JSON.
          if (typeof item.item.date === 'string') {
            item.item.date = new Date(item.item.date);
          }
        });
        return data;
      })
    );
  }

  private scoreItem(
    item: SocialMediaItem
  ): Observable<ScoredItem<SocialMediaItem>> {
    return this.rateLimiter
      .limit(
        this.perspectiveApiService.checkText(stripOutEntitiesFromItemText(item))
      )
      .pipe(map(scores => ({ item, scores })));
  }
}
