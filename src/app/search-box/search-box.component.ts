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
import { MatChipInputEvent } from '@angular/material/chips';
import { RegularExpressionFilterComponent } from '../regular-expression-filter/regular-expression-filter.component';

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: [
    './search-box.component.scss',
    '../regular-expression-filter/regular-expression-filter.component.scss',
  ],
})
export class SearchBoxComponent extends RegularExpressionFilterComponent {
  initialFilterInput = '';

  resetFilters() {
    this.regexFilters = [];
    this.initialFilterInput = '';
    this.regexFiltersChange.emit([]);
  }

  addExcludeFilter(event: MatChipInputEvent) {
    this.addRegexFilter(event, false);
  }

  addIncludeFilter(event: MatChipInputEvent) {
    this.addRegexFilter(event, true);
  }
}
