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

import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatTable } from '@angular/material/table';
import * as moment from 'moment';
import { ScoredItem, Tweet } from '../../common-types';
import {
  formatAttributeScore,
  formatCount,
  formatHashtags,
  getAuthorUrl,
  getTimePosted,
  PdfService,
} from '../pdf_service';
import { ReportService } from '../report.service';

@Component({
  selector: 'app-report-pdf',
  templateUrl: './report-pdf.component.html',
  styleUrls: ['./report-pdf.component.scss'],
})
export class ReportPdfComponent {
  @ViewChild('PdfReportComponent') pdfReportElement!: ElementRef;
  @ViewChild(MatTable) table!: MatTable<Array<ScoredItem<Tweet>>>;

  context = '';
  date = '';
  entries: Array<ScoredItem<Tweet>> = [];
  platform = '';
  reportReasons: string[] = [];
  username = '';

  displayedColumns: string[] = [];
  displayedColumnsTwitter: string[] = [
    'comment',
    'image',
    'hashtag',
    'author',
    'time posted',
    'tweet id',
    'toxicity',
    'severe toxicity',
    'insult',
    'profanity',
    'threat',
    'identity attack',
    'retweets',
    'likes twitter',
    'comments',
  ];
  dataSource = this.entries;

  // Local copies for template use
  formatAttributeScore = formatAttributeScore;
  formatCount = formatCount;
  formatHashtags = formatHashtags;
  getAuthorUrl = getAuthorUrl;
  getTimePosted = getTimePosted;

  constructor(
    private pdfService: PdfService,
    private reportService: ReportService
  ) {
    this.pdfService.onCreatePdfRequest.subscribe(request => {
      this.platform = request.platform ? request.platform : '';
      if (this.platform === 'Twitter') {
        this.displayedColumns = this.displayedColumnsTwitter;
      }

      this.entries = request.entries;
      this.dataSource = this.entries;

      this.username = request.username ? request.username : '';
      this.reportReasons = request.reportReasons;
      this.context = request.context;
      this.date = request.date ? request.date : '';
    });
  }

  getDateRangeString(): string {
    if (this.entries.length === 0) return '';

    let firstDate = this.entries[0].item.date;
    let lastDate = this.entries[0].item.date;
    for (const entry of this.entries) {
      if (entry.item.date < firstDate) {
        firstDate = entry.item.date;
      }
      if (entry.item.date > lastDate) {
        lastDate = entry.item.date;
      }
    }
    return `${moment(firstDate).format(
      'ddd, MMM DD, YYYY hh:mm:ss A'
    )} to ${moment(lastDate).format('ddd, MMM DD, YYYY hh:mm:ss A')}`;
  }

  computeReportSummary(): string {
    return this.reportService.getReportSummary();
  }

  getUsername() {
    return this.platform === 'Twitter' ? `@${this.username}` : this.username;
  }
}
