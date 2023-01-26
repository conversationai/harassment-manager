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

import { ScoredItem, Tweet } from 'src/common-types';

// Mix of real and fake data for testing purposes.
export const TWITTER_ENTRIES: Array<ScoredItem<Tweet>> = [
  {
    item: {
      created_at: 'Mon Jan 24 20:43:25 +0000 2022',
      date: new Date(new Date('2022-01-24T20:43:25.000Z')),
      entities: {
        hashtags: [],
        symbols: [],
        urls: [
          {
            display_url: 'twitter.com/i/web/status/1…',
            expanded_url:
              'https://twitter.com/i/web/status/1485714881710022664',
            indices: [117, 140],
            url: 'https://t.co/8koaMgKmTI',
          },
        ],
        user_mentions: [],
      },
      extended_tweet: {
        entities: {
          hashtags: [
            {
              indices: [27, 39],
              text: 'fakehashtag1',
            },
          ],
          symbols: [],
          urls: [
            {
              display_url: 'jigsaw.google.com/the-current/sh…',
              expanded_url: 'https://jigsaw.google.com/the-current/shutdown/',
              indices: [256, 279],
              url: 'https://t.co/rr3jt112OS',
            },
          ],
          user_mentions: [],
        },
        full_text:
          "The Community Court of Justice for ECOWAS, of which Burkina Faso is a member, ruled that a 2017 internet shutdown in Togo violated its citizens' fundamental rights. Learn more about the impacts of internet shutdowns in the last issue of the Current. (3/3)\nhttps://t.co/rr3jt112OS",
      },
      favorite_count: 1,
      favorited: false,
      id_str: '1485714881710022664',
      lang: 'en',
      reply_count: 0,
      retweet_count: 0,
      source:
        '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
      text: "The Community Court of Justice for ECOWAS, of which Burkina Faso is a member, ruled that a 2017 internet shutdown in Togo violated its citizens' fundamental rights. Learn more about the impacts of internet shutdowns in the last issue of the Current. (3/3)\nhttps://t.co/rr3jt112OS",
      truncated: true,
      url: 'https://twitter.com/i/web/status/1485714881710022664',
      user: {
        created_at: 'Wed May 11 18:30:36 +0000 2011',
        description:
          'A unit at Google that explores threats to open societies and builds technology that inspires scalable solutions.\n\nRT≠endorsement',
        followers_count: 89518,
        id: 296979153,
        id_str: '296979153',
        name: 'Jigsaw',
        screen_name: 'Jigsaw',
        statuses_count: 2702,
        verified: true,
      },
      authorName: 'Jigsaw',
      authorScreenName: 'Jigsaw',
      authorUrl: 'https://twitter.com/Jigsaw',
      authorAvatarUrl:
        'http://pbs.twimg.com/profile_images/1224720616370135041/TZb_fdEo_normal.jpg',
      verified: true,
    },
    scores: {},
  },
  {
    item: {
      created_at: 'Mon Jan 24 20:43:25 +0000 2022',
      date: new Date('2022-01-24T20:43:25.000Z'),
      entities: {
        hashtags: [],
        symbols: [],
        urls: [
          {
            display_url: 'twitter.com/i/web/status/1…',
            expanded_url:
              'https://twitter.com/i/web/status/1485714880292397057',
            indices: [117, 140],
            url: 'https://t.co/qkTt1tORQA',
          },
        ],
        user_mentions: [],
      },
      extended_tweet: {
        entities: {
          hashtags: [
            {
              indices: [27, 39],
              text: 'fakehashtag1',
            },
            {
              indices: [27, 39],
              text: 'fakehashtag2',
            },
          ],
          symbols: [],
          urls: [],
          user_mentions: [],
        },
        full_text:
          'Internet shutdowns have become a go-to tactic in recent years to quell domestic protest, but their use raises grave human rights concerns - with knock-on effects across the economy, education and healthcare. (2/3)',
      },
      favorite_count: 2,
      favorited: false,
      id_str: '1485714880292397057',
      lang: 'en',
      reply_count: 1,
      retweet_count: 0,
      source:
        '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
      text: 'Internet shutdowns have become a go-to tactic in recent years to quell domestic protest, but their use raises grave human rights concerns - with knock-on effects across the economy, education and healthcare. (2/3)',
      truncated: true,
      url: 'https://twitter.com/i/web/status/1485714880292397057',
      user: {
        created_at: 'Wed May 11 18:30:36 +0000 2011',
        description:
          'A unit at Google that explores threats to open societies and builds technology that inspires scalable solutions.\n\nRT≠endorsement',
        followers_count: 89518,
        friends_count: 1065,
        id: 296979153,
        id_str: '296979153',
        name: 'Jigsaw',
        screen_name: 'Jigsaw',
        statuses_count: 2702,
        verified: true,
      },
      authorName: 'Jigsaw',
      authorScreenName: 'Jigsaw',
      authorUrl: 'https://twitter.com/Jigsaw',
      authorAvatarUrl:
        'http://pbs.twimg.com/profile_images/1224720616370135041/TZb_fdEo_normal.jpg',
      verified: true,
    },
    scores: {},
  },
  {
    item: {
      created_at: 'Mon Nov 08 14:47:56 +0000 2021',
      date: new Date('2021-11-08T14:47:56.000Z'),
      entities: {
        hashtags: [],
        symbols: [],
        urls: [
          {
            display_url: 'twitter.com/i/web/status/1…',
            expanded_url:
              'https://twitter.com/i/web/status/1457721555832741888',
            indices: [117, 140],
            url: 'https://t.co/9H4zPEGGgc',
          },
        ],
        user_mentions: [
          {
            id: 111074974,
            id_str: '111074974',
            indices: [0, 10],
            name: 'Morehouse College',
            screen_name: 'Morehouse',
          },
        ],
      },
      extended_tweet: {
        entities: {
          hashtags: [],
          symbols: [],
          urls: [
            {
              display_url: 'news.yahoo.com/morehouse-coll…',
              expanded_url:
                'https://news.yahoo.com/morehouse-college-google-partner-virtual-181911132.html',
              indices: [180, 203],
              url: 'https://t.co/hgDjZH0VuS',
            },
          ],
          user_mentions: [
            {
              id: 111074974,
              id_str: '111074974',
              indices: [0, 10],
              name: 'Morehouse College',
              screen_name: 'Morehouse',
            },
          ],
        },
        full_text:
          '@Morehouse College’s National Training Institute on Race and Equity, along with the school’s Culturally Relevant Computer Lab recently spoke about Trainer. Check out the coverage.\nhttps://t.co/hgDjZH0VuS',
      },
      favorite_count: 0,
      favorited: false,
      id_str: '1457721555832741888',
      lang: 'en',
      reply_count: 0,
      retweet_count: 0,
      source:
        '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
      text: '@Morehouse College’s National Training Institute on Race and Equity, along with the school’s Culturally Relevant Computer Lab recently spoke about Trainer. Check out the coverage.\nhttps://t.co/hgDjZH0VuS',
      truncated: true,
      url: 'https://twitter.com/i/web/status/1457721555832741888',
      user: {
        created_at: 'Wed May 11 18:30:36 +0000 2011',
        description:
          'A unit at Google that explores threats to open societies and builds technology that inspires scalable solutions.\n\nRT≠endorsement',
        followers_count: 89518,
        friends_count: 1065,
        id: 296979153,
        id_str: '296979153',
        name: 'Jigsaw',
        screen_name: 'Jigsaw',
        statuses_count: 2702,
        verified: true,
      },
      authorName: 'Jigsaw',
      authorScreenName: 'Jigsaw',
      authorUrl: 'https://twitter.com/Jigsaw',
      authorAvatarUrl:
        'http://pbs.twimg.com/profile_images/1224720616370135041/TZb_fdEo_normal.jpg',
      verified: true,
    },
    scores: {
      TOXICITY: 0.08997067,
      SEVERE_TOXICITY: 0.0441159,
      INSULT: 0.08199655,
      PROFANITY: 0.045761928,
      THREAT: 0.10894311,
      IDENTITY_ATTACK: 0.10441957,
    },
  },
  {
    item: {
      created_at: 'Thu Oct 28 14:37:12 +0000 2021',
      date: new Date('2021-10-28T14:37:12.000Z'),
      entities: {
        hashtags: [],
        symbols: [],
        urls: [
          {
            display_url: 'twitter.com/i/web/status/1…',
            expanded_url:
              'https://twitter.com/i/web/status/1453732586509901832',
            indices: [116, 139],
            url: 'https://t.co/MhArwy74Pl',
          },
        ],
        user_mentions: [],
      },
      extended_tweet: {
        entities: {
          hashtags: [],
          symbols: [],
          urls: [
            {
              display_url: 'jigsaw.google.com/the-current/sh…',
              expanded_url: 'https://jigsaw.google.com/the-current/shutdown/',
              indices: [251, 274],
              url: 'https://t.co/rr3jt0Jrqi',
            },
          ],
          user_mentions: [],
        },
        full_text:
          'Over the last decade, the number of internet shutdowns globally has exploded from just a handful to hundreds every year. Learn more about the threat of internet shutdowns and how citizens can mitigate their impacts in the latest issue of the Current.\nhttps://t.co/rr3jt0Jrqi',
      },
      favorite_count: 4,
      favorited: false,
      id_str: '1453732586509901832',
      lang: 'en',
      reply_count: 0,
      retweet_count: 5,
      source: '<a href="https://www.sprinklr.com" rel="nofollow">Sprinklr</a>',
      text: 'Over the last decade, the number of internet shutdowns globally has exploded from just a handful to hundreds every year. Learn more about the threat of internet shutdowns and how citizens can mitigate their impacts in the latest issue of the Current.\nhttps://t.co/rr3jt0Jrqi',
      truncated: true,
      url: 'https://twitter.com/i/web/status/1453732586509901832',
      user: {
        created_at: 'Wed May 11 18:30:36 +0000 2011',
        description:
          'A unit at Google that explores threats to open societies and builds technology that inspires scalable solutions.\n\nRT≠endorsement',
        followers_count: 89518,
        friends_count: 1065,
        id: 296979153,
        id_str: '296979153',
        name: 'Jigsaw',
        screen_name: 'Jigsaw',
        statuses_count: 2702,
        verified: true,
      },
      authorName: 'Jigsaw',
      authorScreenName: 'Jigsaw',
      authorUrl: 'https://twitter.com/Jigsaw',
      authorAvatarUrl:
        'http://pbs.twimg.com/profile_images/1224720616370135041/TZb_fdEo_normal.jpg',
      verified: true,
    },
    scores: {
      TOXICITY: 0.05631642,
      SEVERE_TOXICITY: 0.020877242,
      INSULT: 0.035202846,
      PROFANITY: 0.016683849,
      THREAT: 0.07141919,
      IDENTITY_ATTACK: 0.033515174,
    },
  },
];
