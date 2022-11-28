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

import { NgModule } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy,
  RouterModule,
  Routes,
} from '@angular/router';
import { AuthGuardService } from './auth-guard.service';
import { CreateReportComponent } from './create-report/create-report.component';
import { CrisisHelplineComponent } from './crisis-helpline/crisis-helpline.component';
import { FindSupportComponent } from './find-support/find-support.component';
import { EarlyAdoptersOpportunityPageComponent } from './opportunities-early-adopters/opportunities-early-adopters-page.component';
import { HomePageComponent } from './home-page/home-page.component';
import { OauthApiService } from './oauth_api.service';
import { OpportunitiesComponent } from './opportunities/opportunities.component';
import { PrivacyPageComponent } from './privacy-page/privacy-page.component';
import { ReportCompleteComponent } from './report-complete/report-complete.component';
import { ReportPdfComponent } from './report-pdf/report-pdf.component';
import { ResearchPartnersOpportunityPageComponent } from './opportunities-research-partners/opportunities-research-partners-page.component';
import { ReviewReportComponent } from './review-report/review-report.component';
import { ShareReportComponent } from './share-report/share-report.component';
import { WelcomePageComponent } from './welcome-page/welcome-page.component';
import { NotFoundPageComponent } from './not-found-page/not-found-page.component';
import { RequestInvestigationComponent } from './request-investigation/request-investigation.component';
import { FAQSComponent } from './faqs/faqs.component';

/**
 * Custom RouteReuseStrategy that reuses the CreateReportComponent so that the
 * user's work is maintained when navigating to other pages in the app and back.
 * Adapted from tutorial at https://itnext.io/cache-components-with-angular-routereusestrategy-3e4c8b174d5f
 */
export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  readonly supportedRoutes = ['create-report', 'home'];
  storedRouteHandles = new Map<string, DetachedRouteHandle>();

  private signedInWithTwitter = false;

  registerWithAuthService(oauthApiService: OauthApiService) {
    oauthApiService.twitterSignInChange.subscribe((isSignedIn: boolean) => {
      this.signedInWithTwitter = isSignedIn;
      if (!isSignedIn) {
        this.clearStoredRoutes();
      }
    });
  }

  clearStoredRoutes() {
    for (const route of this.supportedRoutes) {
      this.storedRouteHandles.delete(route);
    }
  }

  // Whether we should call store when leaving the route.
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    if (!this.signedInWithTwitter) {
      // If we're not signed in, don't store any routes.
      // Note: This is needed because sometimes the shouldDetach() callback
      // happens after the user has already signed out.
      return false;
    }
    return this.supportedRoutes.includes(this.getPath(route));
  }

  // Stores the component tree in a map for later retrieval.
  store(
    route: ActivatedRouteSnapshot,
    detachedTree: DetachedRouteHandle
  ): void {
    this.storedRouteHandles.set(this.getPath(route), detachedTree);
  }

  // Whether we should call retrieve when loading the route. Otherwise the
  // component is created from scratch.
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const path = this.getPath(route);
    return (
      this.supportedRoutes.includes(path) && this.storedRouteHandles.has(path)
    );
  }

  // Looks up the stored component tree.
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.storedRouteHandles.get(
      this.getPath(route)
    ) as DetachedRouteHandle;
  }

  // Returns whether navigation should happen. This implementation matches the
  // one from the DefaultRouteReuseStrategy.
  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  private getPath(route: ActivatedRouteSnapshot): string {
    if (route.routeConfig && route.routeConfig.path) {
      return route.routeConfig.path;
    }
    return '';
  }
}

export const routes: Routes = [
  {
    path: 'crisis-helpline',
    component: CrisisHelplineComponent,
    data: { title: 'Crisis Helpline' },
  },
  {
    path: 'privacy-policy',
    component: PrivacyPageComponent,
    data: { title: 'Privacy Policy' },
  },
  {
    path: 'create-report',
    component: CreateReportComponent,
    canActivate: [AuthGuardService],
    data: { title: 'Create Report' },
  },
  {
    path: 'find-support',
    component: FindSupportComponent,
    data: { title: 'Find Support' },
  },
  {
    path: 'faqs',
    component: FAQSComponent,
    data: { title: 'FAQ\'s' },
  },
  {
    path: 'opportunities/early-adopters',
    component: EarlyAdoptersOpportunityPageComponent,
    data: { title: 'Early Adopters | Opportunities' },
  },
  {
    path: 'opportunities/research-partners',
    component: ResearchPartnersOpportunityPageComponent,
    data: { title: 'Research Partners | Opportunities' },
  },
  {
    path: 'opportunities',
    component: OpportunitiesComponent,
    data: { title: 'Opportunities' },
  },
  {
    path: 'review-report',
    component: ReviewReportComponent,
    canActivate: [AuthGuardService],
    data: { title: 'Review Report' },
  },
  {
    path: 'share-report',
    component: ShareReportComponent,
    canActivate: [AuthGuardService],
    data: { title: 'Share Report' },
  },
  {
    path: 'report-complete',
    component: ReportCompleteComponent,
    canActivate: [AuthGuardService],
    data: { title: 'Report Complete' },
  },
  {
    path: 'report-pdf',
    component: ReportPdfComponent,
    canActivate: [AuthGuardService],
    data: { title: 'Report PDF' },
  },
  {
    path: 'request-investigation',
    component: RequestInvestigationComponent,
    data: { title: 'Request and Investigation' },
  },
  {
    path: 'home',
    component: HomePageComponent,
    canActivate: [AuthGuardService],
    data: { title: 'Home Page' },
  },
  {
    path: '',
    component: WelcomePageComponent,
    pathMatch: 'full',
  },
  {
    path: '**',
    component: NotFoundPageComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' }),
  ],
  exports: [RouterModule],
  providers: [
    { provide: RouteReuseStrategy, useExisting: CustomRouteReuseStrategy },
    AuthGuardService,
  ],
})
export class AppRoutingModule { }
