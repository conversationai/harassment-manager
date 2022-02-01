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

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SelectableItem, SocialMediaItem, Tweet } from '../../common-types';

@Component({
  selector: 'app-comment-info-expansion',
  templateUrl: './comment-info-expansion.component.html',
  styleUrls: ['./comment-info-expansion.component.scss'],
})
export class CommentInfoExpansionComponent implements OnChanges {
  @Input() comment?: SelectableItem<SocialMediaItem>;
  tweet?: SelectableItem<Tweet>;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['comment']) {
      if (this.comment && this.comment.item) {
        this.tweet = this.comment;
      }
    }
  }

  formatScore(score: number): number {
    return Math.round(score * 100);
  }
}
