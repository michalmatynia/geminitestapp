/**
 * AI-Paths API Client
 *
 * Centralized API utilities for both React components and runtime handlers.
 * Provides typed fetch wrappers with consistent error handling.
 */

import type {
  AgentTeachingAgentRecord,
  AgentTeachingChatSource,
} from '@/shared/contracts/agent-teaching';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import {
  aiPathRunEnqueueResponseSchema,
  type AiPathRunListResult,
  type AiPathRunEnqueueResponse,
  type AiPathRunRecord,
  type AiPathRuntimeAnalyticsSummary,
} from '@/shared/contracts/ai-paths';
import type { ChatMessage } from '@/shared/contracts/chatbot';
import type { SchemaResponse } from '@/shared/contracts/database';
import type {
  ProductAiJobEnqueueRequest,
  ProductAiJobEnqueueResponse,
  ProductAiJobResponse,
  ProductAiJobsResponse,
} from '@/shared/contracts/jobs';

import {
  AgentEnqueuePayload,
  PlaywrightNodeEnqueuePayload,
  PlaywrightNodeRunSnapshot,
  enqueueAgentRun,
  enqueuePlaywrightRun,
  fetchPlaywrightRun,
} from './client/agent';
import { fetchRuntimeAnalyticsSummary } from './client/analytics';
import {
  apiFetch,
  apiPost,
  apiPatch,
  apiDelete,
  resolveApiUrl,
  withApiCsrfHeaders,
} from './client/base';
import type { HttpResult } from '@/shared/contracts/http';
import {
  DbActionPayload,
  DbQueryPayload,
  DbUpdatePayload,
  EntityUpdatePayload,
  databaseAction,
  databaseQuery,
  databaseUpdate,
  entityUpdate,
  fetchSchema,
  browseDatabase,
} from './client/database';
import { fetchSettings, updateSetting } from './client/settings';
import {
  cleanupFixtureTriggerButtons,
  fetchTriggerButtons,
  createTriggerButton,
  updateTriggerButton,
  deleteTriggerButton,
  reorderTriggerButtons,
} from './client/triggers';

export type { SchemaResponse };

export type {
  DbActionPayload,
  DbQueryPayload,
  DbUpdatePayload,
  EntityUpdatePayload,
  AgentEnqueuePayload,
  PlaywrightNodeEnqueuePayload,
  PlaywrightNodeRunSnapshot,
  AiPathRuntimeAnalyticsSummary,
};

// ============================================================================
// Exports
// ============================================================================

export {
  resolveApiUrl,
  apiFetch,
  apiPost,
  apiPatch,
  apiDelete,
  withApiCsrfHeaders,
  databaseAction,
  databaseQuery,
  databaseUpdate,
  entityUpdate,
  fetchSchema,
  browseDatabase,
  fetchSettings,
  updateSetting,
  enqueueAgentRun,
  enqueuePlaywrightRun,
  fetchPlaywrightRun,
  fetchTriggerButtons,
  createTriggerButton,
  updateTriggerButton,
  deleteTriggerButton,
  reorderTriggerButtons,
  cleanupFixtureTriggerButtons,
  fetchRuntimeAnalyticsSummary,
};

// ============================================================================
// Specialized API Methods (Remaining)
// ============================================================================

export async function fetchAgentTeachingAgents(): Promise<HttpResult<AgentTeachingAgentRecord[]>> {
  return apiFetch<AgentTeachingAgentRecord[]>('/api/ai/agent-creator/teaching/agents');
}

export async function fetchAgentTeachingChat(args: {
  agentId: string;
  source: AgentTeachingChatSource;
}): Promise<HttpResult<ChatMessage[]>> {
  return apiFetch<ChatMessage[]>(
    `/api/ai/agent-creator/teaching/chat?agentId=${args.agentId}&source=${args.source}`
  );
}

