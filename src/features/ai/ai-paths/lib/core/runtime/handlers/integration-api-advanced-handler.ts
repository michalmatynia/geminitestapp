import type {
  AdvancedApiConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type {
  NodeHandler,
  NodeHandlerContext,
} from '@/shared/contracts/ai-paths-runtime';

import { getValueAtMappingPath, renderTemplate, safeStringify } from '../../utils';

type JsonRecord = Record<string, unknown>;

type AdvancedApiErrorRoute = {
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

const DEFAULT_ADVANCED_API_CONFIG: AdvancedApiConfig = {
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

const toObject = (value: unknown): JsonRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
};

const toStringRecord = (value: unknown): Record<string, string> => {
  const source = toObject(value);
  const result: Record<string, string> = {};
  Object.entries(source).forEach(([key, entry]) => {
    if (!key.trim()) return;
    if (entry === null || entry === undefined) return;
    result[key] = String(entry);
  });
  return result;
};

const toNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) =>
      typeof entry === 'number'
        ? entry
        : Number.parseInt(typeof entry === 'string' ? entry : '', 10)
    )
    .filter((entry: number): entry is number => Number.isFinite(entry))
    .map((entry: number) => Math.trunc(entry));
};

const parseJsonWithTemplates = <T>(
  raw: string | undefined,
  nodeInputs: RuntimePortValues,
  fallback: T,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  meta: Record<string, unknown>
): T => {
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
};

const applyPathParams = (url: string, params: Record<string, string>): string => {
  let next = url;
  Object.entries(params).forEach(([key, value]) => {
    if (!key) return;
    const encoded = encodeURIComponent(value);
    next = next
      .replaceAll(`:${key}`, encoded)
      .replaceAll(`{${key}}`, encoded);
  });
  return next;
};

const appendQueryParams = (
  url: string,
  queryParams: Record<string, string>
): string => {
  const entries = Object.entries(queryParams).filter(
    ([key, value]) => key.trim().length > 0 && value.length > 0
  );
  if (entries.length === 0) return url;
  const hasQuery = url.includes('?');
  const params = new URLSearchParams(hasQuery ? url.slice(url.indexOf('?') + 1) : '');
  entries.forEach(([key, value]) => {
    params.set(key, value);
  });
  const base = hasQuery ? url.slice(0, url.indexOf('?')) : url;
  const query = params.toString();
  return query.length > 0 ? `${base}?${query}` : base;
};

