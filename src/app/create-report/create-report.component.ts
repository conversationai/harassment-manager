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
import {
  ConnectedPosition,
  ScrollStrategy,
  ScrollStrategyOptions,
} from '@angular/cdk/overlay';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  Injectable,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import {
  MatPaginator,
  MatPaginatorIntl,
  PageEvent,
} from '@angular/material/paginator';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { take } from 'rxjs/operators';
import {
  ScoredItem,
  SelectableItem,
  SocialMediaItem,
  TwitterApiVersion,
} from '../../common-types';
import { Attributes } from '../../perspectiveapi-types';
import { CommentInfoComponent } from '../comment-info/comment-info.component';
import { isSameDay } from '../common/date_utils';
import { getInfluenceScore } from '../common/social_media_item_utils';
import { DateFilterService } from '../date-filter.service';
import { DatePickerDialogComponent } from '../date-picker-dialog/date-picker-dialog.component';
import {
  DropdownOption,
  FilterDropdownComponent,
} from '../filter-dropdown/filter-dropdown.component';
import {
  applyCommentFilters,
  buildDateFilterForNDays,
  DateFilter,
  DayFilterType,
  ToxicityRangeFilter,
} from '../filter_utils';
import {
  EventAction,
  EventCategory,
  GoogleAnalyticsService,
} from '../google_analytics.service';
import { OnboardingService } from '../onboarding.service';
import {
  RecommendedReportTemplate,
  TOXICITY_RANGE_TEMPLATES,
} from '../recommended-report-card/recommended-report-card.component';
import { RegexFilter } from '../regular-expression-filter/regular-expression-filter.component';
import { ReportService } from '../report.service';
import { SearchBoxComponent } from '../search-box/search-box.component';
import { SocialMediaItemService } from '../social-media-item.service';
import { ToxicityRangeSelectorDialogComponent } from '../toxicity-range-selector-dialog/toxicity-range-selector-dialog.component';

enum DateFilterName {
  YESTERDAY = 'Since yesterday',
  LAST_TWO_DAYS = 'Last two days',
  LAST_WEEK = 'Last week',
  LAST_MONTH = 'Last month',
  CUSTOM = 'Custom range',
}

enum OnboardingStep {
  NONE,
  HIGHLIGHT_BLUR_TOGGLE,
  HIGHLIGHT_FILTERS,
  HIGHLIGHT_PAGINATION,
  HIGHLIGHT_COMMENT_CARD,
}

interface DateFilterDropdownOption extends DropdownOption {
  numDays?: number;
}

export interface ToxicityRangeFilterDropdownOption extends DropdownOption {
  toxicityRangeFilter?: ToxicityRangeFilter;
  name: string;
}

interface MetadataFilterDropdownOption extends DropdownOption {
  hasImage?: boolean;
  verified?: boolean;
}

export enum SortOption {
  PRIORITY = 'Highest priority',
  TIME = 'Most recent',
  POPULARITY = 'Most popular',
}

export const TOXICITY_FILTER_NAME_QUERY_PARAM = 'toxicityFilterName';

const PAGE_SIZE = 8;

// Represents the empty comment data for a loading comment card.
const LOADING_COMMENT = {
  selected: false,
  disabled: true,
  item: null,
  scores: {},
};

function getRangeLabel(page: number, pageSize: number, length: number) {
  if (length <= pageSize) {
    return `Showing ${length} of ${length} comments`;
  }

  length = Math.max(length, 0);
  const startIndex = page * pageSize;

  // This ternary handles the condition in which the user changes the page
  // size. We don't currently allow that in the app, but we keep the logic
  // just in case.
  const endIndex =
    startIndex < length
      ? Math.min(startIndex + pageSize, length) 
      : startIndex + pageSize;
  return `Showing ${startIndex + 1} – ${endIndex} of ${length} comments`;
}

@Injectable()
export class PaginatorIntl extends MatPaginatorIntl {
  getRangeLabel = getRangeLabel;
}

@Component({
  selector: 'app-create-report',
  templateUrl: './create-report.component.html',
  styleUrls: ['./create-report.component.scss'],
  providers: [{ provide: MatPaginatorIntl, useClass: PaginatorIntl }],
})
export class CreateReportComponent implements OnInit, AfterViewInit {
  // Copy of enum for use in the template.
  readonly OnboardingStep = OnboardingStep;

