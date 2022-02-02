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

// Focuses element if it's focusable, or the first child of element that is
// focusable.
export function focusElement(element: HTMLElement) {
  const focusableElementSelectors = [ 
    'a', 'button', 'input', 'textarea', 'select', 'details',
    '[tabindex]:not([tabindex="-1"])'
  ];
  if ((element.hasAttribute('tabindex')
       && element.getAttribute('tabindex')! !== '-1' )
      || focusableElementSelectors.includes(element.tagName.toLowerCase())) {
    element.focus();
  } else {
    const focusableChildren = element.querySelectorAll(
      focusableElementSelectors.join(', '));
    if (focusableChildren.length) {
      (focusableChildren[0] as HTMLElement).focus();
    }
  }
}
