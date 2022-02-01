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
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { SelectableItem, SocialMediaItem, Tweet } from '../../common-types';
import { Attributes } from '../../perspectiveapi-types';
import { getInfluenceScore } from '../common/social_media_item_utils';

@Component({
  selector: 'app-comment-info',
  templateUrl: './comment-info.component.html',
  styleUrls: ['./comment-info.component.scss'],
})
export class CommentInfoComponent implements OnChanges {
  @Input() comment?: SelectableItem<SocialMediaItem>;
  tweet?: SelectableItem<Tweet>;
  @Output() selectChange = new EventEmitter<boolean>();
  @Output() deleteClicked = new EventEmitter<void>();

  // Controls whether text/image blurring should be enabled at all.
  private blurringEnabled = false;

  @Input() set enableBlurring(enableBlurring: boolean) {
    this.blurringEnabled = enableBlurring;
    this.shouldBlur = enableBlurring;
  }
  @Input() showCheckbox = true;
  @Input() showFullText = false;
  @Input() showFullMedia = false;
  @Input() showDetails = false;
  @Input() showDeleteButton = false;
  @Input() disabled = false;

  // Controls the blurred state when users hover over/out of the comment
  // text/image.
  shouldBlur = false;

  harmfulStatus = 'Unable to score';
  influence = 'Popularity';
  time = 'Time';

  timeframe = '';

  // The selected state of the component. This variable can be set as an input
  // from the parent component and also from the ngModel on the checkbox.
  selectedInternal = false;
  @Input() set selected(selected: boolean) {
    this.selectedInternal = selected;
    if (this.comment) {
      this.comment.selected = selected;
    }
  }

  get selected() {
    return this.selectedInternal;
  }

  // Whether the expansion panel is open.
  panelOpen = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['comment']) {
      if (this.comment && this.comment.item) {
        this.tweet = this.comment;
      }

      this.computeHighLevelInfo();
    }
  }

  notifyCheckedStateChange() {
    if (this.comment) {
      // Update the data model to reflect the checkbox state.
      this.comment.selected = this.selectedInternal;
    }
    this.selectChange.emit(this.selectedInternal);
  }

  handleCheckboxClicked(event: MouseEvent) {
    if (!this.disabled) {
      this.selectedInternal = !this.selectedInternal;
    }
    this.notifyCheckedStateChange();
    event.stopPropagation();
  }

  handleDeleteClicked() {
    this.deleteClicked.emit();
  }

  computeHighLevelInfo() {
    if (!this.comment || !this.comment.item) {
      this.harmfulStatus = 'Unable to score';
      this.influence = 'Popularity';
      this.time = 'Time';
      return;
    }

    const toxicityScore = this.comment.scores[Attributes.TOXICITY];
    if (!toxicityScore) {
      this.harmfulStatus = 'Unable to score';
    } else if (toxicityScore >= 0.85) {
      this.harmfulStatus = 'Likely harmful';
    } else if (toxicityScore >= 0.6 && toxicityScore < 0.85) {
      this.harmfulStatus = 'Potentially harmful';
    } else if (toxicityScore >= 0.4 && toxicityScore < 0.6) {
      this.harmfulStatus = 'Unsure if harmful';
    } else {
      this.harmfulStatus = 'Unlikely harmful';
    }

    if (getInfluenceScore(this.comment.item) > 100) {
      this.influence = 'Popular';
    } else {
      this.influence = 'Unpopular';
    }

    const timeMs = Date.now() - this.comment.item.date.getTime();
    const timeSecs = Math.round(timeMs / 1000);
    const timeMins = Math.round(timeMs / (1000 * 60));
    const timeHrs = Math.round(timeMs / (1000 * 60 * 60));
    const timeDays = Math.round(timeMs / (1000 * 60 * 60 * 24));
    if (timeDays === 1) {
      this.time = '1 day';
    } else if (timeDays > 1) {
      this.time = `${timeDays} days`;
    } else if (timeHrs === 1) {
      this.time = '1 hour';
    } else if (timeHrs > 1) {
      this.time = `${timeHrs} hours`;
    } else if (timeMins === 1) {
      this.time = '1 minute';
    } else if (timeMins > 1) {
      this.time = `${timeMins} minutes`;
    } else if (timeSecs === 1) {
      this.time = '1 second';
    } else {
      this.time = `${timeSecs} seconds`;
    }

    if (timeDays >= 1) {
      this.timeframe = 'days';
    } else if (timeHrs >= 1) {
      this.timeframe = 'hours';
    } else if (timeMins >= 1) {
      this.timeframe = 'minutes';
    }
  }

  getFormattedDate(timeMs: number): string {
    return new Date(timeMs).toLocaleString('en-US', { timeZone: 'UTC' });
  }

  formatScore(score: number): number {
    return Math.round(score * 100);
  }

  toggleBlur() {
    this.shouldBlur = !this.shouldBlur;
  }

  // For the given comment returns the image filename and image alt text.
  getPriorityIconAndAltText(): string[] {
    if (this.harmfulStatus === 'Likely harmful') {
      return ['high_priority_icon.svg', 'high priority'];
    } else if (this.harmfulStatus === 'Potentially harmful') {
      return ['possible_priority_icon.svg', 'possible priority'];
    } else if (this.harmfulStatus === 'Unlikely harmful') {
      return ['low_priority_icon.svg', 'low priority'];
    } else {
      return ['unknown_priority_icon.svg', 'unknown priority'];
    }
  }

  getAriaLabelForCheckbox() {
    if (!this.comment || !this.comment.item) {
      return '';
    } else {
      return `Comment by ${
        this.tweet
          ? this.comment.item.authorScreenName
          : this.comment.item.authorName
      }
       ', ' ${this.getFormattedDate(this.comment.item.date.getTime())}`;
    }
  }
}