export async function enqueueAiPathRun(
  payload: {
    pathId: string;
    pathName?: string;
    nodes?: unknown[];
    edges?: unknown[];
    triggerEvent?: string;
    triggerNodeId?: string;
    triggerContext?: Record<string, unknown> | null;
    entityId?: string | null;
    entityType?: string | null;
    requestId?: string;
    maxAttempts?: number | null;
    backoffMs?: number | null;
    backoffMaxMs?: number | null;
    meta?: Record<string, unknown> | null;
    contextRegistry?: ContextRegistryConsumerEnvelope | null;
  },
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<HttpResult<AiPathRunEnqueueResponse>> {
  const response = await apiPost<unknown>('/api/ai-paths/runs/enqueue', payload, {
    timeoutMs: options?.timeoutMs ?? 60_000,
    ...(options?.signal ? { signal: options.signal } : {}),
  });
  if (!response.ok) return response;
  const parsed = aiPathRunEnqueueResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid run identifier from API.',
    };
  }
  return {
    ok: true,
    data: parsed.data,
  };
}

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const extractRunIdFromValue = (value: unknown): string | null => {
  const directString = asNonEmptyString(value);
  if (directString) return directString;
  const record = asRecord(value);
  if (!record) return null;
  return (
    asNonEmptyString(record['id']) ??
    asNonEmptyString(record['runId']) ??
    asNonEmptyString(record['_id']) ??
    null
  );
};

const isIdOnlyEnvelopeRecord = (record: Record<string, unknown>): boolean => {
  const keys = Object.keys(record);
  if (keys.length !== 1) return false;
  return keys[0] === 'id' || keys[0] === 'runId' || keys[0] === '_id';
};

const looksLikeRunRecordEnvelope = (record: Record<string, unknown>): boolean => {
  if (isIdOnlyEnvelopeRecord(record)) return true;
  if (asNonEmptyString(record['status'])) return true;
  if (asNonEmptyString(record['createdAt'])) return true;
  if (asNonEmptyString(record['updatedAt'])) return true;
  if (typeof record['progress'] === 'number') return true;
  if (asNonEmptyString(record['pathName'])) return true;
  return false;
};

const extractRunIdFromWrapperRecord = (record: Record<string, unknown>): string | null => {
  const explicitRunId = asNonEmptyString(record['runId']);
  if (explicitRunId) return explicitRunId;
  if (!looksLikeRunRecordEnvelope(record)) return null;
  return asNonEmptyString(record['id']) ?? asNonEmptyString(record['_id']) ?? null;
};

const readEnqueueRunCandidates = (
  data: unknown
): {
  runCandidates: unknown[];
  wrapperCandidates: Record<string, unknown>[];
  hasPrimaryRunValue: boolean;
} => {
  if (typeof data === 'string') {
    return { runCandidates: [data], wrapperCandidates: [], hasPrimaryRunValue: false };
  }
  const root = asRecord(data);
  if (!root) return { runCandidates: [], wrapperCandidates: [], hasPrimaryRunValue: false };
  const nestedData = asRecord(root['data']);
  const runCandidates: unknown[] = [];
  const wrapperCandidates: Record<string, unknown>[] = [root];
  if (nestedData) wrapperCandidates.push(nestedData);
  let hasPrimaryRunValue = false;
  if (hasOwn(root, 'run')) {
    runCandidates.push(root['run']);
    hasPrimaryRunValue = true;
  }
  if (nestedData && hasOwn(nestedData, 'run')) {
    runCandidates.push(nestedData['run']);
    hasPrimaryRunValue = true;
  }
  return { runCandidates, wrapperCandidates, hasPrimaryRunValue };
};

export const extractAiPathRunIdFromEnqueueResponseData = (data: unknown): string | null => {
  const { runCandidates, wrapperCandidates } = readEnqueueRunCandidates(data);
  for (const candidate of runCandidates) {
    const runId = extractRunIdFromValue(candidate);
    if (runId) return runId;
  }
  for (const candidate of wrapperCandidates) {
    const runId = extractRunIdFromWrapperRecord(candidate);
    if (runId) return runId;
  }
  return null;
};

