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

// String enums get compiled to an object with a mapping key->value, so they can
// be treated as an Object and used with Object functions like Object.keys()
// (since unlike numeric enums, they don't get a reverse mapping at runtime; see
// https://www.typescriptlang.org/docs/handbook/enums.html#enums-at-runtime)
// and can also be used with mapped types, such as AttributeSummaryScores below.
export enum Attributes {
  TOXICITY = 'TOXICITY',
  SEVERE_TOXICITY = 'SEVERE_TOXICITY',
  INSULT = 'INSULT',
  PROFANITY = 'PROFANITY',
  THREAT = 'THREAT',
  IDENTITY_ATTACK = 'IDENTITY_ATTACK'
}

// Union type of all keys in Attributes.
export type Attribute = keyof Attributes;

// Mapping of attributes to their summary scores.
export type AttributeSummaryScores = {
  [key in keyof typeof Attributes]?: number
};

export interface AnalyzeCommentRequest {
  comment: TextEntry;
  languages?: string[];
  requested_attributes: RequestedAttributes;
  do_not_store?: boolean;
  client_token?: string;
  session_id?: string;
  community_id?: string;
  span_annotations?: boolean;
}

export interface RequestedAttributes {
  [key: string]: AttributeParameters;
}

interface AttributeParameters {
  score_type?: string;
  score_threshold?: FloatValue;
}

interface FloatValue {
  value: number;
}

export interface ResponseData<T> {
  data: T;
}

export interface AnalyzeCommentResponse {
  attributeScores?: AttributeScores;
  languages?: string[];
  clientToken?: string;
}

// Holds data needed for building an |AnalyzeCommentRequest|.
export interface AnalyzeCommentData {
  comment: string;
  sessionId: string;
  languages?: string[];
  doNotStore?: boolean;
  clientToken?: string;
  communityId?: string;
  spanAnnotations?: boolean;
  parentComment?: string;
  articleText?: string;
  attributes: string[];
}

export interface AttributeScores {
 [key: string]: SpanScores;
}

interface TextEntry {
  text: string;
  type?: string;
}

interface SpanScores {
  spanScores?: SpanScore[];
  summaryScore?: Score;
}

interface SpanScore {
  begin?: number;
  end?: number;
  score: Score;
}

interface Score {
  value: number;
  type?: string;
}

export interface ResponseError {
  code: number;
  errors: string[];
}
