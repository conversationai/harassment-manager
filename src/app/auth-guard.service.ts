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

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { OauthApiService } from './oauth_api.service';

/**
 * Very simple auth guard that checks for Twitter credentials.
 * Because the credentials are not stored anywhere, we only have them if the
 * user has logged in during the lifecycle of the Angular application. If we
 * don't detect login credentials (such as when the page is refreshed or a new
 * tab is opened), we redirect to the login page. Because of this, we also
 * provide a warning about unsaved changes when a user is closing or refreshing
 * the page in the AppComponent.
 *
 * NOTE: This is a simple auth guard that does not keep users logged in when
 * refreshing or opening a new tab.
 */
@Injectable()
export class AuthGuardService implements CanActivate {
  constructor(
    private oauthApiService: OauthApiService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.oauthApiService.getTwitterCredentials()) {
      return true;
    } else {
      this.router.navigate(['']);
      return false;
    }
  }
}
