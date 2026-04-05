import { QueryClient, type QueryKey } from '@tanstack/react-query';

import {
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  AI_PATH_RUN_QUEUE_CHANNEL,
  parseAiPathRunEnqueuedEventPayload,
  type AiPathRunListResult,
  type AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import type { StudioSlotsResponse } from '@/shared/contracts/image-studio/image-studio/slot';
import {
  aiPathRunMatchesFilters,
  rememberOptimisticAiPathRun,
  type OptimisticRunFilters,
} from '@/shared/lib/ai-paths/optimistic-run-queue';
import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';

import { QUERY_KEYS } from './query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


const AI_PATHS_NODE_SOURCES = new Set<string>(AI_PATHS_RUN_SOURCE_VALUES);
const RECENT_AI_PATH_RUN_ENQUEUE_STORAGE_KEY = 'ai-path-run-recent-enqueue';
const RECENT_AI_PATH_RUN_ENQUEUE_TTL_MS = 60_000;
let inMemoryRecentAiPathRunEnqueue: RecentAiPathRunEnqueueRecord | null = null;

type RecentAiPathRunEnqueueRecord = {
  type: 'run-enqueued';
  runId: string;
  entityId: string | null;
  entityType: string | null;
  at: number;
  expiresAt: number;
};

const readRecentAiPathRunEnqueueStringField = (
  record: Record<string, unknown>,
  key: 'runId' | 'entityId' | 'entityType',
  options?: { lowercase?: boolean }
): string | null => {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();
  return options?.lowercase ? trimmed.toLowerCase() : trimmed;
};

const readRecentAiPathRunEnqueueNumberField = (
  record: Record<string, unknown>,
  key: 'at' | 'expiresAt',
  options?: { positive?: boolean }
): number | null => {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  if (options?.positive ? value <= 0 : value < 0) {
    return null;
  }
  return value;
};

const buildRecentAiPathRunEnqueueRecord = (input: {
  runId: string;
  entityId: string | null;
  entityType: string | null;
  at: number;
  expiresAt: number;
}): RecentAiPathRunEnqueueRecord => ({
  type: 'run-enqueued',
  runId: input.runId,
  entityId: input.entityId,
  entityType: input.entityType,
  at: input.at,
  expiresAt: input.expiresAt,
});

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeLocalStorageGetItem = (key: string): string | null => {
  if (!canUseLocalStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    logClientCatch(error, {
      source: 'query-invalidation',
      action: 'safeLocalStorageGetItem',
      storageKey: key,
      level: 'warn',
    });
    return null;
  }
};

const safeLocalStorageSetItem = (key: string, value: string): boolean => {
  if (!canUseLocalStorage()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logClientCatch(error, {
      source: 'query-invalidation',
      action: 'safeLocalStorageSetItem',
      storageKey: key,
      level: 'warn',
    });
    return false;
  }
};

const safeLocalStorageRemoveItem = (key: string): void => {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    logClientCatch(error, {
      source: 'query-invalidation',
      action: 'safeLocalStorageRemoveItem',
      storageKey: key,
      level: 'warn',
    });

    // Ignore storage cleanup failures.
  }
};

const normalizeRecentAiPathRunEnqueueRecord = (
  value: unknown
): RecentAiPathRunEnqueueRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const runId = readRecentAiPathRunEnqueueStringField(record, 'runId');
  const entityId = readRecentAiPathRunEnqueueStringField(record, 'entityId');
  const entityType = readRecentAiPathRunEnqueueStringField(record, 'entityType', {
    lowercase: true,
  });
  const at = readRecentAiPathRunEnqueueNumberField(record, 'at');
  const expiresAt = readRecentAiPathRunEnqueueNumberField(record, 'expiresAt', {
    positive: true,
  });
  if (!runId || at === null || expiresAt === null) return null;
  return buildRecentAiPathRunEnqueueRecord({
    runId,
    entityId,
    entityType,
    at,
    expiresAt,
  });
};

export const rememberRecentAiPathRunEnqueue = (
  payload: unknown,
  options?: { ttlMs?: number }
): void => {
  const parsed = parseAiPathRunEnqueuedEventPayload(payload);
  if (!parsed) return;
  const ttlMs = Math.max(1_000, options?.ttlMs ?? RECENT_AI_PATH_RUN_ENQUEUE_TTL_MS);
  const at =
    typeof parsed.at === 'number' && Number.isFinite(parsed.at) && parsed.at >= 0
      ? parsed.at
      : Date.now();
  const record = buildRecentAiPathRunEnqueueRecord({
    runId: parsed.runId,
    entityId: parsed.entityId ?? null,
    entityType: parsed.entityType ?? null,
    at,
    expiresAt: Date.now() + ttlMs,
  });
  inMemoryRecentAiPathRunEnqueue = record;
  safeLocalStorageSetItem(RECENT_AI_PATH_RUN_ENQUEUE_STORAGE_KEY, JSON.stringify(record));
};

