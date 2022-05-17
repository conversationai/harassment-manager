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

import {
  ConnectedPosition,
  ScrollStrategy,
  ScrollStrategyOptions,
} from '@angular/cdk/overlay';
import {
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { ActionService } from '../action.service';
import { ReportAction } from '../report.service';

// Describes a menu option for taking action on the report.
export interface ActionButtonOption {
  action: ReportAction;
  text: string;
  actionCompletedText?: string;
  actionInProgressText?: string;
  svgIcon?: string;
  iconText?: string;
  href?: SafeUrl;
  downloadFilename?: string;
  buffer?: ArrayBuffer;
}

@Component({
  selector: 'app-dropdown-button',
  templateUrl: './dropdown-button.component.html',
  styleUrls: ['./dropdown-button.component.scss'],
})
export class DropdownButtonComponent implements OnChanges {
  @Output() clickActionOption = new EventEmitter<ActionButtonOption>();
  @Output() selectActionOptionEvent = new EventEmitter<ActionButtonOption>();

  @Input() actionOptions: ActionButtonOption[] = [];
  @Input() selectedActionOptionIndex = 0;
  selectedActionOption: ActionButtonOption =
    this.actionOptions[this.selectedActionOptionIndex];
  @Input() actions: ReportAction[] = [];
  @Input() dropdownButtonAriaLabel = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['actionOptions'] || changes['selectedActionOptionIndex']) {
      this.selectedActionOption =
        this.actionOptions[this.selectedActionOptionIndex];
    }
  }

  actionInProgress = false;
  actionOptionsMenuOpen = false;
  dropdownScrollStrategy: ScrollStrategy;
  // This describes how the dropdown should be connected to the origin element.
  // We want it below the button.
  dropdownConnectedOverlayPositions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
    },
  ];

  constructor(
    private readonly actionService: ActionService,
    private readonly scrollStrategyOptions: ScrollStrategyOptions
  ) {
    this.actionService.actionState.subscribe((state) => {
      if (state.action === this.selectedActionOption.action) {
        this.actionInProgress = state.inProgress;
      }
    });

    this.dropdownScrollStrategy = this.scrollStrategyOptions.reposition();
  }

  getDropdownButtonAriaLabel(): string {
    return `${this.dropdownButtonAriaLabel} ${
      this.actionOptionsMenuOpen ? 'Click to collapse' : 'Click to expand'
    }`;
  }

  handleButtonClick(clickEvent: MouseEvent, saveOption: ActionButtonOption) {
    if (!saveOption.href) {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
    }
    this.clickActionOption.emit(saveOption);
  }

  toggleActionOptionsMenu(state?: boolean) {
    if (state !== undefined) {
      this.actionOptionsMenuOpen = state;
    } else {
      this.actionOptionsMenuOpen = !this.actionOptionsMenuOpen;
    }
  }

  selectActionOption(
    option: ActionButtonOption,
    event?: KeyboardEvent | MouseEvent
  ) {
    if (event) {
      // Some events cause unexpected behavior if we allow them to propagate,
      // like enter events. Without this the menu will toggle open again after
      // being closed when triggered by an enter event.
      event.stopPropagation();
      event.preventDefault();
    }
    this.selectedActionOption = option;
    this.toggleActionOptionsMenu(false);
    this.selectActionOptionEvent.emit(this.selectedActionOption);
  }

  getActionOptionDropdownDisabled(): boolean {
    if (
      this.selectedActionOption.action === ReportAction.DOWNLOAD_CSV ||
      this.selectedActionOption.action === ReportAction.DOWNLOAD_PDF
    ) {
      return !this.selectedActionOption.href;
    } else {
      return false;
    }
  }
}

/**
 * Directive that strips the "download" attribute if the href is empty or equal
 * to some specified value.
 * There is no way to do this with regular data binding. This allows us to use
 * the same <a> element for both downloading CSV/PDF and as a print button.
 */
@Directive({
  selector: '[hrefOnlyDownload]', // eslint-disable-line  @angular-eslint/directive-selector
})
export class HrefOnlyDownloadDirective implements OnChanges {
  @Input() downloadRef = '';
  // Href value we want to ignore the download for, if href is not empty.
  @Input() noActionHref = '';

  constructor(private element: ElementRef) {}

  ngOnChanges() {
    const href = this.element.nativeElement.getAttribute('href');
    if (!href || href === this.noActionHref) {
      this.element.nativeElement.removeAttribute('download');
    } else {
      this.element.nativeElement.setAttribute('download', this.downloadRef);
    }
  }
}
