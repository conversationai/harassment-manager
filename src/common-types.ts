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

import { SafeUrl } from '@angular/platform-browser';
import firebase from 'firebase/compat/app';
import { Credentials } from 'google-auth-library';
import { AttributeSummaryScores } from './perspectiveapi-types';

export interface SocialMediaItem {
  // Note: Matches id field name from TweetObject for easier casting between
  // SocialMediaItem and Tweet.
  id_str: string;
  text: string;
  date: Date;
  url?: string;
  authorId?: string;
  authorName?: string;
  authorScreenName?: string;
  authorUrl?: string;
  authorAvatarUrl?: string;
  hasImage?: boolean;
  verified?: boolean;
}

export interface ScoredItem<T> {
  item: T;
  scores: AttributeSummaryScores;
}

// Data structure representing a selectable state for a ScoredItem.
// This is useful in UI elements that can be sorted, since we want the selected
// attribute to be a part of the data item, not just the component.
export interface SelectableItem<T> extends ScoredItem<T> {
  selected: boolean;
  disabled?: boolean;
}

export interface CreateSpreadsheetRequest<T extends SocialMediaItem> {
  entries: Array<ScoredItem<T>>;
  credentials?: firebase.auth.OAuthCredential | Credentials;
  username: string;
  reportReasons: string[];
  context: string;
}

export interface CreateSpreadsheetResponse {
  spreadsheetUrl: string;
}

export interface CreatePdfRequest<T extends SocialMediaItem> {
  entries: Array<ScoredItem<T>>;
  username?: string;
  reportReasons: string[];
  context: string;
  // Format like 'Mon, November 16, 2020, 08:18 PM' is expected here.
  date?: string;
  platform?: string;
}

export interface CreatePdfResponse {
  title: string;
  safeUrl: SafeUrl;
  buffer?: ArrayBuffer;
}

export interface GetTweetsRequest {
  credentials?: firebase.auth.UserCredential;
  nextPageToken?: string;
  startDateTimeMs: number;
  endDateTimeMs: number;
}

export interface GetTweetsResponse {
  tweets: Tweet[];
  nextPageToken?: string;
}

export interface BlockTwitterUsersRequest {
  credential: firebase.auth.OAuthCredential;
  users: TwitterUser[];
}

export interface BlockTwitterUsersResponse {
  error?: string;
  failedScreennames?: string[]; // Twitter screen names
  numQuotaFailures?: number;
  numOtherFailures?: number;
}

export interface MuteTwitterUsersRequest {
  credential: firebase.auth.OAuthCredential;
  users: TwitterUser[];
}

export interface MuteTwitterUsersResponse {
  error?: string;
  failedScreennames?: string[]; // Twitter screen names
  numQuotaFailures?: number;
  numOtherFailures?: number;
}

export interface HideRepliesTwitterRequest {
  credential: firebase.auth.OAuthCredential;
  tweetIds: string[];
}

export interface HideRepliesTwitterResponse {
  error?: string;
  numQuotaFailures?: number;
  numOtherFailures?: number;
}

export interface TwitterApiResponse {
  next: string;
  results: TweetObject[];
}

// From twitter documentation: When ingesting Tweet data the main object is the
// Tweet Object, which is a parent object to several child objects. For
// example, all Tweets include a User object that describes who authored the
// Tweet. If the Tweet is geo-tagged, there will a "place" object included.
// Every Tweet includes an "entities" object that encapsulates arrays of
// hashtags, user mentions, URLs, cashtags, and native media. If the Tweet has
// any ‘attached’ or ‘native’ media (photos, video, animated GIF), there will
// be an "extended_entities" object. More at:
// https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/intro-to-tweet-json#tweetobject
// More fields were added based on observation of API results, but not all
// possible fields have been added here. We can add more as needed.
export interface TweetObject {
  created_at?: string;
  id_str: string;
  text: string;
  user?: TwitterUser;
  // From the documentation: This entities object does include a media
  // attribute, but its implementation in the entities section is only
  // completely accurate for Tweets with a single photo. For all Tweets
  // with more than one photo, a video, or animated GIF, the reader is
  // directed to the extended_entities section.
  entities?: TweetEntities;

