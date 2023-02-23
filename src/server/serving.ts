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

import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import firebase from 'firebase/compat/app';
import * as fs from 'fs';
import { Credentials } from 'google-auth-library';
import { GoogleApis } from 'googleapis';
import { Endpoint, OAuth2Client } from 'googleapis-common';
import * as http from 'http';
import * as path from 'path';
import {
  CreateSpreadsheetRequest,
  isFirebaseCredential,
  Tweet,
  TwitterApiVersion
} from '../common-types';
import * as dev from '../environments/environment';
import * as prod from '../environments/environment.prod';
import {
  AnalyzeCommentData,
  AnalyzeCommentRequest,
  AnalyzeCommentResponse,
  RequestedAttributes,
  ResponseData,
  ResponseError,
} from '../perspectiveapi-types';
import { DemoRequest, NodeAnalyzeApiClient } from './analyze-api-defs';
import { clearReport } from './middleware/firestore.middleware';
import {
  getReportCsvTemplate,
  sendCreateSpreadsheetApiRequest,
} from './middleware/google-sheets.middleware';
import {
  blockTwitterUsers,
  getTweets,
  hideTwitterReplies,
  muteTwitterUsers,
} from './middleware/twitter.middleware';

interface Logger {
  write(s: string): void;
}

const googleapis = new GoogleApis();
export const COMMENT_ANALYZER_DISCOVERY_URL =
  'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';

export interface Config {
  port: string;
  staticPath: string;
  googleCloudApiKey: string;
  cloudProjectId: string;
  isProduction: boolean;
  twitterApiCredentials: TwitterApiCredentials;
}

export interface TwitterApiCredentials {
  // The below three fields are necessary if using Enterprise Full-Archive
  // Search.
  accountName?: string;
  password?: string;
  username?: string;
  // The below two fields are necessary for the Blocks, Mutes, and Hide Replies
  // APIs.
  appKey: string;
  appToken: string;
  // Necessary if using v2 Full-Archive Search.
  bearerToken?: string;

  // Flag to indicate whether to use the  Essential or Academic v2 Full-Archive Search API
  useEssentialOrElevatedV2?: boolean;
}

export interface WebAppCredentials {
  client_secret: string;
  client_id: string;
}

function loadAppCredentials(): Promise<WebAppCredentials> {
  return new Promise((resolve, reject) => {
    // Load client secrets from a local file.
    fs.readFile('src/server/credentials.json', (err, content) => {
      if (err) {
        reject('Error loading client secret file: ' + err);
      } else {
        const credentials = JSON.parse(content.toString());
        resolve(credentials.web);
      }
    });
  });
}

function loadFirebaseServiceAccountKey(): Promise<ServiceAccount> {
  return new Promise((resolve, reject) => {
    fs.readFile('src/server/service_account_key.json', (err, content) => {
      if (err) {
        reject('Error loading service account key file: ' + err);
      } else {
        resolve(JSON.parse(content.toString()));
      }
    });
  });
}

const REQUEST_PAYLOAD_LIMIT = '50mb';

export class Server {
  // Public for the sake of writing tests.
  app!: express.Express;
  httpServer!: http.Server;
  analyzeApiClient?: NodeAnalyzeApiClient;
  port: number;
  staticPath?: string;

  private appCredentials: WebAppCredentials | null = null;

  private log: Logger;

  constructor(public config: Config) {
    if (this.config.isProduction) {
      this.log = { write: (_s: string): void => {} };
    } else {
      this.log = {
        write: (s: string): void => {
          console.log(s);
        },
      };
    }

    this.log.write(`The config is: ${JSON.stringify(this.config, null, 2)}`);
    this.port = Number(this.config.port);
    if (!config.staticPath) {
      console.error('staticPath must be specified in the config.');
      return;
    }
    this.staticPath = path.resolve(process.cwd(), config.staticPath);
    this.log.write(`Resolved staticPath: ${this.staticPath}`);

    this.app = express();

    // Trust proxies so that DoS server can see original IP addresses.
    // DoS Server will hopefully start from the least trustd IPs and work
    // backwards.
    this.app.set('trust proxy', true);

    this.app.use(express.static(this.staticPath));
    // Remove the header that express adds by default.
    this.app.disable('x-powered-by');
    this.app.use(compression()); // Enable gzip
    this.app.use(bodyParser.json({ limit: REQUEST_PAYLOAD_LIMIT })); // Enable json parser

    // Respond to health checks when running on
    // Google AppEngine and ComputeEngine
    this.app.get('/_ah/health', (_req, res) => {
      res.status(200).send('ok');
    });

    // get Twitter API Version
    this.app.get('/get_twitter_api_version', (_req, res) => {
      res.status(200).send({
        version:this.config.twitterApiCredentials.useEssentialOrElevatedV2 ? TwitterApiVersion.ESSENTIAL_OR_ELEVATED_V2 : TwitterApiVersion.ENTERPRISE
      });

    });

    this.app.post('/check', (req, res) => {
      this.sendAnalyzeRequest(this.getAnalyzeCommentRequest(req))
        .then((response: AnalyzeCommentResponse) => {
          res.send(response);
        })
        .catch((e: ResponseError) => {
          console.log(`Error scoring text ${req.body.comment}: ${e}`);
          res.status(e.code).send(e);
        });
    });

    this.app.post('/get_tweets', (req, res) => {
      getTweets(req, res, this.config.twitterApiCredentials);
    });

    this.app.post('/block_twitter_users', (req, res) => {
      blockTwitterUsers(req, res, this.config.twitterApiCredentials);
    });

    this.app.post('/mute_twitter_users', (req, res) => {
      muteTwitterUsers(req, res, this.config.twitterApiCredentials);
    });

    this.app.post('/hide_replies_twitter', (req, res) => {
      hideTwitterReplies(req, res, this.config.twitterApiCredentials);
    });

    this.app.post('/save_twitter_report_csv', (req, res) => {
      const template = getReportCsvTemplate(
        req.body as CreateSpreadsheetRequest<Tweet>
      );
      res.send(template);
    });

    this.app.post('/create_twitter_report', (req, res) => {
      const createSpreadsheetRequest =
        req.body as CreateSpreadsheetRequest<Tweet>;

      if (!createSpreadsheetRequest.credentials) {
        res.status(400).send(new Error('Missing credentials'));
        return;
      }

      const oauthClient = this.createOAuthClient(
        createSpreadsheetRequest.credentials
      );

      sendCreateSpreadsheetApiRequest(req, res, oauthClient);
    });

    this.app.post('/clear_report', (req, res) => {
      clearReport(req, res);
    });

    this.app.use((_req, res) => {
      res.sendFile('index.html', { root: 'dist/harassment-manager' });
    });

    this.httpServer = http.createServer(this.app);
    this.log.write(`created server`);
  }

