/**
 * API Handler Type Definitions
 * 
 * Type contracts for API route handlers and console utilities.
 * Provides:
 * - API handler context and request metadata
 * - Generic API console configuration and state
 * - Route handler type definitions
 * - Request/response envelope types
 * - Parameter and body validation types
 */

import type { NextRequest } from 'next/server';
import type { ZodSchema } from 'zod';

import type {
  ContextRuntimeDocument,
  ContextRegistryResolutionBundle,
} from '../ai-context-registry';

export type {
  ContextRuntimeDocument,
  ContextRegistryResolutionBundle,
};

/**
 * API Handler Types
 */

/**
 * Preset configuration for API console quick actions
 */
export interface ApiPreset {
  /** Display label for the preset */
  label: string;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** API path or endpoint */
  path?: string;
  /** Query parameters or request body */
  params?: Record<string, unknown> | string;
  /** Request body content */
  body?: string;
}

/**
 * Configuration for generic API console component
 */
export interface GenericApiConsoleConfig {
  /** Console title */
  title: string;
  /** Console description */
  description: string;
  /** Base URL for API requests */
  baseUrl: string;
  /** Whether method is selectable or input field */
  methodType?: 'select' | 'input';
  /** Label for body/params input */
  bodyOrParamsLabel?: string;
  /** Warning message about connection status */
  connectionWarning?: string;
}

/**
 * State for generic API console component
 */
export interface GenericApiConsoleState {
  /** Current HTTP method */
  method: string;
  /** API endpoint path */
  path?: string;
  /** Request body or query parameters as JSON string */
  bodyOrParams: string;
  /** Whether request is in progress */
  loading: boolean;
  /** Error message if request failed */
  error: string | null;
  /** API response data and metadata */
  response: {
    /** HTTP status code */
    status?: number;
    /** HTTP status text */
    statusText?: string;
    /** Response body data */
    data: unknown;
    /** Whether response was refreshed */
    refreshed?: boolean;
  } | null;
}

/**
 * Props for generic API console component
 */
export interface GenericApiConsoleProps {
  /** Console configuration */
  config: GenericApiConsoleConfig;
  /** Current console state */
  state: GenericApiConsoleState;
  /** Quick action presets */
  presets: ApiPreset[];
  /** Whether API is connected and available */
  isConnected?: boolean;
  /** Callback when HTTP method changes */
  onSetMethod: (value: string) => void;
  /** Callback when API path changes */
  onSetPath?: (value: string) => void;
  /** Callback when body/params changes */
  onSetBodyOrParams: (value: string) => void;
  /** Callback to execute API request */
  onRequest: () => void;
}

import type { SimpleDeleteResponse } from '../base';

export type DeleteResponse = SimpleDeleteResponse;

/**
 * Context passed to API route handlers
 * Contains request metadata, tracing, and utility functions
 */
export interface ApiHandlerContext {
  /** Unique request identifier */
  requestId: string;
  /** Distributed trace identifier */
  traceId: string;
  /** Correlation identifier for related requests */
  correlationId: string;
  /** Request start timestamp */
  startTime: number;
  /** Function to get elapsed time since request start */
  getElapsedMs: () => number;
  /** URL path parameters */
  params?: Record<string, string | string[]>;
  /** Parsed request body */
  body?: unknown;
  /** Query string parameters */
  query?: unknown;
  /** Authenticated user ID or null */
  userId?: string | null;
  /** Rate limit headers to include in response */
  rateLimitHeaders?: Record<string, string>;
}

/**
 * Type for API route handler functions
 */
export type ApiRouteHandler = (req: NextRequest, ctx: ApiHandlerContext) => Promise<Response>;

/**
 * Type for API route handler with typed path parameters
 */
export type ApiRouteHandlerWithParams<P extends Record<string, string | string[]>> = (
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: P
) => Promise<Response>;

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  resolveSessionUser?: boolean;
  allowedMethods?: string[];
  source: string;
  service?: string;
  logSuccess?: boolean;
  successLogging?: 'all' | 'slow' | 'off';
  slowSuccessThresholdMs?: number;
  successLogLevel?: 'info' | 'warn' | 'error';
  fallbackMessage?: string;
  includeDetails?: boolean;
  cacheControl?: string;
  rateLimitKey?: false | 'api' | 'auth' | 'write' | 'upload' | 'search';
  maxBodyBytes?: number;
  parseJsonBody?: boolean;
  bodySchema?: ZodSchema;
  paramsSchema?: ZodSchema;
  querySchema?: ZodSchema;
  requireCsrf?: boolean;
  corsOrigins?: string[];
}

export type JsonParseResult<T = unknown> =
  | { ok: true; data: T; response?: Response }
  | { ok: false; response: Response; data?: undefined };

export interface ParseJsonOptions {
  maxSize?: number;
  allowEmpty?: boolean;
  logPrefix?: string;
}

export interface GenericItemMapperConfig<TInternal, TExternal, TMapping> {
  // Context
  connectionId?: string | null;
  connectionName?: string | null;

  // UI Labels
  title: string;
  internalColumnHeader: string;
  externalColumnHeader: string;
  additionalColumnsHeader?: string;

  // Data
  internalItems: TInternal[];
  externalItems: TExternal[];
  currentMappings: TMapping[];

  // Callbacks for extracting/transforming data
  getInternalId: (item: TInternal) => string;
  getInternalLabel: (item: TInternal) => string;
  getExternalId: (item: TExternal) => string;
  getExternalLabel: (item: TExternal) => string;
  getInternalAdditionalLabel?: (item: TInternal) => string | null;

  // Mapping accessors
  getMappingInternalId: (mapping: TMapping) => string;
  getMappingExternalId: (mapping: TMapping) => string | null;

  // Async operations
  onFetch: () => Promise<{ message: string }>;
  onSave: (
    mappings: Array<{ internalId: string; externalId: string | null }>
  ) => Promise<{ message: string }>;

  // Loading states
  isLoadingInternal?: boolean;
  isLoadingExternal?: boolean;
  isLoadingMappings?: boolean;
  isFetching?: boolean;
  isSaving?: boolean;
}

export type GenericMapperExternalCellProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: Array<{ label: string; value: string }>;
  disabled: boolean;
};

export type GenericMapperHeaderActionsProps = {
  onFetch: () => void;
  isFetching: boolean;
  onSave: () => void;
  isSaving: boolean;
  pendingCount: number;
};

export type GenericMapperStatsProps = {
  total: number;
  mapped: number;
  unmapped?: number;
  pending: number;
  itemLabel?: string;
};

export type PendingMappingStatsDto = {
  total: number;
  mapped: number;
  unmapped: number;
  pending: number;
};
export type PendingMappingStats = PendingMappingStatsDto;

export type PendingExternalMappingsStateDto = {
  pendingMappings: Map<string, string | null>;
  getCurrentMapping: (internalId: string) => string | null;
  handleMappingChange: (internalId: string, externalId: string | null) => void;
  resetPendingMappings: () => void;
  stats: PendingMappingStats;
};
export type PendingExternalMappingsState = PendingExternalMappingsStateDto;
