/*
Copyright 2017 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import * as fs from 'fs';

const args = process.argv.slice(2);

const config = JSON.parse(fs.readFileSync(args[0], 'utf8'));

if (process.env['NODE_ENV'] !== 'development' &&
    process.env['NODE_ENV'] !== 'production') {
  console.error('The NODE_ENV environment variable must be "development" ' +
    'or "production", but it was: "' + process.env['NODE_ENV'] + '"');
  process.exit(1);
}

if (!config.googleCloudApiKey) {
  console.error('The config file build/config/server_config.json needs to specify'
                + ' googleCloudApiKey');
  process.exit(1);
}

const IS_PRODUCTION: boolean =
    (process.env['NODE_ENV'] === 'production');

if (IS_PRODUCTION) {
  config.isProduction = true;
  require('@google-cloud/trace-agent').start({
    projectId: config.cloudProjectId
  });
  require('@google-cloud/debug-agent').start({
    projectId: config.cloudProjectId,
    allowExpressions: true
  });
  // AppEngine gives an error message if you're running on a different port than
  // what the ENV variable is set to.
  config['port'] = process.env['PORT'];
}

import * as serving from './serving';
const server = new serving.Server(config);
server.start()
  .then(() => {
    console.log(`Server started on port: ${server.port} ` +
      `with static path: ${server.staticPath}`);
  })
  .catch((e: Error) => {
    console.error(`Server failed to start on port: ${server.port} ` +
      `with static path: ${server.staticPath}`);
    console.error(e);
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('stopping server.');
  // disconnect from DB...
  // db.stop(function(err) { ... });
  server.stop();
  process.exit(0);
});

