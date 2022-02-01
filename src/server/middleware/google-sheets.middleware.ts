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

import { Request, Response } from 'express';
import { GaxiosResponse } from 'gaxios';
import { GoogleApis } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { sheets_v4 } from 'googleapis/build/src/apis/sheets/v4';
import {
  CreateSpreadsheetRequest,
  CreateSpreadsheetResponse,
  CsvFileTemplate,
  ScoredItem,
  SocialMediaItem,
  Tweet,
} from '../../common-types';
import { Attributes } from '../../perspectiveapi-types';

const googleapis = new GoogleApis();

// Exclude milliseconds from date formatting since it can make the tests flaky.
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

// Passing undefined for the locale uses the user's default locale.
// See https://stackoverflow.com/a/31873738
export const DEFAULT_LOCALE = undefined;

const TWITTER_COLUMN_HEADERS = [
  'Report Summary',
  'Comment',
  'Image',
  'Hashtags',
  'Author',
  'Time Posted',
  'Tweet ID',
  'Tweet URL',
  ...Object.keys(Attributes).map(attr => `${attr} (%)`),
  'Retweets',
  'Likes',
  'Comments',
];

// Helper functions for creating cells with the sheets API.
export function getSheetsCellForString(
  value?: string
): sheets_v4.Schema$CellData {
  return { userEnteredValue: { stringValue: value } };
}

export function sendCreateSpreadsheetApiRequest(
  req: Request,
  res: Response,
  oauthClient: OAuth2Client
) {
  const createSpreadsheetRequest = req.body as CreateSpreadsheetRequest<Tweet>;
  const request = getReportSheetsApiRequest(
    createSpreadsheetRequest,
    oauthClient
  );

  const sheets = googleapis.sheets({ version: 'v4' });
  sheets.spreadsheets.create(
    request,
    (
      err: Error | null,
      response: GaxiosResponse<sheets_v4.Schema$Spreadsheet> | null | undefined
    ) => {
      if (err) {
        console.error(err);
        res.send(err);
        return;
      } else if (!response) {
        res.send(new Error('No response'));
        return;
      } else if (!response.data.spreadsheetUrl) {
        const errorMessage = 'No spreadsheet URL found in the response';
        console.error(errorMessage);
        res.send(new Error(errorMessage));
        return;
      }

      res.send({
        spreadsheetUrl: response.data.spreadsheetUrl,
      } as CreateSpreadsheetResponse);
    }
  );
}

/** Returns an array of report summary values. */
function getReportSummaryValues(
  createSpreadsheetRequest: CreateSpreadsheetRequest<Tweet>,
  date: Date
): string[] {
  const reportSummaryValues = [
    `Directed at: ${createSpreadsheetRequest.username}`,
    `Created on: ${date.toLocaleDateString(
      DEFAULT_LOCALE,
      DATE_FORMAT_OPTIONS
    )}`,
    `Total comments: ${createSpreadsheetRequest.entries.length}`,
  ];
  reportSummaryValues.push(
    `Reported due to: ${createSpreadsheetRequest.reportReasons.join(', ')}`,
    `Context: ${createSpreadsheetRequest.context}`
  );
  return reportSummaryValues;
}

/** Returns the report title. */
function getTitle(
  createSpreadsheetRequest: CreateSpreadsheetRequest<Tweet>,
  date: Date
): string {
  return (
    `${createSpreadsheetRequest.username}'s Harassment Report From ` +
    `${date.toLocaleDateString(DEFAULT_LOCALE, DATE_FORMAT_OPTIONS)} ` +
    `[Content Warning- Toxic Language]`
  );
}

/** Returns a formatted array of score values. */
function getScoreValuesForEntry(entry: ScoredItem<SocialMediaItem>): string[] {
  const scoreValuesForEntry: string[] = [];
  for (const attr of Object.keys(Attributes)) {
    scoreValuesForEntry.push(
      ((entry.scores[attr as Attributes] || 0) * 100).toFixed(2)
    );
  }
  return scoreValuesForEntry;
}

/** Returns a row of values for the Twitter report for the specified entry. */
function getReportRowForEntry(
  entry: ScoredItem<Tweet>,
  rowNum: number,
  reportSummaryValues: string[]
): string[] {
  const reportSummaryValue =
    rowNum < reportSummaryValues.length ? reportSummaryValues[rowNum] : '';

  // Date objects created on the client are converted back to
  // string when sent over JSON, which will cause an error below if they are not
  // converted back.
  if (typeof entry.item.date === 'string') {
    entry.item.date = new Date(entry.item.date);
  }

  const row = getTwitterReportRowForEntry(entry);
  return [reportSummaryValue, ...row];
}

