# Setup

Harassment Manager is an [Angular](https://angular.io/) application with an
[Express](https://expressjs.com/) server on the backend. The application also
uses:

- [The Twitter API](https://developer.twitter.com/en/docs/twitter-api) to fetch
  Twitter data
- [The Google Sheets API](https://developers.google.com/sheets/api) for
  exporting data to Sheets
- [Perspective API](https://perspectiveapi.com/) to identify "toxic" comments
- [Firebase](https://firebase.google.com/) for authentication and data storage

Before starting development, you'll need to follow the steps in this document to
get these APIs and other dependencies set up. It should only be necessary to do
this once, even if you're setting this up on behalf of an organization or team
of developers.

## 1. Get access to Twitter APIs

**NOTE: The full suite of Twitter APIs the app uses require additional access
beyond the default Twitter API [Essential access
level](https://developer.twitter.com/en/docs/twitter-api/getting-started/about-twitter-api).
The [Enterprise
search](https://developer.twitter.com/en/docs/twitter-api/enterprise/search-api/overview)
additionally requires an [enterprise
account](https://developer.twitter.com/en/docs/twitter-api/enterprise/search-api/overview).**

**NOTE: We plan to migrate the Enterprise Full-Archive Search API to the v2 Search Tweets
in the future. We will update this documentation accordingly.**

The app makes use of several Twitter APIs, including:

- [The Enterprise Full-Archive Search
  API](https://developer.twitter.com/en/docs/twitter-api/enterprise/search-api/overview) to fetch
  tweets directed at the logged in user
- The v2 [blocks](https://developer.twitter.com/en/docs/twitter-api/users/blocks/introduction)
  endpoint to block users on behalf of the authenticated user
- The v2 [mutes](https://developer.twitter.com/en/docs/twitter-api/users/mutes/introduction)
  endpoint to mute users on behalf of the authenticated user
- The v2 [hide
  replies](https://developer.twitter.com/en/docs/twitter-api/tweets/hide-replies/introduction)
  endpoint to hide replies on behalf of the authenticated user

To support all this functionality, you'll need to [get access to the Twitter
API](https://developer.twitter.com/en/docs/twitter-api/getting-started/getting-access-to-the-twitter-api)
and the Enterprise Full-Archive Search API.

Once granted, take note of the:

- Account name, app key, and app secret for your Twitter API developer account
- Username and password for your Enterpise Full-Archive Search API account

You'll need both sets of credentials later on.

## 2. Create a Google Cloud Platform (GCP) project

A GCP project is required to use several of the APIs the application depends on.
This project forms the basis for creating, enabling, and using all Google Cloud
services, including managing APIs, enabling billing, adding and removing
collaborators, and managing permissions.

1. Create a [Google Cloud](https://cloud.google.com/) account if you do not
   already have one. Note you'll need to log in with a Google account, enter
   details about your account type, and add a payment method.
2. [Create a Google Cloud
   project](https://cloud.google.com/resource-manager/docs/creating-managing-projects).
   Developers who are setting the project up for an organization may want to
   review the [quickstart for
   organizations](https://cloud.google.com/resource-manager/docs/quickstart-organizations).

## 3. Set up Google Cloud APIs

1. Register for [Perspective
   API](https://support.perspectiveapi.com/s/docs-get-started) access.
2. Once access is granted to Perspective API, search for and enable the
   following APIs in the GCP [API
   Library](https://console.cloud.google.com/apis/library).
   - Perspective Comment Analyzer
   - Google Sheets

## 4. Create API credentials

1. Visit the GCP
   [Credentials](https://console.cloud.google.com/apis/credentials) page.
2. Click **Create Credentials** and select **OAuth client ID**. Set "Application
   type" to **Web application**. Add all URLs you want to run the application
   with, including http://localhost:8080 (or your preferred port), under
   "Authorized JavaScript origins" and "Authorized redirect URIs". Consider
   renaming this ID to something you can easily identify.

- Register for [Perspective
  API](https://support.perspectiveapi.com/s/docs-get-started)
- Enable the following [APIs](https://console.cloud.google.com/apis/library) for
  your project:
  - Google Sheets
  - Perspective Comment Analyzer
- Create [credentials](https://console.cloud.google.com/apis/credentials):

  - Create an OAuth 2.0 client ID of type "Web application" to access the Sheets
    APIs. You will want to add all URLs for your application, including
    http://localhost:8080 (or your preferred port), under "Authorized JavaScript
    origins" and "Authorized redirect URIs".

## 5. Configure Firebase

### Add Firebase to your Google Cloud project

1. Log in to the [Firebase console](https://console.firebase.google.com/), then
   click **Add project**.
2. Select your existing Google Cloud project from the dropdown menu, then click
   **Continue**.
3. (Optional) Enable Google Analytics for your project, then follow the prompts
   to select or create a Google Analytics account. See below for more details.
4. Click **Add Firebase**.

### Optional: Register for Google Analytics

By default, the [GoogleAnalyticsService](../src/app/google_analytics.service.ts)
emits logging events for several user actions across the app. To actually enable
this logging and collect the data in Google Analytics,

1. Create a Google Analytics [account and
   property](https://support.google.com/analytics/answer/9304153/)
2. Find your ID (starting with "G-") to use with the
   [gtag.js](https://developers.google.com/analytics/devguides/collection/gtagjs)
   library. Take note of this ID for later on.

### Enable authentication

1. In the Firebase console, click **Authentication** from the navigation panel.
2. Go to the **Sign-in Method** tab
3. Enable **Google** and **Twitter** authentication.

### Create Firestore database

1. In the Firebase console, click **Firestore Database** from the navigation
   panel.
2. Select **Create database** and follow the prompts to enable Firestore.
3. Go to the **Rules** tab.
4. (Important) Change the existing rule to:

   ```
   rules_version = '2';
   service cloud.firestore {
    match /databases/{database}/documents {
      // Only allow users access to their own data
      match /users/{userId}/{documents=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId
      }
    }
   }
   ```

   This enables [content-owner only
   access](https://firebase.google.com/docs/rules/basics#content-owner_only_access),
   so users can only read/write their own data.

5. Click **Publish**.

### Register the app

1. In the center of the [Firebase console's project overview
   page](https://console.firebase.google.com/), click the **Web** icon to launch
   the setup workflow. If you've already added an app to your Firebase project,
   click **Add app** to display the platform options.
2. Enter your app's nickname. This nickname is an internal, convenience
   identifier and is only visible to you in the Firebase console.
3. Click **Register app**.
4. Copy the `firebaseConfig` constant into a local file. You'll need this config
   to set up Firebase in your Angular project.

## 6. Create and secure API keys

The app uses [AngularFire](https://github.com/angular/angularfire) to interact
with Firebase Authentication and Firestore. By default, AngularFire instructs
you to add the Firebase config you saved above to
`/src/environments/environment.ts`. However, this exposes your API key in the
repository. This is problematic because we enabled billable APIs (Perspective
API, which is free, and Google Sheets) for this project. To help secure your API
key, we strongly recommend [adding key
restrictions](https://firebase.google.com/docs/projects/api-keys#apply-restrictions).

One such setup involves creating "client-side" and "server-side" specific keys.
To do so,

1. Visit the GCP
   [Credentials](https://console.cloud.google.com/apis/credentials) page.
2. Select the API key created by Firebase (i.e. the same key from the
   `firebaseConfig` you saved above).
3. Under **API Restrictions**, add
   - Identity Toolkit API
   - Token Service API This restricts the key to only the APIs the client-side
     of the application sues.
4. Go back to the Credentials page and click **Create Credentials** and select
   **API key**. Consider renaming this key to "Client-side key" or something
   similar to easily identify it.
5. Under **API Restrictions**, add

   - Cloud Firestore API
   - Google Sheets API
   - Perspective Comment Analyzer API

   This restricts the key to only the APIs the server-side of the application
   sues. You'll use this key to configure the server later on. Consider renaming
   this key to "Server-side key" or something similar to easily identify it.
   **Make sure to avoid checking in this key in any source code.**

### (Optional) Use environment-specific API keys

By default, the app uses the same Firebase project for both development and
production. This means the app writes to the same Firestore database. If you'd
like to set up different Firebase projects for [development and
production](https://firebase.google.com/docs/projects/api-keys#test-vs-prod-keys),
you'll need to setup the API keys as described above and update
`environment.prod.ts` with the client-side API key from your production project.
We highly encourage also adding referrer and IP restrictions to your production
API keys to restrict the client-side key to the domain you deploy the app to and
the server-side key to the IP address of your server.

## 7. Set up your development environment

You should now be ready to [set up development](2_development.md).
