/**
 * AI-Paths API Client
 *
 * Centralized API utilities for both React components and runtime handlers.
 * Provides typed fetch wrappers with consistent error handling.
 */

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
  provider: string;
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

// ============================================================================
// Base Fetch Utilities
// ============================================================================

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);
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
        result: job?.result,
        error: job?.errorMessage ?? undefined,
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
        headers: options.headers,
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
