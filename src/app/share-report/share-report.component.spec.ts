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
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Provider } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  waitForAsync,
} from '@angular/core/testing';
import { AngularFireModule } from '@angular/fire/compat';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MatSnackBar,
  MatSnackBarRef,
  SimpleSnackBar,
} from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { BehaviorSubject, of, ReplaySubject, Subject, throwError } from 'rxjs';
import { CreatePdfRequest, SocialMediaItem } from 'src/common-types';
import { environment } from '../../environments/environment';
import {
  DropdownButtonComponent,
  HrefOnlyDownloadDirective,
} from '../dropdown-button/dropdown-button.component';
import { OauthApiService } from '../oauth_api.service';
import { PdfService } from '../pdf_service';
import { ReportPdfComponent } from '../report-pdf/report-pdf.component';
import { ReportAction, ReportService } from '../report.service';
import { SheetsApiService } from '../sheets_api.service';
import { TwitterApiService } from '../twitter_api.service';
import { ShareReportComponent } from './share-report.component';

/**
 * Stub for MatDialogRef. The constructor takes a Subject that should be
 * triggered when we want the dialog to close with the value it should send
 * back.
 */
class DialogRefStub<T> {
  constructor(private dialogCloseTrigger: Subject<T>) {}

  afterClosed() {
    return this.dialogCloseTrigger.asObservable();
  }
}

