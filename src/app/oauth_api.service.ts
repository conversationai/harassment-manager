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
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { Credentials } from 'google-auth-library';
import { Observable, ReplaySubject } from 'rxjs';

// OAuth 2.0 Client ID for your cloud project.
// See https://console.cloud.google.com/apis/credentials
const CLIENT_ID = '<YOUR_CLIENT_ID_PREFIX>.apps.googleusercontent.com';

@Injectable({
  providedIn: 'root',
})
export class OauthApiService {
  // Google credentials obtained with the Google Identity Services library.
  private googleCredentials?: Credentials;
  private twitterCredentials?: firebase.auth.UserCredential;
  private twitterProvider: firebase.auth.TwitterAuthProvider;

  private signedInWithTwitterSubject = new ReplaySubject<boolean>(1);
  twitterSignInChange = this.signedInWithTwitterSubject.asObservable();

  constructor(private angularFireAuth: AngularFireAuth) {
    this.twitterProvider = new firebase.auth.TwitterAuthProvider();
  }

  // Returns Google credentials that can be used for Sheets authentication
  // when the user is signed in with Twitter.
  getGoogleCredentials(): Credentials | undefined {
    return this.googleCredentials;
  }

  async authenticateGoogleSheets(): Promise<void> {
    if (this.twitterCredentials) {
      this.googleCredentials = await this.getGoogleSheetsAuth();
    } else {
      throw new Error(
        'Trying to authenticate with Google Sheets, but no credentials found'
      );
    }
  }

  async authenticateTwitter(): Promise<void> {
    try {
      this.twitterCredentials = await this.angularFireAuth.signInWithPopup(
        this.twitterProvider
      );
      this.signedInWithTwitterSubject.next(true);
    } catch (error) {
      throw new Error('Error signing in with Twitter: ' + error);
    }
  }

  getIdToken(): Observable<string | null> {
    return this.angularFireAuth.idToken;
  }

  getTwitterCredentials(): firebase.auth.UserCredential | undefined {
    return this.twitterCredentials;
  }

  getTwitterOauthCredential(): firebase.auth.OAuthCredential | undefined {
    return this.twitterCredentials
      ? (this.twitterCredentials.credential as firebase.auth.OAuthCredential)
      : undefined;
  }

  async signOutOfTwitter(): Promise<void> {
    try {
      await this.angularFireAuth.signOut();
      this.signedInWithTwitterSubject.next(false);
      this.twitterCredentials = undefined;
    } catch (error) {
      throw new Error('Error signing out of Twitter: ' + error);
    }
  }

  async revokeAuth(): Promise<void> {
    if (this.twitterCredentials) {
      await this.signOutOfTwitter();
    }
  }

  private getGoogleSheetsAuth(): Promise<Credentials> {
    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (response) => {
          const access_token = response.access_token;
          if (!!response.error || !access_token) {
            reject('Failed to authenticate with Google');
          }
          resolve({ access_token });
        },
      });
      client.requestAccessToken();
    });
  }
}
