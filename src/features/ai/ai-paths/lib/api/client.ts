/**
 * AI-Paths API Client
 *
 * Centralized API utilities for both React components and runtime handlers.
 * Provides typed fetch wrappers with consistent error handling.
 */

import type { AiTriggerButtonRecord } from "@/shared/types/ai-trigger-buttons";
import type { ChatMessage } from "@/shared/types/chatbot";
import type { AgentTeachingAgentRecord, AgentTeachingChatSource } from "@/shared/types/agent-teaching";

// ============================================================================
// Types
// ============================================================================

export type ApiResponse<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: string;
};

export type DbActionPayload = {
  action: string;
  collection: string;
  filter?: unknown;
  pipeline?: unknown[];
  document?: unknown;
  documents?: unknown[];
  update?: unknown;
  projection?: unknown;
  sort?: unknown;
  limit?: number;
  idType?: string;
};

export type DbQueryPayload = {
  provider: string;
  collection: string;
  query: unknown;
  projection?: unknown;
  sort?: unknown;
  limit?: number;
  single?: boolean;
  idType?: string;
};

export type DbUpdatePayload = {
  provider: string;
  collection: string;
  query: unknown;
  updates: unknown;
  single?: boolean;
  idType?: string;
};

export type EntityUpdatePayload = {
  entityType: string;
  entityId?: string;
  updates: unknown;
  mode?: "replace" | "append";
};

export type SchemaResponse = {
  provider: "prisma" | "mongodb";
  collections: Array<{
    name: string;
    fields?: Array<{ name: string; type: string }>;
    relations?: string[];
  }>;
};

export type BrowseResponse = {
  documents: Record<string, unknown>[];
  total: number;
};

export type SettingRecord = {
  key: string;
  value: string;
};

export type SettingsScope = "all" | "light" | "heavy";

export type AgentEnqueuePayload = {
  prompt: string;
  model?: string;
  plannerModel?: string;
  selfCheckModel?: string;
  extractionValidationModel?: string;
  toolRouterModel?: string;
  memoryValidationModel?: string;
  memorySummarizationModel?: string;
  loopGuardModel?: string;
  approvalGateModel?: string;
  selectorInferenceModel?: string;
  outputNormalizationModel?: string;
  tools?: string[];
  searchProvider?: string;
  agentBrowser?: string;
  runHeadless?: boolean;
  ignoreRobotsTxt?: boolean;
  requireHumanApproval?: boolean;
  planSettings?: {
    maxSteps?: number;
    maxStepAttempts?: number;
    maxReplanCalls?: number;
    replanEverySteps?: number;
    maxSelfChecks?: number;
    loopGuardThreshold?: number;
    loopBackoffBaseMs?: number;
    loopBackoffMaxMs?: number;
  };
};

// ============================================================================
// Base Fetch Utilities
// ============================================================================