export const clearRecentAiPathRunEnqueue = (): void => {
  inMemoryRecentAiPathRunEnqueue = null;
  safeLocalStorageRemoveItem(RECENT_AI_PATH_RUN_ENQUEUE_STORAGE_KEY);
};

const clearExpiredRecentAiPathRunEnqueueMemoryRecord = (): void => {
  inMemoryRecentAiPathRunEnqueue = null;
};

const readRecentAiPathRunEnqueueMemoryRecord = (
  now: number
): RecentAiPathRunEnqueueRecord | null => {
  const record = inMemoryRecentAiPathRunEnqueue;
  if (!record || record.expiresAt <= now) {
    clearExpiredRecentAiPathRunEnqueueMemoryRecord();
    return null;
  }
  return record;
};

const parseRecentAiPathRunEnqueueStorageRecord = (
  raw: string
): RecentAiPathRunEnqueueRecord | null => {
  try {
    return normalizeRecentAiPathRunEnqueueRecord(JSON.parse(raw));
  } catch (error) {
    logClientCatch(error, {
      source: 'query-invalidation',
      action: 'parseRecentAiPathRunEnqueue',
      storageKey: RECENT_AI_PATH_RUN_ENQUEUE_STORAGE_KEY,
      level: 'warn',
    });
    return null;
  }
};

const clearInvalidRecentAiPathRunEnqueueStorageRecord = (): void => {
  safeLocalStorageRemoveItem(RECENT_AI_PATH_RUN_ENQUEUE_STORAGE_KEY);
};

const readRecentAiPathRunEnqueueStorageRecord = (
  now: number
): RecentAiPathRunEnqueueRecord | null => {
  const raw = safeLocalStorageGetItem(RECENT_AI_PATH_RUN_ENQUEUE_STORAGE_KEY);
  if (!raw) return null;
  const record = parseRecentAiPathRunEnqueueStorageRecord(raw);
  if (!record || record.expiresAt <= now) {
    clearInvalidRecentAiPathRunEnqueueStorageRecord();
    return null;
  }
  return record;
};

const selectRecentAiPathRunEnqueueRecord = (
  memoryRecord: RecentAiPathRunEnqueueRecord | null,
  storageRecord: RecentAiPathRunEnqueueRecord | null
): RecentAiPathRunEnqueueRecord | null => {
  if (!storageRecord) return memoryRecord;
  if (!memoryRecord) return storageRecord;
  return storageRecord.at >= memoryRecord.at ? storageRecord : memoryRecord;
};

const toRecentAiPathRunEnqueueSnapshot = (record: RecentAiPathRunEnqueueRecord) => ({
  type: record.type,
  runId: record.runId,
  entityId: record.entityId,
  entityType: record.entityType,
  at: record.at,
});

export const getRecentAiPathRunEnqueue = (): {
  type: 'run-enqueued';
  runId: string;
  entityId: string | null;
  entityType: string | null;
  at: number;
} | null => {
  const now = Date.now();
  const memoryRecord = readRecentAiPathRunEnqueueMemoryRecord(now);
  const storageRecord = readRecentAiPathRunEnqueueStorageRecord(now);
  const record = selectRecentAiPathRunEnqueueRecord(memoryRecord, storageRecord);
  if (!record) return null;

  inMemoryRecentAiPathRunEnqueue = record;
  return toRecentAiPathRunEnqueueSnapshot(record);
};

export const resolveQueueRunSource = (meta?: Record<string, unknown> | null): string | null => {
  if (!meta) return null;
  const source = normalizeString(meta['source']);
  return source;
};

export const isAiPathsQueueRunSource = (meta?: Record<string, unknown> | null): boolean =>
  (() => {
    const source = resolveQueueRunSource(meta);
    return source !== null && AI_PATHS_NODE_SOURCES.has(source);
  })();

/**
 * Standardized invalidation helpers for TanStack Query.
 * Use these instead of manually constructing query keys for invalidation.
 */

// --- Product Metadata ---

export const invalidateProductMetadata = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.all });
};

