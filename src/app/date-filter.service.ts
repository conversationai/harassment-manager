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
import { Observable, ReplaySubject } from 'rxjs';
import { DateFilter } from './filter_utils';

/** Service for maintaining the state of the date filter across the app. */
@Injectable({ providedIn: 'root' })
export class DateFilterService {
  private readonly filter = new ReplaySubject<DateFilter>(1);

  private startTimeMs = Date.now();

  // Gets a synchronized start time for different components in the app; this
  // ensures that even if load times are off by a few milliseconds, the requests
  // to fetch comments at start time will be the same, ensuring that we can use
  // the scoredDataCache when the app loads.
  getStartTimeMs() {
    return this.startTimeMs;
  }

  getFilter(): Observable<DateFilter> {
    return this.filter.asObservable();
  }

  updateFilter(filter: DateFilter): void {
    this.filter.next(filter);
  }
}