  async start(): Promise<void> {
    loadAppCredentials()
      .then((credentials: WebAppCredentials) => {
        this.appCredentials = credentials;
        this.log.write('Authorization load completed');
      })
      .catch((e) => {
        console.log(e);
      });
    loadFirebaseServiceAccountKey()
      .then((key: ServiceAccount) => {
        this.log.write('Firebase service account key load completed');

        const firebase = this.config.isProduction
          ? prod.environment.firebase
          : dev.environment.firebase;

        admin.initializeApp({
          credential: admin.credential.cert(key),
        });

        this.log.write('Firebase app initialized successfully');
      })
      .catch((e) => {
        console.log(e);
      });
    return this.createCommentAnalyzerClient(COMMENT_ANALYZER_DISCOVERY_URL)
      .then<void>(() => {
        this.log.write('Analyzer client created');
        return new Promise<void>(
          (F: () => void, R: (reason?: Error) => void) => {
            // Start HTTP up the server
            this.httpServer.listen(this.port, () => {
              this.log.write(`HTTP Listening on port ${this.port}`);
              F();
            });
            this.httpServer.on('error', (err: Error) => {
              if (err) {
                console.error(err.message);
                R(err);
                return;
              }
            });
          }
        );
      })
      .catch((e) => {
        console.error(`Failed to start: ` + e.message);
        throw e;
      });
  }

  stop(): Promise<void> {
    return new Promise<void>((F: () => void, _: (E?: Error) => void) => {
      this.httpServer.close(F);
    });
  }

  // Converts a DemoRequest into an AnalyzeCommentRequest that can be sent to
  // the OnePlatform API.
  getAnalyzeCommentRequest(req: DemoRequest): AnalyzeCommentRequest {
    if (!req.body) {
      throw Error('No request body.');
    }

    const requestData: AnalyzeCommentData = req.body as AnalyzeCommentData;

    const requestedAttributes: RequestedAttributes = {};
    for (const attribute of requestData.attributes) {
      requestedAttributes[attribute] = { score_type: 'PROBABILITY' };
    }

    return {
      comment: { text: requestData.comment },
      languages: requestData.languages,
      requested_attributes: requestedAttributes,
      do_not_store: true, // Enforce for duration of Twitter API trial access.
      client_token: requestData.clientToken,
      session_id: requestData.sessionId,
      community_id: requestData.communityId,
      span_annotations: requestData.spanAnnotations,
    };
  }

  sendAnalyzeRequest(
    request: AnalyzeCommentRequest
  ): Promise<AnalyzeCommentResponse> {
    return new Promise((resolve, reject) => {
      this.analyzeApiClient!.comments.analyze(
        {
          key: this.config.googleCloudApiKey,
          resource: request,
        },
        (error: Error, response: ResponseData<AnalyzeCommentResponse>) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(response.data);
        }
      );
    });
  }

  async createCommentAnalyzerClient(discoveryUrl: string): Promise<void> {
    return new Promise<void>(
      (
        resolve: () => void,
        reject: (reason?: Error | ResponseError) => void
      ) => {
        googleapis
          .discoverAPI(discoveryUrl)
          .then((endpoint: Readonly<Endpoint>) => {
            const client = endpoint as NodeAnalyzeApiClient;
            if (!(client.comments && client.comments.analyze)) {
              console.error(
                'ERROR: !(client.comments && client.comments.analyze)'
              );
              // Bizarrely, this doesn't cause a discovery error?
              reject(Error('Unknown error loading API: client is b0rken'));
              return;
            }
            this.analyzeApiClient = client;
            resolve();
          })
          .catch((discoverErr) => {
            console.error('ERROR: discoverAPI failed.');
            reject(discoverErr);
            return;
          });
      }
    );
  }

  createOAuthClient(
    credentials: firebase.auth.OAuthCredential | Credentials
  ): OAuth2Client {
    const oauthClient = new googleapis.auth.OAuth2(
      this.appCredentials!.client_id,
      this.appCredentials!.client_secret
    );

    if (isFirebaseCredential(credentials)) {
      oauthClient.setCredentials({
        access_token: credentials.accessToken,
        id_token: credentials.idToken,
      });
    } else {
      oauthClient.setCredentials(credentials);
    }
    return oauthClient;
  }
}
