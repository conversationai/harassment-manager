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
import { SideMenuSection } from '../scrollable-side-menu/scrollable-side-menu.component';


@Component({
  selector: 'app-crisis-helpline',
  templateUrl: './crisis-helpline.component.html',
  styleUrls: ['./crisis-helpline.component.scss']
})
export class CrisisHelplineComponent {
  // Height for the mat-expansion-panel-header.
  expansionPanelHeaderHeight = '82px';

  sideMenuSections: SideMenuSection[] = [
    {
      title: 'Virtual Emergency Support',
      anchorSelector: '.item-1',
      selected: false
    },
    {
      title: "Contact Helpline",
      anchorSelector: '.item-2',
      selected: false
    }
  ];
}