export const invalidateProductValidatorLatestSource = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
  });
};

export const invalidateProducts = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.lists() }),
    invalidateProductValidatorLatestSource(queryClient),
  ]);
};

export const invalidateProductsAndCounts = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.lists() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.counts() }),
    invalidateProductValidatorLatestSource(queryClient),
  ]);
};

export const invalidateProductsAndDetail = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.lists() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detailEdit(productId) }),
    invalidateProductValidatorLatestSource(queryClient),
  ]);
};

export const invalidateProductsCountsAndDetail = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.lists() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.counts() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detailEdit(productId) }),
    invalidateProductValidatorLatestSource(queryClient),
  ]);
};

export const invalidateProductDetail = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detailEdit(productId) }),
  ]);
};

export const refetchProductsAndCounts = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: QUERY_KEYS.products.lists() }),
    queryClient.refetchQueries({ queryKey: QUERY_KEYS.products.counts() }),
    queryClient.refetchQueries({ queryKey: QUERY_KEYS.products.validatorLatestProductSource() }),
  ]);
};

export const invalidateCatalogs = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.catalogs() });
};

export const invalidateCatalogScopedData = async (
  queryClient: QueryClient,
  catalogId: string | null
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.categories(catalogId) }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.metadata.shippingGroups(catalogId),
    }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.tags(catalogId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.parameters(catalogId) }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.metadata.simpleParameters(catalogId),
    }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.settings.categories(catalogId) }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.settings.shippingGroups(catalogId),
    }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.settings.tags(catalogId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.settings.parameters(catalogId) }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.settings.simpleParameters(catalogId),
    }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.settings.categoryTree(catalogId),
    }),
  ]);
};

export const invalidatePriceGroups = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.priceGroups() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.settings.priceGroups() }),
  ]);
};

export const invalidateProductSettingsCatalogs = async (
  queryClient: QueryClient
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.catalogs() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.settings.catalogs() }),
  ]);
};

export const invalidateValidatorConfig = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.settings.validatorSettings() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.settings.validatorPatterns() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.settings.validatorConfig(true) }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.settings.validatorConfig(false),
    }),
  ]);
};

// --- CMS ---

export const invalidateCmsPages = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.pages.all });
};

export const invalidateCmsPageDetail = (queryClient: QueryClient, pageId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.pages.detail(pageId) });
};

export const invalidateCmsSlugs = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.slugs.lists() });
};

export const invalidateCmsSlugDetail = async (
  queryClient: QueryClient,
  slugId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.slugs.detail(slugId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.slugs.domains(slugId) }),
  ]);
};

export const invalidateCmsDomains = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.domains.lists() });
};

export const invalidateCmsThemes = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.themes.lists() });
};

export const invalidateCmsThemeDetail = (queryClient: QueryClient, themeId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.themes.detail(themeId) });
};

// --- Notes ---

export const invalidateNotes = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
};

export const invalidateNotebooks = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks() });
};

export const invalidateNoteDetail = (queryClient: QueryClient, noteId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(noteId) });
};

export const invalidateNoteTags = (queryClient: QueryClient, notebookId?: string) => {
  if (!notebookId) {
    return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all, exact: false });
  }
  return (async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags() }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags(notebookId) }),
    ]);
  })();
};

export const invalidateNoteThemes = (queryClient: QueryClient, notebookId?: string) => {
  if (!notebookId) {
    return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all, exact: false });
  }
  return (async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes(notebookId) }),
    ]);
  })();
};

// --- Integrations ---

export const invalidateIntegrations = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.all });
};

export const invalidateIntegrationConnections = (
  queryClient: QueryClient,
  integrationId?: string
) => {
  if (!integrationId) {
    return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.connections() });
  }

  return (async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.connections() }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.integrations.connections(integrationId),
      }),
    ]);
  })();
};

export const invalidateProductListings = (queryClient: QueryClient, productId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.listings(productId) });
};

export const invalidateListingBadges = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.integrations.productListingsBadges(),
  });
};

export const invalidateProductListingsAndBadges = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    invalidateProductListings(queryClient, productId),
    invalidateListingBadges(queryClient),
  ]);
};

export const invalidateListingRuntimeQueues = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.integrations() }),
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.ai.aiPaths.lists(), 'job-queue'],
    }),
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.ai.aiPaths.all, 'queue-status'],
    }),
  ]);
};

