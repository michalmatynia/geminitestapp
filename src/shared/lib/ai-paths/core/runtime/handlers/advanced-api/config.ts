import { AdvancedApiConfig } from '@/shared/contracts/ai-paths';

export type JsonRecord = Record<string, unknown>;

export type AdvancedApiErrorRoute = {
  id?: string;
  when?: 'status' | 'status_range' | 'body_regex' | 'timeout' | 'network';
  status?: number;
  minStatus?: number;
  maxStatus?: number;
  pattern?: string;
  flags?: string;
  outputPort?: string;
  message?: string;
};

export const DEFAULT_ADVANCED_API_CONFIG: AdvancedApiConfig = {
  url: '',
  method: 'GET',
  pathParamsJson: '{}',
  queryParamsJson: '{}',
  headersJson: '{}',
  bodyTemplate: '',
  bodyMode: 'none',
  timeoutMs: 30_000,
  authMode: 'none',
  apiKeyName: '',
  apiKeyValueTemplate: '',
  apiKeyPlacement: 'header',
  bearerTokenTemplate: '',
  basicUsernameTemplate: '',
  basicPasswordTemplate: '',
  oauthTokenUrl: '',
  oauthClientIdTemplate: '',
  oauthClientSecretTemplate: '',
  oauthScopeTemplate: '',
  connectionIdTemplate: '',
  connectionHeaderName: 'X-Connection-Id',
  responseMode: 'json',
  responsePath: '',
  outputMappingsJson: '{}',
  retryEnabled: true,
  retryAttempts: 2,
  retryBackoff: 'fixed',
  retryBackoffMs: 500,
  retryMaxBackoffMs: 5_000,
  retryJitterRatio: 0,
  retryOnStatusJson: '[429,500,502,503,504]',
  retryOnNetworkError: true,
  paginationMode: 'none',
  pageParam: 'page',
  limitParam: 'limit',
  startPage: 1,
  pageSize: 50,
  cursorParam: 'cursor',
  cursorPath: '',
  itemsPath: 'items',
  maxPages: 1,
  paginationAggregateMode: 'first_page',
  rateLimitEnabled: false,
  rateLimitRequests: 1,
  rateLimitIntervalMs: 1000,
  rateLimitConcurrency: 1,
  rateLimitOnLimit: 'wait',
  idempotencyEnabled: false,
  idempotencyHeaderName: 'Idempotency-Key',
  idempotencyKeyTemplate: '',
  errorRoutesJson: '[]',
};
