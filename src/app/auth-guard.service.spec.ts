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

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { ReplaySubject } from 'rxjs';
import { AuthGuardService } from './auth-guard.service';
import { MockOauthApiService } from './common/test_utils';
import { OauthApiService } from './oauth_api.service';

describe('AuthGuardService', () => {
  let service: AuthGuardService;
  let mockOauthApiService: MockOauthApiService;
  let twitterSignInTestSubject: ReplaySubject<boolean>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    twitterSignInTestSubject = new ReplaySubject<boolean>(1);
    mockOauthApiService = {
      twitterSignInChange: twitterSignInTestSubject.asObservable(),
      getTwitterCredentials: () => undefined,
    };
    mockOauthApiService.twitterSignInChange.subscribe((signedIn: boolean) => {
      mockOauthApiService.getTwitterCredentials = () => {
        return signedIn
          ? jasmine.createSpyObj<firebase.auth.UserCredential>(
              'twitterCredentials',
              ['user', 'credential']
            )
          : undefined;
      };
    });

    mockRouter = jasmine.createSpyObj<Router>('router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuardService,
        {
          provide: Router,
          useValue: mockRouter,
        },
        {
          provide: OauthApiService,
          useValue: mockOauthApiService,
        },
      ],
    });
    service = TestBed.inject(AuthGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('canActivate returns true if logged in with Twitter', () => {
    twitterSignInTestSubject.next(true);
    expect(service.canActivate()).toBe(true);
  });

  it('canActivate returns false and redirects to login if not logged in', () => {
    expect(service.canActivate()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['']);
  });
});
