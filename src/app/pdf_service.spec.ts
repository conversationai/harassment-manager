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

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import firebase from 'firebase/app';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { CreatePdfRequest, SocialMediaItem } from 'src/common-types';
import { OauthApiService } from './oauth_api.service';
import { getTimePosted, PdfService } from './pdf_service';
import { TWITTER_ENTRIES } from './test_constants';

const EMPTY_REQUEST: CreatePdfRequest<SocialMediaItem> = {
  entries: [],
  reportReasons: [],
  context: '',
};

describe('PdfService', () => {
  let service: PdfService;
  let twitterSignInTestSubject: ReplaySubject<boolean>;
  const onCreatePdfRequestMock = new BehaviorSubject<
    CreatePdfRequest<SocialMediaItem>
  >(EMPTY_REQUEST);
  const mockPdfService = {
    onCreatePdfRequestSource: onCreatePdfRequestMock.asObservable(),
  };

  beforeEach(() => {
    twitterSignInTestSubject = new ReplaySubject<boolean>(1);
    const mockGetTwitterCredentials = () => {
      return jasmine.createSpyObj<firebase.auth.UserCredential>(
        'twitterCredentials',
        ['user', 'credential'],
        {
          additionalUserInfo: {
            username: 'my_username',
            isNewUser: false,
            profile: '',
            providerId: '',
          },
        }
      );
    };
    const mockOauthApiService = {
      twitterSignInChange: twitterSignInTestSubject.asObservable(),
      getTwitterCredentials: mockGetTwitterCredentials,
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: OauthApiService,
          useValue: mockOauthApiService,
        },
      ],
    });
    service = TestBed.inject(PdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('Replaces emojis in Comment text with flag', () => {
    // Text without emojis is unchanged.
    expect(
      service.getTextWithoutEmojis('Here is some text123!@#$%^&*()-=+')
    ).toEqual('Here is some text123!@#$%^&*()-=+');

    // All different kinds of emojis are replaced.
    expect(service.getTextWithoutEmojis('🔔 Mal 🍑')).toEqual(
      '[emoji] Mal [emoji]'
    );
    expect(service.getTextWithoutEmojis('That goat!🤪🤪🤪')).toEqual(
      'That goat![emoji][emoji][emoji]'
    );
    expect(service.getTextWithoutEmojis('New from ios 14.2:  🥲')).toEqual(
      'New from ios 14.2:  [emoji]'
    );
    expect(service.getTextWithoutEmojis('smileys: ☺ ☺ ☹ ☻😊😃🙁😎')).toEqual(
      'smileys: [emoji] [emoji] [emoji] [emoji][emoji][emoji][emoji][emoji]'
    );

    // Does not work - these are actually circled Japanese characters not emojis.
    // expect(service.getTextWithoutEmojis('㋡ ㋛')).toEqual('[emoji][emoji]');
  });

  it('formats request into table entries (Twitter)', () => {
    const request: CreatePdfRequest<SocialMediaItem> = {
      entries: [TWITTER_ENTRIES[0], TWITTER_ENTRIES[1]],
      reportReasons: ['reason 1', 'reason 2', 'reason 3'],
      context: 'Here is some context',
      platform: 'Twitter',
    };
    service.updateCreatePdfSource(request);
    const reportTableBodyContent = service.getTableBodyContent();

    // Check that the entries are flattened and formatted.
    expect(reportTableBodyContent.displayedRowText.length).toEqual(2);
    expect(reportTableBodyContent.displayedRowText[0]).toEqual([
      'The Community Court of Justice for ECOWAS, of which Burkina Faso is a ' +
        'member, ruled that a 2017 internet shutdown in Togo violated its ' +
        "citizens' fundamental rights. Learn more about the impacts of " +
        'internet shutdowns in the last issue of the Current. (3/3)\n' +
        'https://t.co/rr3jt112OS',
      'No',
      '#fakehashtag1',
      'Jigsaw',
      // Use getTimePosted() directly because it uses toLocaleDateString(),
      // which depends on the timezone of the machine the test runs on.
      getTimePosted(String(TWITTER_ENTRIES[0].item.date)),
      '1485714881710022664',
      '',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '',
      '0',
      '1',
      '0',
    ]);
    expect(reportTableBodyContent.displayedRowText[1]).toEqual([
      'Internet shutdowns have become a go-to tactic in recent years to ' +
        'quell domestic protest, but their use raises grave human rights ' +
        'concerns - with knock-on effects across the economy, education and ' +
        'healthcare. (2/3)',
      'No',
      '#fakehashtag1, #fakehashtag2',
      'Jigsaw',
      // Use getTimePosted() directly because it uses toLocaleDateString(),
      // which depends on the timezone of the machine the test runs on.
      getTimePosted(String(TWITTER_ENTRIES[1].item.date)),
      '1485714880292397057',
      '',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '',
      '0',
      '2',
      '1',
    ]);

    // Check that the hidden links are created correctly.
    const expectedHiddenLinks = new Map();
    // Author name to Author URL
    expectedHiddenLinks.set('Jigsaw', 'https://twitter.com/Jigsaw');
    // Tweet ID to Tweet URL
    expectedHiddenLinks.set(
      '1485714881710022664',
      'https://twitter.com/i/web/status/1485714881710022664'
    );
    expectedHiddenLinks.set(
      '1485714880292397057',
      'https://twitter.com/i/web/status/1485714880292397057'
    );
    expect(reportTableBodyContent.hiddenLinks).toEqual(expectedHiddenLinks);
  });
});