const sleep = async (ms: number): Promise<void> => {
  if (!Number.isFinite(ms) || ms <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const resolveRetryDelay = (
  attempt: number,
  config: AdvancedApiConfig
): number => {
  const base = Math.max(0, Math.trunc(config.retryBackoffMs ?? 0));
  if (base <= 0) return 0;
  const max = Math.max(base, Math.trunc(config.retryMaxBackoffMs ?? base));
  const strategy = config.retryBackoff ?? 'fixed';
  const step =
    strategy === 'exponential'
      ? Math.min(max, base * Math.pow(2, Math.max(0, attempt - 1)))
      : base;
  const jitterRatio = Math.max(0, Math.min(1, config.retryJitterRatio ?? 0));
  if (jitterRatio <= 0) return step;
  const jitter = Math.round(step * jitterRatio * Math.random());
  return Math.min(max, step + jitter);
};

const parseErrorRoutes = (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  nodeId: string
): AdvancedApiErrorRoute[] =>
  parseJsonWithTemplates<AdvancedApiErrorRoute[]>(
    config.errorRoutesJson,
    nodeInputs,
    [],
    reportAiPathsError,
    { action: 'parseAdvancedApiErrorRoutes', nodeId }
  ).filter((entry: unknown): entry is AdvancedApiErrorRoute => {
    if (!entry || typeof entry !== 'object') return false;
    const record = entry as AdvancedApiErrorRoute;
    return (
      record.when === 'status' ||
      record.when === 'status_range' ||
      record.when === 'body_regex' ||
      record.when === 'timeout' ||
      record.when === 'network'
    );
  });

const evaluateErrorRoute = (
  routes: AdvancedApiErrorRoute[],
  payload: {
    status: number;
    responseText: string;
    timedOut: boolean;
    networkError: boolean;
  }
): AdvancedApiErrorRoute | null => {
  for (const route of routes) {
    if (route.when === 'status') {
      if (
        typeof route.status === 'number' &&
        Math.trunc(route.status) === payload.status
      ) {
        return route;
      }
      continue;
    }
    if (route.when === 'status_range') {
      if (
        typeof route.minStatus === 'number' &&
        typeof route.maxStatus === 'number' &&
        payload.status >= route.minStatus &&
        payload.status <= route.maxStatus
      ) {
        return route;
      }
      continue;
    }
    if (route.when === 'body_regex') {
      if (typeof route.pattern !== 'string' || route.pattern.trim().length === 0) {
        continue;
      }
      try {
        const regex = new RegExp(route.pattern, route.flags ?? '');
        if (regex.test(payload.responseText)) {
          return route;
        }
      } catch {
        // Ignore malformed regex and continue checking other routes.
      }
      continue;
    }
    if (route.when === 'timeout' && payload.timedOut) {
      return route;
    }
    if (route.when === 'network' && payload.networkError) {
      return route;
    }
  }
  return null;
};

const buildMappedOutputs = (
  outputMappings: Record<string, string>,
  envelope: JsonRecord
): RuntimePortValues => {
  const outputs: RuntimePortValues = {};
  Object.entries(outputMappings).forEach(([port, path]) => {
    if (!port.trim() || typeof path !== 'string' || !path.trim()) return;
    const value = getValueAtMappingPath(envelope, path);
    outputs[port] = value;
  });
  return outputs;
};

const resolveRetryStatuses = (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  nodeId: string
): Set<number> => {
  const parsed = parseJsonWithTemplates<unknown>(
    config.retryOnStatusJson,
    nodeInputs,
    [],
    reportAiPathsError,
    { action: 'parseAdvancedApiRetryStatuses', nodeId }
  );
  return new Set<number>(toNumberArray(parsed));
};

const parseOutputMappings = (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  nodeId: string
): Record<string, string> =>
  toStringRecord(
    parseJsonWithTemplates<unknown>(
      config.outputMappingsJson,
      nodeInputs,
      {},
      reportAiPathsError,
      { action: 'parseAdvancedApiOutputMappings', nodeId }
    )
  );

type SignalControl = {
  signal: AbortSignal | undefined;
  wasTimeout: () => boolean;
  cleanup: () => void;
};

const createSignalControl = (
  baseSignal: AbortSignal | undefined,
  timeoutMs: number | undefined
): SignalControl => {
  const normalizedTimeout = Number.isFinite(timeoutMs ?? NaN)
    ? Math.max(0, Math.trunc(timeoutMs as number))
    : 0;

  if (!baseSignal && normalizedTimeout <= 0) {
    return {
      signal: undefined,
      wasTimeout: () => false,
      cleanup: () => undefined,
    };
  }

  const controller = new AbortController();
  let timeoutTriggered = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const handleBaseAbort = (): void => {
    controller.abort();
  };

  if (baseSignal) {
    if (baseSignal.aborted) {
      controller.abort();
    } else {
      baseSignal.addEventListener('abort', handleBaseAbort);
    }
  }

  if (normalizedTimeout > 0) {
    timeoutHandle = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, normalizedTimeout);
  }

  return {
    signal: controller.signal,
    wasTimeout: () => timeoutTriggered,
    cleanup: () => {
      if (baseSignal) {
        baseSignal.removeEventListener('abort', handleBaseAbort);
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    },
  };
};

const resolveAuthHeaders = async (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues,
  headers: Record<string, string>,
  queryParams: Record<string, string>
): Promise<{ headers: Record<string, string>; queryParams: Record<string, string> }> => {
  const authMode = config.authMode ?? 'none';
  const nextHeaders = { ...headers };
  const nextQueryParams = { ...queryParams };

  if (authMode === 'none') {
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'api_key') {
    const name = (config.apiKeyName ?? '').trim();
    const value = renderTemplate(config.apiKeyValueTemplate ?? '', nodeInputs, '').trim();
    if (name && value) {
      if ((config.apiKeyPlacement ?? 'header') === 'query') {
        nextQueryParams[name] = value;
      } else {
        nextHeaders[name] = value;
      }
    }
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'bearer') {
    const token = renderTemplate(config.bearerTokenTemplate ?? '', nodeInputs, '').trim();
    if (token) {
      nextHeaders['Authorization'] = `Bearer ${token}`;
    }
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'basic') {
    const username = renderTemplate(config.basicUsernameTemplate ?? '', nodeInputs, '');
    const password = renderTemplate(config.basicPasswordTemplate ?? '', nodeInputs, '');
    const token = btoa(`${username}:${password}`);
    nextHeaders['Authorization'] = `Basic ${token}`;
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'oauth2_client_credentials') {
    const tokenUrl = renderTemplate(config.oauthTokenUrl ?? '', nodeInputs, '').trim();
    const clientId = renderTemplate(config.oauthClientIdTemplate ?? '', nodeInputs, '');
    const clientSecret = renderTemplate(
      config.oauthClientSecretTemplate ?? '',
      nodeInputs,
      ''
    );
    const scope = renderTemplate(config.oauthScopeTemplate ?? '', nodeInputs, '');
    if (!tokenUrl || !clientId || !clientSecret) {
      return { headers: nextHeaders, queryParams: nextQueryParams };
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      ...(scope.trim() ? { scope } : {}),
    });
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const tokenPayload = toObject(await tokenResponse.json().catch(() => ({})));
    const accessToken = String(tokenPayload['access_token'] ?? '').trim();
    if (accessToken) {
      nextHeaders['Authorization'] = `Bearer ${accessToken}`;
    }
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'connection') {
    const connectionHeaderName = (config.connectionHeaderName ?? '').trim() || 'X-Connection-Id';
    const connectionId = renderTemplate(config.connectionIdTemplate ?? '', nodeInputs, '').trim();
    if (connectionId) {
      nextHeaders[connectionHeaderName] = connectionId;
    }
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  return { headers: nextHeaders, queryParams: nextQueryParams };
};

export const handleAdvancedApi: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  abortSignal,
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

  const parsedPathParams = toStringRecord(
    parseJsonWithTemplates<unknown>(
      config.pathParamsJson,
      nodeInputs,
      {},
      reportAiPathsError,
      { action: 'parseAdvancedApiPathParams', nodeId: node.id }
    )
  );
  const parsedQueryParams = toStringRecord(
    parseJsonWithTemplates<unknown>(
      config.queryParamsJson,
      nodeInputs,
      {},
      reportAiPathsError,
      { action: 'parseAdvancedApiQueryParams', nodeId: node.id }
    )
  );
  const parsedHeaders = toStringRecord(
    parseJsonWithTemplates<unknown>(
      config.headersJson,
      nodeInputs,
      {},
      reportAiPathsError,
      { action: 'parseAdvancedApiHeaders', nodeId: node.id }
    )
  );
  const outputMappings = parseOutputMappings(
    config,
    nodeInputs,
    reportAiPathsError,
    node.id
  );
  const retryStatuses = resolveRetryStatuses(
    config,
    nodeInputs,
    reportAiPathsError,
    node.id
  );
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
  const rateLimitIntervalMs = Math.max(
    1,
    Math.trunc(config.rateLimitIntervalMs ?? 1000)
  );
  const minRequestGapMs = Math.ceil(rateLimitIntervalMs / rateLimitRequests);
  let lastRequestAt = 0;

  const retryEnabled = config.retryEnabled !== false;
  const retryAttempts = Math.max(1, Math.trunc(config.retryAttempts ?? 1));
  const retryOnNetworkError = config.retryOnNetworkError !== false;

  const idempotencyEnabled = Boolean(config.idempotencyEnabled);
  const idempotencyHeaderName =
    (config.idempotencyHeaderName ?? '').trim() || 'Idempotency-Key';
  const idempotencyKey = renderTemplate(
    config.idempotencyKeyTemplate ?? '',
    nodeInputs,
    ''
  ).trim();

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
    route: AdvancedApiErrorRoute | null;
    timedOut: boolean;
    networkError: boolean;
    responseData: unknown;
  }> => {
    const withAuth = await resolveAuthHeaders(config, nodeInputs, headers, queryParams);
    const finalUrl = appendQueryParams(requestUrl, withAuth.queryParams);
    const finalHeaders: Record<string, string> = { ...withAuth.headers };

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
      const response = await fetch(finalUrl, {
        method: config.method,
        headers: finalHeaders,
        ...(body !== undefined ? { body } : {}),
        ...(signalControl.signal ? { signal: signalControl.signal } : {}),
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
      const timedOut = signalControl.wasTimeout();
      const aborted = abortSignal?.aborted === true;
      if (aborted && !timedOut) {
        throw error;
      }
      const networkError = !timedOut;
      const route = evaluateErrorRoute(errorRoutes, {
        status: 0,
        responseText: '',
        timedOut,
        networkError,
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
          route: route?.id ?? null,
          error: error instanceof Error ? error.message : 'Request failed',
          timedOut,
          networkError,
        },
        responseText: '',
        status: 0,
        ok: false,
        route,
        timedOut,
        networkError,
        responseData: null,
      };
    } finally {
      signalControl.cleanup();
    }
  };

  while (pageCount < maxPages) {
    if (abortSignal?.aborted) {
      throw new Error('Advanced API node aborted.');
    }
    if (rateLimitEnabled && lastRequestAt > 0) {
      const elapsed = Date.now() - lastRequestAt;
      if (elapsed < minRequestGapMs) {
        if ((config.rateLimitOnLimit ?? 'wait') === 'fail') {
          lastEnvelope = {
            ok: false,
            status: 0,
            error: 'Rate limit threshold exceeded before request.',
            route: 'rate_limit_fail',
          };
          break;
        }
        await sleep(minRequestGapMs - elapsed);
      }
    }

    let attempt = 1;
    let requestResult:
      | {
          envelope: JsonRecord;
          responseText: string;
          status: number;
          ok: boolean;
          route: AdvancedApiErrorRoute | null;
          timedOut: boolean;
          networkError: boolean;
          responseData: unknown;
        }
      | null = null;

    const pageQueryParams: Record<string, string> = { ...parsedQueryParams };
    if (paginationMode === 'page') {
      pageQueryParams[pageParam] = String(page);
      pageQueryParams[limitParam] = String(pageSize);
    } else if (paginationMode === 'cursor' && cursor) {
      pageQueryParams[cursorParam] = cursor;
    }

    while (attempt <= retryAttempts) {
      lastRequestAt = Date.now();
      const current = await executeRequest(
        baseResolvedUrl,
        pageQueryParams,
        parsedHeaders,
        attempt
      );
      requestResult = current;
      const canRetry =
        retryEnabled &&
        attempt < retryAttempts &&
        (
          (current.status > 0 && retryStatuses.has(current.status)) ||
          (current.status === 0 &&
            ((current.timedOut || current.networkError) && retryOnNetworkError))
        );
      if (!canRetry) break;
      await sleep(resolveRetryDelay(attempt, config));
      attempt += 1;
    }

    if (!requestResult) break;
    lastEnvelope = requestResult.envelope;
    pageCount += 1;

    const responseItems =
      itemsPath.length > 0
        ? getValueAtMappingPath(requestResult.responseData, itemsPath)
        : undefined;
    const pageItems: unknown[] = Array.isArray(responseItems)
      ? responseItems
      : [];
    if (pageItems.length > 0) {
      pageItems.forEach((item: unknown) => {
        aggregateItems.push(item);
      });
    }

    if (paginationMode === 'none' || paginationMode === 'link') {
      break;
    }
    if (paginationMode === 'page') {
      if (pageItems.length < pageSize) break;
      page += 1;
      continue;
    }
    if (paginationMode === 'cursor') {
      const nextCursor =
        cursorPath.length > 0
          ? getValueAtMappingPath(requestResult.responseData, cursorPath)
          : null;
      cursor =
        typeof nextCursor === 'string'
          ? nextCursor.trim()
          : typeof nextCursor === 'number'
            ? String(nextCursor)
            : '';
      if (!cursor) break;
      continue;
    }
    break;
  }

  const fallbackEnvelope: JsonRecord = {
    ok: false,
    status: 0,
    error: 'No response received.',
    route: 'no_response',
  };
  const envelope = lastEnvelope ?? fallbackEnvelope;
  const outputRoute = String(envelope['route'] ?? '');
  const outputError =
    envelope['error'] === null || envelope['error'] === undefined
      ? null
      : String(envelope['error']);
  const outputStatus =
    typeof envelope['status'] === 'number'
      ? envelope['status']
      : Number.parseInt(String(envelope['status'] ?? '0'), 10) || 0;
  const outputValue = envelope['value'] ?? envelope['data'] ?? null;

  const outputs: RuntimePortValues = {
    value: outputValue,
    bundle: envelope,
    status: outputStatus,
    headers: envelope['headers'] ?? {},
    route: outputRoute || null,
    error: outputError,
    success: Boolean(envelope['ok']),
  };

  if (aggregateMode === 'concat_items' && aggregateItems.length > 0) {
    outputs['items'] = aggregateItems;
  } else if (Array.isArray(aggregateItems) && aggregateItems.length > 0) {
    outputs['items'] = aggregateItems[0];
  } else {
    outputs['items'] = [];
  }

  const mappedOutputs = buildMappedOutputs(outputMappings, envelope);
  Object.assign(outputs, mappedOutputs);

  if (typeof outputRoute === 'string' && outputRoute.trim().length > 0) {
    const matchingRoute = errorRoutes.find(
      (route: AdvancedApiErrorRoute): boolean => route.id === outputRoute
    );
    const outputPort = matchingRoute?.outputPort?.trim();
    if (outputPort) {
      outputs[outputPort] = true;
    }
  }

  executed.http.add(node.id);
  return outputs;
};
