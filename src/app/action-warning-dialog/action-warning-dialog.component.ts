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

import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface ActionDialogData {
  actionTitle: string;
  actionText: string;
  learnMoreLink: string;
  confirmationText: string;
}

@Component({
  selector: 'app-action-warning-dialog',
  templateUrl: './action-warning-dialog.component.html',
  styleUrls: ['./action-warning-dialog.component.scss']
})
export class ActionWarningDialogComponent {
  actionTitle = '';
  actionText = '';
  learnMoreLink: SafeUrl;
  confirmationText = '';

  constructor(private dialogRef: MatDialogRef<ActionWarningDialogComponent>,
              @Inject(MAT_DIALOG_DATA) private data: ActionDialogData,
              private sanitizer: DomSanitizer) {
    this.actionTitle = data.actionTitle;
    this.actionText = data.actionText;
    this.learnMoreLink = sanitizer.bypassSecurityTrustUrl(data.learnMoreLink);
    this.confirmationText = data.confirmationText;
  }
}
