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

import { Component } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { TweetImageComponent } from '../tweet-image/tweet-image.component';
import { CommentInfoComponent } from './comment-info.component';

@Component({
  selector: 'app-twitter-test-comment-info-wrapper',
  template: `
    <app-comment-info [comment]="comment"></app-comment-info>
  `,
})
class TestTwitterCommentInfoWrapperComponent {
  comment = {
    item: {
      id_str: 'a',
      text: 'your mother was a hamster',
      date: new Date(),
      favorite_count: 50,
      reply_count: 4,
      retweet_count: 10,
    },
    scores: {
      TOXICITY: 0.8,
    },
  };
}

describe('CommentInfoComponent', () => {
  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [
          CommentInfoComponent,
          TestTwitterCommentInfoWrapperComponent,
          TweetImageComponent,
        ],
        imports: [
          FormsModule,
          MatButtonModule,
          MatCheckboxModule,
          MatIconModule,
        ],
      }).compileComponents();
    })
  );

  it('should create', () => {
    const fixture = TestBed.createComponent(CommentInfoComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('displays tweet', () => {
    const fixture = TestBed.createComponent(
      TestTwitterCommentInfoWrapperComponent
    );
    fixture.detectChanges();
    const templateText = fixture.debugElement.nativeElement.textContent;
    expect(templateText).toContain('your mother was a hamster');
  });

  it('emits an event when select changes', () => {
    const fixture = TestBed.createComponent(CommentInfoComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.tweet = {
      item: {
        id_str: 'a',
        text: 'your mother was a hamster',
        date: new Date(),
      },
      scores: {
        TOXICITY: 0.8,
      },
      selected: false,
    };
    fixture.detectChanges();

    spyOn(component.selectChange, 'emit');

    fixture.debugElement.nativeElement.querySelector('.checkbox').click();
    fixture.detectChanges();
    expect(component.selectChange.emit).toHaveBeenCalledTimes(1);
    expect(component.selectChange.emit).toHaveBeenCalledWith(true);

    fixture.debugElement.nativeElement.querySelector('.checkbox').click();
    fixture.detectChanges();
    expect(component.selectChange.emit).toHaveBeenCalledTimes(2);
    expect(component.selectChange.emit).toHaveBeenCalledWith(false);
  });

  it('emits an event when the delete button is clicked', () => {
    const fixture = TestBed.createComponent(CommentInfoComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.tweet = {
      item: {
        id_str: 'a',
        text: 'your mother was a hamster',
        date: new Date(),
      },
      scores: {
        TOXICITY: 0.8,
      },
      selected: false,
    };
    component.showDeleteButton = true;
    fixture.detectChanges();

    spyOn(component.deleteClicked, 'emit');

    fixture.debugElement.nativeElement.querySelector('.delete-button').click();
    fixture.detectChanges();
    expect(component.deleteClicked.emit).toHaveBeenCalled();
  });
});
