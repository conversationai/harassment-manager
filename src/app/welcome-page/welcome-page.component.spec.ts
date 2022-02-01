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
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { FirestoreService } from '../firestore.service';
import { OauthApiService } from '../oauth_api.service';
import { WelcomePageComponent } from './welcome-page.component';

describe('WelcomePageComponent', () => {
  let component: WelcomePageComponent;
  let fixture: ComponentFixture<WelcomePageComponent>;
  let mockFirestoreService: jasmine.SpyObj<FirestoreService>;
  let mockOauthApiService: jasmine.SpyObj<OauthApiService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockLiveAnnouncer: jasmine.SpyObj<LiveAnnouncer>;

  beforeEach(
    waitForAsync(() => {
      mockFirestoreService = jasmine.createSpyObj<FirestoreService>(
        'firestoreService',
        ['createUserDocument']
      );
      mockOauthApiService = jasmine.createSpyObj<OauthApiService>(
        'oauthApiService',
        ['authenticateTwitter']
      );
      mockRouter = jasmine.createSpyObj<Router>('router', ['navigate']);
      mockLiveAnnouncer = jasmine.createSpyObj<LiveAnnouncer>(
        'liveAnnouncer', ['announce']);

      TestBed.configureTestingModule({
        declarations: [WelcomePageComponent],
        imports: [
          HttpClientTestingModule,
          MatButtonModule,
          MatIconModule,
          MatExpansionModule,
          NoopAnimationsModule,
        ],
        providers: [
          {
            provide: FirestoreService,
            useValue: mockFirestoreService,
          },
          {
            provide: LiveAnnouncer,
            useValue: mockLiveAnnouncer,
          },
          {
            provide: OauthApiService,
            useValue: mockOauthApiService,
          },
          {
            provide: Router,
            useValue: mockRouter,
          },
        ],
      }).compileComponents();
    })
  );

  function createComponent(): void {
    fixture = TestBed.createComponent(WelcomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('creates the component', () => {
    createComponent();

    expect(component).toBeTruthy();
    const componentElement = fixture.debugElement.nativeElement;
    expect(
      componentElement.querySelector('.description').textContent
    ).toContain('Control Your Online Harassment');
  });

  it('routes to the home page on successful Twitter authentication', fakeAsync(() => {
    mockOauthApiService.authenticateTwitter.and.returnValue(Promise.resolve());
    createComponent();

    const componentElement = fixture.debugElement.nativeElement;
    componentElement.querySelector('.twitter-button').click();
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
  }));
});