export const extractAiPathRunRecordFromEnqueueResponseData = (
  data: unknown
): AiPathRunRecord | null => {
  const { runCandidates, wrapperCandidates, hasPrimaryRunValue } = readEnqueueRunCandidates(data);
  const primaryRunRecord = hasPrimaryRunValue ? asRecord(runCandidates[0] ?? null) : null;

  let selectedRecord: Record<string, unknown> | null = null;
  let runId: string | null = null;
  for (const candidate of runCandidates) {
    const candidateRecord = asRecord(candidate);
    const candidateRunId = extractRunIdFromValue(candidate);
    if (!candidateRunId) continue;
    selectedRecord = candidateRecord;
    runId = candidateRunId;
    break;
  }
  if (!runId) {
    for (const candidate of wrapperCandidates) {
      const candidateRunId = extractRunIdFromWrapperRecord(candidate);
      if (!candidateRunId) continue;
      selectedRecord = candidate;
      runId = candidateRunId;
      break;
    }
  }

  if (
    runId &&
    selectedRecord &&
    primaryRunRecord &&
    selectedRecord !== primaryRunRecord &&
    !extractRunIdFromValue(primaryRunRecord)
  ) {
    // Prefer the primary `run` object payload body when id lives on wrapper fields.
    selectedRecord = primaryRunRecord;
  }

  if (!runId) {
    // Mixed legacy payloads can expose id outside `run`, e.g. { run: { status }, runId: "..." }.
    runId = extractAiPathRunIdFromEnqueueResponseData(data);
    if (runId && primaryRunRecord) {
      selectedRecord = primaryRunRecord;
    }
  }

  if (!runId) return null;
  if (!selectedRecord) {
    // Preserve legacy behavior for string-only payloads: return id only, no run record.
    return null;
  }

  const normalizedStatus = asNonEmptyString(selectedRecord?.['status']) ?? 'queued';
  return {
    ...(selectedRecord ?? {}),
    id: runId,
    status: normalizedStatus,
  } as AiPathRunRecord;
};

export const resolveAiPathRunFromEnqueueResponseData = (
  data: unknown
): {
  runId: string | null;
  runRecord: AiPathRunRecord | null;
} => {
  const runRecord = extractAiPathRunRecordFromEnqueueResponseData(data);
  const runId = runRecord
    ? asNonEmptyString(runRecord.id)
    : extractAiPathRunIdFromEnqueueResponseData(data);
  return { runId, runRecord };
};