describe('ShareReportComponent', () => {
  let component: ShareReportComponent;
  let fixture: ComponentFixture<ShareReportComponent>;

  const comments = [
    {
      item: {
        id_str: 'a',
        text: 'your mother was a hamster',
        date: new Date(),
        authorScreenName: 'testing1',
        in_reply_to_status_id: '123',
      },
      scores: {
        TOXICITY: 0.8,
      },
    },
    {
      item: {
        id_str: 'b',
        text: 'and your father smelt of elderberries',
        date: new Date(),
        authorScreenName: 'testing2',
      },
      scores: {
        TOXICITY: 0.9,
      },
    },
  ];

  let mockSheetsApiService: jasmine.SpyObj<SheetsApiService>;
  const onCreatePdfRequestSubject = new ReplaySubject<
    CreatePdfRequest<SocialMediaItem>
  >();
  const mockPdfService = jasmine.createSpyObj<PdfService>(
    'pdfService',
    ['createPdf', 'updateCreatePdfSource'],
    {
      onCreatePdfRequest: onCreatePdfRequestSubject.asObservable(),
    }
  );

  const mockTwitterApiService = jasmine.createSpyObj<TwitterApiService>(
    'twitterApiSerivce',
    ['blockUsers', 'muteUsers', 'hideReplies']
  );

  const mockOauthApiService = {
    authenticateGoogleSheets: () => Promise.resolve(),
  };
  const reportActionsSubject = new BehaviorSubject<ReportAction[]>([]);
  const mockReportService = jasmine.createSpyObj<ReportService>(
    'reportService',
    [
      'getCommentsForReport',
      'getReportReasons',
      'getContext',
      'getReportActions',
      'setReportActions',
      'getReportSummary',
    ],
    {
      reportActionsChanged: reportActionsSubject.asObservable(),
    }
  );
  mockReportService.getCommentsForReport.and.returnValue(comments);
  mockReportService.getReportReasons.and.returnValue(['Reason1', 'Reason2']);
  mockReportService.getContext.and.returnValue('Here is some context');
  mockReportService.getReportActions.and.returnValue([]);
  const mockSnackBarRef = jasmine.createSpyObj<MatSnackBarRef<SimpleSnackBar>>(
    'matSnackBarRef',
    ['onAction']
  );

  mockSnackBarRef.onAction.and.returnValue(of());
  const mockSnackBar = jasmine.createSpyObj<MatSnackBar>('matSnackBar', [
    'open',
  ]);
  mockSnackBar.open.and.returnValue(mockSnackBarRef);

  const dialogCloseTrigger = new Subject<boolean>();

  beforeEach(
    waitForAsync(() => {
      reportActionsSubject.next([]);

      mockSheetsApiService = jasmine.createSpyObj<SheetsApiService>(
        'sheetsApiService',
        ['createSpreadsheet', 'createCsvTemplate']
      );
      mockSheetsApiService.createSpreadsheet.and.returnValue(
        of('http://test-url')
      );
      mockSheetsApiService.createCsvTemplate.and.returnValue(
        of({
          title: 'test-csv',
          header: ['column1', 'column2'],
          bodyRows: [
            ['a', 'b'],
            ['c', 'd'],
          ],
        })
      );
      mockPdfService.createPdf.and.returnValue(
        Promise.resolve({
          title: 'title',
          safeUrl: 'www.my-pdf.com',
          buffer: Buffer.from('Test'),
        })
      );

      // Reset these everytime since they're changed in the tests.
      mockReportService.getReportActions.and.returnValue([]);

      mockPdfService.createPdf.calls.reset();
      mockPdfService.updateCreatePdfSource.calls.reset();

      mockTwitterApiService.blockUsers.calls.reset();
      mockTwitterApiService.muteUsers.calls.reset();
      mockTwitterApiService.hideReplies.calls.reset();
    })
  );

  function createComponent(providers: Provider[] = []) {
    TestBed.configureTestingModule({
      declarations: [
        DropdownButtonComponent,
        HrefOnlyDownloadDirective,
        ReportPdfComponent,
        ShareReportComponent,
      ],
      imports: [
        AngularFireModule.initializeApp(environment.firebase),
        HttpClientTestingModule,
        MatButtonModule,
        MatCardModule,
        MatDialogModule,
        MatExpansionModule,
        MatIconModule,
        MatProgressSpinnerModule,
        NoopAnimationsModule,
        OverlayModule,
        PdfViewerModule,
      ],
      providers: [
        {
          provide: MatSnackBar,
          useValue: mockSnackBar,
        },
        {
          provide: OauthApiService,
          useValue: mockOauthApiService,
        },
        {
          provide: ReportService,
          useValue: mockReportService,
        },
        {
          provide: SheetsApiService,
          useValue: mockSheetsApiService,
        },
        {
          provide: PdfService,
          useValue: mockPdfService,
        },
        {
          provide: MatDialog,
          useValue: {
            open(componentName: string) {
              return new DialogRefStub<boolean>(dialogCloseTrigger);
            },
          },
        },
        {
          provide: TwitterApiService,
          useValue: mockTwitterApiService,
        },
        ...providers,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('creates Google sheet', async () => {
    createComponent();
    fixture.debugElement
      .query(By.css('.save-to-sheets-button'))
      .nativeElement.click();
    await fixture.whenStable();

    expect(mockSheetsApiService.createSpreadsheet).toHaveBeenCalledTimes(1);
    expect(mockSheetsApiService.createSpreadsheet).toHaveBeenCalledWith(
      comments,
      ['Reason1', 'Reason2'],
      'Here is some context'
    );
  });

  it('creates PDF', async () => {
    createComponent();
    await fixture.whenStable();

    expect(mockPdfService.updateCreatePdfSource).toHaveBeenCalledOnceWith({
      entries: comments,
      reportReasons: ['Reason1', 'Reason2'],
      context: 'Here is some context',
    });
    expect(mockPdfService.createPdf).toHaveBeenCalledWith(jasmine.any(Object));
  });

  it('shows checkmarks next to completed report actions', async () => {
    createComponent();
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(
        By.css('.save-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeFalsy();

    // First select the CSV option from the menu.
    component.selectedSaveOptionIndex = component.downloadCsvOptionIndex;
    fixture.detectChanges();

    const saveToCsvButton = fixture.debugElement.query(
      By.css('.save-actions-button .dropdown-action-button')
    );
    saveToCsvButton.nativeElement.click();

    fixture.detectChanges();

    expect(
      fixture.debugElement.query(
        By.css('.save-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeTruthy();

    expect(
      fixture.debugElement.query(By.css('.save-to-sheets-button .checkmark'))
    ).toBeFalsy();

    const saveToSheetsButton = fixture.debugElement.query(
      By.css('.save-to-sheets-button')
    );
    saveToSheetsButton.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.save-to-sheets-button .checkmark'))
    ).toBeTruthy();
  });

  it('shows checkmarks next to completed Twitter block action and blocks users', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();

    // Select the BLOCK option from the twitter actions menu.
    component.selectedTwitterActionOptionIndex = 0;
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(
        By.css('.twitter-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeFalsy();

    // If the user cancels the dialog, we should not update the button.
    mockTwitterApiService.blockUsers.and.returnValue(of({}));
    const blockButton = fixture.debugElement.query(
      By.css('.twitter-actions-button .dropdown-action-button')
    );
    blockButton.nativeElement.click();
    fixture.detectChanges();
    dialogCloseTrigger.next(false);
    flush();
    fixture.detectChanges();
    flush();

    expect(
      fixture.debugElement.query(
        By.css('.twitter-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeFalsy();
    expect(mockTwitterApiService.blockUsers).not.toHaveBeenCalledWith([
      'testing1',
      'testing2',
    ]);
    mockTwitterApiService.blockUsers.calls.reset();

    // If there is an error, we should not update the button.
    mockTwitterApiService.blockUsers.and.returnValue(
      throwError({ error: 'Oh no' })
    );
    blockButton.nativeElement.click();
    fixture.detectChanges();
    dialogCloseTrigger.next(true);
    flush();
    fixture.detectChanges();
    flush();

    expect(
      fixture.debugElement.query(
        By.css('.twitter-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeFalsy();
    expect(mockTwitterApiService.blockUsers).toHaveBeenCalledWith([
      'testing1',
      'testing2',
    ]);
    mockTwitterApiService.blockUsers.calls.reset();

    // If the user completes the dialog and there is no error, we should update the button.
    mockTwitterApiService.blockUsers.and.returnValue(of({}));
    blockButton.nativeElement.click();
    fixture.detectChanges();
    dialogCloseTrigger.next(true);
    flush();
    fixture.detectChanges();
    flush();

    expect(
      fixture.debugElement.query(
        By.css('.twitter-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeTruthy();
    expect(mockTwitterApiService.blockUsers).toHaveBeenCalledWith([
      'testing1',
      'testing2',
    ]);
  }));

  it('shows checkmarks next to completed Twitter mute action and mutes users', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();

    // Select the MUTE option from the twitter actions menu.
    component.selectedTwitterActionOptionIndex = 1;
    fixture.detectChanges();

    // If the user cancels the dialog, we should not update the button.
    mockTwitterApiService.muteUsers.and.returnValue(of({}));
    const muteButton = fixture.debugElement.query(
      By.css('.twitter-actions-button .dropdown-action-button')
    );
    muteButton.nativeElement.click();
    fixture.detectChanges();
    dialogCloseTrigger.next(false);
    flush();
    fixture.detectChanges();
    flush();

    expect(
      fixture.debugElement.query(
        By.css('.twitter-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeFalsy();
    expect(mockTwitterApiService.muteUsers).not.toHaveBeenCalledWith([
      'testing1',
      'testing2',
    ]);
    mockTwitterApiService.muteUsers.calls.reset();

    // If there is an error, we should not update the button.
    mockTwitterApiService.muteUsers.and.returnValue(
      throwError({ error: 'Oh no' })
    );
    muteButton.nativeElement.click();
    fixture.detectChanges();
    dialogCloseTrigger.next(true);
    flush();
    fixture.detectChanges();
    flush();

    expect(
      fixture.debugElement.query(
        By.css('.twitter-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeFalsy();
    expect(mockTwitterApiService.muteUsers).toHaveBeenCalledWith([
      'testing1',
      'testing2',
    ]);
    mockTwitterApiService.muteUsers.calls.reset();

    // If the user completes the dialog and there is no error, we should update the button.
    mockTwitterApiService.muteUsers.and.returnValue(of({}));
    muteButton.nativeElement.click();

    fixture.detectChanges();
    dialogCloseTrigger.next(true);
    flush();
    fixture.detectChanges();
    flush();

    expect(
      fixture.debugElement.query(
        By.css('.twitter-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeTruthy();
    expect(mockTwitterApiService.muteUsers).toHaveBeenCalledWith([
      'testing1',
      'testing2',
    ]);
  }));

  it('shows checkmarks next to completed Twitter hide replies action and hides replies', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.hide-replies-button .checkmark'))
    ).toBeFalsy();

    // If the user cancels the dialog, we should not update the button.
    mockTwitterApiService.hideReplies.and.returnValue(of({}));
    const hideRepliesButton = fixture.debugElement.query(
      By.css('.hide-replies-button')
    );
    hideRepliesButton.nativeElement.click();
    fixture.detectChanges();
    dialogCloseTrigger.next(false);
    flush();
    fixture.detectChanges();
    flush();

    expect(
      fixture.debugElement.query(By.css('.hide-replies-button .checkmark'))
    ).toBeFalsy();
    expect(mockTwitterApiService.hideReplies).not.toHaveBeenCalledWith(['a']);
    mockTwitterApiService.hideReplies.calls.reset();

    // If there is an error, we should not update the button.
    mockTwitterApiService.hideReplies.and.returnValue(
      throwError({ error: 'Oh no' })
    );
    hideRepliesButton.nativeElement.click();
    fixture.detectChanges();
    dialogCloseTrigger.next(true);
    flush();
    fixture.detectChanges();
    flush();

    expect(
      fixture.debugElement.query(By.css('.hide-replies-button .checkmark'))
    ).toBeFalsy();
    expect(mockTwitterApiService.hideReplies).toHaveBeenCalledWith(['a']);
    mockTwitterApiService.hideReplies.calls.reset();

    // If the user completes the dialog and there is no error, we should update the button.
    mockTwitterApiService.hideReplies.and.returnValue(of({}));
    hideRepliesButton.nativeElement.click();
    fixture.detectChanges();
    dialogCloseTrigger.next(true);
    flush();
    fixture.detectChanges();
    flush();

    expect(
      fixture.debugElement.query(By.css('.hide-replies-button .checkmark'))
    ).toBeTruthy();
    expect(mockTwitterApiService.hideReplies).toHaveBeenCalledWith(['a']);
  }));

  it('initializes and updates to report actions from service', () => {
    reportActionsSubject.next([
      ReportAction.BLOCK_TWITTER,
      ReportAction.SAVE_TO_DRIVE,
    ]);
    createComponent();
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.twitter-actions-button .checkmark'))
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(
        By.css('.save-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeFalsy();
    expect(
      fixture.debugElement.query(By.css('.save-to-sheets-button .checkmark'))
    ).toBeTruthy();

    reportActionsSubject.next([
      ReportAction.DOWNLOAD_PDF,
      ReportAction.SAVE_TO_DRIVE,
    ]);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.twitter-actions-button .checkmark'))
    ).toBeFalsy();
    expect(
      fixture.debugElement.query(
        By.css('.save-actions-button .dropdown-action-button .checkmark')
      )
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('.save-to-sheets-button .checkmark'))
    ).toBeTruthy();
  });

  it('prints report', () => {
    createComponent();
    fixture.detectChanges();

    const mockDocument = jasmine.createSpyObj<Document>('document', ['write']);
    const mockWindow = jasmine.createSpyObj<Window>(
      'window',
      ['print', 'document', 'close'],
      {
        document: mockDocument,
      }
    );
    spyOn(window, 'open').and.returnValue(mockWindow);

    // First select the Print option from the menu.
    component.selectedSaveOptionIndex = component.printOptionIndex;
    fixture.detectChanges();

    const printButton = fixture.debugElement.query(
      By.css('.save-actions-button .dropdown-action-button')
    );
    printButton.nativeElement.click();

    fixture.detectChanges();

    expect(mockWindow.print).toHaveBeenCalled();
  });
});
