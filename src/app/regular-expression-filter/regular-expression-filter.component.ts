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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

export interface RegexFilter {
  regex: string;
  include: boolean;
}

@Component({
  selector: 'app-regular-expression-filter',
  templateUrl: './regular-expression-filter.component.html',
  styleUrls: ['./regular-expression-filter.component.scss'],
})
export class RegularExpressionFilterComponent {
  regexFiltersInternal: RegexFilter[] = [];
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  @Output() regexFiltersChange = new EventEmitter<RegexFilter[]>();
  @Input()
  get regexFilters() {
    return this.regexFiltersInternal;
  }
  set regexFilters(filters) {
    if (this.filtersChanged(this.regexFiltersInternal, filters)) {
      this.regexFiltersInternal = filters;
      this.regexFiltersChange.emit(this.regexFiltersInternal);
    }
  }

  private filtersChanged(oldFilters: RegexFilter[], newFilters: RegexFilter[]) {
    if (oldFilters.length !== newFilters.length) {
      return true;
    }
    for (let i = 0; i < oldFilters.length; i++) {
      if (oldFilters[i] !== newFilters[i]) {
        return true;
      }
    }
    return false;
  }

  addRegexFilter(event: MatChipInputEvent, include: boolean): void {
    const input = event.input;
    const value = event.value;

    // Add the regex
    if ((value || '').trim()) {
      this.regexFiltersInternal.push({ regex: value.trim(), include });
      this.regexFiltersChange.emit(this.regexFiltersInternal);
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeRegexFilter(regexFilter: RegexFilter): void {
    const index = this.regexFiltersInternal.indexOf(regexFilter);
    if (index < 0) {
      return;
    }
    this.regexFiltersInternal.splice(index, 1);
    this.regexFiltersChange.emit(this.regexFiltersInternal);
  }
}