const mergeNullableRecord = (
  primary: unknown,
  fallback: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined => {
  const normalizedPrimary = asRecord(primary);
  const normalizedFallback = asRecord(fallback);
  if (normalizedPrimary && normalizedFallback) {
    return {
      ...normalizedFallback,
      ...normalizedPrimary,
    };
  }
  if (normalizedPrimary) return normalizedPrimary;
  if (normalizedFallback) return normalizedFallback;
  if (primary === null || fallback === null) return null;
  return undefined;
};

const mergeOptionalRecord = (
  primary: unknown,
  fallback: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  const normalizedPrimary = asRecord(primary);
  const normalizedFallback = asRecord(fallback);
  if (normalizedPrimary && normalizedFallback) {
    return {
      ...normalizedFallback,
      ...normalizedPrimary,
    };
  }
  return normalizedPrimary ?? normalizedFallback ?? undefined;
};

export const mergeEnqueuedAiPathRunForCache = (args: {
  fallbackRun: AiPathRunRecord;
  runId: string;
  runRecord?: AiPathRunRecord | null;
}): AiPathRunRecord => {
  const { fallbackRun, runId, runRecord } = args;

  return {
    ...fallbackRun,
    ...(runRecord ?? {}),
    id: runId,
    status: runRecord?.status ?? fallbackRun.status,
    createdAt: runRecord?.createdAt ?? fallbackRun.createdAt,
    updatedAt: runRecord?.updatedAt ?? fallbackRun.updatedAt,
    pathId: runRecord?.pathId ?? fallbackRun.pathId ?? null,
    pathName: runRecord?.pathName ?? fallbackRun.pathName ?? null,
    requestId: runRecord?.requestId ?? fallbackRun.requestId ?? null,
    triggerNodeId: runRecord?.triggerNodeId ?? fallbackRun.triggerNodeId ?? null,
    triggerEvent: runRecord?.triggerEvent ?? fallbackRun.triggerEvent ?? null,
    entityId: runRecord?.entityId ?? fallbackRun.entityId ?? null,
    entityType: runRecord?.entityType ?? fallbackRun.entityType ?? null,
    meta: mergeNullableRecord(runRecord?.meta, fallbackRun.meta),
    triggerContext: mergeNullableRecord(runRecord?.triggerContext, fallbackRun.triggerContext),
    context: mergeOptionalRecord(runRecord?.context, fallbackRun.context),
  };
};

export async function listAiPathRuns(options?: {
  pathId?: string;
  nodeId?: string;
  requestId?: string;
  source?: string;
  sourceMode?: 'include' | 'exclude';
  visibility?: 'scoped' | 'global';
  status?: string;
  query?: string;
  limit?: number;
  offset?: number;
  includeTotal?: boolean;
  fresh?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<HttpResult<AiPathRunListResult>> {
  const params = new URLSearchParams();
  if (options?.pathId) params.set('pathId', options.pathId);
  if (options?.nodeId) params.set('nodeId', options.nodeId);
  if (options?.requestId) params.set('requestId', options.requestId);
  if (options?.source) params.set('source', options.source);
  if (options?.sourceMode) params.set('sourceMode', options.sourceMode);
  if (options?.visibility) params.set('visibility', options.visibility);
  if (options?.status) params.set('status', options.status);
  if (options?.query) params.set('query', options.query);
  if (typeof options?.limit === 'number') params.set('limit', String(options.limit));
  if (typeof options?.offset === 'number') params.set('offset', String(options.offset));
  if (typeof options?.includeTotal === 'boolean') {
    params.set('includeTotal', options.includeTotal ? '1' : '0');
  }
  if (options?.fresh) params.set('fresh', '1');

  const query = params.toString();
  const url = query ? `/api/ai-paths/runs?${query}` : '/api/ai-paths/runs';
  return apiFetch<AiPathRunListResult>(url, {
    ...(typeof options?.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  });
}

export async function getAiPathRun(
  runId: string,
  options?: RequestInit & { timeoutMs?: number | undefined; signal?: AbortSignal | undefined }
): Promise<HttpResult<{ run: unknown; nodes: unknown[]; events: unknown[] }>> {
  return apiFetch<{ run: unknown; nodes: unknown[]; events: unknown[] }>(
    `/api/ai-paths/runs/${encodeURIComponent(runId)}`,
    {
      ...(typeof options?.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : {}),
      ...(options?.signal ? { signal: options.signal } : {}),
      ...(options?.cache ? { cache: options.cache } : {}),
      ...(options?.credentials ? { credentials: options.credentials } : {}),
      ...(options?.headers ? { headers: options.headers } : {}),
      ...(options?.integrity ? { integrity: options.integrity } : {}),
      ...(options?.keepalive ? { keepalive: options.keepalive } : {}),
      ...(options?.mode ? { mode: options.mode } : {}),
      ...(options?.redirect ? { redirect: options.redirect } : {}),
      ...(options?.referrer ? { referrer: options.referrer } : {}),
      ...(options?.referrerPolicy ? { referrerPolicy: options.referrerPolicy } : {}),
    }
  );
}

export function streamAiPathRun(runId: string, options?: { since?: string | null }): EventSource {
  const params = new URLSearchParams();
  const since = options?.since;
  if (typeof since === 'string' && since.trim().length > 0) {
    params.set('since', since.trim());
  }
  const path = `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream`;
  const url = params.toString() ? `${path}?${params.toString()}` : path;
  return new EventSource(resolveApiUrl(url));
}

export async function removeAiPathRun(
  runId: string
): Promise<HttpResult<{ deleted: boolean; runId: string }>> {
  return apiDelete<{ deleted: boolean; runId: string }>(
    `/api/ai-paths/runs/${encodeURIComponent(runId)}`
  );
}

export async function getAiPathQueueStatus(options?: {
  visibility?: 'scoped' | 'global';
  fresh?: boolean;
}): Promise<HttpResult<{ status: unknown }>> {
  const params = new URLSearchParams();
  if (options?.visibility) params.set('visibility', options.visibility);
  if (options?.fresh) params.set('fresh', '1');
  const query = params.toString();
  const url = query
    ? `/api/ai-paths/runs/queue-status?${query}`
    : '/api/ai-paths/runs/queue-status';
  return apiFetch<{ status: unknown }>(url);
}

export async function clearAiPathRuns(options?: {
  scope?: 'all' | 'terminal';
  pathId?: string;
  source?: string;
  sourceMode?: 'include' | 'exclude';
}): Promise<HttpResult<{ deleted: number; scope: 'all' | 'terminal' }>> {
  const params = new URLSearchParams();
  if (options?.scope) params.set('scope', options.scope);
  if (options?.pathId) params.set('pathId', options.pathId);
  if (options?.source) params.set('source', options.source);
  if (options?.sourceMode) params.set('sourceMode', options.sourceMode);
  const query = params.toString();
  const url = query ? `/api/ai-paths/runs?${query}` : '/api/ai-paths/runs';
  return apiDelete<{ deleted: number; scope: 'all' | 'terminal' }>(url);
}

export async function resumeAiPathRun(
  runId: string,
  mode?: 'resume' | 'replay'
): Promise<HttpResult<{ run: unknown }>> {
  return apiPost<{ run: unknown }>(`/api/ai-paths/runs/${encodeURIComponent(runId)}/resume`, {
    mode,
  });
}

export async function retryAiPathRunNode(
  runId: string,
  nodeId: string
): Promise<HttpResult<{ run: unknown }>> {
  return apiPost<{ run: unknown }>(`/api/ai-paths/runs/${encodeURIComponent(runId)}/retry-node`, {
    nodeId,
  });
}

export async function cancelAiPathRun(runId: string): Promise<HttpResult<{ run: unknown }>> {
  return apiPost<{ run: unknown }>(`/api/ai-paths/runs/${encodeURIComponent(runId)}/cancel`, {});
}

export async function handoffAiPathRun(
  runId: string,
  payload?: { reason?: string; checkpointLineageId?: string }
): Promise<HttpResult<{ run: unknown; handoffReady?: boolean; runId?: string }>> {
  return apiPost<{ run: unknown; handoffReady?: boolean; runId?: string }>(
    `/api/ai-paths/runs/${encodeURIComponent(runId)}/handoff`,
    payload ?? {}
  );
}

export async function requeueAiPathDeadLetterRuns(payload: {
  runIds?: string[];
  pathId?: string | null;
  query?: string | null;
  mode?: 'resume' | 'replay';
  limit?: number | null;
}): Promise<
  HttpResult<{
    requeued: number;
    runIds: string[];
    errors?: Array<{ runId: string; error: string }>;
  }>
> {
  return apiPost<{
    requeued: number;
    runIds: string[];
    errors?: Array<{ runId: string; error: string }>;
  }>('/api/ai-paths/runs/dead-letter/requeue', payload);
}

// ============================================================================
// Grouped API Objects (Namespaces)
// ============================================================================

export const runsApi = {
  enqueue: enqueueAiPathRun,
  list: listAiPathRuns,
  get: getAiPathRun,
  stream: streamAiPathRun,
  remove: removeAiPathRun,
  queueStatus: getAiPathQueueStatus,
  clear: clearAiPathRuns,
  resume: resumeAiPathRun,
  retryNode: retryAiPathRunNode,
  cancel: cancelAiPathRun,
  handoff: handoffAiPathRun,
  requeueDeadLetter: requeueAiPathDeadLetterRuns,
};

export const dbApi = {
  action: databaseAction,
  query: databaseQuery,
  update: databaseUpdate,
  fetchSchema,
  browse: async (
    collection: string,
    args?: { provider?: 'auto' | 'mongodb'; limit?: number; skip?: number; query?: string }
  ) =>
    browseDatabase({
      collection,
      ...(args?.provider ? { provider: args.provider } : {}),
      ...(typeof args?.limit === 'number' ? { limit: args.limit } : {}),
      ...(typeof args?.skip === 'number' ? { skip: args.skip } : {}),
      ...(typeof args?.query === 'string' ? { query: args.query } : {}),
    }),
  browseDatabase,
  schema: fetchSchema,
};

export const entityApi = {
  update: entityUpdate,
  getProduct: async (id: string) => apiFetch<unknown>(`/api/v2/products/${id}`),
  getNote: async (id: string) => apiFetch<unknown>(`/api/notes/${id}`),
  deleteProduct: async (id: string) => apiDelete<unknown>(`/api/v2/products/${id}`),
  deleteNote: async (id: string) => apiDelete<unknown>(`/api/notes/${id}`),
  createProduct: async (payload: unknown) => apiPost<unknown>('/api/v2/products', payload),
  createNote: async (payload: unknown) => apiPost<unknown>('/api/notes', payload),
};

export const settingsApi = {
  list: fetchSettings,
  update: updateSetting,
};

export const triggerButtonsApi = {
  list: fetchTriggerButtons,
  create: createTriggerButton,
  update: updateTriggerButton,
  delete: deleteTriggerButton,
  reorder: reorderTriggerButtons,
  cleanupFixtures: cleanupFixtureTriggerButtons,
};

type AiJobsPollPayload =
  | { status?: unknown; result?: unknown; error?: unknown }
  | {
      job?: {
        status?: unknown;
        result?: unknown;
        error?: unknown;
        errorMessage?: unknown;
      };
    };

const normalizeAiJobStatus = (status: unknown): string => {
  if (typeof status !== 'string') return '';
  const normalized = status.trim().toLowerCase();
  if (normalized === 'cancelled') return 'canceled';
  return normalized;
};

const normalizeAiJobsPollPayload = (
  payload: AiJobsPollPayload
): {
  status: string;
  result?: unknown;
  error?: string;
} => {
  if ('job' in payload && payload.job && typeof payload.job === 'object') {
    const jobRecord = payload.job;
    const status = normalizeAiJobStatus(jobRecord.status);
    const errorValue =
      typeof jobRecord.errorMessage === 'string'
        ? jobRecord.errorMessage
        : typeof jobRecord.error === 'string'
          ? jobRecord.error
          : undefined;
    return {
      status,
      ...(jobRecord.result !== undefined ? { result: jobRecord.result } : {}),
      ...(errorValue ? { error: errorValue } : {}),
    };
  }

  const payloadRecord = payload as Record<string, unknown>;
  const status = normalizeAiJobStatus(payloadRecord['status']);
  const errorValue =
    typeof payloadRecord['error'] === 'string' ? payloadRecord['error'] : undefined;
  return {
    status,
    ...(payloadRecord['result'] !== undefined ? { result: payloadRecord['result'] } : {}),
    ...(errorValue ? { error: errorValue } : {}),
  };
};

const AI_JOBS_ENQUEUE_TIMEOUT_MS =
  typeof window === 'undefined' ? 60_000 : 15_000;

export const aiJobsApi = {
  enqueue: async (payload: ProductAiJobEnqueueRequest) =>
    apiPost<ProductAiJobEnqueueResponse>('/api/v2/products/ai-jobs/enqueue', payload, {
      timeoutMs: AI_JOBS_ENQUEUE_TIMEOUT_MS,
    }),
  poll: async (
    jobId: string,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<HttpResult<{ status: string; result?: unknown; error?: string }>> => {
    const { timeoutMs, ...fetchOptions } = options ?? {};
    const response = await apiFetch<AiJobsPollPayload>(`/api/v2/products/ai-jobs/${jobId}`, {
      ...fetchOptions,
      ...(typeof timeoutMs === 'number' ? { timeoutMs } : {}),
    });
    if (!response.ok) return response;
    return {
      ok: true,
      data: normalizeAiJobsPollPayload(response.data),
    };
  },
  get: async (jobId: string) => apiFetch<ProductAiJobResponse>(`/api/v2/products/ai-jobs/${jobId}`),
  list: async () => apiFetch<ProductAiJobsResponse>('/api/v2/products/ai-jobs'),
};

export const agentApi = {
  enqueue: enqueueAgentRun,
  enqueueAgentRun,
  enqueuePlaywrightRun,
  get: fetchPlaywrightRun,
  poll: fetchPlaywrightRun,
};

export const learnerAgentsApi = {
  list: async () => {
    return { ok: true, data: { agents: [] } };
  },
  chat: async (payload: unknown) => apiPost<unknown>('/api/ai/learner-agents/chat', payload),
};

export const aiPathsApi = {
  streamRun: streamAiPathRun,
};

export const aiGenerationApi = {
  async generate() {
    return { ok: true, data: { result: '' } };
  },
};

export const playwrightNodeApi = {
  enqueue: enqueuePlaywrightRun,
  get: fetchPlaywrightRun,
  poll: fetchPlaywrightRun,
};
