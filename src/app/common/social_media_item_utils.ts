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
  Indices,
  SocialMediaItem,
  Tweet,
  TweetEntities,
} from '../../common-types';

/**
 * Strips out entities (@ mentions, hashtags, urls, etc) from the text of a
 * SocialMediaItem (currently this only works for Tweets) and returns the text
 * without these elements. The reason for stripping out entities is that they
 * can confuse language detection and Perspective API models.
 */
export function stripOutEntitiesFromItemText(item: SocialMediaItem): string {
  const tweet = item as Tweet;
  if (!tweet.entities && !tweet.extended_entities) {
    // If the tweet has no entities, then there's nothing to strip out.
    return item.text;
  }
  let entities: TweetEntities;
  if (tweet.extended_entities) {
    entities = tweet.extended_entities;
  } else {
    // Check above ensures this is not undefined.
    entities = tweet.entities!;
  }

  const indicesToStripOut: Indices[] = [];
  // Some of these elements have text fields (like hashtags) that don't
  // contain the symbol which we could be using. Alternatively we could replace
  // the hashtag field with the text from the entity instead of stripping it
  // out.
  if (entities.hashtags) {
    for (const hashtag of entities.hashtags) {
      indicesToStripOut.push(hashtag.indices);
    }
  }
  if (entities.urls) {
    for (const url of entities.urls) {
      indicesToStripOut.push(url.indices);
    }
  }
  if (entities.user_mentions) {
    for (const mention of entities.user_mentions) {
      indicesToStripOut.push(mention.indices);
    }
  }
  if (entities.media) {
    for (const media of entities.media) {
      indicesToStripOut.push(media.indices);
    }
  }
  if (entities.symbols) {
    for (const symbol of entities.symbols) {
      indicesToStripOut.push(symbol.indices);
    }
  }

  // Sort so that the indices closer to the end come first.
  indicesToStripOut.sort(sortIndicesDescending);

  // Strip out entities starting at the end of the string.
  let text = tweet.text;
  for (const indices of indicesToStripOut) {
    text = text.slice(0, indices[0]) + text.slice(indices[1], text.length);
  }

  // Trim whitespace at beginning and end. Note that there may be extra
  // whitespace in the middle of the string.
  return text.trim();
}

function sortIndicesDescending(a: Indices, b: Indices) {
  if (a[0] === b[0]) {
    return 0;
  }
  return a[0] < b[0] ? 1 : -1;
}

// Returns a number to represent the influence 'score' for the comment; this
// will be used for determining if the comment is 'Popular' on the card, and
// for popularity sorting.
export function getInfluenceScore(item: SocialMediaItem): number {
  const tweet = item as Tweet;
  return (
    toNumberOrZero(tweet.retweet_count) +
    toNumberOrZero(tweet.favorite_count) +
    toNumberOrZero(tweet.reply_count)
  );
}

function toNumberOrZero(input: string | number | null | undefined): number {
  return Number(input) || 0;
}
