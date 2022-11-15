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
import { DomSanitizer } from '@angular/platform-browser';
import jsPDF from 'jspdf';
import autoTable, { CellHookData, Styles } from 'jspdf-autotable';
import { BehaviorSubject } from 'rxjs';
import {
  CreatePdfRequest,
  CreatePdfResponse,
  ScoredItem,
  SocialMediaItem,
  Tweet,
} from '../common-types';
import { googleSans } from './google-sans-font';
import { OauthApiService } from './oauth_api.service';

const TWITTER = 'Twitter';

// See https://stackoverflow.com/questions/66590691/typescript-type-string-is-not-assignable-to-type-numeric-2-digit-in-d
// for the rationale behind the "as const" declarations below.

// Exclude milliseconds from date formatting since it can make the tests flaky.
const DATE_FORMAT_OPTIONS = {
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
} as const;

// Exclude hours and minutes since colons can't be in file names.
const TITLE_DATE_FORMAT_OPTIONS = {
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
} as const;

// Regex matching Extended Pictographic Unicode characters.
// https://stackoverflow.com/questions/64389323/why-do-unicode-emoji-property-escapes-match-numbers
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]/gu;

// Interface for data used to fill in the PDF Report Table, each
// string[] in displayedRowText is a separate row in the Report
// Table. Each element in displayedRowText corresponds to a cell in
// the table and the cell text has an associated hiddenLink.
interface ReportTableBodyContent {
  displayedRowText: string[][];
  hiddenLinks: Map<string, string>;
}

const TABLE_ACCENT_COLOR = '#101BCF';
const BORDER_COLUMN = ''; // Used to style border between columns.

const DISPLAYED_COLUMNS_TWITTER: string[] = [
  'Comment',
  'Image',
  'Hashtags',
  'Author',
  'Time Posted',
  'Tweet ID',
  BORDER_COLUMN,
  'Toxicity',
  'Severe Toxicity',
  'Insult',
  'Profanity',
  'Threat',
  'Identity Attack',
  BORDER_COLUMN,
  'Retweets',
  'Likes',
  'Comments',
];
const COLUMN_STYLES_TWITTER: {
  [key: string]: Partial<Styles>;
} = {
  0: { cellWidth: 50 },
  1: { cellWidth: 12 },
  2: { cellWidth: 17 },
  3: { cellWidth: 23 },
  4: { cellWidth: 23 },
  5: { cellWidth: 17 },
  6: { cellWidth: 1, fillColor: TABLE_ACCENT_COLOR },
  7: { cellWidth: 14, halign: 'center' },
  8: { cellWidth: 14, halign: 'center' },
  9: { cellWidth: 14, halign: 'center' },
  10: { cellWidth: 14, halign: 'center' },
  11: { cellWidth: 14, halign: 'center' },
  12: { cellWidth: 14, halign: 'center' },
  13: { cellWidth: 1, fillColor: TABLE_ACCENT_COLOR },
  14: { cellWidth: 14, halign: 'center' },
  15: { cellWidth: 14, halign: 'center' },
  16: { cellWidth: 14, halign: 'center' },
  17: { cellWidth: 14, halign: 'center' },
};

// Passing undefined for the locale uses the user's default locale.
// See https://stackoverflow.com/a/31873738
export const DEFAULT_LOCALE = undefined;

export function formatAttributeScore(score?: number): string {
  if (score === undefined) {
    return '-';
  } else {
    return `${Math.round(score * 100)}`;
  }
}

export function formatCount(count?: number): string {
  if (count === undefined || isNaN(count)) {
    return '0';
  } else {
    return `${count}`;
  }
}

// Given a ISO 8601 date (like '2020-11-10T17:44:51.000Z') format it
// as 'MM/DD/YY at 00:00 AM/PM'
export function getTimePosted(createdTime?: string): string {
  if (!createdTime) {
    return '-';
  }
  const date = new Date(createdTime);
  return `${date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  })} at ${date
    .toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })
    .slice(12)}`;
}

export function getAuthorUrl(url?: string): string {
  return url || '';
}

