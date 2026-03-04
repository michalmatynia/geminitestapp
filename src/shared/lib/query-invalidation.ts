import { QueryClient, type QueryKey } from '@tanstack/react-query';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { StudioSlotsResponse } from '@/shared/contracts/image-studio';
import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';

import { QUERY_KEYS } from './query-keys';

/**
 * Standardized invalidation helpers for TanStack Query.
 * Use these instead of manually constructing query keys for invalidation.
 */

// --- Product Metadata ---

export const invalidateProductMetadata = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.all });
};

export const invalidateProducts = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all });
};

export const invalidateProductsAndCounts = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.counts() }),
  ]);
};

export const invalidateProductsAndDetail = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) }),
  ]);
};

export const invalidateProductsCountsAndDetail = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.counts() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) }),
  ]);
};

export const refetchProductsAndCounts = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: QUERY_KEYS.products.lists() }),
    queryClient.refetchQueries({ queryKey: QUERY_KEYS.products.counts() }),
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
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.tags(catalogId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.parameters(catalogId) }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.metadata.simpleParameters(catalogId),
    }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.settings.categories(catalogId) }),
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
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agentPersonas.lists() });
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

type AiPathQueueCachePayload = {
  runs: AiPathRunRecord[];
  total: number;
};

const AI_PATHS_NODE_SOURCES = new Set<string>(AI_PATHS_RUN_SOURCE_VALUES);

const AI_PATH_RUN_QUEUE_CHANNEL = 'ai-path-queue';

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const readMetaRecord = (meta: AiPathRunRecord['meta']): Record<string, unknown> | null => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  return meta;
};

const resolveRunSource = (run: AiPathRunRecord): string | null => {
  const meta = readMetaRecord(run.meta as Record<string, unknown>);
  if (!meta) return null;
  return normalizeString(meta['source']);
};

const isAiPathsNodeSource = (source: string | null): boolean => {
  if (!source) return false;
  return AI_PATHS_NODE_SOURCES.has(source);
};

const matchesSourceFilter = (
  run: AiPathRunRecord,
  sourceFilter: string | null,
  sourceMode: 'include' | 'exclude'
): boolean => {
  if (!sourceFilter) return true;
  const runSource = resolveRunSource(run);

  if (sourceMode === 'exclude') {
    if (sourceFilter === 'ai_paths_ui') {
      return !isAiPathsNodeSource(runSource);
    }
    return runSource !== sourceFilter;
  }

  if (sourceFilter === 'ai_paths_ui') {
    return isAiPathsNodeSource(runSource);
  }
  return runSource === sourceFilter;
};

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

const matchesQueryFilter = (run: AiPathRunRecord, query: string | null): boolean => {
  if (!query) return true;
  const haystack = [run.id, run.pathId, run.pathName, run.entityId, run.errorMessage]
    .map((item: unknown) => (typeof item === 'string' ? item.toLowerCase() : ''))
    .join(' ');
  return haystack.includes(query);
};

const shouldIncludeInQueueCache = (
  run: AiPathRunRecord,
  filters: Record<string, unknown>
): boolean => {
  const statusFilter = normalizeString(filters['status']);
  if (statusFilter && statusFilter !== 'all') {
    const runStatus = normalizeString(run.status);
    if (runStatus !== statusFilter) return false;
  }

  const pathFilter = normalizeString(filters['pathId']);
  if (pathFilter) {
    const runPathId = normalizeString(run.pathId);
    if (runPathId !== pathFilter) return false;
  }

  const sourceFilter = normalizeString(filters['source']);
  const sourceModeRaw = normalizeString(filters['sourceMode']);
  const sourceMode = sourceModeRaw === 'exclude' ? 'exclude' : 'include';
  if (!matchesSourceFilter(run, sourceFilter, sourceMode)) {
    return false;
  }

  const queryFilter = normalizeString(filters['query']);
  return matchesQueryFilter(run, queryFilter);
};

const isQueuePayload = (value: unknown): value is AiPathQueueCachePayload => {
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

  const queueKeyPrefix = [...QUERY_KEYS.ai.aiPaths.lists(), 'job-queue'] as const;
  const entries = queryClient.getQueriesData<AiPathQueueCachePayload>({
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

    queryClient.setQueryData<AiPathQueueCachePayload>(queryKey, {
      ...payload,
      runs: nextRuns,
      total: nextTotal,
    });
  });
};

export const notifyAiPathRunEnqueued = (runId?: string | null): void => {
  if (typeof window === 'undefined') return;
  const normalizedRunId =
    typeof runId === 'string' && runId.trim().length > 0 ? runId.trim() : null;
  const payload = {
    type: 'run-enqueued',
    runId: normalizedRunId,
    at: Date.now(),
  };

  window.dispatchEvent(new CustomEvent('ai-path-run-enqueued', { detail: payload }));

  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(AI_PATH_RUN_QUEUE_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // best-effort notification channel
  }
};
