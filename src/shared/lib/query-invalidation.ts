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

// --- Notes ---

export const invalidateNotebooks = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks });
};

export const invalidateNoteDetail = (queryClient: QueryClient, noteId: string) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(noteId) });
};

// --- Integrations ---

export const invalidateIntegrationConnections = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.connections() });
};

// --- AI Paths ---

export const invalidateAiPathRuns = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.runs() });
};

export const invalidateAiPathQueue = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.jobQueue({}) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.queueStatus() }),
  ]);
};
