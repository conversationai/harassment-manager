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

import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { take } from 'rxjs/operators';

import { isMomentSameDay } from '../common/date_utils';
import { DateFilterService } from '../date-filter.service';
import { DateFilter } from '../filter_utils';

import * as moment from 'moment';

/**
 * Gets the moment with the proper end time for the given end date.
 * For an end date of today, we only want to go up to the current time, but for
 * an end date of a date in the past, we want to go up to midnight.
 */
export function getEndMoment(endDate: moment.Moment): moment.Moment {
  const today = moment();
  if (isMomentSameDay(endDate, today)) {
    // If the selected end date is today, set the end time to the current time
    // so we fetch data up until "now".
    return today;
  } else {
    // Otherwise, set the end date to 23:59 so we fetch data up until and
    // including the day selected.
    return endDate.endOf('day');
  }
}

@Component({
  selector: 'app-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.scss'],
})
export class DateRangePickerComponent {
  startDate: FormControl = new FormControl();
  endDate: FormControl = new FormControl();
  maxDate = moment();
  dateFilter?: DateFilter;

  constructor(private dateFilterService: DateFilterService) {
    this.resetDates();
  }

  updateDateFilter() {
    const endDate = moment(this.endDate.value);
    this.endDate.setValue(getEndMoment(endDate));

    this.dateFilter = {
      startDateTimeMs: this.startDate.value.valueOf(),
      endDateTimeMs: this.endDate.value.valueOf(),
    };
  }

  // Resets the start and end dates to the currently selected DateFilter.
  resetDates() {
    this.dateFilterService.getFilter().pipe(take(1)).subscribe(
      (filter: DateFilter) => {
        this.startDate.setValue(moment(filter.startDateTimeMs));
        this.endDate.setValue(moment(filter.endDateTimeMs));
        this.dateFilter = filter;
      });
  };
}
