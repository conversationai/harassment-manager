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

import { HttpStatusCode } from '@angular/common/http';
import axios, { AxiosBasicCredentials, AxiosError, AxiosInstance } from 'axios';
import addOAuthInterceptor from 'axios-oauth-1.0a';
import { Request, Response } from 'express';
import firebase from 'firebase/compat/app';
import * as fs from 'fs';
import {
  BlockTwitterUsersRequest,
  BlockTwitterUsersResponse,
  GetTweetsRequest,
  GetTweetsResponse,
  HideRepliesTwitterRequest,
  HideRepliesTwitterResponse,
  MuteTwitterUsersRequest,
  MuteTwitterUsersResponse,
  Tweet,
  TweetHashtag,
  TweetMedia,
  TweetObject,
  TweetUrl,
  TweetUserMention,
  TwitterApiResponse,
  TwitterUser,
  V2Includes,
  V2TweetObject,
} from '../../common-types';
import { TwitterApiCredentials } from '../serving';

// Max results per twitter call.
const BATCH_SIZE = 500;

interface TwitterApiRequest {
  query: string;
  maxResults?: number;
  fromDate?: string;
  toDate?: string;
  next?: string;
}

export async function getTweets(
  req: Request,
  res: Response,
  apiCredentials: TwitterApiCredentials
) {
  let twitterDataPromise: Promise<TwitterApiResponse>;

  // if (fs.existsSync('src/server/twitter_sample_results.json')) {
  //   twitterDataPromise = loadLocalTwitterData();
  // } else if (enterpriseSearchCredentialsAreValid(apiCredentials)) {
  //   twitterDataPromise = loadTwitterData(apiCredentials, req.body);
  // } else if (v2SearchCredentialsAreValid(apiCredentials)) {
  //   twitterDataPromise = loadTwitterDataV2(apiCredentials, req.body);
  // } else {
  //   res.send(new Error('Invalid Search API credentials'));
  //   return;
  // }

  // const enterpriseResults = (
  //   await loadTwitterData(apiCredentials, req.body)
  // ).results.map(parseTweet);
  // const v2Results = (
  //   await loadTwitterDataV2(apiCredentials, req.body)
  // ).results.map(parseTweet);

  // console.log(JSON.stringify(enterpriseResults));
  // console.log(JSON.stringify(v2Results));

  try {
    const twitterData = await loadTwitterData(apiCredentials, req.body);
    const tweets = twitterData.results.map(parseTweet);
    res.send({ tweets, nextPageToken: twitterData.next } as GetTweetsResponse);
  } catch (e) {
    console.error('Error loading Twitter data: ' + e);
    res.status(500).send('Error loading Twitter data');
  }
}

export async function blockTwitterUsers(
  req: Request,
  res: Response,
  credentials: TwitterApiCredentials
) {
  if (!standardApiCredentialsAreValid(credentials)) {
    res.send(new Error('Invalid Twitter Standard API credentials'));
    return;
  }

  const request = req.body as BlockTwitterUsersRequest;
  const response = await blockUsers(credentials, request);
  if (response.error) {
    // All block API requests failed. Send an error.
    res.status(500).send(response);
  } else {
    res.send(response);
  }
}

export async function muteTwitterUsers(
  req: Request,
  res: Response,
  credentials: TwitterApiCredentials
) {
  if (!standardApiCredentialsAreValid(credentials)) {
    res.send(new Error('Invalid Twitter Standard API credentials'));
    return;
  }

  const request = req.body as MuteTwitterUsersRequest;
  const response = await muteUsers(credentials, request);
  if (response.error) {
    // All mute API requests failed. Send an error.
    res.status(500).send(response);
  } else {
    res.send(response);
  }
}

