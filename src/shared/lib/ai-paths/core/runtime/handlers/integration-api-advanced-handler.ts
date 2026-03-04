/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { AdvancedApiConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandler, NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { getValueAtMappingPath, renderTemplate, safeStringify } from '../../utils';
import {
  evaluateOutboundUrlPolicy,
  fetchWithOutboundUrlPolicy,
  OutboundUrlPolicyError,
} from '../security/outbound-url-policy';

import { DEFAULT_ADVANCED_API_CONFIG, JsonRecord } from './advanced-api/config';
import {
  toStringRecord,
  applyPathParams,
  appendQueryParams,
  sleep,
  resolveRetryDelay,
  buildMappedOutputs,
  createSignalControl,
} from './advanced-api/utils';
import {
  parseErrorRoutes,
  evaluateErrorRoute,
  resolveRetryStatuses,
  parseOutputMappings,
} from './advanced-api/routing';
import { resolveAuthHeaders } from './advanced-api/auth';

export const handleAdvancedApi: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  abortSignal,
  sideEffectControl,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.http.has(node.id)) return prevOutputs;

  const config: AdvancedApiConfig = {
    ...DEFAULT_ADVANCED_API_CONFIG,
    ...(node.config?.apiAdvanced ?? {}),
  };

  const baseUrl = renderTemplate(config.url ?? '', nodeInputs, '').trim();
  if (!baseUrl) {
    return {
      value: null,
      bundle: {
        ok: false,
        status: 0,
        error: 'Missing URL',
        route: 'missing_url',
      },
      status: 0,
      error: 'Missing URL',
      route: 'missing_url',
      success: false,
    };
  }
  const baseOutboundPolicy = evaluateOutboundUrlPolicy(baseUrl);
  if (!baseOutboundPolicy.allowed) {
    return {
      value: null,
      bundle: {
        ok: false,
        status: 0,
        error: `Blocked outbound URL (${baseOutboundPolicy.reason ?? 'policy_violation'})`,
        route: 'blocked_outbound_url',
      },
      status: 0,
      error: `Blocked outbound URL (${baseOutboundPolicy.reason ?? 'policy_violation'})`,
      route: 'blocked_outbound_url',
      success: false,
    };
  }

  const parsedPathParams = toStringRecord(
    (parseJsonWithTemplates as any)(config.pathParamsJson, nodeInputs, {}, reportAiPathsError, {
      action: 'parseAdvancedApiPathParams',
      nodeId: node.id,
    })
  );
  const parsedQueryParams = toStringRecord(
    (parseJsonWithTemplates as any)(config.queryParamsJson, nodeInputs, {}, reportAiPathsError, {
      action: 'parseAdvancedApiQueryParams',
      nodeId: node.id,
    })
  );
  const parsedHeaders = toStringRecord(
    (parseJsonWithTemplates as any)(config.headersJson, nodeInputs, {}, reportAiPathsError, {
      action: 'parseAdvancedApiHeaders',
      nodeId: node.id,
    })
  );
  const outputMappings = parseOutputMappings(config, nodeInputs, reportAiPathsError, node.id);
  const retryStatuses = resolveRetryStatuses(config, nodeInputs, reportAiPathsError, node.id);
  const errorRoutes = parseErrorRoutes(config, nodeInputs, reportAiPathsError, node.id);

  const maxPages = Math.max(1, Math.trunc(config.maxPages ?? 1));
  const pageParam = (config.pageParam ?? 'page').trim() || 'page';
  const limitParam = (config.limitParam ?? 'limit').trim() || 'limit';
  const cursorParam = (config.cursorParam ?? 'cursor').trim() || 'cursor';
  const paginationMode = config.paginationMode ?? 'none';
  const aggregateMode = config.paginationAggregateMode ?? 'first_page';
  const pageSize = Math.max(1, Math.trunc(config.pageSize ?? 50));
  const startPage = Math.max(1, Math.trunc(config.startPage ?? 1));
  const itemsPath = (config.itemsPath ?? '').trim();
  const cursorPath = (config.cursorPath ?? '').trim();

  const rateLimitEnabled = Boolean(config.rateLimitEnabled);
  const rateLimitRequests = Math.max(1, Math.trunc(config.rateLimitRequests ?? 1));
  const rateLimitIntervalMs = Math.max(1, Math.trunc(config.rateLimitIntervalMs ?? 1000));
  const minRequestGapMs = Math.ceil(rateLimitIntervalMs / rateLimitRequests);
  let lastRequestAt = 0;

  const retryEnabled = config.retryEnabled !== false;
  const retryAttempts = Math.max(1, Math.trunc(config.retryAttempts ?? 1));
  const retryOnNetworkError = config.retryOnNetworkError !== false;

  const generatedIdempotencyKey = sideEffectControl?.idempotencyKey?.trim() ?? '';
  const idempotencyEnabled =
    Boolean(config.idempotencyEnabled) || generatedIdempotencyKey.length > 0;
  const idempotencyHeaderName = (config.idempotencyHeaderName ?? '').trim() || 'Idempotency-Key';
  const configuredIdempotencyKey = renderTemplate(
    config.idempotencyKeyTemplate ?? '',
    nodeInputs,
    ''
  ).trim();
  const idempotencyKey = configuredIdempotencyKey || generatedIdempotencyKey;

  const baseResolvedUrl = applyPathParams(baseUrl, parsedPathParams);
  const aggregateItems: unknown[] = [];

  let page = startPage;
  let cursor = '';
  let pageCount = 0;
  let lastEnvelope: JsonRecord | null = null;

  const executeRequest = async (
    requestUrl: string,
    queryParams: Record<string, string>,
    headers: Record<string, string>,
    attempt: number
  ): Promise<{
    envelope: JsonRecord;
    responseText: string;
    status: number;
    ok: boolean;
    route: unknown;
    timedOut: boolean;
    networkError: boolean;
    responseData: unknown;
  }> => {
    const withAuth = await resolveAuthHeaders(config, nodeInputs, headers, queryParams);
    const finalUrl = appendQueryParams(requestUrl, withAuth.queryParams);
    const finalHeaders: Record<string, string> = { ...withAuth.headers };
    const outboundPolicy = evaluateOutboundUrlPolicy(finalUrl);
    if (!outboundPolicy.allowed) {
      return {
        envelope: {
          ok: false,
          status: 0,
          url: finalUrl,
          method: config.method,
          headers: {},
          data: null,
          value: null,
          attempt,
          page,
          cursor,
          route: 'blocked_outbound_url',
          error: `Blocked outbound URL (${outboundPolicy.reason ?? 'policy_violation'})`,
          timedOut: false,
          networkError: false,
        },
        responseText: '',
        status: 0,
        ok: false,
        route: null,
        timedOut: false,
        networkError: false,
        responseData: null,
      };
    }

    if (idempotencyEnabled && idempotencyHeaderName && idempotencyKey) {
      finalHeaders[idempotencyHeaderName] = idempotencyKey;
    }

    let body: BodyInit | undefined;
    const bodyMode = config.bodyMode ?? 'none';
    if (config.method !== 'GET' && config.method !== 'DELETE' && bodyMode !== 'none') {
      const renderedBody = renderTemplate(config.bodyTemplate ?? '', nodeInputs, '');
      if (renderedBody.trim()) {
        if (bodyMode === 'json') {
          body = renderedBody;
          if (!finalHeaders['Content-Type']) {
            finalHeaders['Content-Type'] = 'application/json';
          }
        } else {
          body = renderedBody;
          if (!finalHeaders['Content-Type']) {
            finalHeaders['Content-Type'] = 'text/plain';
          }
        }
      }
    }

    const signalControl = createSignalControl(abortSignal, config.timeoutMs);
    try {
      const response = await fetchWithOutboundUrlPolicy(finalUrl, {
        method: config.method,
        headers: finalHeaders,
        ...(body !== undefined ? { body } : {}),
        ...(signalControl.signal ? { signal: signalControl.signal } : {}),
        maxRedirects: 5,
      });
      const responseText = await response.text();
      const responseHeaders = Object.fromEntries(response.headers.entries());

      let responseData: unknown = null;
      const responseMode = config.responseMode ?? 'json';
      if (responseMode === 'status') {
        responseData = response.status;
      } else if (responseMode === 'text') {
        responseData = responseText;
      } else {
        try {
          responseData = responseText.trim().length > 0 ? JSON.parse(responseText) : null;
        } catch {
          responseData = responseText;
        }
      }

      const baseValue = config.responsePath
        ? getValueAtMappingPath(responseData, config.responsePath)
        : responseData;
      const resolvedValue = baseValue === undefined ? responseData : baseValue;

      const route = evaluateErrorRoute(errorRoutes, {
        status: response.status,
        responseText,
        timedOut: false,
        networkError: false,
      });

      return {
        envelope: {
          ok: response.ok,
          status: response.status,
          url: finalUrl,
          method: config.method,
          headers: responseHeaders,
          data: responseData,
          value: resolvedValue,
          attempt,
          page,
          cursor,
          route: route?.id ?? null,
        },
        responseText,
        status: response.status,
        ok: response.ok,
        route,
        timedOut: false,
        networkError: false,
        responseData,
      };
    } catch (error) {
      if (error instanceof OutboundUrlPolicyError) {
        return {
          envelope: {
            ok: false,
            status: 0,
            url: finalUrl,
            method: config.method,
            headers: {},
            data: null,
            value: null,
            attempt,
            page,
            cursor,
            route: 'blocked_outbound_url',
            error: `Blocked outbound URL (${error.decision.reason ?? 'policy_violation'})`,
            timedOut: false,
            networkError: false,
          },
          responseText: '',
          status: 0,
          ok: false,
          route: null,
          timedOut: false,
          networkError: false,
          responseData: null,
        };
      }

      const timedOut = signalControl.wasTimeout();
      const route = evaluateErrorRoute(errorRoutes, {
        status: 0,
        responseText: '',
        timedOut,
        networkError: !timedOut,
      });

      return {
        envelope: {
          ok: false,
          status: 0,
          url: finalUrl,
          method: config.method,
          headers: {},
          data: null,
          value: null,
          attempt,
          page,
          cursor,
          route: route?.id ?? (timedOut ? 'timeout' : 'network_error'),
          error: timedOut
            ? 'Request timed out'
            : error instanceof Error
              ? error.message
              : 'Network error',
          timedOut,
          networkError: !timedOut,
        },
        responseText: '',
        status: 0,
        ok: false,
        route,
        timedOut,
        networkError: !timedOut,
        responseData: null,
      };
    } finally {
      signalControl.cleanup();
    }
  };

  while (pageCount < maxPages) {
    let queryParams = { ...parsedQueryParams };
    if (paginationMode === 'page') {
      queryParams[pageParam] = String(page);
      if (limitParam) queryParams[limitParam] = String(pageSize);
    } else if (paginationMode === 'cursor' && cursor) {
      queryParams[cursorParam] = cursor;
      if (limitParam) queryParams[limitParam] = String(pageSize);
    }

    let attempt = 0;
    let result: Awaited<ReturnType<typeof executeRequest>> | null = null;

    while (attempt < retryAttempts) {
      attempt += 1;

      if (rateLimitEnabled) {
        const now = Date.now();
        const elapsedSinceLast = now - lastRequestAt;
        if (elapsedSinceLast < minRequestGapMs) {
          await sleep(minRequestGapMs - elapsedSinceLast);
        }
      }

      lastRequestAt = Date.now();
      result = await executeRequest(baseResolvedUrl, queryParams, parsedHeaders, attempt);

      if (result.ok && !result.route) break;

      const shouldRetry =
        retryEnabled &&
        attempt < retryAttempts &&
        (retryStatuses.has(result.status) || (retryOnNetworkError && result.networkError));

      if (!shouldRetry) break;

      const delay = resolveRetryDelay(attempt, config);
      if (delay > 0) await sleep(delay);
    }

    if (!result) break; // Should not happen

    lastEnvelope = result.envelope;
    const responseData = result.responseData;

    if (paginationMode !== 'none') {
      const items = Array.isArray(responseData)
        ? responseData
        : itemsPath
          ? (getValueAtMappingPath(responseData, itemsPath) as unknown[])
          : [];

      if (Array.isArray(items)) {
        aggregateItems.push(...items);
      }

      if (paginationMode === 'page') {
        page += 1;
      } else if (paginationMode === 'cursor') {
        const nextCursor = cursorPath
          ? (getValueAtMappingPath(responseData, cursorPath) as string)
          : null;
        if (!nextCursor || nextCursor === cursor) break;
        cursor = nextCursor;
      }

      if (!Array.isArray(items) || items.length < pageSize) break;
    }

    pageCount += 1;
    if (result.route || !result.ok) break;
  }

  if (!lastEnvelope) {
    throw new Error('Advanced API execution failed to produce an envelope');
  }

  const finalEnvelope: JsonRecord = {
    ...lastEnvelope,
    ...(paginationMode !== 'none' ? { items: aggregateItems, pageCount } : {}),
  };

  const outputs = buildMappedOutputs(outputMappings, finalEnvelope);
  const envelopeStatus = typeof finalEnvelope['status'] === 'number' ? finalEnvelope['status'] : 0;
  const envelopeOk = finalEnvelope['ok'] === true;
  const envelopeError = typeof finalEnvelope['error'] === 'string' ? finalEnvelope['error'] : null;
  const envelopeRoute = typeof finalEnvelope['route'] === 'string' ? finalEnvelope['route'] : null;

  return {
    ...outputs,
    value:
      paginationMode !== 'none' && (aggregateMode as string) === 'all_pages'
        ? aggregateItems
        : finalEnvelope['value'],
    bundle: finalEnvelope,
    status: envelopeStatus,
    ok: envelopeOk,
    error: envelopeError,
    success: envelopeOk,
    route: envelopeRoute,
  };
};

function parseJsonWithTemplates<T>(
  raw: string | undefined,
  nodeInputs: RuntimePortValues,
  fallback: T,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  meta: Record<string, unknown>
): T {
  if (typeof raw !== 'string' || raw.trim().length === 0) return fallback;
  const renderedWithValue = raw.replace(
    /{{\s*([^}]+)\s*}}/g,
    (_match: string, token: string): string => {
      const key = String(token).trim();
      if (!key) return '';
      if (key === 'value' || key === 'current') {
        return safeStringify(nodeInputs['value']);
      }
      return safeStringify(getValueAtMappingPath(nodeInputs, key));
    }
  );
  try {
    return JSON.parse(renderedWithValue) as T;
  } catch (error) {
    reportAiPathsError(error, meta, 'Invalid advanced API JSON config:');
    return fallback;
  }
}
