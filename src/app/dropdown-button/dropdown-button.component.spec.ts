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

import { OverlayModule } from '@angular/cdk/overlay';
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ReportAction } from '../report.service';

import {
  DropdownButtonComponent,
  ActionButtonOption,
  HrefOnlyDownloadDirective,
} from './dropdown-button.component';

/**
 * Wrapper component that allows passing parameters via data binding, so we can
 * accurately test the behavior in ngOnChanges, which doesn't get triggered by
 * directly setting variables.
 */
@Component({
  selector: 'app-dropdown-button-test',
  template: `
    <app-dropdown-button [actionOptions]="actionOptions"></app-dropdown-button>
  `,
})
class DropdownButtonTestComponent {
  @ViewChild(DropdownButtonComponent) component!: DropdownButtonComponent;

  readonly actionOptions: ActionButtonOption[] = [
    {
      action: ReportAction.DOWNLOAD_CSV,
      text: 'Download CSV',
      svgIcon: 'csv_icon',
    },
    {
      action: ReportAction.DOWNLOAD_PDF,
      text: 'Download PDF',
      svgIcon: 'pdf_icon',
    },
    {
      action: ReportAction.PRINT,
      text: 'Print Report',
      iconText: 'print',
    },
  ];
}

describe('DropdownButtonComponent', () => {
  let component: DropdownButtonComponent;
  let testComponent: DropdownButtonTestComponent;
  let fixture: ComponentFixture<DropdownButtonTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        DropdownButtonComponent,
        DropdownButtonTestComponent,
        HrefOnlyDownloadDirective,
      ],
      imports: [OverlayModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DropdownButtonTestComponent);
    testComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = testComponent.component;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('selects different save action options with split button', () => {
    expect(component.selectedActionOption.action).toEqual(
      ReportAction.DOWNLOAD_CSV
    );
    expect(component.actionOptionsMenuOpen).toBe(false);

    const menuToggle = fixture.debugElement.query(
      By.css('.dropdown-toggle-button')
    );
    menuToggle.nativeElement.click();

    fixture.detectChanges();

    expect(component.actionOptionsMenuOpen).toBe(true);

    const menu = document.querySelector(
      '.cdk-overlay-pane .save-options-dropdown'
    );
    expect(menu).not.toBe(null);

    const csvMenuOption = document.querySelectorAll(
      '.cdk-overlay-pane .save-options-dropdown .save-option'
    )[1];

    (csvMenuOption as HTMLElement).click();

    fixture.detectChanges();

    expect(component.selectedActionOption.action).toEqual(
      ReportAction.DOWNLOAD_PDF
    );
    expect(component.actionOptionsMenuOpen).toBe(false);
  });
});