  currentOnboardingStep = OnboardingStep.NONE;

  overlayScrollStrategy: ScrollStrategy;

  // Twitter Api Version
  useEssentialOrElevatedV2 = false
  

  // This describes how the overlay should be connected to the origin element.
  highlightViewSettingsConnectedOverlayPositions: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'center',
      overlayX: 'start',
      overlayY: 'center',
      offsetX: 24,
    },
  ];

  centerBottomConnectedOverlayPositions: ConnectedPosition[] = [
    {
      originX: 'center',
      originY: 'bottom',
      overlayX: 'center',
      overlayY: 'top',
    },
    // Use center top if center bottom doesn't fit onscreen
    {
      originX: 'center',
      originY: 'top',
      overlayX: 'center',
      overlayY: 'bottom',
      offsetY: -24,
    },
  ];

  leftBottomConnectedOverlayPositions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: 24,
    },
    // Use left top if left bottom doesn't fit onscreen.
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetY: -24,
    },
  ];

  @Output() triggerHighlightReviewReportButtonOnboardingStep = new EventEmitter<
    void
  >();

  @ViewChildren(CommentInfoComponent) itemList!: QueryList<
    CommentInfoComponent
  >;
  @ViewChild('dateFilterDropdown') dateFilterDropdown!: FilterDropdownComponent;
  @ViewChild('moreFiltersDropdown')
  moreFiltersDropdown!: FilterDropdownComponent;
  @ViewChild('toxicityRangeDropdown')
  toxicityRangeDropdown!: FilterDropdownComponent;
  @ViewChild('selectAllCheckbox') selectAllCheckbox!: MatCheckbox;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(SearchBoxComponent) searchBoxComponent!: SearchBoxComponent;

  private pageIndex = 0;
  private numPages = 0;
  private now: Date;

  comments: Array<SelectableItem<SocialMediaItem>> = [];
  error: string | null = null;
  loading = false;
  lastLoadedDate = '';
  commentsLoaded = 0;
  initialToxicityFilterNames: string[] = [''];

  // A subset of comments that meet the user-selected filters, sorted based on
  // the selectedSortOption.
  filteredComments: Array<SelectableItem<SocialMediaItem>> = [];

  includeRegexFilters: RegexFilter[] = [];
  excludeRegexFilters: RegexFilter[] = [];
  toxicityRangeFilters: ToxicityRangeFilter[] = [];

  hasImageFilter = false;
  shouldBlur = true;
  verifiedFilter = false;

  pageSize = PAGE_SIZE;

  fullDateDropdownOptions: DateFilterDropdownOption[] = [
    { displayText: DateFilterName.YESTERDAY, numDays: 1 },
    { displayText: DateFilterName.LAST_TWO_DAYS, numDays: 2 },
    { displayText: DateFilterName.LAST_WEEK, numDays: 7 },
    { displayText: DateFilterName.LAST_MONTH, numDays: 31 },
    { displayText: DateFilterName.CUSTOM, customOption: true },
  ];

  essentialDateDropdownOptions: DateFilterDropdownOption[] = [
    { displayText: DateFilterName.YESTERDAY, numDays: 1 },
    { displayText: DateFilterName.LAST_TWO_DAYS, numDays: 2 },
    { displayText: DateFilterName.LAST_WEEK, numDays: 7 },
  ]

  dateDropdownOptions: DateFilterDropdownOption[] = this.useEssentialOrElevatedV2 ?  this.essentialDateDropdownOptions : this.fullDateDropdownOptions

  dateFilter: DateFilter;

  recommendedDropdownOptions = [
    { displayText: 'Severe' },
    { displayText: 'High' },
  ];

  toxicityRangeDropdownOptions: ToxicityRangeFilterDropdownOption[] = TOXICITY_RANGE_TEMPLATES.map(
    template => {
      const rangeFilter = template.toxicityRangeFilter;
      const minPercent = Math.round(rangeFilter.minScore * 100);
      const maxPercent =
        rangeFilter.maxScore === 1
          ? 100
          : Math.round(rangeFilter.maxScore * 100) - 1;
      const scoreRange =
        template.name === 'Unable to score'
          ? '(-)'
          : '(' + minPercent + ' - ' + maxPercent + '%)';
      return {
        name: template.name,
        displayText: `${template.description} ${scoreRange}`,
        toxicityRangeFilter: template.toxicityRangeFilter,
      } as ToxicityRangeFilterDropdownOption;
    }
  ).concat([
    {
      name: 'Custom range',
      displayText: 'Custom range',
      customOption: true,
    },
  ]);

  moreDropdownOptions: MetadataFilterDropdownOption[] = [
    { displayText: 'Verified accounts only', verified: true },
    { displayText: 'Comment includes images', hasImage: true },
  ];

  sortOptions = [SortOption.PRIORITY, SortOption.TIME, SortOption.POPULARITY];
  selectedSortOption = this.sortOptions[0];

  private datePickerDialogOpen = false;
  private toxicityRangeDialogOpen = false;

  // Max visible page buttons to be displayed in the bottom pagination.
  readonly maxBottomPaginationPages = 6;

  selectedItemsForPage: Array<SelectableItem<SocialMediaItem>> = [];

  constructor(
    public dialog: MatDialog,
    private dateFilterService: DateFilterService,
    private reportService: ReportService,
    private router: Router,
    private route: ActivatedRoute,
    private socialMediaItemsService: SocialMediaItemService,
    private readonly scrollStrategyOptions: ScrollStrategyOptions,
    private onboardingService: OnboardingService,
    private googleAnalyticsService: GoogleAnalyticsService,
    private liveAnnouncer: LiveAnnouncer,
      private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
  ) {
    this.overlayScrollStrategy = this.scrollStrategyOptions.block();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.initialToxicityFilterNames = this.getInitialToxicityFilterNames();

        this.setInitialToxicityFilterOptions();
      }
    });

    this.now = new Date(this.dateFilterService.getStartTimeMs());
    this.dateFilter = buildDateFilterForNDays(
      this.now,
      this.dateDropdownOptions[0].numDays!
    );

    this.dateFilterService.getFilter().subscribe((newFilter: DateFilter) => {
      const previousFilter = this.dateFilter;
      this.dateFilter = newFilter;

      if (dateFilterWithinRange(previousFilter, newFilter)) {
        this.applyFilters();
      } else {
        this.commentsLoaded = 0;
        this.getComments();
      }
    });

    this.reportService.reportCommentsChanged.subscribe(() => {
      this.toggleItemsInReport();
    });

    this.reportService.reportCleared.subscribe(() => {
      // Reset the UI.
      // Reset sorting
      this.selectedSortOption = this.sortOptions[0];
      // Reset search box
      if (this.searchBoxComponent) {
        this.searchBoxComponent.resetFilters();
      }
      // Reset toxicity options.
      if (this.toxicityRangeDropdown) {
        this.initialToxicityFilterNames = TOXICITY_RANGE_TEMPLATES.map(
          template => template.name
        );
        this.setInitialToxicityFilterOptions();
      }
      // Reset date filter option.
      if (this.dateFilterDropdown) {
        this.dateFilterDropdown.setSelectedOption(this.dateDropdownOptions[0]);
      }
      // Reset more filters options.
      if (this.moreFiltersDropdown) {
        this.moreFiltersDropdown.setSelectedOptions([]);
      }
      // Get latest data.
      this.refresh();
    });

    this.socialMediaItemsService.onSocialMediaItemsLoaded.subscribe(
      (newCount: number) => {
        this.commentsLoaded = newCount;
      }
    );

    this.iconRegistry
      .addSvgIcon(
        'open_report_icon',
        this.sanitizer.bypassSecurityTrustResourceUrl('eye-on.svg')
      )
      .addSvgIcon(
        'close_report_icon',
        this.sanitizer.bypassSecurityTrustResourceUrl(
          '/eye-off.svg'
        )
      )
  }

  ngOnInit() {
    this.initialToxicityFilterNames = this.getInitialToxicityFilterNames();
    this.getComments();
    this.getTwitterApiVersion();
  }

  ngAfterViewInit() {
    // When first creating the component, check if a recommended report was used
    // to navigate here, and set the filter accordingly.
    // Wrap in a Promise.resolve() to avoid an
    // ExpressionChangedAfterItHasBeenChecked error.
    Promise.resolve().then(() => {
      this.setInitialToxicityFilterOptions();

      // We have to wait for the ViewChild to load to start onboarding, so we do
      // this in ngAfterViewInit.
      this.onboardingService
        .getCreateReportPageOnboardingComplete()
        .subscribe((onboarded: boolean) => {
          if (!onboarded) {
            this.nextOnboardingStep();
          }
        });
    });
  }

  private getInitialToxicityFilterNames(): string[] {
    const names = this.route.snapshot.queryParamMap.getAll(
      TOXICITY_FILTER_NAME_QUERY_PARAM
    );
    return names.length ? names : [''];
  }

  nextOnboardingStep() {
    this.liveAnnouncer.announce('Opened next walkthrough dialog');
    if (this.currentOnboardingStep === OnboardingStep.NONE) {
      this.currentOnboardingStep = OnboardingStep.HIGHLIGHT_BLUR_TOGGLE;
    } else if (
      this.currentOnboardingStep === OnboardingStep.HIGHLIGHT_BLUR_TOGGLE
    ) {
      this.currentOnboardingStep = OnboardingStep.HIGHLIGHT_FILTERS;
    } else if (
      this.currentOnboardingStep === OnboardingStep.HIGHLIGHT_FILTERS
    ) {
      this.currentOnboardingStep = OnboardingStep.HIGHLIGHT_PAGINATION;
    } else if (
      this.currentOnboardingStep === OnboardingStep.HIGHLIGHT_PAGINATION
    ) {
      this.currentOnboardingStep = OnboardingStep.HIGHLIGHT_COMMENT_CARD;
    } else if (
      this.currentOnboardingStep === OnboardingStep.HIGHLIGHT_COMMENT_CARD
    ) {
      // The next onboarding step is highlighting the review report button,
      // which needs to be done in the toolbar component, so we use a service.
      this.onboardingService.triggerHighlightReviewReportButton();
      this.currentOnboardingStep = OnboardingStep.NONE;
    }
  }

  // Given a ISO 8601 date (like '2020-11-10T17:44:51.000Z') format it
  // as 'Month Day Time Timezone' like 'Jan 8 12:42 EST'
  private formatLastLoadedDate(date: Date): string {
    return `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })}`;
  }

  private getComments() {
    this.loading = true;
    this.error = null;
    this.socialMediaItemsService
      .fetchItems(
        this.dateFilter.startDateTimeMs,
        this.dateFilter.endDateTimeMs
      )
      .pipe(take(1))
      .subscribe(
        (items: Array<ScoredItem<SocialMediaItem>>) => {
          this.comments = items.map(
            (item): SelectableItem<SocialMediaItem> => {
              return {
                item: item.item,
                scores: item.scores,
                selected: false,
              };
            }
          );
          this.toggleItemsInReport();
          this.applyFilters();
          this.loading = false;
          this.lastLoadedDate = this.formatLastLoadedDate(new Date());
        },
        error => {
          this.error = error;
          this.comments = [];
          this.loading = false;
          this.googleAnalyticsService.emitEvent(
            EventCategory.ERROR,
            EventAction.LOAD_COMMENTS_ERROR,
            error
          );
        }
      );
  }

  private getTwitterApiVersion() {
    this.socialMediaItemsService.getTwitterApiVersion().subscribe((version:TwitterApiVersion) => {
      this.useEssentialOrElevatedV2 = version === TwitterApiVersion.ESSENTIAL_OR_ELEVATED_V2;
    },
      _error => {
        this.useEssentialOrElevatedV2 = false;
      }
    )
    this.dateDropdownOptions = this.useEssentialOrElevatedV2 ?  this.essentialDateDropdownOptions : this.fullDateDropdownOptions
  }

  private shouldSelectOption(
    option: ToxicityRangeFilterDropdownOption
  ): boolean {
    return (
      this.initialToxicityFilterNames[0] === 'All' ||
      this.initialToxicityFilterNames.includes(option.name)
    );
  }

  private setInitialToxicityFilterOptions() {
    if (this.initialToxicityFilterNames.length && this.toxicityRangeDropdown) {
      const optionsToSelect: ToxicityRangeFilterDropdownOption[] = [];
      // Add the options from the initialToxicityFilterNames. The 'Customize
      // Range' option should never be added, so it is omitted.
      for (const option of this.toxicityRangeDropdownOptions.slice(0, -1)) {
        if (this.shouldSelectOption(option)) {
          optionsToSelect.push(option);
        }
      }
      if (optionsToSelect.length) {
        this.toxicityRangeDropdown.setSelectedOptions(optionsToSelect);
      }
      this.applyFilters();
    }
  }

  getDatePickerDialogOpen() {
    return this.datePickerDialogOpen;
  }

  getToxicityRangeDialogOpen() {
    return this.toxicityRangeDialogOpen;
  }

  applySortOption() {
    // Make a copy of comments, since js sort methods sort in place.
    const commentsCopy = this.filteredComments.slice();
    switch (this.selectedSortOption) {
      case SortOption.PRIORITY:
        // Based on the ordering of TOXICITY_RANGE_TEMPLATES, unscored
        // comments can have a greater priority than other comments with
        // toxicity scores. The unscoredValue is the minimum toxicity score of
        // a comment with greater priority than an unscored comment.
        // Note: This assumes that the order of templates in the
        // TOXICITY_RANGE_TEMPLATES is the intended filter ordering.
        const indexUnscored = TOXICITY_RANGE_TEMPLATES.findIndex(
          (template: RecommendedReportTemplate) =>
            template.name === 'Unable to score'
        );
        const unscoredValue =
          TOXICITY_RANGE_TEMPLATES[indexUnscored - 1].toxicityRangeFilter
            .minScore;
        this.filteredComments = commentsCopy.sort((a, b) => {
          const aScore = a.scores[Attributes.TOXICITY];
          const bScore = b.scores[Attributes.TOXICITY];
          if (aScore === bScore) {
            return 0;
          } else if (aScore && bScore) {
            // both are numbers
            return this.toNumberOrZero(aScore) > this.toNumberOrZero(bScore)
              ? -1
              : 1;
          } else if (aScore) {
            // aScore is a number, bScore is undefined
            return this.toNumberOrZero(aScore) >= unscoredValue ? -1 : 1;
          } else {
            // bScore is a number, aScore is undefined
            return this.toNumberOrZero(bScore) >= unscoredValue ? 1 : -1;
          }
        });
        break;
      case SortOption.TIME:
        this.filteredComments = commentsCopy.sort((a, b) => {
          if (a.item.date === b.item.date) {
            return 0;
          } else {
            return a.item.date > b.item.date ? -1 : 1;
          }
        });
        break;
      case SortOption.POPULARITY:
        this.filteredComments = commentsCopy.sort((a, b) => {
          const aPopularity = getInfluenceScore(a.item);
          const bPopularity = getInfluenceScore(b.item);
          if (aPopularity === bPopularity) {
            return 0;
          } else {
            return aPopularity > bPopularity ? -1 : 1;
          }
        });
        break;
      default:
        break;
    }
  }

  // Used for testing
  getSelectedComments() {
    return this.filteredComments.filter(c => c.selected);
  }

  private updateSelectedItemsForPage() {
    this.selectedItemsForPage = this.itemList
      .filter(item => item.selected && item.comment !== undefined)
      .map(item => item.comment!);
  }

  updateSelectedComment(comment: SelectableItem<SocialMediaItem>) {
    if (comment.selected) {
      this.reportService.addCommentsToReport([comment]);
    } else {
      this.reportService.removeCommentFromReport(comment);
    }
    this.updateSelectedItemsForPage();
  }

  private updateSelectedComments(
    comments: Array<SelectableItem<SocialMediaItem>>
  ) {
    const allSelected = comments.every(c => c.selected);
    if (allSelected) {
      // If all are selected, add them to the report in batch.
      this.reportService.addCommentsToReport(comments);
      this.updateSelectedItemsForPage();
    } else {
      for (const comment of comments) {
        this.updateSelectedComment(comment);
      }
    }
  }

  selectAll() {
    const commentsToUpdate = [];
    for (const item of this.itemList) {
      if (item.comment && !item.comment.disabled) {
        item.selected = true;
        commentsToUpdate.push(item.comment);
      }
    }
    this.updateSelectedComments(commentsToUpdate);
  }

  deselectAll() {
    const commentsToUpdate = [];
    for (const item of this.itemList) {
      if (item.comment && !item.comment.disabled) {
        item.selected = false;
        commentsToUpdate.push(item.comment);
      }
    }
    this.updateSelectedComments(commentsToUpdate);
  }

  /**
   * Applies toxicity range, date, and keyword filters.
   *
   * Note that this updates automatically when filters are updated, which will
   * result in hiding any selected items that don't fall within filter
   * parameters.
   */
  applyFilters(): void {
    const regexFilters = this.includeRegexFilters.concat(
      this.excludeRegexFilters
    );
    this.filteredComments = applyCommentFilters<
      SelectableItem<SocialMediaItem>
    >(this.comments, {
      toxicityRangeFilters: this.toxicityRangeFilters,
      regexFilters,
      dateFilter: this.dateFilter,
      imageFilter: this.hasImageFilter,
      verifiedFilter: this.verifiedFilter,
    });
    this.applySortOption();
    if (this.pageIndex * this.pageSize > this.filteredComments.length) {
      // The current page index is higher than the total number of pages, so
      // reset to the first page.
      this.paginator.firstPage();
    }
    this.numPages = Math.ceil(this.filteredComments.length / this.pageSize);
  }

  formatScore(score: number): number {
    return Math.round(score * 100) / 100;
  }

  getFormattedDate(timeMs: number): string {
    return new Date(timeMs).toLocaleString('en-US', { timeZone: 'UTC' });
  }

  getIncludeKeywordsFilterActive(): boolean {
    return this.includeRegexFilters.length > 0;
  }

  getExcludeKeywordsFilterActive(): boolean {
    return this.excludeRegexFilters.length > 0;
  }

  getIncludeKeywordsDisplayString(): string {
    return this.includeRegexFilters.map(item => item.regex).join();
  }

  getExcludeKeywordsDisplayString(): string {
    return this.excludeRegexFilters.map(item => item.regex).join();
  }

  dateFilterSelectionChanged(selection: DateFilterDropdownOption) {
    if (!selection) {
      return;
    }

    this.now = new Date();

    if (selection.customOption) {
      this.getCustomDateFilter();
    } else if (selection.numDays) {
      const  filterType:DayFilterType = this.useEssentialOrElevatedV2? DayFilterType.NOW : DayFilterType.MIDNIGHT;
      this.dateFilterService.updateFilter( 
        buildDateFilterForNDays(this.now, selection.numDays, filterType )
      );
    }
  }

  /** Opens a dialogue to select a custom date range. */
  getCustomDateFilter() {
    if (this.datePickerDialogOpen) {
      return;
    }
    const dialogRef = this.dialog.open(DatePickerDialogComponent);
    this.datePickerDialogOpen = true;
    dialogRef.afterClosed().subscribe(result => {
      this.datePickerDialogOpen = false;
      if (result) {
        this.dateFilterService.updateFilter(result);
      }
    });
  }

  toxicityRangeSelectionChanged(
    selection: ToxicityRangeFilterDropdownOption[]
  ) {
    const toxicityRangeFilters: ToxicityRangeFilter[] = [];
    for (const item of selection) {
      if (item.toxicityRangeFilter) {
        toxicityRangeFilters.push(item.toxicityRangeFilter);
      }
    }
    this.toxicityRangeFilters = toxicityRangeFilters;
    this.applyFilters();
  }

  metadataFilterSelectionChanged(selection: MetadataFilterDropdownOption[]) {
    this.hasImageFilter = false;
    this.verifiedFilter = false;
    for (const option of selection) {
      if (option.hasImage) {
        this.hasImageFilter = true;
      }
      if (option.verified) {
        this.verifiedFilter = true;
      }
    }
    this.applyFilters();
  }

  /** Opens a dialogue to select a toxicity range. */
  getCustomToxicityRange() {
    if (this.toxicityRangeDialogOpen) {
      return;
    }
    const dialogRef = this.dialog.open(ToxicityRangeSelectorDialogComponent);
    this.toxicityRangeDialogOpen = true;
    dialogRef.afterClosed().subscribe(result => {
      this.toxicityRangeDialogOpen = false;
      if (result) {
        this.toxicityRangeFilters = [result];
        this.applyFilters();
      } else {
        this.toxicityRangeDropdown.setToPreviousSelectedValue();
      }
    });
  }

  getPaginatedItems():
    | Array<SelectableItem<SocialMediaItem>>
    | Array<SelectableItem<null>> {
    if (this.loading) {
      const loadingComments = [];
      for (let i = 0; i < PAGE_SIZE; i++) {
        loadingComments.push(LOADING_COMMENT);
      }
      return loadingComments;
    }
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredComments.slice(startIndex, endIndex);
  }

  page(pageEvent: Partial<PageEvent>): void {
    if (pageEvent.pageIndex !== undefined) {
      this.pageIndex = pageEvent.pageIndex;
    }
    // Unchecks the select all checkbox so the user can select all on the next
    // page if they want to.
    this.selectAllCheckbox.checked = false;
  }

  /** Gets a list of pages for pagination in the template. */
  getAllPages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.numPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  /** Gets a list of pages for pagination before the ellipsis. */
  getStartAbbreviatedPages(): number[] {
    const startPages: number[] = [];
    if (this.pageIndex >= this.numPages - (this.maxBottomPaginationPages - 1)) {
      // If we're at the end, we want to show 1 ... n-2 n-1 n so
      // we just return 1 here.
      startPages.push(1);
    } else {
      // Otherwise show something like c c+1 c+2 c+3 c+4 ... n where
      // c = current page, so we return c c+1 c+2 c+3 c+4 here.
      const start = this.pageIndex + 1;
      const end = Math.min(
        this.pageIndex + this.maxBottomPaginationPages - 1,
        this.numPages - 2
      );
      for (let i = start; i <= end; i++) {
        startPages.push(i);
      }
    }
    return startPages;
  }

  /** Gets a list of pages for pagination after the ellipsis. */
  getEndAbbreviatedPages(): number[] {
    const startPages = this.getStartAbbreviatedPages();
    const endPages: number[] = [];

    if (startPages.length === 1 && startPages[0] === 1) {
      // If we're at the end, we want to show 1 ... n-2 n-1 n so
      // startAbbreviatedPages will just be 1 and we want to return
      // n-4 n-3 n-2 n-1 n here.
      const start = this.numPages - (this.maxBottomPaginationPages - 2);
      const end = this.numPages;
      for (let i = start; i <= end; i++) {
        endPages.push(i);
      }
    } else {
      // Otherwise just return the last number.
      endPages.push(this.numPages);
    }
    return endPages;
  }

  toNumberOrZero(input: string | number | undefined): number {
    return Number(input) || 0;
  }

  handleRegexFiltersChanged(filters: RegexFilter[]) {
    this.includeRegexFilters = filters;
    this.applyFilters();
  }

  refresh() {
    const endDate = new Date(this.dateFilter.endDateTimeMs);

    // Avoid refetching data if a user has selected a custom date range with a
    // end date != today.
    if (!isSameDay(endDate, this.now)) {
      return;
    }

    // Update the end date time to "now" so we refetch data.
    this.now = new Date();
    this.dateFilterService.updateFilter({
      startDateTimeMs: this.dateFilter.startDateTimeMs,
      endDateTimeMs: this.now.getTime(),
    });
  }

  setPageSize(pageSize: number) {
    this.pageSize = pageSize;
    this.numPages = Math.ceil(this.filteredComments.length / this.pageSize);
  }

  // Only used for testing.
  getPageIndex() {
    return this.pageIndex;
  }

  getRangeLabel(page: number, pageSize: number, length: number) {
    return getRangeLabel(page, pageSize, length);
  }

  private toggleItemsInReport() {
    const reportItemIds = this.reportService
      .getCommentsForReport()
      .map(item => item.item.id_str);

    for (const comment of this.comments) {
      // We check the comment if it's in the report, otherwise uncheck it.
      comment.selected = reportItemIds.includes(comment.item.id_str);
    }
  }
}

function dateFilterWithinRange(
  filter1: DateFilter,
  filter2: DateFilter
): boolean {
  return (
    filter2.startDateTimeMs >= filter1.startDateTimeMs &&
    filter2.endDateTimeMs <= filter1.endDateTimeMs
  );
}
