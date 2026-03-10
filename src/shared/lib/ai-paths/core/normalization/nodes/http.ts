import { type AiNode } from '@/shared/contracts/ai-paths';

import { API_ADVANCED_INPUT_PORTS, HTTP_INPUT_PORTS } from '../../constants';
import { ensureUniquePorts } from '../../utils/graph.ports';

export const normalizeHttpNode = (node: AiNode): AiNode => {
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], HTTP_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], ['value', 'bundle']),
    config: {
      ...node.config,
      http: {
        url: node.config?.http?.url ?? 'https://api.example.com',
        method: node.config?.http?.method ?? 'GET',
        headers: node.config?.http?.headers ?? '{\n  "Content-Type": "application/json"\n}',
        bodyTemplate: node.config?.http?.bodyTemplate ?? '',
        responseMode: node.config?.http?.responseMode ?? 'json',
        responsePath: node.config?.http?.responsePath ?? '',
      },
    },
  };
};

export const normalizeApiAdvancedNode = (node: AiNode): AiNode => {
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], API_ADVANCED_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], [
      'value',
      'bundle',
      'status',
      'headers',
      'items',
      'route',
      'error',
      'success',
    ]),
    config: {
      ...node.config,
      apiAdvanced: {
        url: node.config?.apiAdvanced?.url ?? '',
        method: node.config?.apiAdvanced?.method ?? 'GET',
        pathParamsJson: node.config?.apiAdvanced?.pathParamsJson ?? '{}',
        queryParamsJson: node.config?.apiAdvanced?.queryParamsJson ?? '{}',
        headersJson: node.config?.apiAdvanced?.headersJson ?? '{}',
        bodyTemplate: node.config?.apiAdvanced?.bodyTemplate ?? '',
        bodyMode: node.config?.apiAdvanced?.bodyMode ?? 'none',
        timeoutMs: node.config?.apiAdvanced?.timeoutMs ?? 30_000,
        authMode: node.config?.apiAdvanced?.authMode ?? 'none',
        apiKeyName: node.config?.apiAdvanced?.apiKeyName ?? '',
        apiKeyValueTemplate: node.config?.apiAdvanced?.apiKeyValueTemplate ?? '',
        apiKeyPlacement: node.config?.apiAdvanced?.apiKeyPlacement ?? 'header',
        bearerTokenTemplate: node.config?.apiAdvanced?.bearerTokenTemplate ?? '',
        basicUsernameTemplate: node.config?.apiAdvanced?.basicUsernameTemplate ?? '',
        basicPasswordTemplate: node.config?.apiAdvanced?.basicPasswordTemplate ?? '',
        oauthTokenUrl: node.config?.apiAdvanced?.oauthTokenUrl ?? '',
        oauthClientIdTemplate: node.config?.apiAdvanced?.oauthClientIdTemplate ?? '',
        oauthClientSecretTemplate: node.config?.apiAdvanced?.oauthClientSecretTemplate ?? '',
        oauthScopeTemplate: node.config?.apiAdvanced?.oauthScopeTemplate ?? '',
        connectionIdTemplate: node.config?.apiAdvanced?.connectionIdTemplate ?? '',
        connectionHeaderName: node.config?.apiAdvanced?.connectionHeaderName ?? 'X-Connection-Id',
        responseMode: node.config?.apiAdvanced?.responseMode ?? 'json',
        responsePath: node.config?.apiAdvanced?.responsePath ?? '',
        outputMappingsJson: node.config?.apiAdvanced?.outputMappingsJson ?? '{}',
        retryEnabled: node.config?.apiAdvanced?.retryEnabled ?? true,
        retryAttempts: node.config?.apiAdvanced?.retryAttempts ?? 2,
        retryBackoff: node.config?.apiAdvanced?.retryBackoff ?? 'fixed',
        retryBackoffMs: node.config?.apiAdvanced?.retryBackoffMs ?? 500,
        retryMaxBackoffMs: node.config?.apiAdvanced?.retryMaxBackoffMs ?? 5000,
        retryJitterRatio: node.config?.apiAdvanced?.retryJitterRatio ?? 0,
        retryOnStatusJson: node.config?.apiAdvanced?.retryOnStatusJson ?? '[429,500,502,503,504]',
        retryOnNetworkError: node.config?.apiAdvanced?.retryOnNetworkError ?? true,
        paginationMode: node.config?.apiAdvanced?.paginationMode ?? 'none',
        pageParam: node.config?.apiAdvanced?.pageParam ?? 'page',
        limitParam: node.config?.apiAdvanced?.limitParam ?? 'limit',
        startPage: node.config?.apiAdvanced?.startPage ?? 1,
        pageSize: node.config?.apiAdvanced?.pageSize ?? 50,
        cursorParam: node.config?.apiAdvanced?.cursorParam ?? 'cursor',
        cursorPath: node.config?.apiAdvanced?.cursorPath ?? '',
        itemsPath: node.config?.apiAdvanced?.itemsPath ?? 'items',
        maxPages: node.config?.apiAdvanced?.maxPages ?? 1,
        paginationAggregateMode: node.config?.apiAdvanced?.paginationAggregateMode ?? 'first_page',
        rateLimitEnabled: node.config?.apiAdvanced?.rateLimitEnabled ?? false,
        rateLimitRequests: node.config?.apiAdvanced?.rateLimitRequests ?? 1,
        rateLimitIntervalMs: node.config?.apiAdvanced?.rateLimitIntervalMs ?? 1000,
        rateLimitConcurrency: node.config?.apiAdvanced?.rateLimitConcurrency ?? 1,
        rateLimitOnLimit: node.config?.apiAdvanced?.rateLimitOnLimit ?? 'wait',
        idempotencyEnabled: node.config?.apiAdvanced?.idempotencyEnabled ?? false,
        idempotencyHeaderName: node.config?.apiAdvanced?.idempotencyHeaderName ?? 'Idempotency-Key',
        idempotencyKeyTemplate: node.config?.apiAdvanced?.idempotencyKeyTemplate ?? '',
        errorRoutesJson: node.config?.apiAdvanced?.errorRoutesJson ?? '[]',
      },
    },
  };
};
