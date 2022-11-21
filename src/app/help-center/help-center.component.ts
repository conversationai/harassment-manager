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
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { SideMenuSection } from '../scrollable-side-menu/scrollable-side-menu.component';


@Component({
  selector: 'app-help-center',
  templateUrl: './help-center.component.html',
  styleUrls: ['./help-center.component.scss']
})
export class HelpCenterComponent {
  // Height for the mat-expansion-panel-header.
  expansionPanelHeaderHeight = '82px';

  sideMenuSections: SideMenuSection[] = [
    {
      title: 'Product Description',
      anchorSelector: '.product-description',
      selected: true
    },
    {
      title: 'Product Support',
      anchorSelector: '.product-support',
      selected: false
    },
    {
      title: "Contact Us",
      anchorSelector: '.contact-us',
      selected: false
    }
  ];

  constructor(private formBuilder: FormBuilder,) {
  }

  contactUsForm = this.formBuilder.group({
    firstName: new FormControl('', [Validators.required]),
    lastName: new FormControl(''),
    email: new FormControl('', [Validators.required]),
    subject: new FormControl('', [Validators.required]),
    message: new FormControl('', [Validators.required])
  });

  onSubmit() {
    //TODO: handle contact us form submission
  }
}
