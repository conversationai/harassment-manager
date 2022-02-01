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
import {
  applyCommentFilters,
  itemHasImage,
  itemIsVerified,
  itemMeetsDateFilters,
  itemMeetsRegexFilters,
  itemMeetsToxicityRangeFilters,
} from './filter_utils';

describe('FilterUtils', () => {
  it('gives correct output of applyCommentFilters', () => {
    const regexFilters = [
      {
        regex: 'your',
        include: true,
      },
    ];
    const currentTimeMs = Date.now();
    const dateFilter = {
      startDateTimeMs: currentTimeMs - 1000,
      endDateTimeMs: currentTimeMs,
    };
    const toxicityRangeFilters = [
      {
        minScore: 0.8,
        maxScore: 1,
        includeUnscored: false,
      },
    ];
    const comments: Array<ScoredItem<SocialMediaItem>> = [
      // Meets all filters.
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(currentTimeMs - 1000),
          hasImage: true,
          verified: true,
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      // Only meets the regex filter.
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(currentTimeMs - 10000),
        },
        scores: {
          TOXICITY: 0.7,
        },
      },
      // Only meets the threshold filter.
      {
        item: {
          id_str: 'c',
          text: 'Now go away or I will taunt you a second time!',
          date: new Date(currentTimeMs - 10000),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      // Only meets the date filter.
      {
        item: {
          id_str: 'd',
          text:
            'Supreme executive power derives from a mandate from the masses.',
          date: new Date(currentTimeMs - 20),
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      // Meets threshold and regex filters.
      {
        item: {
          id_str: 'e',
          text: 'What is your quest??',
          date: new Date(currentTimeMs - 1001),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      // Meets regex and date filters.
      {
        item: {
          id_str: 'f',
          text: 'What is your favorite color?',
          date: new Date(currentTimeMs - 1000),
        },
        scores: {
          TOXICITY: 0.3,
        },
      },
      // Meets threshold and date filters.
      {
        item: {
          id_str: 'g',
          text: 'She turned me into a newt!',
          date: new Date(currentTimeMs - 1000),
        },
        scores: {
          TOXICITY: 0.8,
        },
      },
      // Only meets the image filter.
      {
        item: {
          id_str: 'h',
          text: 'What is the airspeed velocity of an unladen swallow?',
          date: new Date(currentTimeMs - 1001),
          hasImage: true,
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
      // Only meets the verified filter.
      {
        item: {
          id_str: 'i',
          text: 'I thought we were an autonomous collective.',
          date: new Date(currentTimeMs - 1001),
          verified: true,
        },
        scores: {
          TOXICITY: 0.1,
        },
      },
    ];

    expect(
      applyCommentFilters(comments, {
        toxicityRangeFilters,
        regexFilters,
        dateFilter,
      })
    ).toEqual([comments[0]]);
    expect(
      applyCommentFilters(comments, { regexFilters, dateFilter })
    ).toEqual([comments[0], comments[5]]);
    expect(
      applyCommentFilters(comments, { toxicityRangeFilters, dateFilter })
    ).toEqual([comments[0], comments[6]]);
    expect(
      applyCommentFilters(comments, { toxicityRangeFilters, regexFilters })
    ).toEqual([comments[0], comments[4]]);
    expect(applyCommentFilters(comments, { toxicityRangeFilters })).toEqual([
      comments[0],
      comments[2],
      comments[4],
      comments[6],
    ]);
    expect(applyCommentFilters(comments, { regexFilters })).toEqual([
      comments[0],
      comments[1],
      comments[4],
      comments[5],
    ]);
    expect(applyCommentFilters(comments, { dateFilter })).toEqual([
      comments[0],
      comments[3],
      comments[5],
      comments[6],
    ]);
    expect(applyCommentFilters(comments, { imageFilter: true })).toEqual([
      comments[0],
      comments[7],
    ]);
    expect(applyCommentFilters(comments, { verifiedFilter: true })).toEqual([
      comments[0],
      comments[8],
    ]);
  });

  it(
    'produces correct output of itemMeetsToxicityRangeFilters: single filter ' +
      'min and max',
    () => {
      const filter = {
        minScore: 0.5,
        maxScore: 0.8,
        includeUnscored: false,
      };
      const text = 'hello world';
      const date = new Date();
      const idStr = 'a';
      expect(
        itemMeetsToxicityRangeFilters(
          { scores: { TOXICITY: 0.1 }, item: { id_str: idStr, text, date } },
          [filter]
        )
      ).toBe(false);
      expect(
        itemMeetsToxicityRangeFilters(
          { scores: { TOXICITY: 0.5 }, item: { id_str: idStr, text, date } },
          [filter]
        )
      ).toBe(true);
      expect(
        itemMeetsToxicityRangeFilters(
          { scores: { TOXICITY: 0.799 }, item: { id_str: idStr, text, date } },
          [filter]
        )
      ).toBe(true);
      expect(
        itemMeetsToxicityRangeFilters(
          { scores: { TOXICITY: 0.8 }, item: { id_str: idStr, text, date } },
          [filter]
        )
      ).toBe(false);

      // Checks that scores of 1 are included for maxScore = 1.
      const filter2 = {
        minScore: 0.5,
        maxScore: 1,
        includeUnscored: false,
      };
      expect(
        itemMeetsToxicityRangeFilters(
          { scores: { TOXICITY: 1 }, item: { id_str: idStr, text, date } },
          [filter2]
        )
      ).toBe(true);
    }
  );

  it('produces correct output of itemMeetsToxicityRangeFilters: multiple filters', () => {
    const filter1 = {
      minScore: 0.2,
      maxScore: 0.4,
      includeUnscored: false,
    };

    const filter2 = {
      minScore: 0.8,
      maxScore: 1,
      includeUnscored: false,
    };

    const filter3 = {
      minScore: 0.7,
      maxScore: 0.9,
      includeUnscored: false,
    };

    const text = 'hello world';
    const date = new Date();
    const idStr = 'a';
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { TOXICITY: 0.19 }, item: { id_str: idStr, text, date } },
        [filter1, filter2, filter3]
      )
    ).toBe(false);
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { TOXICITY: 0.3 }, item: { id_str: idStr, text, date } },
        [filter1, filter2, filter3]
      )
    ).toBe(true);
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { TOXICITY: 0.4 }, item: { id_str: idStr, text, date } },
        [filter1, filter2, filter3]
      )
    ).toBe(false);
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { TOXICITY: 0.5 }, item: { id_str: idStr, text, date } },
        [filter1, filter2, filter3]
      )
    ).toBe(false);
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { TOXICITY: 0.7 }, item: { id_str: idStr, text, date } },
        [filter1, filter2, filter3]
      )
    ).toBe(true);
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { TOXICITY: 0.8 }, item: { id_str: idStr, text, date } },
        [filter1, filter2, filter3]
      )
    ).toBe(true);
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { TOXICITY: 0.9 }, item: { id_str: idStr, text, date } },
        [filter1, filter2, filter3]
      )
    ).toBe(true);
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { TOXICITY: 1 }, item: { id_str: idStr, text, date } },
        [filter1, filter2, filter3]
      )
    ).toBe(true);
  });

  it('produces correct output of itemMeetsToxicityRangeFilter: missing TOXICITY score', () => {
    const filter1 = {
      minScore: 0.5,
      maxScore: 1,
      includeUnscored: false,
    };
    const filter2 = {
      minScore: 0.5,
      maxScore: 1,
      includeUnscored: true,
    };
    const text = 'hello world';
    const date = new Date();
    const idStr = 'a';
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { INSULT: 0.5 }, item: { id_str: idStr, text, date } },
        [filter1]
      )
    ).toBe(false);
    expect(
      itemMeetsToxicityRangeFilters(
        { scores: { INSULT: 0.5 }, item: { id_str: idStr, text, date } },
        [filter1, filter2]
      )
    ).toBe(true);
  });

  it('produces correct output of itemHasImage', () => {
    const itemWithImage = {
      scores: { TOXICITY: 0.2 },
      item: { id_str: 'a', text: 'foo', date: new Date(), hasImage: true },
    };
    const itemWithoutImage = {
      scores: { TOXICITY: 0.2 },
      item: { id_str: 'a', text: 'foo', date: new Date() },
    };

    expect(itemHasImage(itemWithImage)).toBe(true);
    expect(itemHasImage(itemWithoutImage)).toBe(false);
  });

  it('produces correct output of itemIsVerified', () => {
    const verifiedItem = {
      scores: { TOXICITY: 0.2 },
      item: { id_str: 'a', text: 'foo', date: new Date(), verified: true },
    };
    const unverifiedItem = {
      scores: { TOXICITY: 0.2 },
      item: { id_str: 'a', text: 'foo', date: new Date() },
    };

    expect(itemIsVerified(verifiedItem)).toBe(true);
    expect(itemIsVerified(unverifiedItem)).toBe(false);
  });

  it('produces correct output of itemMeetsRegexFilters: single filter include', () => {
    const filters = [
      {
        regex: 'hello',
        include: true,
      },
    ];
    const scores = { TOXICITY: 0.1 };
    const date = new Date();
    const idStr = 'a';
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'hello world', date } },
        filters
      )
    ).toBe(true);
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'HELLO WORLD', date } },
        filters
      )
    ).toBe(true);
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'goodbye', date } },
        filters
      )
    ).toBe(false);
  });

  it('produces correct output of itemMeetsRegexFilters: single filter exclude', () => {
    const filters = [
      {
        regex: 'hello',
        include: false,
      },
    ];
    const scores = { TOXICITY: 0.1 };
    const date = new Date();
    const idStr = 'a';
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'hello world', date } },
        filters
      )
    ).toBe(false);
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'goodbye', date } },
        filters
      )
    ).toBe(true);
  });

  it('produces correct output of itemMeetsRegexFilters: author name and screen name', () => {
    const filters = [
      {
        regex: 'hello',
        include: true,
      },
    ];
    const scores = { TOXICITY: 0.1 };
    const date = new Date();
    const idStr = 'a';
    expect(
      itemMeetsRegexFilters(
        {
          scores,
          item: {
            id_str: idStr,
            text: 'text',
            authorName: 'hello123',
            authorScreenName: 'screen name',
            date,
          },
        },
        filters
      )
    ).toBe(true);
    expect(
      itemMeetsRegexFilters(
        {
          scores,
          item: {
            id_str: idStr,
            text: 'text',
            authorName: 'name',
            authorScreenName: '@hElLo',
            date,
          },
        },
        filters
      )
    ).toBe(true);
    expect(
      itemMeetsRegexFilters(
        {
          scores,
          item: {
            id_str: idStr,
            text: 'text',
            authorName: 'name',
            authorScreenName: 'screen name',
            date,
          },
        },
        filters
      )
    ).toBe(false);
  });

  it('produces correct output of itemMeetsRegexFilters: multiple filters include', () => {
    const filters = [
      {
        regex: 'hello',
        include: true,
      },
      {
        regex: 'world',
        include: true,
      },
    ];
    const scores = { TOXICITY: 0.1 };
    const date = new Date();
    const idStr = 'a';
    // Include filters out comments that don't contain regexes from all the
    // filters.
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'hello world', date } },
        filters
      )
    ).toBe(true);
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'hello', date } },
        filters
      )
    ).toBe(false);
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'world', date } },
        filters
      )
    ).toBe(false);
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'goodbye', date } },
        filters
      )
    ).toBe(false);
  });

  it('produces correct output of itemMeetsRegexFilters: multiple filters exclude', () => {
    const filters = [
      {
        regex: 'hello',
        include: false,
      },
      {
        regex: 'world',
        include: false,
      },
    ];
    const scores = { TOXICITY: 0.1 };
    const date = new Date();
    const idStr = 'a';
    // Exclude filters out comments that contain any of the regexes in the
    // filter.
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'hello world', date } },
        filters
      )
    ).toBe(false);
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'hello', date } },
        filters
      )
    ).toBe(false);
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'world', date } },
        filters
      )
    ).toBe(false);
    expect(
      itemMeetsRegexFilters(
        { scores, item: { id_str: idStr, text: 'goodbye', date } },
        filters
      )
    ).toBe(true);
  });

  it(
    'produces correct output of itemMeetsRegexFilters: multiple filters include and ' +
      'exclude',
    () => {
      const filters = [
        {
          regex: 'hello',
          include: true,
        },
        {
          regex: 'world',
          include: true,
        },
        {
          regex: 'wonderful',
          include: false,
        },
      ];
      const scores = { TOXICITY: 0.1 };
      const date = new Date();
      const idStr = 'a';
      expect(
        itemMeetsRegexFilters(
          { scores, item: { id_str: idStr, text: 'hello world', date } },
          filters
        )
      ).toBe(true);
      expect(
        itemMeetsRegexFilters(
          {
            scores,
            item: { id_str: idStr, text: 'hello wonderful world', date },
          },
          filters
        )
      ).toBe(false);
      expect(
        itemMeetsRegexFilters(
          { scores, item: { id_str: idStr, text: 'hello', date } },
          filters
        )
      ).toBe(false);
      expect(
        itemMeetsRegexFilters(
          { scores, item: { id_str: idStr, text: 'world', date } },
          filters
        )
      ).toBe(false);
      expect(
        itemMeetsRegexFilters(
          { scores, item: { id_str: idStr, text: 'wonderful', date } },
          filters
        )
      ).toBe(false);
      expect(
        itemMeetsRegexFilters(
          { scores, item: { id_str: idStr, text: 'goodbye', date } },
          filters
        )
      ).toBe(false);
    }
  );

  it('produces correct output of itemMeetsDateFilters: date filter active', () => {
    const currentTimeMs = Date.now();
    const filter = {
      startDateTimeMs: currentTimeMs - 1000,
      endDateTimeMs: currentTimeMs,
    };

    const scores = { TOXICITY: 0.1 };
    const text = 'hello world';
    const idStr = 'a';
    expect(
      itemMeetsDateFilters(
        {
          scores,
          item: { id_str: idStr, text, date: new Date(currentTimeMs - 1001) },
        },
        filter
      )
    ).toBe(false);
    expect(
      itemMeetsDateFilters(
        {
          scores,
          item: { id_str: idStr, text, date: new Date(currentTimeMs - 1000) },
        },
        filter
      )
    ).toBe(true);
    expect(
      itemMeetsDateFilters(
        {
          scores,
          item: { id_str: idStr, text, date: new Date(currentTimeMs - 1) },
        },
        filter
      )
    ).toBe(true);
    expect(
      itemMeetsDateFilters(
        {
          scores,
          item: { id_str: idStr, text, date: new Date(currentTimeMs) },
        },
        filter
      )
    ).toBe(true);
    expect(
      itemMeetsDateFilters(
        {
          scores,
          item: { id_str: idStr, text, date: new Date(currentTimeMs + 1) },
        },
        filter
      )
    ).toBe(false);
  });
});