export async function hideTwitterReplies(
  req: Request,
  res: Response,
  apiCredentials: TwitterApiCredentials
) {
  if (!standardApiCredentialsAreValid(apiCredentials)) {
    res.send(new Error('Invalid Twitter Standard API credentials'));
    return;
  }

  const request = req.body as HideRepliesTwitterRequest;
  const response = await hideReplies(apiCredentials, request);
  if (response.error) {
    // All hide reply API requests failed. Send an error.
    res.status(500).send(response);
  } else {
    res.send(response);
  }
}

async function blockUsers(
  credentials: TwitterApiCredentials,
  request: BlockTwitterUsersRequest
): Promise<BlockTwitterUsersResponse> {
  const client = createAxiosInstance(credentials, request.credential);
  const response: BlockTwitterUsersResponse = {};
  const id = getUserIdFromCredential(request.credential);
  if (!id) {
    response.error = 'Missing Twitter user ID in access token';
    return response;
  }
  let quotaExhaustedErrors = 0;
  let otherErrors = 0;
  const requests = request.users.map((user) =>
    client
      .post<BlockTwitterUsersResponse>(
        `https://api.twitter.com/2/users/${id}/blocking`,
        { target_user_id: user.id_str }
      )
      .catch((e: AxiosError) => {
        if (
          e.response?.status === HttpStatusCode.TooManyRequests ||
          e.response?.statusText.includes('Too Many Requests')
        ) {
          quotaExhaustedErrors += 1;
        } else {
          otherErrors += 1;
        }
        console.error(
          `Unable to block Twitter user @${user.screen_name} because ${e}`
        );
        response.failedScreennames = [
          ...(response.failedScreennames ?? []),
          user.screen_name,
        ];
      })
  );

  await Promise.all(requests);
  response.numQuotaFailures = quotaExhaustedErrors;
  response.numOtherFailures = otherErrors;
  if (otherErrors == request.users.length) {
    response.error = 'Unable to block Twitter users';
  }
  return response;
}

async function muteUsers(
  credentials: TwitterApiCredentials,
  request: MuteTwitterUsersRequest
): Promise<MuteTwitterUsersResponse> {
  const client = createAxiosInstance(credentials, request.credential);
  const response: MuteTwitterUsersResponse = {};
  const id = getUserIdFromCredential(request.credential);
  if (!id) {
    response.error = 'Missing Twitter user ID in access token';
    return response;
  }
  let quotaExhaustedErrors = 0;
  let otherErrors = 0;
  const requests = request.users.map((user) =>
    client
      .post<MuteTwitterUsersResponse>(
        `https://api.twitter.com/2/users/${id}/muting`,
        { target_user_id: user.id_str }
      )
      .catch((e: AxiosError) => {
        if (
          e.response?.status === HttpStatusCode.TooManyRequests ||
          e.response?.statusText.includes('Too Many Requests')
        ) {
          quotaExhaustedErrors += 1;
        } else {
          otherErrors += 1;
        }
        console.error(
          `Unable to mute Twitter user @${user.screen_name} because ${e}`
        );
        response.failedScreennames = [
          ...(response.failedScreennames ?? []),
          user.screen_name,
        ];
      })
  );

  await Promise.all(requests);
  response.numQuotaFailures = quotaExhaustedErrors;
  response.numOtherFailures = otherErrors;
  if (otherErrors == request.users.length) {
    response.error = 'Unable to mute Twitter users';
  }
  return response;
}

