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
import { Credentials } from 'google-auth-library';
import { environment } from 'src/environments/environment';

// OAuth 2.0 Client ID for your cloud project.
// See https://console.cloud.google.com/apis/credentials
const CLIENT_ID = '<YOUR_CLIENT_ID_PREFIX>.apps.googleusercontent.com'

@Injectable({
  providedIn: 'root',
})
export class GapiService {
  constructor() {
    // Load the auth2 library.
    gapi.load('auth2', () => {});
  }

  async getGoogleSheetsAuth(): Promise<Credentials> {
    if (!gapi.auth2) {
      // Not loaded yet.
      return Promise.reject(
        new Error(
          'Failed to authenticate Google Sheets because gapi is not yet loaded'
        )
      );
    }

    return new Promise((resolve, reject) => {
      // Note that we use authorize() instead of grantOfflineAccess() here. This
      // is intentional. When using grantOfflineAccess, the OAuth consent screen
      // requests all permission scopes listed on the google cloud console, even
      // the ones we're not requesting here. authorize() only requests the
      // permissions we specify here under scope. It also allows us to request a
      // token directly, so we don't have to go through the server to exchange a
      // code for a token.
      gapi.auth2.authorize(
        {
          client_id: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/spreadsheets',
          response_type: 'id_token permission',
        },
        response => {
          if (response.error) {
            reject(new Error('Failed to authenticate Google Sheets'));
          }
          resolve(response);
        }
      );
    });
  }
}