export const invalidateListingsBadgesAndQueues = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    invalidateProductListingsAndBadges(queryClient, productId),
    invalidateListingRuntimeQueues(queryClient),
  ]);
};

// --- Marketplace ---

export const invalidateMarketplaceCategories = (queryClient: QueryClient, connectionId: string) => {
  return queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.integrations.marketplace.categories(connectionId),
  });
};

export const invalidateMarketplaceMappings = (
  queryClient: QueryClient,
  connectionId: string,
  catalogId: string
) => {
  return queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.integrations.marketplace.mappings(connectionId, catalogId),
  });
};

export const invalidateMarketplaceProducers = (queryClient: QueryClient, connectionId: string) => {
  return queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.integrations.marketplace.producers(connectionId),
  });
};

export const invalidateMarketplaceProducerMappings = (
  queryClient: QueryClient,
  connectionId: string
) => {
  return queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.integrations.marketplace.producerMappings(connectionId),
  });
};

export const invalidateMarketplaceTags = (queryClient: QueryClient, connectionId: string) => {
  return queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.integrations.marketplace.tags(connectionId),
  });
};

export const invalidateMarketplaceTagMappings = (
  queryClient: QueryClient,
  connectionId: string
) => {
  return queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.integrations.marketplace.tagMappings(connectionId),
  });
};

// --- System ---

export const invalidateSystemLogs = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.system.logs.all });
};

export const invalidateSystemDiagnostics = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.system.diagnostics.all });
};

export const invalidateSystemActivity = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.system.activity.all });
};

// --- Settings ---

export const invalidateAllSettings = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings.all });
};

export const invalidateSettingsScope = (queryClient: QueryClient, scope: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings.scope(scope) });
};

// --- Users & Preferences ---

export const invalidateUsers = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.users.all });
};

export const invalidateAuthSecurity = (queryClient: QueryClient, userId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.users.security(userId) });
};

export const invalidateUserPreferences = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.preferences.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userPreferences.all }),
  ]);
};

// --- Files ---

export const invalidateFiles = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files.all });
};

// --- Chatbot ---

export const invalidateChatbotSessions = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.chatbot.sessions() });
};

export const invalidateChatbotSession = (queryClient: QueryClient, sessionId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.chatbot.session(sessionId) });
};

export const invalidateChatbotMemory = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.chatbot.memory() });
};

// --- Viewer 3D ---

export const invalidateAsset3d = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.viewer3d.all });
};

export const invalidateAsset3dDetail = (queryClient: QueryClient, id: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.viewer3d.detail(id) });
};

// --- Analytics ---

export const invalidateAnalytics = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.analytics.all });
};

// --- Jobs ---

export const invalidateJobs = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.all });
};

export const invalidateIntegrationJobs = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.integrations() });
};

// --- Drafter ---

export const invalidateDrafts = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drafts.all });
};

export const invalidateDraftDetail = (queryClient: QueryClient, id: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drafts.detail(id) });
};

// --- Agent Creator ---

export const invalidateAgentRuns = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agentRuns.all });
};

export const invalidateAgentPersonas = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agentPersonas.all });
};

// --- Image Studio ---

export const invalidateImageStudioProjects = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.imageStudio.projects() });
};

export const invalidateImageStudioSlots = (queryClient: QueryClient, projectId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.imageStudio.slots(projectId) });
};

/**
 * Synchronously patches the slots cache for a specific project.
 */
export const patchImageStudioSlotsCache = (
  queryClient: QueryClient,
  projectId: string,
  updater: (current: StudioSlotsResponse | undefined) => StudioSlotsResponse | undefined
): void => {
  queryClient.setQueryData<StudioSlotsResponse>(QUERY_KEYS.imageStudio.slots(projectId), updater);
};

// --- AI Paths ---

const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? Math.floor(value) : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

const extractJobQueueFilters = (queryKey: QueryKey): Record<string, unknown> => {
  if (!Array.isArray(queryKey)) return {};
  const payload: unknown = queryKey[4];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const filters = (payload as { filters?: unknown }).filters;
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) return {};
  return filters as Record<string, unknown>;
};

const shouldIncludeInQueueCache = (
  run: AiPathRunRecord,
  filters: Record<string, unknown>
): boolean => {
  const typed: OptimisticRunFilters = {
    status: typeof filters['status'] === 'string' ? filters['status'] : undefined,
    pathId: typeof filters['pathId'] === 'string' ? filters['pathId'] : undefined,
    source: typeof filters['source'] === 'string' ? filters['source'] : undefined,
    sourceMode: filters['sourceMode'] === 'exclude' ? 'exclude' : 'include',
    query: typeof filters['query'] === 'string' ? filters['query'] : undefined,
  };
  return aiPathRunMatchesFilters(run, typed);
};

