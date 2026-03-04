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
import type { ChatMessage } from '@/shared/contracts/chatbot';

import {
  apiFetch,
  apiPost,
  apiPatch,
  apiDelete,
  ApiResponse,
  resolveApiUrl,
  withCsrfHeadersCompat
} from './client/base';

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
  browseDatabase
} from './client/database';

import {
  fetchSettings,
  updateSetting
} from './client/settings';

import {
  AgentEnqueuePayload,
  PlaywrightNodeEnqueuePayload,
  PlaywrightNodeRunSnapshot,
  enqueueAgentRun,
  enqueuePlaywrightRun,
  fetchPlaywrightRun
} from './client/agent';

import {
  fetchTriggerButtons,
  createTriggerButton,
  updateTriggerButton,
  deleteTriggerButton,
  reorderTriggerButtons
} from './client/triggers';

import {
  fetchRuntimeAnalyticsSummary
} from './client/analytics';

import type { 
  SchemaResponse 
} from '@/shared/contracts/database';
export type { SchemaResponse };
import type { 
  AiPathRuntimeAnalyticsSummary 
} from '@/shared/contracts/ai-paths';

export type {
  ApiResponse,
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
  withCsrfHeadersCompat,

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

  fetchRuntimeAnalyticsSummary
};

// ============================================================================
// Specialized API Methods (Remaining)
// ============================================================================

export async function fetchAgentTeachingAgents(): Promise<ApiResponse<AgentTeachingAgentRecord[]>> {
  return apiFetch<AgentTeachingAgentRecord[]>('/api/ai/agent-creator/teaching/agents');
}

export async function fetchAgentTeachingChat(args: {
  agentId: string;
  source: AgentTeachingChatSource;
}): Promise<ApiResponse<ChatMessage[]>> {
  return apiFetch<ChatMessage[]>(`/api/ai/agent-creator/teaching/chat?agentId=${args.agentId}&source=${args.source}`);
}

