import { QueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from './query-keys';

/**
 * Standardized invalidation helpers for TanStack Query.
 * Use these instead of manually constructing query keys for invalidation.
 */

// --- Product Metadata ---

export const invalidateProductMetadata = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all });
};

export const invalidateProducts = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all });
};

export const invalidateProductsAndCounts = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.counts() }),
  ]);
};

export const invalidateProductsAndDetail = (queryClient: QueryClient, productId: string) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) }),
  ]);
};

export const invalidateProductsCountsAndDetail = (queryClient: QueryClient, productId: string) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.counts() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) }),
  ]);
};

export const refetchProductsAndCounts = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.refetchQueries({ queryKey: QUERY_KEYS.products.lists() }),
    queryClient.refetchQueries({ queryKey: QUERY_KEYS.products.counts() }),
  ]);
};

export const invalidateCatalogs = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.catalogs });
};

export const invalidateCatalogScopedData = (queryClient: QueryClient, catalogId: string) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.categories(catalogId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.tags(catalogId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.metadata.parameters(catalogId) }),
  ]);
};

// --- CMS ---

export const invalidateCmsPages = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.pages.all });
};

export const invalidateCmsSlugs = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.slugs.all });
};

export const invalidateCmsDomains = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.domains.all });
};

export const invalidateCmsThemes = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cms.themes.all });
};

// --- Notes ---

export const invalidateNotes = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
};

export const invalidateNotebooks = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks });
};

export const invalidateNoteDetail = (queryClient: QueryClient, noteId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(noteId) });
};

// --- Integrations ---

export const invalidateIntegrations = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.all });
};

export const invalidateIntegrationConnections = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.connections() });
};

// --- Marketplace ---

export const invalidateMarketplaceCategories = (queryClient: QueryClient, connectionId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.marketplace.categories(connectionId) });
};

export const invalidateMarketplaceMappings = (queryClient: QueryClient, connectionId: string, catalogId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.marketplace.mappings(connectionId, catalogId) });
};

export const invalidateMarketplaceProducers = (queryClient: QueryClient, connectionId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.marketplace.producers(connectionId) });
};

export const invalidateMarketplaceProducerMappings = (queryClient: QueryClient, connectionId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.marketplace.producerMappings(connectionId) });
};

export const invalidateMarketplaceTags = (queryClient: QueryClient, connectionId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.marketplace.tags(connectionId) });
};

export const invalidateMarketplaceTagMappings = (queryClient: QueryClient, connectionId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.marketplace.tagMappings(connectionId) });
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

export const invalidateUserPreferences = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.preferences.all });
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

// --- AI Paths ---

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

export const invalidateAiPathQueue = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.jobQueue({}) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.queueStatus() }),
  ]);
};
