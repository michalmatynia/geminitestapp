import type { NextRequest } from 'next/server';
import type { ZodSchema } from 'zod';

export type {
  ContextRuntimeDocument,
  ContextRegistryResolutionBundle,
} from '../ai-context-registry';

/**
 * API Handler Types
 */

export interface ApiPreset {
  label: string;
  method: string;
  path?: string;
  params?: Record<string, unknown> | string;
  body?: string;
}

export interface GenericApiConsoleConfig {
  title: string;
  description: string;
  baseUrl: string;
  methodType?: 'select' | 'input';
  bodyOrParamsLabel?: string;
  connectionWarning?: string;
}

export interface GenericApiConsoleState {
  method: string;
  path?: string;
  bodyOrParams: string;
  loading: boolean;
  error: string | null;
  response: {
    status?: number;
    statusText?: string;
    data: unknown;
    refreshed?: boolean;
  } | null;
}

export interface GenericApiConsoleProps {
  config: GenericApiConsoleConfig;
  state: GenericApiConsoleState;
  presets: ApiPreset[];
  isConnected?: boolean;
  onSetMethod: (value: string) => void;
  onSetPath?: (value: string) => void;
  onSetBodyOrParams: (value: string) => void;
  onRequest: () => void;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
}

export interface ApiHandlerContext {
  requestId: string;
  traceId: string;
  correlationId: string;
  startTime: number;
  getElapsedMs: () => number;
  params?: Record<string, string | string[]>;
  body?: unknown;
  query?: unknown;
  userId?: string | null;
  rateLimitHeaders?: Record<string, string>;
}

export type ApiRouteHandler = (req: NextRequest, ctx: ApiHandlerContext) => Promise<Response>;

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