function getTweetHashtags(item: Tweet): string {
  // In some languages tweets are being truncated after 140 characters instead
  // of 280, and in this case the extended_tweet has the full tweet information
  // including all hashtags.
  // https://docs.tweepy.org/en/latest/extended_tweets.html
  let hashtags = [];
  if (item.truncated) {
    hashtags =
      item.extended_tweet && item.extended_tweet.entities.hashtags
        ? item.extended_tweet.entities.hashtags
        : [];
  } else {
    hashtags =
      item.entities && item.entities.hashtags ? item.entities.hashtags : [];
  }

  return hashtags.length
    ? hashtags.map(item => `#${item.text}`).join(', ')
    : '';
}

function getTwitterReportRowForEntry(entry: ScoredItem<Tweet>) {
  return [
    entry.item.text, // Comment
    entry.item.extended_entities && entry.item.extended_entities.media
      ? 'Yes'
      : 'No', // Image
    getTweetHashtags(entry.item), // Hashtags
    entry.item.authorScreenName || '', // Author
    entry.item.date.toLocaleDateString(DEFAULT_LOCALE, DATE_FORMAT_OPTIONS), // Time Posted
    entry.item.id_str, // Tweet ID,
    entry.item.url ? entry.item.url : '', // Tweet URL
    ...getScoreValuesForEntry(entry),
    `${entry.item.retweet_count}`, // Retweets
    `${entry.item.favorite_count}`, // Likes
    `${entry.item.reply_count}`, // Comments
  ];
}

export function getReportCsvTemplate(
  createSpreadsheetRequest: CreateSpreadsheetRequest<Tweet>
): CsvFileTemplate {
  const date = new Date();
  const headerRow = TWITTER_COLUMN_HEADERS;
  const bodyRows: string[][] = [];

  const reportSummaryValues = getReportSummaryValues(
    createSpreadsheetRequest,
    date
  );

  for (let i = 0; i < createSpreadsheetRequest.entries.length; i++) {
    const entry = createSpreadsheetRequest.entries[i];
    bodyRows.push(getReportRowForEntry(entry, i, reportSummaryValues));
  }

  // If there are fewer items in the report than report summary values, add
  // the extra rows so we complete the Report Summary column.
  if (createSpreadsheetRequest.entries.length < reportSummaryValues.length) {
    for (
      let i = createSpreadsheetRequest.entries.length;
      i < reportSummaryValues.length;
      i++
    ) {
      bodyRows.push([reportSummaryValues[i]]);
    }
  }
  return {
    title: `${getTitle(createSpreadsheetRequest, date)}.csv`,
    header: headerRow,
    bodyRows,
  };
}

export function getReportSheetsApiRequest(
  createSpreadsheetRequest: CreateSpreadsheetRequest<Tweet>,
  oauthClient: OAuth2Client
): sheets_v4.Params$Resource$Spreadsheets$Create {
  const date = new Date();

  const request: sheets_v4.Params$Resource$Spreadsheets$Create = {
    auth: oauthClient,
    requestBody: {
      sheets: [
        {
          data: [{ rowData: [] }],
        },
      ],
      properties: {
        title: getTitle(createSpreadsheetRequest, date),
      },
    },
  };

  const headerRow: sheets_v4.Schema$RowData = {
    values: TWITTER_COLUMN_HEADERS.map(header =>
      getSheetsCellForString(header)
    ),
  };
  request.requestBody!.sheets![0].data![0].rowData!.push(headerRow);

  const reportSummaryValues = getReportSummaryValues(
    createSpreadsheetRequest,
    date
  );

  for (let i = 0; i < createSpreadsheetRequest.entries.length; i++) {
    const entry = createSpreadsheetRequest.entries[i];
    const rowForEntry: sheets_v4.Schema$RowData = {
      values: getReportRowForEntry(
        entry,
        i,
        reportSummaryValues
      ).map((item: string) => getSheetsCellForString(item)),
    };
    request.requestBody!.sheets![0].data![0].rowData!.push(rowForEntry);
  }

  // If there are fewer items in the report than report summary values, add
  // the extra rows so we complete the Report Summary column.
  if (createSpreadsheetRequest.entries.length < reportSummaryValues.length) {
    for (
      let i = createSpreadsheetRequest.entries.length;
      i < reportSummaryValues.length;
      i++
    ) {
      request.requestBody!.sheets![0].data![0].rowData!.push({
        values: [getSheetsCellForString(reportSummaryValues[i])],
      });
    }
  }
  return request;
}
