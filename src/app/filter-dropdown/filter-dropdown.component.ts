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
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  SimpleChanges,
  OnChanges,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { pairwise, startWith } from 'rxjs/operators';

export interface DropdownOption {
  displayText: string;
  customOption?: boolean;
}

/** Component that displays a dropdown selection list for a filter setting. */
@Component({
  selector: 'app-filter-dropdown',
  templateUrl: './filter-dropdown.component.html',
  styleUrls: ['./filter-dropdown.component.scss'],
})
export class FilterDropdownComponent implements OnInit, OnChanges {
  @Input() options: DropdownOption[] = [];
  @Input() label = '';
  @Input() multi = false;
  @Input() selectFirstOption = false;
  @Input() selectAll = false;
  @Input() colorChangeOnSelect = true;
  @Input() multiSelectionLabelPrefix = '';

  @Output() selectedOptionChange = new EventEmitter<DropdownOption>();
  @Output() customOptionSelected = new EventEmitter<void>();
  @Output() selectedOptionsChange = new EventEmitter<DropdownOption[]>();

  // Reference to the single select MatSelect in the template; only used for
  // testing.
  @ViewChild('optionsSelect') selectForTesting!: MatSelect;

  // Selected item when multi = false.
  selectedOption = new FormControl();
  // Selected item(s) when multi = true.
  selectedOptions = new FormControl();

  // Previously selected option for the single select menu.
  private previousSelectedOption: DropdownOption | null = null;

  // Previously selected options for the multi-select menu.
  private previousSelectedOptions: DropdownOption[] | null = null;

  ngOnInit() {
    this.selectedOption.valueChanges
      .pipe(startWith(this.selectedOption.value), pairwise())
      .subscribe(([oldValue, newValue]) => {
        this.previousSelectedOption = oldValue;
        this.selectedOptionChange.emit(this.selectedOption.value);
      });

    this.selectedOptions.valueChanges
      .pipe(startWith(this.selectedOptions.value), pairwise())
      .subscribe(([oldValues, newValues]) => {
        this.handleSelectedOptionsChange(oldValues, newValues);
      });
    this.resetSelectedOption();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['options']) {
      this.selectedOption.setValue(null);
      this.selectedOptions.setValue([]);
      this.resetSelectedOption();
    }
  }

  private handleSelectedOptionsChange(
    oldValues: DropdownOption[],
    newValues: DropdownOption[]
  ) {
    const customSelectedOptions: DropdownOption[] = [];
    const nonCustomSelectedOptions: DropdownOption[] = [];
    for (const option of this.selectedOptions.value) {
      if (option.customOption) {
        customSelectedOptions.push(option);
      } else {
        nonCustomSelectedOptions.push(option);
      }
    }

    const customPreviouslySelected =
      oldValues && oldValues.length === 1 && oldValues[0].customOption;
    if (customPreviouslySelected && this.selectedOptions.value.length > 1) {
      // Deselect the custom option because a non-custom option was selected.
      this.selectedOptions.setValue(nonCustomSelectedOptions);
      return;
    }

    if (customSelectedOptions.length) {
      if (nonCustomSelectedOptions.length) {
        // Custom option is newly selected. Unselect the other options.
        this.previousSelectedOptions = nonCustomSelectedOptions;
        this.selectedOptions.setValue(customSelectedOptions);
      } else {
        // Only the custom option is selected; emit an event.
        this.customOptionSelected.emit();
      }
    } else {
      // Regular change in selected options without changing custom option
      // state; emit an event.
      this.previousSelectedOptions = this.selectedOptions.value;
      this.selectedOptionsChange.emit(this.selectedOptions.value);
    }
  }

  resetSelectedOption() {
    if (this.selectAll && this.multi && this.options.length > 0) {
      this.selectedOptions.setValue(
        this.options.filter(option => !option.customOption)
      );
    } else if (this.selectFirstOption && this.options.length > 0) {
      this.selectedOption.setValue(this.options[0]);
      this.selectedOptions.setValue([this.options[0]]);
    }
  }

  setSelectedOption(option: DropdownOption) {
    this.selectedOption.setValue(option);
    this.selectedOptions.setValue([option]);
  }

  setSelectedOptions(options: DropdownOption[]) {
    this.selectedOptions.setValue(options);
  }

  onOpenedChange(open: boolean) {
    // Since the selectChange event only fires when the selected item changes,
    // we check if the custom option was selected when the menu is closed. In
    // this case, we emit an additional event, in case the user wants to handle
    // the custom option differently.
    if (
      !open &&
      this.selectedOption &&
      this.selectedOption.value.customOption
    ) {
      this.customOptionSelected.emit();
    }
  }

  setToPreviousSelectedValue() {
    this.selectedOption.setValue(this.previousSelectedOption);
    this.selectedOptions.setValue(this.previousSelectedOptions);
  }

  getSelectedValues(): string {
    return this.selectedOptions.value
      .map((option: DropdownOption) => option.displayText)
      .join();
  }

  isFilterActive(): boolean {
    return (
      this.selectedOption.value ||
      (this.selectedOptions.value && this.selectedOptions.value.length > 0)
    );
  }

  getMultiSelectLabelValue(): string {
    const numSelected = this.selectedOptions.value.length;
    let label = `${this.label}: `;

    if (numSelected === 1) {
      return `${label} ${this.selectedOptions.value[0].displayText}`;
    }

    label += `${numSelected}`;
    if (this.multiSelectionLabelPrefix) {
      label += ` ${this.multiSelectionLabelPrefix}`;
    }
    return `${label} selected`;
  }

  getMatSelectTriggerLabelAndA11yText(): string {
    if (this.multi) {
      return this.getMultiSelectLabelValue();
    } else {
      return `${this.label}${this.selectedOption.value ? ': ' + this.selectedOption.value.displayText : ''}`;
    }
  }
}
