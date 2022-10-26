# Development

Before starting this, ensure you or another developer on your team has gone
through the required [setup](1_setup.md). Each developer will need to follow the
steps in this document to set up their machine for development.

## 1. Install Node.js, npm, and global packages

1. [Download and install Node.js and
   npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#using-a-node-version-manager-to-install-nodejs-and-npm)
2. Install TypeScript and Angular
   ```shell
   npm install -g typescript angular-cli
   ```

## 2. Install local packages

Clone the repository and run `npm install` to download all the local
dependencies listed in `package.json`.

## 3. Copy Google Cloud Platform (GCP) OAuth credentials

These credentials are necessary for the application to authenticate the user
with Google Sheets.

1. Visit the GCP
   [Credentials](https://console.cloud.google.com/apis/credentials) page and
   select the **OAuth 2.0 Client ID** you or another developer on your team
   created for this project during [setup](1_setup.md).
2. Click **Download JSON**.
3. Rename the downloaded file to `credentials.json` and move it to
   [src/server](src/server) (i.e. you should have a
   `src/server/credentials.json` file after this step).

The file will look something like

```json
{
  "web": {
    "client_id": "{YOUR_CLIENT_ID}",
    "project_id": "{YOUR_PROJECT_ID}",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "{SECRET}",
    "redirect_uris": ["http://localhost:8080", "https://other-url.com"],
    "javascript_origins": ["http://localhost:8080", "https://other-url.com"]
  }
}
```

4. If you or another developer on your team has not yet updated the `CLIENT_ID`
   field in [OauthApiService](../src/app/oauth_api.service.ts), copy the value
   from the `client_id` in the `credentials.json` file above into the
   `CLIENT_ID` field. It will look something like <long string of
   characters>.apps.googleusercontent.com.

## 4. Create a Firebase service account key

The server uses the [Firebase Admin
SDK](https://firebase.google.com/docs/admin/setup) to [delete
collections](https://firebase.google.com/docs/firestore/manage-data/delete-data#collections)
of data. The Admin SDK requires a service account key to authenticate the app.
To set up this key

1. Log in to the [Firebase console](https://console.firebase.google.com/), then
   click the gear icon and select **Project settings**.
2. Click the **Service accounts** tab.
3. Click the **Generate new private key** button and then **Generate key**.
4. Rename the downloaded file to `service_account_key.json` and move to
   [src/server](src/server) ((i.e. you should have a
   `src/server/service_account_key.json` file after this step).

The file will look something like

```json
{
  "type": "service_account",
  "project_id": "{YOUR_PROJECT_ID}",
  "private_key_id": "{YOUR_PRIVATE_KEY_ID}",
  "private_key": "-----BEGIN PRIVATE KEY-----{YOUR_PRIVATE_KEY}-----END PRIVATE KEY-----\n",
  "client_email": "{YOUR_CLIENT_EMAIL}",
  "client_id": "{YOUR_CLIENT_ID}",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "{YOUR_URL}"
}
```

## 5. Set up `environment.ts`

1. Log in to the [Firebase console](https://console.firebase.google.com/), then
   click the gear icon and select **Project settings**.
2. Under \*_Your apps_, copy the object named `firebaseConfig`.
3. In [environment.ts](../src/environment.ts), add a new `firebase` key to the
   `environment` const and set its value to the object you just copied.

The file will look something like

```ts
export const environment = {
  production: false,
  firebase: {
    apiKey: '{YOUR_API_KEY}',
    authDomain: 'yourproject.firebaseapp.com',
    databaseURL: 'https://yourproject.firebaseio.com',
    projectId: '{YOUR_PROJECT_ID}',
    storageBucket: 'undefined',
    messagingSenderId: '{YOUR_MESSAGING_SENDER_ID}',
    appId: '{YOUR_APP_ID}',
    measurementId: '{YOUR_MEASUREMENT_ID}',
  },
};
```

If you set up a production-specific Firebase project in [setup](1_setup.md),
you'll want to do the same as above, but copy the object into
[environment.prod.ts](../src/environment.prod.ts).

## 6. Configure the server

The server expects a `build/config/server_config.json` to read the necessary
server-side credentials.

To create this file, run

```bash
npm run setup-server
```

This creates the `build/server/` and `build/config/` directories, and copies
over the [server config template](../src/server/server_config_template.json) to
`build/config/server_config.json`. You'll have to update this config to reflect
your project settings.

The required fields are:

- `port`: The port to run the server on. You'll want to make sure that this port
  is the same as the `target` port in [proxy.conf.js](../proxy.conf.js)
  (currently set to 3000)
- `staticPath`: The directory for the static JavaScript files (typically
  `dist/harassment-manager`)
- `googleCloudApiKey`: Your Google Cloud project API key. Note that this should
  be the server-side key created in [setup](1_setup.md) in GCP
  [Credentials](https://console.cloud.google.com/apis/credentials)
- `cloudProjectId`: Your Google Cloud project ID

The optional fields are:

- `twitterApiCredentials`: Your credentials for the Twitter APIs. The server
  expect this field to be an object with `accountName`, `username`, and
  `password` fields for the Enterprise Search API and `appKey` and `appToken`
  for the Standard API.

All together, your config should look something like the config below, with the
relevant credentials and key values replaced.

```json
{
  "port": "3000",
  "staticPath": "dist/harassment-manager",
  "googleCloudApiKey": "{YOUR_GOOGLE_CLOUD_API_KEY}",
  "cloudProjectId": "{YOUR_GOOGLE_CLOUD_PROJECTID}",
  "twitterApiCredentials": {
    "accountName": "{TWITTER_API_ACCOUNT_NAME}",
    "username": "{TWITTER_API_USERNAME}",
    "password": "{TWITTER_API_PASSWORD}",
    "appKey": "{APP_KEY}",
    "appToken": "{APP_TOKEN}"
  }
}
```

## 7. (Optional) Enable Google Analytics

If you created a Google Analytics property in [setup](1_setup.md) and want to
enable analytics in the application,

1. Find your [measurement or tracking
   ID](https://support.google.com/analytics/answer/7372977?hl=en)
2. Open [index.html](../src/index.html) and copy the ID into
   `"YOUR_ANALYTICS_ID_GOES_HERE"`.

## 8. Run the app

All npm commands are defined in [package.json](../package.json).

### Manually build and run the app

To build and run the app and a local development server, run

```shell
npm run build:all:dev && npm run start:dev-server
```

To build and run the app and a local production server, run

```shell
npm run build:all:prod && npm run start:prod-server
```

Navigate to `http://localhost:8080` to load the app. Note that this command
starts the server on the port specified in `build/server/server_config.json`.

### Automatically rebuild and run the app

To rebuild the app and server automatically, run:

```shell
npm run develop
```

### Testing

To test the app, run:

```shell
npm run test
```

### Pushing code

We maintain a [CircleCI](https://circleci.com/) configuration in
[config.yml](../config.yml) to build, lint, and test the app whenever a change
is pushed to this GitHub repository. You can choose to use the same
configuration for your own CircleCI setup if you'd like or remove the
configuration in favor of another CI solution or none at all.
