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

import { ScoredItem, SocialMediaItem } from '../common-types';
import { Attributes } from '../perspectiveapi-types';
import { RegexFilter } from './regular-expression-filter/regular-expression-filter.component';

export interface DateFilter {
  startDateTimeMs: number;
  endDateTimeMs: number;
}

export interface CommentFilters {
  toxicityRangeFilters?: ToxicityRangeFilter[];
  regexFilters?: RegexFilter[];
  dateFilter?: DateFilter;
  imageFilter?: boolean;
  verifiedFilter?: boolean;
}

export interface ToxicityRangeFilter {
  minScore: number;
  maxScore: number;
  includeUnscored: boolean;
}

/**
 * Applies the regex, date, and threshold filters to the specified comments, and
 * returns the subset of comments that match the filters.
 */
export function applyCommentFilters<T extends ScoredItem<SocialMediaItem>>(
  comments: T[],
  filters: CommentFilters
): T[] {
  return comments.filter(comment => {
    const meetsToxicityRangeFilter = filters.toxicityRangeFilters
      ? itemMeetsToxicityRangeFilters(comment, filters.toxicityRangeFilters)
      : true;
    const meetsRegexFilters = filters.regexFilters
      ? itemMeetsRegexFilters(comment, filters.regexFilters)
      : true;
    const meetsDateFilter = filters.dateFilter
      ? itemMeetsDateFilters(comment, filters.dateFilter)
      : true;
    const meetsImageFilter = filters.imageFilter ? itemHasImage(comment) : true;
    const meetsVerifiedFilter = filters.verifiedFilter
      ? itemIsVerified(comment)
      : true;
    return (
      meetsToxicityRangeFilter &&
      meetsRegexFilters &&
      meetsDateFilter &&
      meetsImageFilter &&
      meetsVerifiedFilter
    );
  });
}

/** Returns true if any of the threshold filters apply to the tweet. */
export function itemMeetsToxicityRangeFilters(
  tweet: ScoredItem<SocialMediaItem>,
  toxicityRangeFilters: ToxicityRangeFilter[]
): boolean {
  const toxicityScore = tweet.scores[Attributes.TOXICITY];
  // To include unscored comments, at least one ToxicityRangeFilter
  // must have includeUnscored set to true.
  if (!toxicityScore) {
    return toxicityRangeFilters.some(filter => filter.includeUnscored);
  }
  for (const filter of toxicityRangeFilters) {
    const exceedsMin = toxicityScore >= filter.minScore;
    // Include comments with scores of 1 when the maxScore is equal to 1 because
    // neither maxScore nor comment scores can exceed 1.
    const belowMax =
      filter.maxScore === 1
        ? toxicityScore <= filter.maxScore
        : toxicityScore < filter.maxScore;
    if (exceedsMin && belowMax) {
      return true;
    }
  }
  return false;
}

/** Returns true if all regex filters apply to the tweet. */
export function itemMeetsRegexFilters(
  tweet: ScoredItem<SocialMediaItem>,
  regexFilters: RegexFilter[]
): boolean {
  if (regexFilters.length === 0) {
    return true;
  }
  for (const regexFilter of regexFilters) {
    const hasRegex = itemHasRegex(tweet, regexFilter.regex);
    if (
      (hasRegex && !regexFilter.include) ||
      (!hasRegex && regexFilter.include)
    ) {
      return false;
    }
  }
  return true;
}

/** Returns true if date filters apply to the tweet. */
export function itemMeetsDateFilters(
  item: ScoredItem<SocialMediaItem>,
  dateFilter: DateFilter
): boolean {
  // Date objects seem to get converted to String when being sent over the
  // server? Needs more investigation...
  if (typeof item.item.date === 'string') {
    item.item.date = new Date(item.item.date);
  }

  const tweetTimeMs = item.item.date.getTime();
  return (
    tweetTimeMs >= dateFilter.startDateTimeMs &&
    tweetTimeMs <= dateFilter.endDateTimeMs
  );
}
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
// We are using the assumption that "since yesterday" means since the beginning
// of yesterday (midnight yesterday), but this could be interpreted 
// differently. We're also interpreting weeks and months relative to today, 
// but these could also be determined based on where we are in the month.
// Added an optional filterType parameter to allow for the option of using the current time as the start time instead of midnight.
export function buildDateFilterForNDays(now: Date, days: number,fromNow: boolean = false): DateFilter {

  const fromTime = fromNow ? now.getTime() : new Date(now).setHours(0, 0, 0, 0);

  return {
    startDateTimeMs: fromTime - days * MILLISECONDS_PER_DAY,
    endDateTimeMs: now.getTime(),
  };
}

// Returns whether the tweet contains the specified regex, either in the
// tweet text, the author's name, or the author's screen name.
function itemHasRegex(
  item: ScoredItem<SocialMediaItem>,
  regex: string
): boolean {
  // Makes the regex match case-insensitive.
  const caseInsensitiveRegex = new RegExp(regex, 'i');
  return (
    item.item.text.match(caseInsensitiveRegex) !== null ||
    (!!item.item.authorName &&
      item.item.authorName.match(caseInsensitiveRegex) !== null) ||
    (!!item.item.authorScreenName &&
      item.item.authorScreenName.match(caseInsensitiveRegex) !== null)
  );
}

/** Returns true if the comment contains an image. */
export function itemHasImage(comment: ScoredItem<SocialMediaItem>): boolean {
  return !!comment.item.hasImage;
}

/** Returns true if the comment is verified. */
export function itemIsVerified(comment: ScoredItem<SocialMediaItem>): boolean {
  return !!comment.item.verified;
}
