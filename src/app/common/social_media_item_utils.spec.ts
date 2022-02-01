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

import { ScoredItem, SocialMediaItem } from '../../common-types';
import { stripOutEntitiesFromItemText } from './social_media_item_utils';

describe('SocialMediaItemUtils', () => {
  it('Keeps text with no entities the same', () => {
    const tweet = {
      id_str: 'a',
      text:
        '@KingArthur @SirLancelot your mother was a hamster #rodent ' +
        'http://hamster-pic and $foo your father smelt of elderberries ' +
        '#smelly http://media-url',
      date: new Date(),
      retweet_count: 0,
    };
    expect(stripOutEntitiesFromItemText(tweet)).toEqual(tweet.text);
  });

  it('correctly strips out entities from tweet text', () => {
    const tweet = {
      id_str: 'a',
      text:
        '@KingArthur @SirLancelot your mother was a hamster #rodent ' +
        'http://hamster-pic and $foo your father smelt of elderberries ' +
        '#smelly http://media-url',
      date: new Date(),
      retweet_count: 0,
      entities: {
        hashtags: [
          { indices: [51, 58], text: 'rodent' },
          { indices: [121, 128], text: 'smelly' },
        ],
        symbols: [{ indices: [82, 86], text: 'foo' }],
        urls: [{ indices: [59, 77], url: 'http://hamster-pic' }],
        user_mentions: [
          { indices: [0, 11], screen_name: 'KingArthur' },
          { indices: [12, 24], screen_name: 'SirLancelot' },
        ],
        media: [
          { indices: [129, 145], media_url: 'http://media-url', type: 'image' },
        ],
      },
    };
    expect(stripOutEntitiesFromItemText(tweet)).toEqual(
      'your mother was a hamster   and  your father smelt of elderberries'
    );
  });

  it('correctly strips out extended entities from tweet text', () => {
    const tweet = {
      id_str: 'a',
      text:
        '@KingArthur @SirLancelot your mother was a hamster #rodent ' +
        'http://hamster-pic and $foo your father smelt of elderberries ' +
        '#smelly http://media-url',
      date: new Date(),
      retweet_count: 0,
      extended_entities: {
        hashtags: [
          { indices: [51, 58], text: 'rodent' },
          { indices: [121, 128], text: 'smelly' },
        ],
        symbols: [{ indices: [82, 86], text: 'foo' }],
        urls: [{ indices: [59, 77], url: 'http://hamster-pic' }],
        user_mentions: [
          { indices: [0, 11], screen_name: 'KingArthur' },
          { indices: [12, 24], screen_name: 'SirLancelot' },
        ],
        media: [
          { indices: [129, 145], media_url: 'http://media-url', type: 'image' },
        ],
      },
    };
    expect(stripOutEntitiesFromItemText(tweet)).toEqual(
      'your mother was a hamster   and  your father smelt of elderberries'
    );
  });
});
