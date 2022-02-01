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

import firebase from 'firebase/app';
import { OAuth2Client } from 'googleapis-common';
import * as supertest from 'supertest';
import { CreateSpreadsheetRequest, Tweet } from '../common-types';
import {
  DATE_FORMAT_OPTIONS,
  DEFAULT_LOCALE,
  getReportCsvTemplate,
  getReportSheetsApiRequest,
  getSheetsCellForString,
} from './middleware/google-sheets.middleware';
import * as serving from './serving';

describe('Server', () => {
  let server: serving.Server;

  const now = Date.now();

  const mockCredentials = jasmine.createSpyObj<firebase.auth.OAuthCredential>(
    'oauthCredential',
    ['providerId', 'signInMethod', 'toJSON']
  );
  mockCredentials.providerId.indexOf = (a: string, b?: number) => 0;

  const createSpreadsheetRequestTwitter: CreateSpreadsheetRequest<Tweet> = {
    entries: [
      {
        item: {
          id_str: 'a',
          text: 'your mother was a hamster',
          date: new Date(now - 100),
          url: 'foo.com',
          authorScreenName: 'bar',
          favorite_count: 2,
          reply_count: 0,
          retweet_count: 0,
        },
        scores: {
          TOXICITY: 0.8,
          SEVERE_TOXICITY: 0.65,
          INSULT: 0.9,
          PROFANITY: 0.222,
          THREAT: 0.12345,
          IDENTITY_ATTACK: 0.4,
        },
      },
      {
        item: {
          id_str: 'b',
          text: 'and your father smelt of elderberries',
          date: new Date(now - 10),
          favorite_count: 500,
          reply_count: 20,
          retweet_count: 100,
          entities: {
            hashtags: [
              { text: 'father', indices: [9, 15] },
              { text: 'elderberries', indices: [25, 37] },
            ],
            media: [],
            symbols: [],
            urls: [],
            user_mentions: [],
          },
          extended_entities: {
            media: [
              {
                id_str: 'c',
                media_url: 'test.abc',
                type: 'image',
                indices: [0, 10],
              },
            ],
            hashtags: [],
            symbols: [],
            urls: [],
            user_mentions: [],
          },
        },
        scores: {
          TOXICITY: 0.9,
        },
      },
    ],
    reportReasons: ['Reason 1', 'Reason 2'],
    context: 'Here is some context',
    username: 'foo',
    credentials: mockCredentials,
  };

  beforeEach(done => {
    const config: serving.Config = {
      port: '8080',
      staticPath: 'static',
      googleCloudApiKey: 'foo',
      cloudProjectId: 'fake project id',
      isProduction: false,
      twitterApiCredentials: {
        accountName: 'fake name',
        appKey: 'fake key',
        appToken: 'fake token',
        password: 'fake password',
        username: 'fake username',
      },
    };
    server = new serving.Server(config);
    server.start().then(done);
  });

  afterEach(done => {
    server.stop().then(done);
  });

  it('200 to /', done => {
    supertest(server.app)
      .get('/')
      .expect(200, done);
  });

  // This responds with a 200 because we return index.html for any
  // non-existant paths.
  xit('404 to non-existent path /foo/bar', done => {
    console.log('test 404');
    supertest(server.app)
      .get('/foo/bar')
      .expect(404, done);
  });

  it('creates CSV rows for Twitter', () => {
    const rows = getReportCsvTemplate(createSpreadsheetRequestTwitter);

    expect(rows).toEqual({
      title:
        `foo's Harassment Report From ` +
        `${new Date(now).toLocaleDateString(
          DEFAULT_LOCALE,
          DATE_FORMAT_OPTIONS
        )}` +
        ` [Content Warning- Toxic Language].csv`,
      header: [
        'Report Summary',
        'Comment',
        'Image',
        'Hashtags',
        'Author',
        'Time Posted',
        'Tweet ID',
        'Tweet URL',
        'TOXICITY (%)',
        'SEVERE_TOXICITY (%)',
        'INSULT (%)',
        'PROFANITY (%)',
        'THREAT (%)',
        'IDENTITY_ATTACK (%)',
        'Retweets',
        'Likes',
        'Comments',
      ],
      bodyRows: [
        [
          'Directed at: foo',
          'your mother was a hamster',
          'No',
          '',
          'bar',
          new Date(now - 100).toLocaleDateString(
            DEFAULT_LOCALE,
            DATE_FORMAT_OPTIONS
          ),
          'a',
          'foo.com',
          '80.00',
          '65.00',
          '90.00',
          '22.20',
          '12.35',
          '40.00',
          '0',
          '2',
          '0',
        ],
        [
          `Created on: ${new Date(now).toLocaleDateString(
            DEFAULT_LOCALE,
            DATE_FORMAT_OPTIONS
          )}`,
          'and your father smelt of elderberries',
          'Yes',
          '#father, #elderberries',
          '',
          new Date(now - 10).toLocaleDateString(
            DEFAULT_LOCALE,
            DATE_FORMAT_OPTIONS
          ),
          'b',
          '',
          '90.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '100',
          '500',
          '20',
        ],
        ['Total comments: 2'],
        ['Reported due to: Reason 1, Reason 2'],
        ['Context: Here is some context'],
      ],
    });
  });

  it('creates Twitter Sheets API request', () => {
    const mockOAuthClient = jasmine.createSpyObj<OAuth2Client>('oauth2Client', [
      'credentials',
    ]);

    const request = getReportSheetsApiRequest(
      createSpreadsheetRequestTwitter,
      mockOAuthClient
    );
    expect(request!.requestBody!.properties!.title).toContain(
      "foo's Harassment Report"
    );

    expect(request!.requestBody!.sheets).toEqual([
      {
        data: [
          {
            rowData: [
              {
                values: [
                  getSheetsCellForString('Report Summary'),
                  getSheetsCellForString('Comment'),
                  getSheetsCellForString('Image'),
                  getSheetsCellForString('Hashtags'),
                  getSheetsCellForString('Author'),
                  getSheetsCellForString('Time Posted'),
                  getSheetsCellForString('Tweet ID'),
                  getSheetsCellForString('Tweet URL'),
                  getSheetsCellForString('TOXICITY (%)'),
                  getSheetsCellForString('SEVERE_TOXICITY (%)'),
                  getSheetsCellForString('INSULT (%)'),
                  getSheetsCellForString('PROFANITY (%)'),
                  getSheetsCellForString('THREAT (%)'),
                  getSheetsCellForString('IDENTITY_ATTACK (%)'),
                  getSheetsCellForString('Retweets'),
                  getSheetsCellForString('Likes'),
                  getSheetsCellForString('Comments'),
                ],
              },
              {
                values: [
                  getSheetsCellForString('Directed at: foo'),
                  getSheetsCellForString('your mother was a hamster'),
                  getSheetsCellForString('No'),
                  getSheetsCellForString(''),
                  getSheetsCellForString('bar'),
                  getSheetsCellForString(
                    new Date(now - 100).toLocaleDateString(
                      DEFAULT_LOCALE,
                      DATE_FORMAT_OPTIONS
                    )
                  ),
                  getSheetsCellForString('a'),
                  getSheetsCellForString('foo.com'),
                  getSheetsCellForString('80.00'),
                  getSheetsCellForString('65.00'),
                  getSheetsCellForString('90.00'),
                  getSheetsCellForString('22.20'),
                  getSheetsCellForString('12.35'),
                  getSheetsCellForString('40.00'),
                  getSheetsCellForString('0'),
                  getSheetsCellForString('2'),
                  getSheetsCellForString('0'),
                ],
              },
              {
                values: [
                  getSheetsCellForString(
                    `Created on: ${new Date(now).toLocaleDateString(
                      DEFAULT_LOCALE,
                      DATE_FORMAT_OPTIONS
                    )}`
                  ),
                  getSheetsCellForString(
                    'and your father smelt of elderberries'
                  ),
                  getSheetsCellForString('Yes'),
                  getSheetsCellForString('#father, #elderberries'),
                  getSheetsCellForString(''),
                  getSheetsCellForString(
                    new Date(now - 10).toLocaleDateString(
                      DEFAULT_LOCALE,
                      DATE_FORMAT_OPTIONS
                    )
                  ),
                  getSheetsCellForString('b'),
                  getSheetsCellForString(''),
                  getSheetsCellForString('90.00'),
                  getSheetsCellForString('0.00'),
                  getSheetsCellForString('0.00'),
                  getSheetsCellForString('0.00'),
                  getSheetsCellForString('0.00'),
                  getSheetsCellForString('0.00'),
                  getSheetsCellForString('100'),
                  getSheetsCellForString('500'),
                  getSheetsCellForString('20'),
                ],
              },
              {
                values: [getSheetsCellForString('Total comments: 2')],
              },
              {
                values: [
                  getSheetsCellForString('Reported due to: Reason 1, Reason 2'),
                ],
              },
              {
                values: [
                  getSheetsCellForString('Context: Here is some context'),
                ],
              },
            ],
          },
        ],
      },
    ]);
  });
});
