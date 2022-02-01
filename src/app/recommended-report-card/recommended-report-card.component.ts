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
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ScoredItem, SocialMediaItem } from '../../common-types';
import { ToxicityRangeFilter } from '../filter_utils';
import {
  EventAction,
  EventCategory,
  GoogleAnalyticsService,
} from '../google_analytics.service';
import { ReportService } from '../report.service';

export interface RecommendedReportTemplate {
  toxicityRangeFilter: ToxicityRangeFilter;
  // Display name for the template. This should be unique and short.
  name: string;
  // A more descriptive name for the template. This should still be short
  // enough to fit in a dropdown menu.
  description: string;
  // Image to display on the template.
  icon?: string;
  // Color of the icon describing this template.
  color?: string;
  // Name to use when routing to the Create Report Page. Must correspond to a
  // the name of one of the TOXICITY_RANGE_TEMPLATES for proper filtering.
  routing_name?: string;
}

export interface RecommendedReportData extends RecommendedReportTemplate {
  comments: Array<ScoredItem<SocialMediaItem>>;
}

// Templates for the toxicity range options used on the Create Report page for
// the toxicity filter.
export const TOXICITY_RANGE_TEMPLATES: RecommendedReportTemplate[] = [
  {
    toxicityRangeFilter: {
      minScore: 0.85,
      maxScore: 1,
      includeUnscored: false,
    },
    name: 'Likely',
    description: 'Likely harmful',
    icon: 'high_priority_icon.svg',
    color: 'orange',
  },
  {
    toxicityRangeFilter: {
      minScore: 0.6,
      maxScore: 0.85,
      includeUnscored: false,
    },
    name: 'Potentially',
    description: 'Potentially harmful',
    icon: 'possible_priority_icon.svg',
    color: 'yellow',
  },
  {
    toxicityRangeFilter: {
      minScore: 0.4,
      maxScore: 0.6,
      includeUnscored: false,
    },
    name: 'Unsure',
    description: 'Unsure if harmful',
    icon: 'unknown_priority_icon.svg',
    color: 'grey',
  },
  {
    toxicityRangeFilter: {
      minScore: 0,
      maxScore: 0.4,
      includeUnscored: false,
    },
    name: 'Unlikely',
    description: 'Unlikely harmful',
    icon: 'low_priority_icon.svg',
    color: 'green',
  },
  {
    toxicityRangeFilter: {
      minScore: 0,
      maxScore: 0,
      includeUnscored: true,
    },
    name: 'Unable to score',
    description: 'Unable to score',
    icon: 'unknown_priority_icon.svg',
    color: 'grey',
  },
];

// Templates for the recommended reports (aka priority buckets) on the
// Home Page.
export const RECOMMENDED_REPORT_TEMPLATES: RecommendedReportTemplate[] = [
  // High
  { ...TOXICITY_RANGE_TEMPLATES[0], name: 'High', routing_name: 'Likely' },
  // Possible
  {
    ...TOXICITY_RANGE_TEMPLATES[1],
    name: 'Possible',
    routing_name: 'Potentially',
  },
  // Unknown - Combination of 'Unsure' and 'Unable to score'
  {
    toxicityRangeFilter: {
      minScore: TOXICITY_RANGE_TEMPLATES[2].toxicityRangeFilter.minScore,
      maxScore: TOXICITY_RANGE_TEMPLATES[2].toxicityRangeFilter.maxScore,
      includeUnscored: true,
    },
    name: 'Unknown',
    description: 'Unknown if harmful',
    icon: TOXICITY_RANGE_TEMPLATES[2].icon,
    color: TOXICITY_RANGE_TEMPLATES[2].color,
  },
  // All
  {
    toxicityRangeFilter: {
      minScore: 0,
      maxScore: 1,
      includeUnscored: true,
    },
    name: 'All',
    description: 'All comments',
    icon: 'all_comments_icon.svg',
  },
];