const isQueuePayload = (value: unknown): value is AiPathRunListResult => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record['runs']) && typeof record['total'] === 'number';
};

export const invalidateAiPathTriggerButtons = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.triggerButtons() });
};

export const invalidateAiPathSettings = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.settings() });
};

export const invalidateAiPathRuns = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.runs() });
};

export const invalidateAiPathRunDetail = (queryClient: QueryClient, runId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.run(runId) });
};

export const invalidateAiPathQueue = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.ai.aiPaths.lists(), 'job-queue'],
    }),
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.ai.aiPaths.all, 'queue-status'],
    }),
  ]);
};

export const optimisticallyInsertAiPathRunInQueueCache = (
  queryClient: QueryClient,
  run: unknown
): void => {
  if (!run || typeof run !== 'object') return;
  const runRecord = run as AiPathRunRecord;
  if (typeof runRecord.id !== 'string' || runRecord.id.trim().length === 0) return;
  if (typeof runRecord.status !== 'string' || runRecord.status.trim().length === 0) return;

  rememberOptimisticAiPathRun(runRecord);

  const queueKeyPrefix = [...QUERY_KEYS.ai.aiPaths.lists(), 'job-queue'] as const;
  const entries = queryClient.getQueriesData<AiPathRunListResult>({
    queryKey: queueKeyPrefix,
  });

  entries.forEach(([queryKey, payload]) => {
    if (!isQueuePayload(payload)) return;
    const filters = extractJobQueueFilters(queryKey);
    if (!shouldIncludeInQueueCache(runRecord, filters)) return;

    const existingIndex = payload.runs.findIndex(
      (existing: AiPathRunRecord) => existing.id === runRecord.id
    );
    const page = parsePositiveInt(filters['page']) ?? 1;
    const pageSize = parsePositiveInt(filters['pageSize']) ?? 25;
    const nextTotal = existingIndex >= 0 ? payload.total : payload.total + 1;

    let nextRuns = payload.runs;
    if (existingIndex >= 0) {
      nextRuns = [...payload.runs];
      nextRuns[existingIndex] = runRecord;
    } else if (page <= 1) {
      const expanded = [runRecord, ...payload.runs];
      nextRuns = pageSize > 0 ? expanded.slice(0, pageSize) : expanded;
    }

    queryClient.setQueryData<AiPathRunListResult>(queryKey, {
      ...payload,
      runs: nextRuns,
      total: nextTotal,
    });
  });
};

export const notifyAiPathRunEnqueued = (
  runId?: string | null,
  options?: {
    entityId?: string | null;
    entityType?: string | null;
    run?: AiPathRunRecord | null;
  }
): void => {
  if (typeof window === 'undefined') return;
  const normalizedRunId =
    typeof runId === 'string' && runId.trim().length > 0 ? runId.trim() : null;
  if (!normalizedRunId) return;
  const normalizedEntityId =
    typeof options?.entityId === 'string' && options.entityId.trim().length > 0
      ? options.entityId.trim()
      : null;
  const normalizedEntityType =
    typeof options?.entityType === 'string' && options.entityType.trim().length > 0
      ? options.entityType.trim().toLowerCase()
      : null;
  const basePayload = {
    type: 'run-enqueued',
    runId: normalizedRunId,
    entityId: normalizedEntityId,
    entityType: normalizedEntityType,
    at: Date.now(),
  };
  const payload =
    parseAiPathRunEnqueuedEventPayload(
      options?.run
        ? {
          ...basePayload,
          run: options.run,
        }
        : basePayload
    ) ?? parseAiPathRunEnqueuedEventPayload(basePayload);
  if (!payload) return;

  rememberRecentAiPathRunEnqueue(payload);

  window.dispatchEvent(new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, { detail: payload }));

  const BroadcastChannelCtor = window.BroadcastChannel;
  if (typeof BroadcastChannelCtor !== 'function') return;
  try {
    const channel = new BroadcastChannelCtor(AI_PATH_RUN_QUEUE_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch (error) {
    logClientCatch(error, {
      source: 'query-invalidation',
      action: 'broadcastRecentAiPathRunEnqueue',
      channel: AI_PATH_RUN_QUEUE_CHANNEL,
      level: 'warn',
    });

    // best-effort notification channel
  }
};
