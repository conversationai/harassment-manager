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
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-find-support-tile',
  templateUrl: './find-support-tile.component.html',
  styleUrls: ['./find-support-tile.component.scss']
})
export class FindSupportTileComponent implements OnChanges {
  @Input() title = '';
  @Input() description = '';
  @Input() url = '';
  @Input() image = '';
  safeUrl: SafeUrl;
  safeImage: SafeUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.url);
    this.safeImage = this.sanitizer.bypassSecurityTrustUrl(this.image);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['url']) {
      this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.url);
    }
    if (changes['image']) {
      this.safeImage = this.sanitizer.bypassSecurityTrustUrl(this.image);
    }
  }
}