export async function enqueueAiPathRun(
  payload: {
    pathId: string;
    pathName?: string;
    nodes: unknown[];
    edges: unknown[];
    triggerEvent?: string;
    triggerNodeId?: string;
    triggerContext?: Record<string, unknown> | null;
    entityId?: string | null;
    entityType?: string | null;
    maxAttempts?: number | null;
    backoffMs?: number | null;
    backoffMaxMs?: number | null;
    meta?: Record<string, unknown> | null;
  },
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<ApiResponse<{ run: unknown }>> {
  return apiPost<{ run: unknown }>('/api/ai-paths/runs/enqueue', payload, {
    timeoutMs: options?.timeoutMs ?? 60_000,
    ...(options?.signal ? { signal: options.signal } : {}),
  });
}

export async function listAiPathRuns(options?: {
  pathId?: string;
  nodeId?: string;
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
}): Promise<ApiResponse<{ runs: unknown[]; total: number }>> {
  const params = new URLSearchParams();
  if (options?.pathId) params.set('pathId', options.pathId);
  if (options?.nodeId) params.set('nodeId', options.nodeId);
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
  return apiFetch<{ runs: unknown[]; total: number }>(url, {
    ...(typeof options?.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  });
}

export async function getAiPathRun(
  runId: string
): Promise<ApiResponse<{ run: unknown; nodes: unknown[]; events: unknown[] }>> {
  return apiFetch<{ run: unknown; nodes: unknown[]; events: unknown[] }>(
    `/api/ai-paths/runs/${encodeURIComponent(runId)}`
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
): Promise<ApiResponse<{ deleted: boolean; runId: string }>> {
  return apiDelete<{ deleted: boolean; runId: string }>(
    `/api/ai-paths/runs/${encodeURIComponent(runId)}`
  );
}

export async function getAiPathQueueStatus(options?: {
  visibility?: 'scoped' | 'global';
  fresh?: boolean;
}): Promise<ApiResponse<{ status: unknown }>> {
  const params = new URLSearchParams();
  if (options?.visibility) params.set('visibility', options.visibility);
  if (options?.fresh) params.set('fresh', '1');
  const query = params.toString();
  const url = query ? `/api/ai-paths/runs/queue-status?${query}` : '/api/ai-paths/runs/queue-status';
  return apiFetch<{ status: unknown }>(url);
}

export async function clearAiPathRuns(options?: {
  scope?: 'all' | 'terminal';
  pathId?: string;
  source?: string;
  sourceMode?: 'include' | 'exclude';
}): Promise<ApiResponse<{ deleted: number; scope: 'all' | 'terminal' }>> {
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
): Promise<ApiResponse<{ run: unknown }>> {
  return apiPost<{ run: unknown }>(`/api/ai-paths/runs/${encodeURIComponent(runId)}/resume`, {
    mode,
  });
}

export async function retryAiPathRunNode(
  runId: string,
  nodeId: string
): Promise<ApiResponse<{ run: unknown }>> {
  return apiPost<{ run: unknown }>(
    `/api/ai-paths/runs/${encodeURIComponent(runId)}/retry-node`,
    { nodeId }
  );
}

export async function cancelAiPathRun(runId: string): Promise<ApiResponse<{ run: unknown }>> {
  return apiPost<{ run: unknown }>(`/api/ai-paths/runs/${encodeURIComponent(runId)}/cancel`, {});
}

export async function requeueAiPathDeadLetterRuns(payload: {
  runIds?: string[];
  pathId?: string | null;
  query?: string | null;
  mode?: 'resume' | 'replay';
  limit?: number | null;
}): Promise<
  ApiResponse<{
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
// Grouped API Objects (Namespaces) - Compatibility Layer
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
  requeueDeadLetter: requeueAiPathDeadLetterRuns,
};

export const dbApi = {
  action: databaseAction,
  query: databaseQuery,
  update: databaseUpdate,
  fetchSchema,
  browse: async (
    collection: string,
    args?: { provider?: string; limit?: number; skip?: number; query?: string }
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
  getProduct: async (id: string) => apiFetch<unknown>(`/api/products/${id}`),
  getNote: async (id: string) => apiFetch<unknown>(`/api/notes/${id}`),
  deleteProduct: async (id: string) => apiDelete<unknown>(`/api/products/${id}`),
  deleteNote: async (id: string) => apiDelete<unknown>(`/api/notes/${id}`),
  createProduct: async (payload: unknown) => apiPost<unknown>('/api/products', payload),
  createNote: async (payload: unknown) => apiPost<unknown>('/api/notes', payload),
};

export const settingsApi = {
  list: fetchSettings,
  update: updateSetting
};

export const triggerButtonsApi = {
  list: fetchTriggerButtons,
  create: createTriggerButton,
  update: updateTriggerButton,
  delete: deleteTriggerButton,
  remove: deleteTriggerButton,
  reorder: (
    payload:
      | string[]
      | {
        orderedIds?: string[];
        buttonIds?: string[];
      }
  ) => {
    if (Array.isArray(payload)) {
      return reorderTriggerButtons({ orderedIds: payload });
    }
    if (Array.isArray(payload.orderedIds)) {
      return reorderTriggerButtons({ orderedIds: payload.orderedIds });
    }
    return reorderTriggerButtons({ orderedIds: payload.buttonIds ?? [] });
  }
};

export const aiJobsApi = {
  enqueue: async (payload: unknown) => apiPost<{ jobId: string }>('/api/ai/jobs/enqueue', payload),
  poll: async (jobId: string, options?: { signal?: AbortSignal }) => 
    apiFetch<{ status: string; result?: unknown; error?: string }>(`/api/ai/jobs/${jobId}/poll`, options),
  get: async (jobId: string) => apiFetch<{ job: unknown }>(`/api/ai/jobs/${jobId}`),
  list: async () => apiFetch<{ jobs: unknown[] }>('/api/ai/jobs'),
};

export const agentApi = {
  enqueue: enqueueAgentRun,
  enqueueAgentRun,
  enqueuePlaywrightRun,
  get: fetchPlaywrightRun,
  poll: fetchPlaywrightRun,
};

export const learnerAgentsApi = {
  list: async () => { return { ok: true, data: { agents: [] } }; },
  chat: async (payload: unknown) => apiPost<unknown>('/api/ai/learner-agents/chat', payload),
};

export const aiPathsApi = {
  streamRun: streamAiPathRun,
};

export const aiGenerationApi = {
  async generate() { return { ok: true, data: { result: '' } }; },
  updateProductDescription: async (productId: string, description: string) => 
    apiPatch<unknown>(`/api/products/${productId}`, { description }),
};

export const playwrightNodeApi = {
  enqueue: enqueuePlaywrightRun,
  get: fetchPlaywrightRun,
  poll: fetchPlaywrightRun,
};
