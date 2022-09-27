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

import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FirestoreService } from '../firestore.service';
import { OauthApiService } from '../oauth_api.service';

@Component({
  selector: 'app-welcome-page',
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.scss'],
})
export class WelcomePageComponent {

  appName: string = "SafeNet"

  constructor(
    private firestoreService: FirestoreService,
    private oauthApiService: OauthApiService,
    private sanitizer: DomSanitizer,
    private iconRegistry: MatIconRegistry,
    private router: Router,
    private liveAnnouncer: LiveAnnouncer
  ) {
    this.iconRegistry.addSvgIcon(
      'twitter_icon',
      this.sanitizer.bypassSecurityTrustResourceUrl(
        '/Twitter_Logo_WhiteOnBlue.svg'
      )
    );
  }

  loginWithTwitter(): void {
    this.oauthApiService.authenticateTwitter().then(async () => {
      this.liveAnnouncer.announce('Logged in. Exited Twitter login page.');
      await this.firestoreService.createUserDocument();
      this.router.navigate(['/home']);
    });
  }

  visitHelpCenter() {
    this.router.navigate(['/help-center']);
  }
}
