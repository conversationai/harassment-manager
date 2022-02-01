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
import { environment } from '../environments/environment';
import { ReportAction } from './report.service';

/**
 * We use the category to refer to what was interacted with, per documentation
 * guidelines:
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/events
 */
export enum EventCategory {
  REPORT = 'report',
  VIEW_ALL_COMMENTS_BUTTON = 'view_all_comments_button',
  ADD_ALL_TO_REPORT_BUTTON = 'add_all_to_report_button',
  ERROR = 'error',
  LOADING_STATE = 'loading_state',
}

/**
 * We use EventAction to refer to the type of interaction, per documentation
 * guidelines:
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/events
 */
export enum EventAction {
  START_REPORT = 'start_report',
  FINISH_REPORT = 'finish_report',
  CLICK = 'click',
  PERSPECTIVE_ERROR = 'perspective_error',
  LOAD_COMMENTS_ERROR = 'load_comments_error',
  FIRST_COMMENTS_LOADED = 'first_comments_loaded',
}

export type EventActionType = EventAction | ReportAction;

/**
 * The documentation says to use this field for 'categorizing events'.
 */
export type EventLabel = string | null;

const REPORT_STARTED_TIME_LABEL = 'reportStarted';

/** Service for sending Google Analytics events. */
@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService {
  /**
   * Emit google analytics event
   * Fire event example:
   *   this.emitEvent("testCategory", "testAction", "testLabel", 10);
   */
  emitEvent(
    eventCategory: EventCategory,
    eventAction: EventActionType,
    eventLabel: EventLabel | null = null,
    eventValue: number | null = null
  ) {
    const eventParams: Gtag.EventParams = {
      event_category: eventCategory as string,
    };
    if (eventLabel) {
      eventParams.event_label = eventLabel as string;
    }
    if (eventValue) {
      eventParams.value = eventValue as number;
    }

    gtag('event', eventAction as string, eventParams);
  }
}
