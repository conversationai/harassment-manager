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

import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-expansion-box',
  templateUrl: './expansion-box.component.html',
  styleUrls: ['./expansion-box.component.scss']
})
export class ExpansionBoxComponent {
  panelOpen = false;
  @Input() disabled = false;

  handleClick() {
    if (this.disabled) {
      return;
    }

    this.panelOpen = !this.panelOpen;
  }
}
