# Server

The server is built with Node.js and [Express](https://expressjs.com/). The
design and structure of the server is based on the
[perspectiveapi-simple-server](https://github.com/conversationai/perspectiveapi-simple-server).

## Overview

The files in this directory include:

- [contrib_typings/](contrib_typings/): Contains namespace and typing
  definitions for various server dependencies
- [middleware/](middleware/): Contains the middleware functions for the server's
  HTTP endpoints
- [analyze-api-defs.ts](analyze-api-defs.ts): Defines various interfaces for
  Perspective API
- [http-status-codes.ts](http-status-codes.ts): Defines error codes for the
  server
- [run_server.ts](run_server.ts): Starts the server
- [server_config.template.json](server_config.template.json): The server relies
  on a `server_config.json` configuration file for various API credentials. This
  file defines the template for that configuration file. `npm run setup-server`
  copies this template into the appropriate directory as `server_config.json`.
- [serving.ts](serving.ts): Defines the server
- [serving_test.ts](serving_test.ts): Tests some of the server functionality

## Configuring the server

See the top-level README for instructions on how to [configure the
server](https://github.com/Jigsaw-Code/harassment-manager#4-configure-the-server).