  display_text_range?: number[];
  truncated?: boolean;
  extended_tweet?: ExtendedTweet;

  // Added based on observation of API results.
  extended_entities?: TweetEntities;
  favorite_count?: number;
  favorited?: boolean;
  in_reply_to_status_id?: string;
  lang?: string;
  reply_count?: number;
  retweet_count?: number;
  retweeted_status?: TweetObject;
  source?: string;
}

export interface V2TweetObject {
  attachments: V2Attachments;
  author_id: string;
  created_at: string;
  entities: V2Entities;
  id: string;
  lang: string;
  public_metrics: V2PublicMetrics;
  referenced_tweets: V2ReferencedTweet[];
  source: string;
  text: string;
}

interface V2PublicMetrics {
  like_count: number;
  quote_count: number;
  reply_count: number;
  retweet_count: number;
}

interface V2ReferencedTweet {
  id: string;
  type: string;
}

interface V2Entities {
  hashtags?: V2Hashtags[];
  mentions?: V2Mentions[];
  referenced_tweets?: V2ReferencedTweet[];
  urls?: V2Url[];
}

interface V2Mentions {
  start: number;
  end: number;
  username: string;
  id: string;
}

interface V2Hashtags {
  start: number;
  end: number;
  tag: string;
}

interface V2Url {
  display_url: string;
  extended_url: string;
  start: number;
  end: number;
}

export interface V2Includes {
  media?: V2Media[];
  users?: V2Users[];
}

interface V2Media {
  media_key: string;
  type: string;
  url: string;
}

interface V2Users {
  profile_image_url: string;
  name: string;
  username: string;
  verified: boolean;
  id: string;
}
interface V2Attachments {
  media_keys: string[];
}

// TODO: Maybe remove all unused fields?
export interface TwitterUser {
  id_str: string;
  screen_name: string;

  // Added based on observation of API results. Not all fields included.
  created_at?: string;
  description?: string;
  favorite_count?: number;
  followers_count?: number;
  friends_count?: number;
  id?: number;
  name?: string;
  profile_image_url?: string;
  statuses_count?: number;
  verified?: boolean;
}

export interface TweetEntities {
  hashtags?: TweetHashtag[];
  media?: TweetMedia[];
  symbols?: Symbols[];
  urls?: TweetUrl[];
  user_mentions?: TweetUserMention[];
}

export type Indices = [number, number];

interface Symbols {
  indices: Indices;
  text: string;
}

export interface TweetUserMention {
  id?: number;
  id_str?: string;
  indices: Indices;
  name?: string;
  screen_name: string;
}

export interface TweetMedia {
  id_str?: string;
  media_url: string;
  type: string;
  indices: Indices;
}

interface TweetMediaSizes {
  large: TweetMediaDimensions;
  medium: TweetMediaDimensions;
  small: TweetMediaDimensions;
  thumb: TweetMediaDimensions;
}

interface TweetMediaDimensions {
  h: number;
  w: number;
  resize: string;
}

export interface TweetUrl {
  display_url?: string;
  expanded_url?: string;
  indices: Indices;
  url: string;
}

export interface TweetHashtag {
  text: string;
  indices: Indices;
}

// For tweets above 140 characters.
interface ExtendedTweet {
  full_text: string;
  display_text_range: number[];
  entities: TweetEntities;
}

export type Tweet = TweetObject & SocialMediaItem;

export function isFirebaseCredential(
  credential: firebase.auth.OAuthCredential | Credentials
): credential is firebase.auth.OAuthCredential {
  // Check for a field present in firebase.auth.OAuthCredential that is not also
  // in Credentials.
  return (
    (credential as firebase.auth.OAuthCredential).signInMethod !== undefined
  );
}

export interface CsvFileTemplate {
  title: string;
  header: string[];
  bodyRows: string[][];
}

export enum Platform {
  TWITTER = 'twitter',
}

export enum BuildReportStep {
  NONE,
  ADD_COMMENTS,
  EDIT_DETAILS,
  TAKE_ACTION,
  COMPLETE,
}

export interface ClearReportRequest {
  documentId: string;
  idToken: string;
  platform: Platform;
}
