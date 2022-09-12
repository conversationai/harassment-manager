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

import { Component, ElementRef, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { CustomRouteReuseStrategy } from './app-routing.module';
import { OauthApiService } from './oauth_api.service';
import { focusElement } from './common/a11y_utils';

const APP_TITLE = 'SafeNet';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild('pageBody') pageBodyElement!: ElementRef;

  constructor(
    private activatedRoute: ActivatedRoute,
    private oauthApiService: OauthApiService,
    private router: Router,
    private elementRef: ElementRef,
    private routeReuseStrategy: CustomRouteReuseStrategy,
    private titleService: Title
  ) {
    this.routeReuseStrategy.registerWithAuthService(this.oauthApiService);
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map(route => {
          // Get the leaf route (e.g. "/path/abc/123 -> 123").
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        })
      )
      .subscribe(route => {
        const title = route.snapshot.data['title'];
        if (title) {
          this.titleService.setTitle(`${title} - ${APP_TITLE}`);
        } else {
          this.titleService.setTitle(APP_TITLE);
        }
        // When the route changes, focus on the top of the page. Then try to
        // focus on the main page content below the toolbar if we can.
        // Sets a brief timeout to give things a chance to load, otherwise it
        // might focus on an outdated element from the page we navigated away
        // from. Note that this is not 100% reliable as load times vary. Most
        // notably, this is not enough of a timeout to wait for the PDF to load
        // on the Take Action page. But we can't make the timeout too large, or
        // else it will announce multiple things and confuse the user.
        focusElement(this.elementRef.nativeElement);
        setTimeout(() => {
          if (this.pageBodyElement) {
            focusElement(this.pageBodyElement.nativeElement);
          }
        }, 100);
      });
  }

  shouldShowToolbar(): boolean {
    return this.router.url !== '/';
  }

  shouldShowFeedbackButton() {
    return this.oauthApiService.getTwitterCredentials();
  }
}
