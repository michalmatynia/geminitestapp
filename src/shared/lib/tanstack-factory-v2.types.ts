import type { ErrorCategory } from '@/shared/contracts/observability';

import type { QueryKey } from '@tanstack/react-query';

export type TanstackRequestOperation =
  | 'list'
  | 'detail'
  | 'infinite'
  | 'polling'
  | 'create'
  | 'update'
  | 'delete'
  | 'action'
  | 'upload';

export type TanstackEntityKind =
  | 'query'
  | 'mutation'
  | 'query-cache'
  | 'mutation-cache'
  | 'query-batch';

export type TanstackLifecycleStage = 'start' | 'success' | 'error' | 'retry' | 'cancel';

export type TanstackCriticality = 'low' | 'normal' | 'high' | 'critical';

export type TanstackFactoryDomain =
  | 'global'
  | 'products'
  | 'image_studio'
  | 'integrations'
  | 'cms'
  | 'ai_paths'
  | 'auth'
  | 'database'
  | 'notes'
  | 'playwright'
  | 'jobs'
  | 'observability'
  | 'chatbot'
  | 'agent_creator'
  | 'drafter'
  | 'files'
  | 'viewer3d'
  | 'analytics'
  | 'internationalization'
  | 'viewer3d'
  | 'analytics';

export type TanstackFactoryMeta = {
  source: string;
  operation: TanstackRequestOperation;
  resource: string;
  domain: TanstackFactoryDomain;
  description?: string | undefined;
  queryKey?: QueryKey | undefined;
  mutationKey?: QueryKey | undefined;
  criticality?: TanstackCriticality | undefined;
  samplingRate?: number | undefined;
  logError?: boolean | undefined;
  tags?: string[] | undefined;
};

export type TanstackFactoryMetaResolved = {
  source: string;
  operation: TanstackRequestOperation;
  resource: string;
  description?: string | undefined;
  key: QueryKey | undefined;
  criticality: TanstackCriticality;
  samplingRate: number;
  logError: boolean;
  domain: TanstackFactoryDomain;
  tags: string[];
};

export type TanstackFactoryRuntimeMeta = {
  tanstackFactoryV2Meta?: TanstackFactoryMetaResolved | undefined;
};

export type TanstackTelemetryEvent = {
  id: string;
  timestamp: string;
  traceId: string;
  entity: TanstackEntityKind;
  stage: TanstackLifecycleStage;
  source: string;
  operation: TanstackRequestOperation;
  resource: string;
  description?: string | undefined;
  key: string;
  keyHash: string;
  criticality: TanstackCriticality;
  domain: TanstackFactoryDomain;
  sampled: boolean;
  attempt?: number | undefined;
  durationMs?: number | undefined;
  statusCode?: number | undefined;
  category?: ErrorCategory | string | undefined;
  errorMessage?: string | undefined;
  context?: Record<string, unknown> | undefined;
  tags?: string[] | undefined;
};

export type TanstackTelemetryEnvelope = {
  event: TanstackTelemetryEvent;
};

export type TanstackTelemetryBatch = {
  events: TanstackTelemetryEvent[];
};
