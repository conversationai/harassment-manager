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
import { GapiService } from './gapi.service';

@Injectable({
  providedIn: 'root',
})
export class OauthApiService {
  private twitterCredentials?: firebase.auth.UserCredential;
  private twitterProvider: firebase.auth.TwitterAuthProvider;
  // Alternative Google credentials obtained with the gapi auth lib.
  private gapiGoogleCredentials?: Credentials;
  private signedInWithTwitterSubject = new ReplaySubject<boolean>(1);
  twitterSignInChange = this.signedInWithTwitterSubject.asObservable();

  constructor(
    private angularFireAuth: AngularFireAuth,
    private gapiService: GapiService
  ) {
    this.twitterProvider = new firebase.auth.TwitterAuthProvider();
  }

  // Returns Google credentials obtained via gapi that can be used for Sheets
  // authentication when the user is signed in with Twitter.
  getGapiGoogleCredentials(): Credentials | undefined {
    return this.gapiGoogleCredentials;
  }

  async authenticateGoogleSheets(): Promise<void> {
    if (this.twitterCredentials) {
      this.gapiGoogleCredentials = await this.gapiService.getGoogleSheetsAuth();
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
}
