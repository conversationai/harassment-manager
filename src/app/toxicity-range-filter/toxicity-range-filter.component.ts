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
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { ToxicityRangeFilter } from '../filter_utils';

import * as noUiSlider from 'nouislider';

@Component({
  selector: 'app-toxicity-range-filter',
  templateUrl: './toxicity-range-filter.component.html',
  styleUrls: ['./toxicity-range-filter.component.scss'],
})
export class ToxicityRangeFilterComponent implements AfterViewInit {
  // The noUiSlider library works by appending a slider onto a DOM element. We
  // use ViewChild to keep a reference to that element.
  @ViewChild('noUiSliderElement') sliderElement!: ElementRef;

  toxicityRangeFilterInternal: ToxicityRangeFilter = {
    minScore: 0,
    maxScore: 1,
    includeUnscored: false,
  };

  @Output() toxicityRangeFilterChange = new EventEmitter<ToxicityRangeFilter>();
  @Input()
  get toxicityRangeFilter() {
    return this.toxicityRangeFilterInternal;
  }
  set toxicityRangeFilter(toxicityRangeFilter) {
    // Check for changes to avoid an endless loop.
    if (
      this.toxicityRangeFilterInternal.minScore !==
        toxicityRangeFilter.minScore ||
      this.toxicityRangeFilterInternal.maxScore !== toxicityRangeFilter.maxScore
    ) {
      this.toxicityRangeFilterInternal = toxicityRangeFilter;
      this.sliderElement.nativeElement.noUiSlider.set([
        toxicityRangeFilter.minScore * 100,
        toxicityRangeFilter.maxScore * 100,
        toxicityRangeFilter.includeUnscored,
      ]);
      this.toxicityRangeFilterChange.emit(this.toxicityRangeFilterInternal);
    }
  }

  constructor(
    private elementRef: ElementRef,
    private sanitizer: DomSanitizer
  ) {}

  /** Sets the minScore and maxScore as CSS variables. */
  @HostBinding('attr.style')
  get toxicityRangeAsStyle(): SafeStyle {
    return this.sanitizer.bypassSecurityTrustStyle(
      `--min-score: ${this.toxicityRangeFilter.minScore * 100}%; ` +
        `--max-score: ${(this.toxicityRangeFilter.maxScore || 1) * 100}%;`
    );
  }

  ngAfterViewInit() {
    noUiSlider.create(this.sliderElement.nativeElement, {
      start: [
        this.toxicityRangeFilterInternal.minScore * 100,
        this.toxicityRangeFilterInternal.maxScore * 100,
      ],
      connect: [false, true, false],
      step: 1,
      range: {
        min: 0,
        max: 100,
      },
    });

    this.sliderElement.nativeElement.noUiSlider.on(
      'update',
      (values: string[], handle: number) => {
        // Note: Number(x) can return NaN. If that happens just use default
        // min and max.
        this.toxicityRangeFilter = {
          minScore: (Number(values[0]) || 0) / 100,
          maxScore: (Number(values[1]) || 100) / 100,
          includeUnscored: false,
        };
      }
    );
  }
}