const resolveApiUrl = (url: string): string => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (typeof window !== "undefined") {
    return url;
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${trimmedBase}${path}`;
};

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const resolvedUrl = resolveApiUrl(url);
    const res = await fetch(resolvedUrl, options);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({})) as { error?: string; message?: string };
      return {
        ok: false,
        error: errorData.error || errorData.message || `Request failed with status ${res.status}`,
      };
    }
    const data = await res.json() as T;
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function apiPost<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function apiPatch<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, { method: "DELETE" });
}

// ============================================================================
// Database API
// ============================================================================

export const dbApi = {
  /**
   * Execute a database action (aggregate, find, insert, update, delete)
   */
  async action<T = unknown>(payload: DbActionPayload): Promise<ApiResponse<T>> {
    return apiPost<T>("/api/ai-paths/db-action", payload);
  },

  /**
   * Execute a database query
   */
  async query<T = unknown>(payload: DbQueryPayload): Promise<ApiResponse<T>> {
    return apiPost<T>("/api/ai-paths/db-query", payload);
  },

  /**
   * Execute a database update
   */
  async update<T = unknown>(payload: DbUpdatePayload): Promise<ApiResponse<T>> {
    return apiPost<T>("/api/ai-paths/db-update", payload);
  },

  /**
   * Fetch database schema
   */
  async schema(): Promise<ApiResponse<SchemaResponse>> {
    return apiFetch<SchemaResponse>("/api/databases/schema");
  },

  /**
   * Browse collection documents
   */
  async browse(
    collection: string,
    options?: { limit?: number; skip?: number; query?: string }
  ): Promise<ApiResponse<BrowseResponse>> {
    const params = new URLSearchParams();
    params.set("collection", collection);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.skip) params.set("skip", String(options.skip));
    if (options?.query) params.set("query", options.query);
    return apiFetch<BrowseResponse>(`/api/databases/browse?${params.toString()}`);
  },
};

// ============================================================================
// Settings API
// ============================================================================

export const settingsApi = {
  async list(options?: { scope?: SettingsScope }): Promise<ApiResponse<SettingRecord[]>> {
    const scope = options?.scope;
    const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
    return apiFetch<SettingRecord[]>(`/api/settings${query}`);
  },
};

// ============================================================================
// Trigger Buttons API
// ============================================================================

export const triggerButtonsApi = {
  async list(): Promise<ApiResponse<AiTriggerButtonRecord[]>> {
    return apiFetch<AiTriggerButtonRecord[]>("/api/ai-paths/trigger-buttons");
  },

  async create(payload: {
    name: string;
    iconId?: string | null;
    display?: AiTriggerButtonRecord["display"];
    locations: AiTriggerButtonRecord["locations"];
    mode?: AiTriggerButtonRecord["mode"];
  }): Promise<ApiResponse<AiTriggerButtonRecord>> {
    return apiPost<AiTriggerButtonRecord>("/api/ai-paths/trigger-buttons", payload);
  },

  async update(
    id: string,
    patch: Partial<Pick<AiTriggerButtonRecord, "name" | "iconId" | "locations" | "mode" | "display">>
  ): Promise<ApiResponse<AiTriggerButtonRecord>> {
    return apiPatch<AiTriggerButtonRecord>(`/api/ai-paths/trigger-buttons/${encodeURIComponent(id)}`, patch);
  },

  async remove(id: string): Promise<ApiResponse<{ ok: true }>> {
    return apiDelete<{ ok: true }>(`/api/ai-paths/trigger-buttons/${encodeURIComponent(id)}`);
  },

  async reorder(orderedIds: string[]): Promise<ApiResponse<AiTriggerButtonRecord[]>> {
    return apiPost<AiTriggerButtonRecord[]>("/api/ai-paths/trigger-buttons/reorder", { orderedIds });
  },
};

// ============================================================================
// Agent Creator API
// ============================================================================

export const agentApi = {
  async enqueue(payload: AgentEnqueuePayload): Promise<ApiResponse<{ runId: string; status?: string }>> {
    return apiPost<{ runId: string; status?: string }>("/api/agentcreator/agent", payload);
  },

  async poll(runId: string): Promise<ApiResponse<{ run?: unknown }>> {
    return apiFetch<{ run?: unknown }>(`/api/agentcreator/agent/${encodeURIComponent(runId)}`);
  },
};

// ============================================================================
// Learner Agents API (RAG)
// ============================================================================

export const learnerAgentsApi = {
  async listAgents(): Promise<ApiResponse<AgentTeachingAgentRecord[]>> {
    const response = await apiFetch<{ agents?: AgentTeachingAgentRecord[] }>("/api/agentcreator/teaching/agents");
    if (!response.ok) return response;
    return { ok: true, data: response.data.agents ?? [] };
  },

  async chat(payload: {
    agentId: string;
    messages: ChatMessage[];
  }): Promise<ApiResponse<{ message: string; sources: AgentTeachingChatSource[] }>> {
    return apiPost<{ message: string; sources: AgentTeachingChatSource[] }>("/api/agentcreator/teaching/chat", payload);
  },
};

// ============================================================================
// Entity API (Products, Notes)
// ============================================================================

export const entityApi = {
  /**
   * Update an entity using the generic update endpoint
   */
  async update<T = unknown>(payload: EntityUpdatePayload): Promise<ApiResponse<T>> {
    return apiPost<T>("/api/ai-paths/update", payload);
  },

  /**
   * Fetch a product by ID
   */
  async getProduct(productId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return apiFetch<Record<string, unknown>>(
      `/api/products/${encodeURIComponent(productId)}`
    );
  },

  /**
   * Create a product
   */
  async createProduct(formData: FormData): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})) as { error?: string };
        return { ok: false, error: errorData.error || "Failed to create product" };
      }
      const data = await res.json() as Record<string, unknown>;
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return apiDelete<{ ok: boolean }>(
      `/api/products/${encodeURIComponent(productId)}`
    );
  },

  /**
   * Fetch a note by ID
   */
  async getNote(noteId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return apiFetch<Record<string, unknown>>(
      `/api/notes/${encodeURIComponent(noteId)}`
    );
  },

  /**
   * Create a note
   */
  async createNote(payload: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> {
    return apiPost<Record<string, unknown>>("/api/notes", payload);
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return apiDelete<{ ok: boolean }>(
      `/api/notes/${encodeURIComponent(noteId)}`
    );
  },

  /**
   * Fetch entity by type and ID
   */
  async getByType(
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const normalized = entityType.toLowerCase();
    if (normalized === "product" || normalized === "products") {
      return this.getProduct(entityId);
    }
    if (normalized === "note" || normalized === "notes") {
      return this.getNote(entityId);
    }
    return { ok: false, error: `Unknown entity type: ${entityType}` };
  },
};

// ============================================================================
// AI Jobs API
// ============================================================================

export const aiJobsApi = {
  /**
   * Enqueue an AI job
   */
  async enqueue(payload: {
    productId: string;
    type: string;
    payload: unknown;
  }): Promise<ApiResponse<{ jobId: string }>> {
    return apiPost<{ jobId: string }>("/api/products/ai-jobs/enqueue", payload);
  },

  /**
   * Poll for AI job status
   */
  async poll(jobId: string): Promise<ApiResponse<{
    status: string;
    result?: unknown;
    error?: string;
  }>> {
    const response = await apiFetch<{
      job?: { status?: string; result?: unknown; errorMessage?: string | null };
    }>(`/api/products/ai-jobs/${encodeURIComponent(jobId)}`);

    if (!response.ok) {
      return response;
    }

    const job = response.data.job;
    return {
      ok: true,
      data: {
        status: job?.status ?? "",
        ...(job?.result !== undefined ? { result: job.result } : {}),
        ...(job?.errorMessage ? { error: job.errorMessage } : {}),
      },
    };
  },
};

// ============================================================================
// AI Generation API
// ============================================================================

export const aiGenerationApi = {
  /**
   * Generate a description using AI
   */
  async generateDescription(body: {
    entityJson: Record<string, unknown>;
    imageUrls: string[];
    descriptionConfig?: Record<string, unknown>;
  }): Promise<ApiResponse<{ description?: string }>> {
    return apiPost<{ description?: string }>("/api/generate-description", body);
  },

  /**
   * Update a product's description
   */
  async updateProductDescription(
    productId: string,
    description: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const formData = new FormData();
      formData.append("description_en", description);
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})) as { error?: string };
        return { ok: false, error: errorData.error || "Failed to update description" };
      }
      const data = await res.json() as Record<string, unknown>;
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};

// ============================================================================
// HTTP Node API (for external requests)
// ============================================================================

export const httpApi = {
  /**
   * Execute an HTTP request (used by HTTP node)
   */
  async request(
    url: string,
    options: {
      method: string;
      headers?: Record<string, string>;
      body?: string;
    }
  ): Promise<ApiResponse<{ status: number; data: unknown }>> {
    try {
      const fetchInit: RequestInit = {
        method: options.method,
        ...(options.headers ? { headers: options.headers } : {}),
      };
      if (options.body !== undefined) {
        fetchInit.body = options.body;
      }
      const res = await fetch(url, fetchInit);
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }
      return { ok: true, data: { status: res.status, data } };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  },
};

// ============================================================================
// AI Paths Runs API
// ============================================================================

export const runsApi = {
  async enqueue(payload: {
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
  }): Promise<ApiResponse<{ run: unknown }>> {
    return apiPost<{ run: unknown }>("/api/ai-paths/runs/enqueue", payload);
  },

  async list(options?: {
    pathId?: string;
    status?: string;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ runs: unknown[]; total: number }>> {
    const params = new URLSearchParams();
    if (options?.pathId) params.set("pathId", options.pathId);
    if (options?.status) params.set("status", options.status);
    if (options?.query) params.set("query", options.query);
    if (typeof options?.limit === "number") params.set("limit", String(options.limit));
    if (typeof options?.offset === "number") params.set("offset", String(options.offset));
    const query = params.toString();
    const url = query ? `/api/ai-paths/runs?${query}` : "/api/ai-paths/runs";
    return apiFetch<{ runs: unknown[]; total: number }>(url);
  },

  async get(runId: string): Promise<ApiResponse<{ run: unknown; nodes: unknown[]; events: unknown[] }>> {
    return apiFetch<{ run: unknown; nodes: unknown[]; events: unknown[] }>(
      `/api/ai-paths/runs/${encodeURIComponent(runId)}`
    );
  },

  async queueStatus(): Promise<ApiResponse<{ status: unknown }>> {
    return apiFetch<{ status: unknown }>("/api/ai-paths/runs/queue-status");
  },

  async resume(runId: string, mode?: "resume" | "replay"): Promise<ApiResponse<{ run: unknown }>> {
    return apiPost<{ run: unknown }>(
      `/api/ai-paths/runs/${encodeURIComponent(runId)}/resume`,
      { mode }
    );
  },

  async retryNode(runId: string, nodeId: string): Promise<ApiResponse<{ run: unknown }>> {
    return apiPost<{ run: unknown }>(
      `/api/ai-paths/runs/${encodeURIComponent(runId)}/retry-node`,
      { nodeId }
    );
  },

  async cancel(runId: string): Promise<ApiResponse<{ run: unknown }>> {
    return apiPost<{ run: unknown }>(
      `/api/ai-paths/runs/${encodeURIComponent(runId)}/cancel`,
      {}
    );
  },

  async requeueDeadLetter(payload: {
    runIds?: string[];
    pathId?: string | null;
    query?: string | null;
    mode?: "resume" | "replay";
    limit?: number | null;
  }): Promise<ApiResponse<{
    requeued: number;
    runIds: string[];
    errors?: Array<{ runId: string; error: string }>;
  }>> {
    return apiPost<{
      requeued: number;
      runIds: string[];
      errors?: Array<{ runId: string; error: string }>;
    }>("/api/ai-paths/runs/dead-letter/requeue", payload);
  },
};
