// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { JSONSchema7 } from 'json-schema';

import type { IBotProject } from './server';
import type { UserIdentity } from './user';
import type { ILuisConfig, IQnAConfig } from './settings';
import { AuthParameters } from './auth';

export type PublishResult = {
  message: string;
  comment?: string;
  eTag?: string;
  log?: string;
  id?: string;
  time?: Date;
  endpointURL?: string;
  status?: number;
};

export type PublishResponse = {
  status: number;
  result: PublishResult;
};

export type PullResponse = {
  error?: any;
  eTag?: string;
  status: number;
  /** Path to the pulled .zip containing updated bot content */
  zipPath?: string;
};

type GetAccessToken = (params: AuthParameters) => Promise<string>;

// TODO: Add types for project, metadata
export type PublishPlugin<Config = any> = {
  name: string;
  description: string;

  // methods plugins should support
  publish: (
    config: Config,
    project: IBotProject,
    metadata: any,
    user?: UserIdentity,
    getAccessToken?: GetAccessToken
  ) => Promise<PublishResponse>;
  getStatus?: (
    config: Config,
    project: IBotProject,
    user?: UserIdentity,
    getAccessToken?: GetAccessToken
  ) => Promise<PublishResponse>;
  getHistory?: (
    config: Config,
    project: IBotProject,
    user?: UserIdentity,
    getAccessToken?: GetAccessToken
  ) => Promise<PublishResult[]>;
  rollback?: (
    config: Config,
    project: IBotProject,
    rollbackToVersion: string,
    user?: UserIdentity
  ) => Promise<PublishResponse>;
  pull?: (
    config: Config,
    project: IBotProject,
    user?: UserIdentity,
    getAccessToken?: GetAccessToken
  ) => Promise<PullResponse>;

  // other properties
  schema?: JSONSchema7;
  instructions?: string;
  bundleId?: string;
  [key: string]: any;
};

export type IPublishConfig = {
  luis: ILuisConfig;
  qna: IQnAConfig;
};

export type PublishTarget = {
  name: string;
  type: string;
  configuration: string;
  lastPublished?: Date;
};
