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

declare module 'passport-google-oauth20' {

    import passport = require('passport');
    import express = require('express');

    interface Profile extends passport.Profile {
        id : string;  // public id for the user.
        displayName :string;
        provider : string;
        photos ?: {
                value:string;  // holds the URL of the photo
            }[];
        birthday ?: string;
        relationship ?: string;
        isPerson ?: string;
        isPlusUser ?: string;
        placesLived ?: string;
        language ?: string;
        gender ?: string;
        picture ?: string;

        _raw: string;
        _json: any;
    }

    interface IOAuth2StrategyOption {
        clientID: string;
        clientSecret: string;
        callbackURL: string;

        authorizationURL?: string;
        tokenURL?: string;

        accessType?: string;
        approval_prompt?: string;
        prompt?: string;
        loginHint?: string;
        userID?: string;
        hostedDomain?: string;
        display?: string;
        requestVisibleActions?: string;
        openIDRealm?: string;
    }

    export class Strategy implements passport.Strategy {
        constructor(options: IOAuth2StrategyOption,
                    verify: (accessToken: string, refreshToken: string, profile: Profile, done: (error: any, user?: any) => void) => void);
        name: string;
        authenticate: (req: express.Request, options?: Object) => void;
    }
}