async function hideReplies(
  apiCredentials: TwitterApiCredentials,
  request: HideRepliesTwitterRequest
): Promise<HideRepliesTwitterResponse> {
  const client = createAxiosInstance(apiCredentials, request.credential);
  const response: HideRepliesTwitterResponse = {};
  let quotaExhaustedErrors = 0;
  let otherErrors = 0;
  const requests = request.tweetIds.map((id) =>
    client
      .put<HideRepliesTwitterResponse>(
        `https://api.twitter.com/2/tweets/${id}/hidden`,
        { hidden: true }
      )
      .catch((e: AxiosError) => {
        console.error(`Unable to hide tweet ID: ${id} because ${e}`);
        if (
          e.response?.status === HttpStatusCode.TooManyRequests ||
          e.response?.statusText.includes('Too Many Requests')
        ) {
          quotaExhaustedErrors += 1;
        } else {
          otherErrors += 1;
        }
      })
  );
  await Promise.all(requests);
  response.numQuotaFailures = quotaExhaustedErrors;
  response.numOtherFailures = otherErrors;
  if (otherErrors === request.tweetIds.length) {
    response.error = 'Unable to hide replies';
  }
  return response;
}

function loadTwitterData(
  credentials: TwitterApiCredentials,
  request: GetTweetsRequest
): Promise<TwitterApiResponse> {
  const requestUrl = `https://gnip-api.twitter.com/search/fullarchive/accounts/${credentials.accountName}/prod.json`;
  // These are the *user's* credentials for Twitter.
  const user = request.credentials?.additionalUserInfo?.username;
  if (!user) {
    throw new Error('No user credentials in GetTweetsRequest');
  }

  const twitterApiRequest: TwitterApiRequest = {
    query: `(@${user} OR url:twitter.com/${user}) -from:${user} -is:retweet`,
    maxResults: BATCH_SIZE,
  };

  if (request.startDateTimeMs) {
    twitterApiRequest.fromDate = formatTimestamp(request.startDateTimeMs);
  }
  if (request.endDateTimeMs) {
    twitterApiRequest.toDate = formatTimestamp(request.endDateTimeMs);
  }
  if (request.nextPageToken) {
    twitterApiRequest.next = request.nextPageToken;
  }

  const auth: AxiosBasicCredentials = {
    username: credentials!.username,
    password: credentials!.password,
  };

  return axios
    .post<TwitterApiResponse>(requestUrl, twitterApiRequest, { auth })
    .then((response) => response.data)
    .catch((error) => {
      const errorStr =
        `Error while fetching tweets with request ` +
        `${JSON.stringify(request)}: ${error}`;
      throw new Error(errorStr);
    });
}

function loadTwitterDataV2(
  credentials: TwitterApiCredentials,
  request: GetTweetsRequest
): Promise<TwitterApiResponse> {
  const requestUrl = 'https://api.twitter.com/2/tweets/search/all';
  const user = request.credentials?.additionalUserInfo?.username;
  if (!user) {
    throw new Error('No user credentials in GetTweetsRequest');
  }
  return axios
    .get<TwitterApiResponse>(requestUrl, {
      headers: {
        authorization: `Bearer ${credentials.bearerToken}`,
      },
      params: {
        query: `(@${user} OR url:twitter.com/${user}) -from:${user} -is:retweet`,
        max_results: BATCH_SIZE,
        'user.fields': 'id,name,username,profile_image_url,verified',
        expansions: 'author_id,attachments.media_keys,referenced_tweets.id',
        start_time: formatTimestampForV2(request.startDateTimeMs),
        end_time: formatTimestampForV2(request.endDateTimeMs),
        'media.fields': 'url,type',
        'tweet.fields':
          'attachments,created_at,id,entities,lang,public_metrics,source,text',
      },
      transformResponse: [
        (data, _) => {
          const response = JSON.parse(data);
          const tweets: V2TweetObject[] = response.data ?? [];
          const includes: V2Includes = response.includes ?? {};
          const toReturn = {
            results: tweets.map((tweet) => packV2Tweet(tweet, includes)),
            next: response.meta.next_token ?? '',
          };
          return toReturn;
        },
      ],
    })
    .then((response) => response.data);
}

