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
import { isSameDay, isMomentSameDay } from './date_utils';

import * as moment from 'moment';

describe('DateUtils', () => {
  it('gives correct output for isSameDay', () => {
    const date1 = new Date(2020, 8, 15, 2, 25, 0, 0);
    const date2 = new Date(2020, 8, 15, 23, 59, 59, 59);
    const date3 = new Date(2020, 8, 16, 0, 0, 0, 0);

    expect(isSameDay(date1, date2)).toBe(true);
    expect(isSameDay(date1, date3)).toBe(false);
  });

  it('gives correct output for isMomentSameDay', () => {
    const date1 = moment('2020-09-15 02:25:13');
    const date2 = moment('2020-09-15 23:59:59');
    const date3 = moment('2020-09-16 00:00:00');

    expect(isMomentSameDay(date1, date2)).toBe(true);
    expect(isMomentSameDay(date1, date3)).toBe(false);
  });
});
