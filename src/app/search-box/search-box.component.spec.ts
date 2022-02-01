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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SearchBoxComponent } from './search-box.component';

describe('SearchBoxComponent', () => {
  let component: SearchBoxComponent;
  let fixture: ComponentFixture<SearchBoxComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [SearchBoxComponent],
        imports: [
          FormsModule,
          MatIconModule,
          MatChipsModule,
          MatInputModule,
          NoopAnimationsModule,
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits event when include filter is added', () => {
    spyOn(component.regexFiltersChange, 'emit');
    component.addIncludeFilter({
      input: fixture.debugElement.nativeElement.querySelector('input'),
      value: 'test',
    });
    fixture.detectChanges();
    expect(component.regexFiltersChange.emit).toHaveBeenCalledWith([
      { regex: 'test', include: true },
    ]);
  });

  it('clears filters', () => {
    component.addIncludeFilter({
      input: fixture.debugElement.nativeElement.querySelector('input'),
      value: 'test',
    });
    fixture.detectChanges();

    expect(component.regexFilters).toEqual([{ regex: 'test', include: true }]);
    expect(fixture.debugElement.queryAll(By.css('mat-chip')).length).toEqual(1);

    component.resetFilters();
    fixture.detectChanges();

    expect(component.regexFilters).toEqual([]);
    expect(fixture.debugElement.queryAll(By.css('mat-chip')).length).toEqual(0);
  });
});