// Packs a Tweet object response from the V2 Search PI into the Enterprise
// Search API response object format.
function packV2Tweet(tweet: V2TweetObject, includes: V2Includes): TweetObject {
  const entities = {
    hashtags: tweet.entities?.hashtags?.map(
      (hashtag) =>
        <TweetHashtag>{
          indices: [hashtag.start, hashtag.end],
          text: hashtag.tag,
        }
    ),
    // TODO: Handle this
    symbols: [],
    urls: tweet.entities?.urls?.map(
      (url) =>
        <TweetUrl>{
          display_url: url.display_url,
          expanded_url: url.extended_url,
          indices: [url.start, url.end],
        }
    ),
    user_mentions: tweet.entities.mentions?.map(
      (mention) =>
        <TweetUserMention>{
          id_str: mention.id,
          indices: [mention.start, mention.end],
          screen_name: mention.username,
        }
    ),
    media: tweet.attachments?.media_keys
      ?.flatMap((media_key) => {
        const media = includes.media?.find(
          (media) => media.media_key === media_key
        );
        if (!media) {
          throw new Error('Unable to find media');
        }
        return <TweetMedia>{
          indices: [0, 0], // Indices not available in V2.
          media_url: media.url ?? '',
          type: media.type,
        };
      })
      .filter((media) => media.type === 'photo'),
  };

  const tweetObject: TweetObject = {
    created_at: tweet.created_at,
    id_str: tweet.id,
    text: tweet.text,
    // The Enterprise API entities field is not always complete, but the v2
    // entities field is.
    entities: entities,
    extended_entities: entities,
    // No display_text_range, truncated, or extended_tweet fields because the
    // V2 API does not truncate the text.
    favorite_count: tweet.public_metrics.like_count,
    // favorited is not available in V2 API.
    in_reply_to_status_id: tweet.entities?.referenced_tweets?.find(
      (tweet) => tweet.type === 'replied_to'
    )?.id,
    lang: tweet.lang,
    reply_count: tweet.public_metrics.reply_count,
    retweet_count: tweet.public_metrics.retweet_count,
    source: tweet.source,
    truncated: tweet.text.length > 140,
    user: getUser(tweet.author_id, includes),
  };

  if (tweetObject.truncated) {
    // The Enteprise API populates the extended_tweet field if the tweet is
    // truncated.
    tweetObject.extended_tweet = {
      full_text: tweetObject.text,
      display_text_range: [0, 0], // Indices not available in v2.
      entities,
    };
  }

  return tweetObject;
}

function getUser(id: string, includes: V2Includes): TwitterUser {
  const user = includes.users?.find((user) => user.id === id);
  if (!user) {
    throw new Error('Unable to find user');
  }
  return {
    id_str: user?.id,
    profile_image_url: user?.profile_image_url,
    name: user?.name,
    screen_name: user?.username,
    verified: user?.verified,
  };
}

function loadLocalTwitterData(): Promise<TwitterApiResponse> {
  return fs.promises
    .readFile('src/server/twitter_sample_results.json')
    .then((data: Buffer) => {
      // Remove the `next` page token so the client doesn't infinitely issue
      // requests for a next page of data.
      const response = JSON.parse(data.toString()) as TwitterApiResponse;
      response.next = '';
      return response;
    });
}

function enterpriseSearchCredentialsAreValid(
  credentials: TwitterApiCredentials
): boolean {
  return (
    !!credentials.accountName &&
    !!credentials.username &&
    !!credentials.password
  );
}

function v2SearchCredentialsAreValid(
  credentials: TwitterApiCredentials
): boolean {
  return !!credentials.bearerToken;
}

function standardApiCredentialsAreValid(
  credentials: TwitterApiCredentials
): boolean {
  return !!credentials.appKey && !!credentials.appToken;
}

function createAxiosInstance(
  apiCredentials: TwitterApiCredentials,
  userCredential: firebase.auth.OAuthCredential
): AxiosInstance {
  const token = userCredential.accessToken;
  const tokenSecret = userCredential.secret;

  if (!token || !tokenSecret) {
    throw new Error('Twitter user access token and secret are missing');
  }

  const client = axios.create();

  // Add OAuth 1.0a credentials.
  addOAuthInterceptor(client, {
    algorithm: 'HMAC-SHA1',
    key: apiCredentials.appKey,
    includeBodyHash: false,
    secret: apiCredentials.appToken,
    token,
    tokenSecret,
  });

  return client;
}

