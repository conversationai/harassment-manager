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
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { SocialMediaItemService } from '../social-media-item.service';
import { LoadingDialogComponent } from './loading-dialog.component';

describe('LoadingDialogComponent', () => {
  let component: LoadingDialogComponent;
  let fixture: ComponentFixture<LoadingDialogComponent>;

  const onSocialMediaItemLoadedMock = new BehaviorSubject<number>(0);
  const mockSocialMediaItemsService = jasmine.createSpyObj<
    SocialMediaItemService
  >('socialMediaItemsService', ['fetchItems'], {
    onSocialMediaItemsLoaded: onSocialMediaItemLoadedMock.asObservable(),
  });

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [LoadingDialogComponent],
        imports: [
          MatButtonModule,
          MatDialogModule,
          MatIconModule,
          NoopAnimationsModule,
        ],
        providers: [
          { provide: MatDialogRef, useValue: {} },
          {
            provide: SocialMediaItemService,
            useValue: mockSocialMediaItemsService,
          },
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