export function formatHashtags(item: Tweet): string {
  // In some languages tweets are being truncated after 140 characters instead
  // of 280, and in this case the extended_tweet has the full tweet information
  // including all hashtags.
  // https://docs.tweepy.org/en/latest/extended_tweets.html
  const hashtags = item.truncated
    ? item.extended_tweet?.entities.hashtags
    : item.entities?.hashtags;

  return hashtags?.length
    ? hashtags.map(item => `#${item.text}`).join(', ')
    : '-';
}

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  displayedColumns: string[] = [];
  platform = '';
  date = '';
  username = '';
  initialRequest: CreatePdfRequest<SocialMediaItem> = {
    entries: [],
    reportReasons: [],
    context: '',
  };
  private onCreatePdfRequestSource: BehaviorSubject<
    CreatePdfRequest<SocialMediaItem>
  > = new BehaviorSubject(this.initialRequest);
  onCreatePdfRequest = this.onCreatePdfRequestSource.asObservable();

  constructor(
    private readonly oauthApiService: OauthApiService,
    private sanitizer: DomSanitizer
  ) {
    this.username = this.getUsername();
    this.date = new Date().toLocaleDateString(
      DEFAULT_LOCALE,
      DATE_FORMAT_OPTIONS
    );
  }

  private getUsername(): string {
    const twitterCredentials = this.oauthApiService.getTwitterCredentials();
    if (!twitterCredentials) {
      throw new Error('Twitter credentials not found');
    }
    if (
      twitterCredentials.additionalUserInfo &&
      twitterCredentials.additionalUserInfo.username
    ) {
      return twitterCredentials.additionalUserInfo.username;
    } else {
      throw new Error('Twitter credentials found, but no username is present');
    }
  }

  /**
   * Updates the createPdfObservable with new Report Data to be used to create
   * a PDF.
   */
  updateCreatePdfSource(request: CreatePdfRequest<SocialMediaItem>) {
    request.date = this.date;
    request.platform = TWITTER;
    this.platform = request.platform;
    this.displayedColumns = DISPLAYED_COLUMNS_TWITTER;
    request.username = this.username;
    this.onCreatePdfRequestSource.next(request);
  }

  /**
   * Returns the file name of the created PDF Report.
   */
  private getTitle(): string {
    const date = new Date().toLocaleDateString(
      DEFAULT_LOCALE,
      TITLE_DATE_FORMAT_OPTIONS
    );
    return (
      `${this.username}'s FieldShield Report From ${date} ` +
      `[Content Warning- Toxic Language]`
    );
  }

  /**
   * Returns text with emojis replaced by a placeholder.
   */
  getTextWithoutEmojis(text?: string): string {
    if (!text) {
      return '';
    }
    return text.replace(EMOJI_REGEX, '[emoji]');
  }

  /**
   * Formats Tweet into the text for a row in the table.
   */
  private getDisplayedRowTextTwitter(entry: ScoredItem<Tweet>): string[] {
    return [
      entry.item.text,
      entry.item.hasImage ? 'Yes' : 'No',
      entry.item ? formatHashtags(entry.item) : '-',
      entry.item.authorName || 'missing author name',
      getTimePosted(String(entry.item.date)),
      entry.item.id_str,
      BORDER_COLUMN,
      formatAttributeScore(entry.scores.TOXICITY),
      formatAttributeScore(entry.scores.SEVERE_TOXICITY),
      formatAttributeScore(entry.scores.INSULT),
      formatAttributeScore(entry.scores.PROFANITY),
      formatAttributeScore(entry.scores.THREAT),
      formatAttributeScore(entry.scores.IDENTITY_ATTACK),
      BORDER_COLUMN,
      formatCount(entry.item.retweet_count),
      formatCount(entry.item.favorite_count),
      formatCount(entry.item.reply_count),
    ];
  }

  /**
   * Formats ScoredItem into text to display for a row in the table.
   */
  private getDisplayedRowText(entry: ScoredItem<Tweet>): string[] {
    return this.getDisplayedRowTextTwitter(entry);
  }

  private addLinks(
    data: CellHookData,
    doc: jsPDF,
    hiddenLinks: Map<string, string>
  ) {
    if (data.section !== 'body') {
      return;
    }

    // data.cell.raw can be a string, number, true, string[],
    // HTMLTableCellElement, or CellDef.
    if (typeof data.cell.raw === 'string') {
      const cellText = data.cell.raw as string;
      if (hiddenLinks.has(cellText)) {
        doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
          url: hiddenLinks.get(cellText),
        });
      }
    }
  }

  /**
   * Gets the URLs for a Tweet entry.
   */
  private getHiddenLinksTwitter(
    entries: Array<ScoredItem<Tweet>>
  ): Map<string, string> {
    // For Twitter the only links are for the author's profile page
    // and the URL of the Tweet, all other URLs are empty.
    const hiddenLinks = new Map();
    for (const entry of entries) {
      if (entry.item.authorName) {
        hiddenLinks.set(
          entry.item.authorName,
          getAuthorUrl(entry.item.authorUrl)
        );
      }
      hiddenLinks.set(entry.item.id_str, entry.item.url || '');
    }

    return hiddenLinks;
  }

  /**
   * Adds the custom fonts to jsPDF.
   */
  private addCustomFont(doc: jsPDF) {
    // Default text used, without this the character spacing is buggy
    // from the font in ReportPDF being converted to jsPDF's default.
    doc.addFileToVFS('MyFont.ttf', googleSans);
    doc.addFont('MyFont.ttf', 'Google Sans', 'normal');
    doc.setFont('Google Sans');
  }

  /**
   * Removes emojis from text and author field.
   */
  removeEmojisFromEntries(
    entries: Array<ScoredItem<SocialMediaItem>>
  ): Array<ScoredItem<SocialMediaItem>> {
    for (const entry of entries) {
      entry.item.text = this.getTextWithoutEmojis(entry.item.text || '');
      entry.item.authorName = this.getTextWithoutEmojis(
        entry.item.authorName || ''
      );
    }
    return entries;
  }

  /**
   * Converts the request entries to format that can be used to create a table.
   */
  getTableBodyContent(): ReportTableBodyContent {
    let entries = this.onCreatePdfRequestSource.value.entries;
    entries = this.removeEmojisFromEntries(entries);
    const displayedRowText = new Array(entries.length);

    const hiddenLinks = this.getHiddenLinksTwitter(
      entries as Array<ScoredItem<Tweet>>
    );
    for (let i = 0; i < entries.length; i++) {
      displayedRowText[i] = this.getDisplayedRowText(
        entries[i] as ScoredItem<Tweet>
      );
    }

    return { displayedRowText, hiddenLinks };
  }

  /**
   * Adds the Report Details to the PDF.
   */
  private addReportTable(tableBodyContent: ReportTableBodyContent, doc: jsPDF) {
    const columnStyles = COLUMN_STYLES_TWITTER;
    const displayedRowText = tableBodyContent.displayedRowText;
    doc.addPage();
    doc.addImage('fieldshield_table_header.png', 'PNG', 14, 10, 270, 23);
    autoTable(doc, {
      theme: 'grid',
      // Shift the table down on the first page so the inserted image isn't covered.
      startY: 30,
      headStyles: {
        fontSize: 7,
        fillColor: TABLE_ACCENT_COLOR,
        valign: 'middle',
        halign: 'center',
      },
      // For each of the columns in displayedColumns set the width,
      // vertically center the number columns, and style the empty columns as
      // colored lines.
      columnStyles,
      head: [this.displayedColumns],
      body: displayedRowText,
      didDrawCell: data => {
        this.addLinks(data, doc, tableBodyContent.hiddenLinks);
      },
    });
  }

  /**
   * Process the entire PDF into a downloadable format.
   */
  private async finalizePdf(doc: jsPDF): Promise<CreatePdfResponse> {
    const blobPdf = new Blob([doc.output('blob')], {
      type: 'application/pdf',
    });
    const url = this.sanitizer.bypassSecurityTrustUrl(
      window.URL.createObjectURL(blobPdf)
    );
    const title = this.getTitle();
    const buffer = await blobPdf.arrayBuffer();
    return {
      title,
      safeUrl: url,
      buffer,
    };
  }

  /**
   * Creates a PDF file with a downloadable URL and a title.
   */
  async createPdf(reportPdfElement: HTMLElement): Promise<CreatePdfResponse> {
    // Format the entries so they can be used by jspdf-autotable.
    const tableBodyContent: ReportTableBodyContent = this.getTableBodyContent();

    // Initialize JSPDF
    // 'mm' (millimeter) is the unit and 'a4' is the format of a standard
    // 8"x11" sheet of paper.
    const doc = new jsPDF('landscape', 'mm', 'a4');
    this.addCustomFont(doc);

    // Create the PDF using the HTML from the ReportPDF component for the first
    // page and the data from the request for the table.
    const reportPdfElementSummary = reportPdfElement.querySelector(
      '.report-summary'
    ) as HTMLElement;
    // Scaling factor for the Report Summary on the first page.
    const scale = 0.24;
    const response: Promise<CreatePdfResponse> = new Promise(resolve =>
      doc.html(reportPdfElementSummary, {
        html2canvas: { scale },
        callback: renderedDoc => {
          this.addReportTable(tableBodyContent, renderedDoc);
          resolve(this.finalizePdf(renderedDoc));
        },
      })
    );

    return response;
  }
}
