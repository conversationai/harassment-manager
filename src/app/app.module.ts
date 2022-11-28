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

import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { APP_BASE_HREF } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MomentDateModule } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { environment } from '../environments/environment';
import { ActionWarningDialogComponent } from './action-warning-dialog/action-warning-dialog.component';
import { ApiErrorDialogComponent } from './api-error-dialog/api-error-dialog.component';
import {
  AppRoutingModule,
  CustomRouteReuseStrategy,
} from './app-routing.module';
import { AppComponent } from './app.component';
import { ClearReportDialogComponent } from './clear-report-dialog/clear-report-dialog.component';
import { CommentInfoExpansionComponent } from './comment-info-expansion/comment-info-expansion.component';
import { CommentInfoComponent } from './comment-info/comment-info.component';
import { CommentLinkComponent } from './comment-link/comment-link.component';
import { CreateReportComponent } from './create-report/create-report.component';
import { CrisisHelplineComponent } from './crisis-helpline/crisis-helpline.component';
import { DatePickerDialogComponent } from './date-picker-dialog/date-picker-dialog.component';
import { DateRangePickerComponent } from './date-range-picker/date-range-picker.component';
import {
  DropdownButtonComponent,
  HrefOnlyDownloadDirective,
} from './dropdown-button/dropdown-button.component';
import { EarlyAdoptersOpportunityPageComponent } from './opportunities-early-adopters/opportunities-early-adopters-page.component';
import { ErrorDialogComponent } from './error-dialog/error-dialog.component';
import { ExitDialogComponent } from './exit-dialog/exit-dialog.component';
import { ExpansionBoxComponent } from './expansion-box/expansion-box.component';
import { FilterDropdownComponent } from './filter-dropdown/filter-dropdown.component';
import { FindSupportListItemComponent } from './find-support-list-item/find-support-list-item.component';
import { FindSupportTileComponent } from './find-support-tile/find-support-tile.component';
import { FindSupportComponent } from './find-support/find-support.component';
import { FooterComponent } from './footer/footer.component';
import { HelpCenterComponent } from './help-center/help-center.component';
import { HomePageComponent } from './home-page/home-page.component';
import { IntroStepperComponent } from './intro-stepper/intro-stepper.component';
import { LoadingDialogComponent } from './loading-dialog/loading-dialog.component';
import { PdfService } from './pdf_service';
import { PerspectiveApiService } from './perspectiveapi.service';
import { NotFoundPageComponent } from './not-found-page/not-found-page.component';
import { OpportunitiesComponent } from './opportunities/opportunities.component';
import { OpportunityCardComponent } from './opportunity-card/opportunity-card.component';
import { RecommendedReportCardComponent } from './recommended-report-card/recommended-report-card.component';
import { RegularExpressionFilterComponent } from './regular-expression-filter/regular-expression-filter.component';
import { ReportCompleteComponent } from './report-complete/report-complete.component';
import { ReportPdfComponent } from './report-pdf/report-pdf.component';
import { ReportProgressBarComponent } from './report-progress-bar/report-progress-bar.component';
import { ResearchPartnersOpportunityPageComponent } from './opportunities-research-partners/opportunities-research-partners-page.component';
import { ReviewReportComponent } from './review-report/review-report.component';
import { ScrollableSideMenuComponent } from './scrollable-side-menu/scrollable-side-menu.component';
import { SearchBoxComponent } from './search-box/search-box.component';
import { ShareReportComponent } from './share-report/share-report.component';
import { SheetsApiService } from './sheets_api.service';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { ToxicityRangeFilterComponent } from './toxicity-range-filter/toxicity-range-filter.component';
import { ToxicityRangeSelectorDialogComponent } from './toxicity-range-selector-dialog/toxicity-range-selector-dialog.component';
import { TweetImageComponent } from './tweet-image/tweet-image.component';
import { TwitterApiService } from './twitter_api.service';
import { WelcomePageComponent } from './welcome-page/welcome-page.component';
import { PrivacyPageComponent } from './privacy-page/privacy-page.component';
import { RequestInvestigationComponent } from './request-investigation/request-investigation.component';
import { FAQSComponent } from './faqs/faqs.component';

@NgModule({
  declarations: [
    ActionWarningDialogComponent,
    ApiErrorDialogComponent,
    AppComponent,
    ClearReportDialogComponent,
    CrisisHelplineComponent,
    CommentInfoComponent,
    CommentInfoExpansionComponent,
    CommentLinkComponent,
    CreateReportComponent,
    DatePickerDialogComponent,
    DateRangePickerComponent,
    DropdownButtonComponent,
    EarlyAdoptersOpportunityPageComponent,
    ErrorDialogComponent,
    ExitDialogComponent,
    ExpansionBoxComponent,
    FilterDropdownComponent,
    FindSupportComponent,
    FindSupportListItemComponent,
    FindSupportTileComponent,
    FooterComponent,
    HelpCenterComponent,
    HomePageComponent,
    HrefOnlyDownloadDirective,
    IntroStepperComponent,
    LoadingDialogComponent,
    NotFoundPageComponent,
    OpportunitiesComponent,
    OpportunityCardComponent,
    RecommendedReportCardComponent,
    RegularExpressionFilterComponent,
    ReportCompleteComponent,
    ReportPdfComponent,
    ReportProgressBarComponent,
    ResearchPartnersOpportunityPageComponent,
    ReviewReportComponent,
    ScrollableSideMenuComponent,
    SearchBoxComponent,
    ShareReportComponent,
    ToolbarComponent,
    ToxicityRangeFilterComponent,
    ToxicityRangeSelectorDialogComponent,
    TweetImageComponent,
    WelcomePageComponent,
    PrivacyPageComponent,
    RequestInvestigationComponent,
    FAQSComponent,
  ],
  imports: [
    A11yModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MomentDateModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatSnackBarModule,
    MatTableModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    OverlayModule,
    PdfViewerModule,
    ReactiveFormsModule,
    RouterModule,
    ScrollingModule,
  ],
  providers: [
    CustomRouteReuseStrategy,
    PdfService,
    PerspectiveApiService,
    SheetsApiService,
    TwitterApiService,
    // See https://momentjs.com/docs/#/displaying/format/
    // Formats starting with 'l' and 'L' are localized formats.
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          // Parse input formats of Month numeral, day of month, year
          // (mm/dd/yyyy) and Month name, day of month, year (January 1, 2000)
          dateInput: ['l', 'LL'],
        },
        display: {
          dateInput: 'll', // Display as month name, day of month, year (Jan 1, 2000)
          monthYearLabel: 'MMM YYYY', // Abbreviated month (Jan, Feb...), full year
          dateA11yLabel: 'LL', // Month name, day of month, year (January 1, 2000).
          monthYearA11yLabel: 'MMMM YYYY', // Full month name, full year
        },
      },
    },
    { provide: APP_BASE_HREF, useValue: '/' },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