@Component({
  selector: 'app-recommended-report-card',
  templateUrl: './recommended-report-card.component.html',
  styleUrls: ['./recommended-report-card.component.scss'],
})
export class RecommendedReportCardComponent {
  @Input() reportData: RecommendedReportData = {
    toxicityRangeFilter: {
      minScore: 0,
      maxScore: 1,
      includeUnscored: false,
    },
    name: 'Default',
    description: 'Default',
    icon: 'unknown_priority_icon.svg',
    comments: [],
  };
  @Output() viewCommentsClicked = new EventEmitter<void>();
  @Input() loading = false;
  @Input() error = false;
  @Output() addAllClicked = new EventEmitter<void>();
  // Used to override the default name that's displayed.
  @Input() name?: string;
  addAllWasClicked = false;

  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private reportService: ReportService,
    private readonly googleAnalyticsService: GoogleAnalyticsService
  ) {
    this.iconRegistry
      .addSvgIcon(
        'add_to_report_icon',
        this.sanitizer.bypassSecurityTrustResourceUrl('/add_to_report.svg')
      )
      .addSvgIcon(
        'add_to_report_icon_disabled',
        this.sanitizer.bypassSecurityTrustResourceUrl(
          '/action_report_disabled.svg'
        )
      )
      .addSvgIcon(
        'add_to_report_icon_added',
        this.sanitizer.bypassSecurityTrustResourceUrl(
          '/action_report_added.svg'
        )
      );

    this.reportService.reportCleared.subscribe(() => {
      this.addAllWasClicked = false;
    });
  }

  get addAllIcon() {
    if (this.loading || this.reportCommentsEmpty) {
      return 'add_to_report_icon_disabled';
    } else if (this.addAllWasClicked) {
      return 'add_to_report_icon_added';
    } else {
      return 'add_to_report_icon';
    }
  }

  get description(): string {
    if (this.reportData.name === 'Unable to score') {
      // Capitalize 'Unable' if it's the first word.
      const unableText = `${this.error ? 'U' : 'u'}nable to be `;
      // The last word in this description is a matToolTip set in the html.
      return unableText /* scored */;
    } else {
      const minPercentage = this.reportData.toxicityRangeFilter.minScore * 100;
      const maxPercentage =
        this.reportData.toxicityRangeFilter.maxScore === 1
          ? this.reportData.toxicityRangeFilter.maxScore * 100
          : this.reportData.toxicityRangeFilter.maxScore * 100 - 1;
      return `${minPercentage}% - ${maxPercentage}% likely to be harmful`;
    }
  }

  get reportCommentsEmpty(): boolean {
    return this.reportData.comments.length === 0;
  }

  get reportName(): string {
    if (this.name) {
      return this.name;
    } else {
      return `${this.reportData.name} priority`;
    }
  }

  get viewCommentTextCommentCount(): string {
    if (!this.error) {
      const singular = this.reportData.comments.length === 1;
      const commentText = singular ? 'comment' : 'comments';
      return `View ${this.reportData.comments.length} ${commentText}`;
    }
    return 'View comments';
  }

  // For the given image filename return image alt text.
  getAltText(image?: string): string {
    if (!image) {
      return '';
    } else if (image === 'high_priority_icon.svg') {
      return 'high priority';
    } else if (image === 'possible_priority_icon.svg') {
      return 'possible priority';
    } else if (image === 'low_priority_icon.svg') {
      return 'low priority';
    } else {
      return 'unknown priority';
    }
  }

  handleViewCommentsClicked() {
    this.viewCommentsClicked.emit();
  }

  handleAddToReportClicked() {
    this.addAllWasClicked = true;
    this.addAllClicked.emit();
    this.reportService.addCommentsToReport(this.reportData.comments);
    this.googleAnalyticsService.emitEvent(
      EventCategory.ADD_ALL_TO_REPORT_BUTTON,
      EventAction.CLICK
    );
  }
}
