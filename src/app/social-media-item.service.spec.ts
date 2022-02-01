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

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, ReplaySubject, throwError } from 'rxjs';
import { AttributeSummaryScores } from '../perspectiveapi-types';
import { OauthApiService } from './oauth_api.service';
import { PerspectiveApiService } from './perspectiveapi.service';
import {
  RequestCache,
  SocialMediaItemService,
} from './social-media-item.service';
import { TwitterApiService } from './twitter_api.service';

const TWEETS = [
  {
    id_str: 'a',
    text: 'She turned me into a newt!',
    date: new Date(),
  },
  {
    id_str: 'b',
    text:
      'Strange women lying in ponds distributing swords is no basis for a system of government.',
    date: new Date(),
  },
];

describe('SocialMediaItemService', () => {
  let service: SocialMediaItemService;
  let mockTwitterApiService: jasmine.SpyObj<TwitterApiService>;
  let mockPerspectiveApiService: jasmine.SpyObj<PerspectiveApiService>;

  const onSocialMediaItemLoadedMock = new BehaviorSubject<number>(0);
  const twitterSignInTestSubject = new ReplaySubject<boolean>(1);
  const mockOauthApiService = {
    twitterSignInChange: twitterSignInTestSubject.asObservable(),
  };
  const mockSocialMediaItemsService = {
    onSocialMediaItemLoadedSource: onSocialMediaItemLoadedMock.asObservable(),
  };

  beforeEach(() => {
    const onTweetsLoaded = new ReplaySubject<number>();
    mockTwitterApiService = jasmine.createSpyObj<TwitterApiService>(
      'twitterApiService',
      ['getTweets'],
      {
        onTweetsLoaded: onTweetsLoaded.asObservable(),
      }
    );
    mockTwitterApiService.getTweets.and.returnValue(
      Promise.resolve({ tweets: TWEETS })
    );
    mockPerspectiveApiService = jasmine.createSpyObj<PerspectiveApiService>(
      'perspectiveApiService',
      ['checkText']
    );
    const mockPerspectiveScores: AttributeSummaryScores = { TOXICITY: 0.5 };
    mockPerspectiveApiService.checkText.and.returnValue(
      of(mockPerspectiveScores)
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: OauthApiService,
          useValue: mockOauthApiService,
        },
        {
          provide: PerspectiveApiService,
          useValue: mockPerspectiveApiService,
        },
        {
          provide: TwitterApiService,
          useValue: mockTwitterApiService,
        },
      ],
    });
    service = TestBed.inject(SocialMediaItemService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store in-flight requests in cache', async () => {
    mockTwitterApiService.getTweets.and.returnValue(
      Promise.resolve({ tweets: TWEETS })
    );

    twitterSignInTestSubject.next(true);
    expect(mockTwitterApiService.getTweets).toHaveBeenCalledTimes(0);
    expect(mockPerspectiveApiService.checkText).toHaveBeenCalledTimes(0);

    const endDateTimeMs = Date.now() - 100;
    const startDateTimeMs = endDateTimeMs - 10000;

    const firstRequest = service.fetchItems(startDateTimeMs, endDateTimeMs);
    const secondRequest = service.fetchItems(startDateTimeMs, endDateTimeMs);
    const thirdRequest = service.fetchItems(
      startDateTimeMs + 10,
      endDateTimeMs
    );

    expect(secondRequest).toEqual(firstRequest);
    expect(thirdRequest).not.toEqual(firstRequest);
    const expectedRequestCache: RequestCache = {};
    expectedRequestCache[`${startDateTimeMs}_${endDateTimeMs}`] = firstRequest;
    expectedRequestCache[
      `${startDateTimeMs + 10}_${endDateTimeMs}`
    ] = thirdRequest;
    expect(service.getRequestCache()).toEqual(expectedRequestCache);
    expect(mockTwitterApiService.getTweets).toHaveBeenCalledTimes(2);

    await firstRequest.toPromise();
    await secondRequest.toPromise();
    await thirdRequest.toPromise();

    expect(mockTwitterApiService.getTweets).toHaveBeenCalledTimes(2);
    expect(mockPerspectiveApiService.checkText).toHaveBeenCalledTimes(4);
  });

  it('should not store comments in cache on an error fetching comments', async () => {
    twitterSignInTestSubject.next(true);
    mockTwitterApiService.getTweets.and.returnValue(Promise.reject('Oh no!'));

    const endDateTimeMs = Date.now() - 100;
    const startDateTimeMs = endDateTimeMs - 10000;

    expect(mockTwitterApiService.getTweets).toHaveBeenCalledTimes(0);
    expect(mockPerspectiveApiService.checkText).toHaveBeenCalledTimes(0);

    await expectAsync(
      service.fetchItems(startDateTimeMs, endDateTimeMs).toPromise()
    ).toBeRejected('Oh no!');
    expect(service.getRequestCache()).toEqual({});
    expect(mockTwitterApiService.getTweets).toHaveBeenCalledTimes(1);
    expect(mockPerspectiveApiService.checkText).toHaveBeenCalledTimes(0);
  });

  it('should not store comments in cache on an error scoring comments', async () => {
    twitterSignInTestSubject.next(true);
    mockPerspectiveApiService.checkText.and.returnValue(
      throwError(new Error('Oh no!'))
    );

    const endDateTimeMs = Date.now() - 100;
    const startDateTimeMs = endDateTimeMs - 10000;

    expect(mockTwitterApiService.getTweets).toHaveBeenCalledTimes(0);
    expect(mockPerspectiveApiService.checkText).toHaveBeenCalledTimes(0);

    await expectAsync(
      service.fetchItems(startDateTimeMs, endDateTimeMs).toPromise()
    ).toBeRejectedWithError('Oh no!');
    expect(service.getRequestCache()).toEqual({});
    expect(mockTwitterApiService.getTweets).toHaveBeenCalledTimes(1);
    expect(mockPerspectiveApiService.checkText).toHaveBeenCalledTimes(2);
  });

  it('should clear cache on twitter logout', async () => {
    twitterSignInTestSubject.next(true);

    const endDateTimeMs = Date.now() - 100;
    const startDateTimeMs = endDateTimeMs - 10000;
    const request = service.fetchItems(startDateTimeMs, endDateTimeMs);
    await request.toPromise();

    const scoredComments = [
      {
        item: TWEETS[0],
        scores: { TOXICITY: 0.5 },
      },
      {
        item: TWEETS[1],
        scores: { TOXICITY: 0.5 },
      },
    ];
    const expectedRequestCache: RequestCache = {};
    expectedRequestCache[`${startDateTimeMs}_${endDateTimeMs}`] = request;
    expect(service.getRequestCache()).toEqual(expectedRequestCache);

    twitterSignInTestSubject.next(false);

    expect(service.getRequestCache()).toEqual({});
  });
});
