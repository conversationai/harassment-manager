# Deployment

## 1. Address TODOs in code

We've left several TODOs throughout the application code. Before deploying the
code, you'll want adress those TODOs with the information relevant for your use
case and organization.

These include:

- Replacing filler text
- Adding contact information
- Adding links to your organization, privacy policy, and terms of service
- Adding content to the FAQ
  - We strongly recommend adding a "Privacy & Security" section, with questions
    like: "How secure is my data?" and details about data storage

## 2. Deploy the app

We include an [app.yaml](../app.yaml) file to configure settings for deploying
to an AppEngine instance in a Google Cloud Project (GCP). By default, we are
using the standard AppEngine environment with nodejs10 and deploying to the
default service. The AppEngine environment will run `npm run start` when
starting up the app. For more info, see the [AppEngine node.js runtime
documentation](https://cloud.google.com/appengine/docs/standard/nodejs/runtime).

To deploy,

1. Install the [Cloud SDK](https://cloud.google.com/sdk/docs/install) on your
   machine
2. Set your project iD
   ```bash
   gcloud config set project ${YOUR_CLOUD_PROJECT_ID}
   ```
3. Build the app for production
   ```bash
   npm run build:all:prod
   ```
4. Deploy
   ```bash
   gcloud app deploy
   ```

If you want to disable promoting the deployment to receive all traffic, run
`gcloud app deploy --no-promote`. This will upload the changes to a new version
without migrating the traffic. You can then visit
[Versions](https://console.cloud.google.com/appengine/versions) in GCP to see
the new deployment in the list with 0% traffic allocation. You can click on the
version number to open the URL and test the deployment. When you are satisfied,
click the checkbox next to the version number and click **Migrate traffic** at
the top of the screen. This will migrate the traffic to the new version.
