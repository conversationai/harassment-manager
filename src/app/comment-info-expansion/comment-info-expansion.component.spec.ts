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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CommentLinkComponent } from '../comment-link/comment-link.component';
import { CommentInfoExpansionComponent } from './comment-info-expansion.component';

@Component({
  selector: 'app-twitter-test-comment-info-wrapper',
  template: `
    <app-comment-info-expansion [comment]="comment"></app-comment-info-expansion>
  `,
})
export class TestTwitterCommentInfoExpansionWrapperComponent {
  comment = {
    item: {
      id_str: 'a',
      text: 'your mother was a hamster',
      date: new Date(),
      url: 'test url',
      favorite_count: 50,
      reply_count: 4,
      retweet_count: 10,
    },
    scores: {
      TOXICITY: 0.8,
    },
  };
}

describe('CommentInfoExpansionComponent', () => {
  let component: CommentInfoExpansionComponent;
  let fixture: ComponentFixture<CommentInfoExpansionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        CommentInfoExpansionComponent,
        CommentLinkComponent,
        TestTwitterCommentInfoExpansionWrapperComponent,
      ],
      imports: [
        MatTooltipModule,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CommentInfoExpansionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('displays tweet info', () => {
    const fixture = TestBed.createComponent(
      TestTwitterCommentInfoExpansionWrapperComponent
    );
    fixture.detectChanges();
    const templateText = fixture.debugElement.nativeElement.textContent;
    expect(templateText).toContain('Toxicity - 80%');
    expect(templateText).toContain('50 Likes');
    expect(templateText).toContain('4 Comments');
    expect(templateText).toContain('10 Retweets');
    expect(templateText).toContain('View on Twitter');
  });
});
