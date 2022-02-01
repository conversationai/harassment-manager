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

// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function(config) {
  var configuration = {
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../coverage'),
      reports: ['html', 'lcovonly'],
      fixWebpackSourcePaths: true,
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    files: [
      { pattern: '/assets/*', watched: false, included: false, served: true },
    ],
    proxies: {
      '/action_report_disabled.svg': '/assets/action_report_disabled.svg',
      '/all_comments_icon.svg': '/assets/all_comments_icon.svg',
      '/alert_sign_stake.svg': '/assets/alert_sign_stake.svg',
      '/climb_mountain.svg': '/assets/climb_mountain.svg',
      '/filing-report.svg': '/assets/filing-report.svg',
      '/harassment_manager_logo.png': '/assets/harassment_manager_logo.png',
      '/header_images_Left_image.svg': '/assets/header_images_Left_image.svg',
      '/header_images_Right_image.svg': '/assets/header_images_Right_image.svg',
      '/high_priority_icon.svg': '/assets/high_priority_icon.svg',
      '/highfive.png': '/assets/highfive.png',
      '/low_priority_icon.svg': '/assets/low_priority_icon.svg',
      '/mountain_flag.svg': '/assets/mountain_flag.svg',
      '/pdf_table_header.png': '/assets/pdf_table_header.png',
      '/placing_circle.svg': '/assets/placing_circle.svg',
      '/possible_priority_icon.svg': '/assets/possible_priority_icon.svg',
      '/product_logos_drive_24dp.svg': '/assets/product_logos_drive_24dp.svg',
      '/resources.png': '/assets/resources.png',
      '/spreadsheet.png': '/assets/spreadsheet.png',
      '/unknown_priority_icon.svg': '/assets/unknown_priority_icon.svg',
      '/walking_in_clutter.svg': '/assets/walking_in_clutter.svg',
      '/writing_on_document.svg': '/assets/writing_on_document.svg',
    },
  };

  if (process.env.CIRCLECI) {
    // Run only once when using circleci.
    configuration.singleRun = true;
  }

  config.set(configuration);
};
