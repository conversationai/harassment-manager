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

import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { focusElement } from '../common/a11y_utils';

export interface SideMenuSection {
  title: string;
  anchorSelector: string;
  selected: boolean;
}

@Component({
  selector: 'app-scrollable-side-menu',
  templateUrl: './scrollable-side-menu.component.html',
  styleUrls: ['./scrollable-side-menu.component.scss']
})
export class ScrollableSideMenuComponent {
  constructor(private elementRef: ElementRef) {}

  @Input() sideMenuSections: SideMenuSection[] = [];

  scrollToSelector(selector: string) {
    // Direct access of the DOM like this is generally discouraged in
    // Angular, but it's not clear how else we can call scrollIntoView().
    // Explore other options, such as intercepting nav events (see
    // https://stackoverflow.com/a/49522894).
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView();
      window.scrollBy(0, -64); // Account for toolbar.
      focusElement(element as HTMLElement);
    }
  }

  private unselectAllMenuSections() {
    for (const menuSection of this.sideMenuSections) {
      menuSection.selected = false;
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    this.unselectAllMenuSections();
    // Use the following logic to determine which menu section should be
    // selected.
    // 1. Determine if the scrollY of the page directly matches the offset of
    // the beginning of any of the sections. This is the selected section.
    // 2. If not, determine the percentage of each section that is visible on the page.
    // 3. If more than one section has the same percentage of visibility on the
    //    page, choose the top-most section if we are at the top of the page.
    //    Otherwise choose the bottom-most section.
    const percentagesVisible = new Array(this.sideMenuSections.length).fill(0);
    let maxPercentageIndices: number[] = [];
    let maxPercentage = 0;
    for (let i = 0; i < this.sideMenuSections.length; i++) {
      const menuSection = this.sideMenuSections[i];
      const element = document.querySelector(menuSection.anchorSelector);
      if (element) {
        // getBoundingClientRect is relative to the current scroll position.
        const boundingRect = element.getBoundingClientRect();
        if (boundingRect.y === 0) {
          menuSection.selected = true;
          return;
        } else {
          if (boundingRect.top <= window.innerHeight && boundingRect.bottom >= 0) {
            const elemPageStart = Math.max(0, boundingRect.top);
            const elemPageEnd = Math.min(window.innerHeight, boundingRect.bottom);
            percentagesVisible[i] =
              (elemPageEnd - elemPageStart) * 100.0 / (boundingRect.bottom - boundingRect.top);
          }
        }
      }
      if (percentagesVisible[i] > maxPercentage) {
        maxPercentageIndices = [i];
        maxPercentage = percentagesVisible[i];
      } else if (percentagesVisible[i] === maxPercentage) {
        maxPercentageIndices.push(i);
      }
    }

    let index;
    if (maxPercentageIndices.length === 1 || window.scrollY === 0) {
      index = 0;
    } else {
      index = maxPercentageIndices.length - 1;
    }
    this.sideMenuSections[maxPercentageIndices[index]].selected = true;
  }
}
