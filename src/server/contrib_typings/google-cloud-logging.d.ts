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
import google_cloud_trace = require('@google-cloud/logging');

declare namespace logging {
    export interface Log {
      write(stringToLog:string): Promise<void>;
    }
    export interface LoggingClient {
      log(logName:string) : Log;
    }
    export interface CloudLogging {
      (): LoggingClient;
    }
}

declare var logging: logging.CloudLogging;
export = logging;
