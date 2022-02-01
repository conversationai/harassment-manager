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
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

import { SideMenuSection } from '../scrollable-side-menu/scrollable-side-menu.component';

@Component({
  selector: 'app-find-support',
  templateUrl: './find-support.component.html',
  styleUrls: ['./find-support.component.scss'],
})
export class FindSupportComponent {
  sideMenuSections: SideMenuSection[] = [
    { title: 'Get Informed', anchorSelector: '.get-informed', selected: true },
    {
      title: 'Explore Digital Tools',
      anchorSelector: '.explore-digital-tools',
      selected: false,
    },
    {
      title: 'Connect with Organizations',
      anchorSelector: '.connect-with-organizations',
      selected: false,
    },
  ];

  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer
  ) {
    this.iconRegistry.addSvgIcon(
      'medical_services',
      this.sanitizer.bypassSecurityTrustResourceUrl('/medical_services.svg')
    );
  }
}
