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

import { OverlayModule } from '@angular/cdk/overlay';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Provider } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { AngularFireModule } from '@angular/fire/compat';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import firebase from 'firebase/compat/app';
import { ReplaySubject } from 'rxjs';
import { environment } from '../environments/environment';
import { CustomRouteReuseStrategy, routes } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthGuardService } from './auth-guard.service';
import { MockOauthApiService } from './common/test_utils';
import { CreateReportComponent } from './create-report/create-report.component';
import { HomePageComponent } from './home-page/home-page.component';
import { OauthApiService } from './oauth_api.service';
import { PerspectiveApiService } from './perspectiveapi.service';
import { ReportPdfComponent } from './report-pdf/report-pdf.component';
import { SheetsApiService } from './sheets_api.service';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { TwitterApiService } from './twitter_api.service';
import { WelcomePageComponent } from './welcome-page/welcome-page.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  let twitterSignInTestSubject: ReplaySubject<boolean>;
  let mockOauthApiService: MockOauthApiService;

  function createComponent(providers: Provider[] = []) {
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

    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        CreateReportComponent,
        HomePageComponent,
        ToolbarComponent,
        WelcomePageComponent,
        ReportPdfComponent,
      ],
      imports: [
        AngularFireModule.initializeApp(environment.firebase),
        FormsModule,
        HttpClientTestingModule,
        MatDialogModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatPaginatorModule,
        MatSnackBarModule,
        MatTabsModule,
        MatToolbarModule,
        MatTooltipModule,
        NoopAnimationsModule,
        MatSnackBarModule,
        OverlayModule,
        RouterTestingModule.withRoutes(routes),
      ],
      providers: [
        AuthGuardService,
        CustomRouteReuseStrategy,
        PerspectiveApiService,
        SheetsApiService,
        TwitterApiService,
        { provide: OauthApiService, useValue: mockOauthApiService },
        { provide: MatDialogRef, useValue: {} },
        ...providers,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    router = TestBed.inject(Router);
    component = fixture.debugElement.componentInstance;
    fixture.detectChanges();
  }

  it('should render the WelcomePageComponent for the / route', fakeAsync(() => {
    createComponent();
    router.navigate(['/']);
    tick(100);

    const componentElement = fixture.debugElement.nativeElement;
    expect(componentElement.querySelector('app-welcome-page')).not.toBeNull();
  }));

  it(
    'should redirect to the login page for the /create-report route with ' +
      'no user sign-in',
    fakeAsync(() => {
      createComponent();
      router.navigate(['/create-report']);
      tick(100);

      const componentElement = fixture.debugElement.nativeElement;
      expect(componentElement.querySelector('app-create-report')).toBeNull();
      expect(router.url).toEqual('/');
    })
  );

  it(
    'should render the CreateReportComponent for the /create-report route ' +
      'with twitter sign-in',
    fakeAsync(() => {
      createComponent();
      twitterSignInTestSubject.next(true);
      router.navigate(['/create-report']);
      tick(100);

      const componentElement = fixture.debugElement.nativeElement;
      expect(
        componentElement.querySelector('app-create-report')
      ).not.toBeNull();
    })
  );

  it(
    'should redirect to the login page for the /home route with no user ' +
      'sign-in',
    fakeAsync(() => {
      createComponent();
      router.navigate(['/home']);
      tick(100);

      const componentElement = fixture.debugElement.nativeElement;
      expect(componentElement.querySelector('app-home-page')).toBeNull();
      expect(router.url).toEqual('/');
    })
  );

  it(
    'should render the HomePageComponent for the /home route with twitter ' +
      'sign-in',
    fakeAsync(() => {
      createComponent();
      twitterSignInTestSubject.next(true);
      router.navigate(['/home']);
      tick(100);

      const componentElement = fixture.debugElement.nativeElement;
      expect(componentElement.querySelector('app-home-page')).not.toBeNull();
    })
  );
});
