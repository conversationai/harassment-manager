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

import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  DropdownOption, FilterDropdownComponent
} from './filter-dropdown.component';


/**
 * Wrapper component that allows passing parameters via data binding, so we can
 * accurately test the behavior in ngOnChanges, which doesn't get triggered by
 * directly setting variables.
 */
@Component({
  selector: 'app-dropdown-test',
  template: `
    <app-filter-dropdown
      [options]="options"
      [selectFirstOption]="selectFirstOption"
      [multi]="multi"
      [selectAll]="selectAll"
      (selectedOptionsChange)="incrementSelectedOptionsChangeEventCount()"
      (customOptionSelected)="incrementCustomOptionCount()"
    >
    </app-filter-dropdown>
  `,
})
class DropdownTestComponent {
  @ViewChild(FilterDropdownComponent)
  dropdownComponent!: FilterDropdownComponent;

  options: DropdownOption[] = [];
  selectFirstOption = false;
  multi = false;
  selectAll = false;
  customOptionEventCount = 0;
  selectedOptionsChangeEventCount = 0;

  incrementCustomOptionCount() {
    this.customOptionEventCount++;
  }

  incrementSelectedOptionsChangeEventCount() {
    this.selectedOptionsChangeEventCount++;
  }
}

describe('FilterDropdownComponent', () => {
  let testComponent: DropdownTestComponent;
  let component: FilterDropdownComponent;
  let fixture: ComponentFixture<DropdownTestComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DropdownTestComponent, FilterDropdownComponent],
      imports: [
        FormsModule,
        MatIconModule,
        MatSelectModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
      ],
    }).compileComponents();
  }));

  function createComponent(
    options?: DropdownOption[],
    selectFirstOption?: boolean,
    multiple?: boolean,
    selectAll?: boolean
  ) {
    fixture = TestBed.createComponent(DropdownTestComponent);
    testComponent = fixture.componentInstance;
    if (options !== undefined) {
      testComponent.options = options;
    }
    if (selectFirstOption !== undefined) {
      testComponent.selectFirstOption = selectFirstOption;
    }
    if (multiple !== undefined) {
      testComponent.multi = multiple;
    }
    if (selectAll !== undefined) {
      testComponent.selectAll = selectAll;
    }
    fixture.detectChanges();
    component = testComponent.dropdownComponent;
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('Emits event for custom option selected', async () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, true);
    fixture.detectChanges();

    expect(component.selectedOption.value).toEqual(options[0]);
    expect(testComponent.customOptionEventCount).toEqual(0);

    component.selectForTesting.open();
    fixture.detectChanges();
    // Wait for everything to update before continuing, otherwise the open event
    // will not fire with the correct value.
    await fixture.whenStable();
    fixture.detectChanges();
    component.selectedOption.setValue(component.options[3]);
    fixture.detectChanges();
    component.selectForTesting.close();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(testComponent.customOptionEventCount).toEqual(1);

    // Select the custom option again, and make sure the event still fires.
    component.selectForTesting.open();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    component.selectedOption.setValue(component.options[3]);
    fixture.detectChanges();
    component.selectForTesting.close();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(testComponent.customOptionEventCount).toEqual(2);
  });

  it('Initializes with selectFirstOption = true', () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, true);

    expect(component.selectedOption.value).toEqual(options[0]);
  });

  it('Initializes with setFirstOption = false', () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, false);

    expect(component.selectedOption.value).toEqual(null);
  });

  it('Multiple select: Initializes with selectFirstOption = true', () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, true, true);

    expect(component.selectedOptions.value).toEqual([options[0]]);
  });

  it('Multiple select: Initializes with setFirstOption = false', () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, false, true);

    expect(component.selectedOptions.value).toEqual([]);
  });

  it('Multiple select: Initializes with selectAll = true', () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, false, true, true);

    expect(component.selectedOptions.value).toEqual([
      options[0],
      options[1],
      options[2],
      options[4],
    ]);
  });

  it('Multiple select: Initializes with selectAll = true overrides selectFirstOption = true', () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, true, true, true);

    expect(component.selectedOptions.value).toEqual([
      options[0],
      options[1],
      options[2],
      options[4],
    ]);
  });

  it('Multiple select: Deselects non-custom option when custom option selected', async () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, true, true);

    // Check that the first option is selected.
    expect(component.selectedOptions.value).toEqual([options[0]]);

    // Set values to the already selected first option plus the custom option to
    // mimic clicking on the custom option in addition to the first option in a
    // multi select.
    component.selectedOptions.setValue([
      component.options[0],
      component.options[3],
    ]);

    // Only the custom option should be selected.
    expect(component.selectedOptions.value).toEqual([component.options[3]]);
  });

  it('Multiple select: Deselects custom option when non custom option selected', async () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, false, true);
    fixture.detectChanges();

    expect(component.selectedOptions.value).toEqual([]);

    // Set values to the custom option.
    component.selectedOptions.setValue([component.options[3]]);

    // The custom option should be selected.
    expect(component.selectedOptions.value).toEqual([component.options[3]]);

    // Set values to the already selected custom option plus the first option to
    // mimic clicking on the first option in addition to the custom option in a
    // multi select.
    component.selectedOptions.setValue([
      component.options[0],
      component.options[3],
    ]);

    // Only the first option should be selected.
    expect(component.selectedOptions.value).toEqual([component.options[0]]);
  });

  it('Multiple select: Allows selecting multiple non custom options', async () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, true, true);
    fixture.detectChanges();

    // Check that the first option is selected.
    expect(component.selectedOptions.value).toEqual([options[0]]);

    // Set values to the already selected first option plus another option to
    // mimic clicking on another option in addition to the first option in a
    // multi select.
    component.selectedOptions.setValue([
      component.options[0],
      component.options[1],
    ]);
    fixture.detectChanges();

    // Check that the first two options are selected.
    expect(component.selectedOptions.value).toEqual([
      component.options[0],
      component.options[1],
    ]);
  });

  it('Multiple select: Emits event for custom option selected', async () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, true, true);
    fixture.detectChanges();

    // Check that the first option is selected.
    expect(component.selectedOptions.value).toEqual([options[0]]);
    expect(testComponent.customOptionEventCount).toEqual(0);

    // Set values to the already selected option plus the custom option to mimic
    // clicking on the custom option in addition to the first option in a multi
    // select.
    component.selectedOptions.setValue([
      component.options[0],
      component.options[3],
    ]);
    fixture.detectChanges();

    // Only the custom option should be selected.
    expect(component.selectedOptions.value).toEqual([component.options[3]]);
    expect(testComponent.customOptionEventCount).toEqual(1);

    // Select the custom option again, and make sure the event still fires.
    component.selectedOptions.setValue([component.options[3]]);
    expect(testComponent.customOptionEventCount).toEqual(2);
  });

  it('Multiple select: Emits event for non custom option selected', async () => {
    const options = [
      { displayText: 'puppies' },
      { displayText: 'kittens' },
      { displayText: 'bunnies' },
      { displayText: 'your favorite animal', customOption: true },
      { displayText: 'dragons' },
    ];
    createComponent(options, true, true);
    fixture.detectChanges();

    // Check that the first option is selected.
    expect(component.selectedOptions.value).toEqual([options[0]]);
    // The initial selection for selectFirstOption = true counts as one event.
    expect(testComponent.selectedOptionsChangeEventCount).toEqual(1);

    // Set values to the already selected option plus the custom option to mimic
    // clicking on the custom option in addition to the first option in a multi
    // select.
    component.selectedOptions.setValue([
      component.options[0],
      component.options[3],
    ]);
    fixture.detectChanges();

    // Only the custom option should be selected.
    expect(component.selectedOptions.value).toEqual([component.options[3]]);
    // No additional events from the custom option.
    expect(testComponent.selectedOptionsChangeEventCount).toEqual(1);

    // Select a non-custom option.
    component.selectedOptions.setValue([component.options[0]]);
    expect(component.selectedOptions.value).toEqual([component.options[0]]);
    expect(testComponent.selectedOptionsChangeEventCount).toEqual(2);

    // Select another non-custom option.
    component.selectedOptions.setValue([
      component.options[0],
      component.options[1],
    ]);
    expect(component.selectedOptions.value).toEqual([
      component.options[0],
      component.options[1],
    ]);
    expect(testComponent.selectedOptionsChangeEventCount).toEqual(3);
  });
});