function parseTweet(tweetObject: TweetObject): Tweet {
  // Still pass the rest of the metadata in case we want to use it
  // later, but surface the comment in a top-level field.
  //
  // Firestore doesn't support writing nested arrays, so we have to
  // manually build the Tweet object to avoid accidentally including the nested
  // arrays in the TweetObject from the Twitter API response.
  const tweet: Tweet = {
    created_at: tweetObject.created_at,
    date: new Date(),
    display_text_range: tweetObject.display_text_range,
    entities: tweetObject.entities,
    extended_entities: tweetObject.extended_entities,
    extended_tweet: tweetObject.extended_tweet,
    favorite_count: tweetObject.favorite_count,
    favorited: tweetObject.favorited,
    in_reply_to_status_id: tweetObject.in_reply_to_status_id,
    id_str: tweetObject.id_str,
    lang: tweetObject.lang,
    reply_count: tweetObject.reply_count,
    retweet_count: tweetObject.retweet_count,
    retweeted_status: tweetObject.retweeted_status,
    source: tweetObject.source,
    text: tweetObject.text,
    truncated: tweetObject.truncated,
    url: `https://twitter.com/i/web/status/${tweetObject.id_str}`,
    user: tweetObject.user,
  };
  if (tweetObject.truncated && tweetObject.extended_tweet) {
    tweet.text = tweetObject.extended_tweet.full_text;
  }
  if (tweetObject.created_at) {
    tweet.date = new Date(tweetObject.created_at);
  }
  if (tweetObject.user) {
    tweet.authorId = tweetObject.user.id_str;
    tweet.authorName = tweetObject.user.name;
    tweet.authorScreenName = tweetObject.user.screen_name;
    tweet.authorUrl = `https://twitter.com/${tweetObject.user.screen_name}`;
    tweet.authorAvatarUrl = tweetObject.user.profile_image_url;
    tweet.verified = tweetObject.user.verified;
  }
  if (tweetObject.extended_entities && tweetObject.extended_entities.media) {
    tweet.hasImage = true;
  }
  // console.log(tweet.text);
  // console.log(tweet.text.length);
  // console.log(tweet.truncated);
  return tweet;
}

function getUserIdFromCredential(credential: firebase.auth.OAuthCredential) {
  // The numeric part of the Twitter Access Token is the user ID.
  const match = credential.accessToken?.match('[0-9]+');
  return match && match.length ? match[0] : null;
}

// Format a millisecond-based timestamp into the yyyymmddhhmm date format
// suitable for the Enteprise Twitter API, as defined in:
// https://developer.twitter.com/en/docs/tweets/search/api-reference/enterprise-search
function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  const MM = date.getUTCMonth() + 1; // getMonth() is zero-based
  const dd = date.getUTCDate();
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();

  return (
    `${date.getFullYear()}` +
    `${(MM > 9 ? '' : '0') + MM}` +
    `${(dd > 9 ? '' : '0') + dd}` +
    `${(hh > 9 ? '' : '0') + hh}` +
    `${(mm > 9 ? '' : '0') + mm}`
  );
}

// Format a millisecond-based timestamp into the YYYY-MM-DDTHH:mm:ssZ date format
// suitable for the v2 Twitter API, as defined in:
// https://developer.twitter.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-all
function formatTimestampForV2(ms: number): string {
  const date = new Date(ms);
  // Remove milliseconds from the ISO string (e.g.
  // from 2022-10-12T23:09:43.430Z to 2022-10-12T23:09:43Z.
  return date.toISOString().substring(0, 19) + 'Z';
}
