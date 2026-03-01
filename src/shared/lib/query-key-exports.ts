/**
 * Consolidated Query Key Exports
 *
 * This module provides a single source of truth for commonly used query key subsets
 * across the application. Instead of duplicating key declarations in individual
 * hook files, we export them here for consistency and easier maintenance.
 *
 * Usage:
 *   import { dbKeys, cmsKeys, productSettingsKeys } from '@/shared/lib/query-key-exports';
 */

import { QUERY_KEYS } from '@/shared/lib/query-keys';

/**
 * Database query keys (from system.databases)
 * Used in: useDatabaseQueries.ts
 */
export const dbKeys = QUERY_KEYS.system.databases;

/**
 * CMS query keys (from cms)
 * Used in: useCmsQueries.ts
 */
export const cmsKeys = QUERY_KEYS.cms;

/**
 * Product settings query keys (from products.settings)
 * Used in: useProductSettingsQueries.ts
 */
export const productSettingsKeys = QUERY_KEYS.products.settings;

/**
 * Product metadata query keys (from products.metadata)
 * Used in: useProductMetadataQueries.ts
 */
export const productMetadataKeys = QUERY_KEYS.products.metadata;

/**
 * Products main query keys (from products)
 * Used in: useProductQueries.ts
 */
export const productKeys = QUERY_KEYS.products;

/**
 * Integrations query keys (from integrations)
 * Used in: useIntegrationQueries.ts
 */
export const integrationKeys = QUERY_KEYS.integrations;

/**
 * Notes query keys (from notes)
 * Used in: useNoteQueries.ts
 */
export const noteKeys = QUERY_KEYS.notes;

/**
 * Files query keys (from files)
 * Used in: useFileQueries.ts
 */
export const fileKeys = QUERY_KEYS.files;

/**
 * Auth query keys (from auth)
 * Used in: useAuthQueries.ts
 */
export const authKeys = QUERY_KEYS.auth;

/**
 * Settings query keys (from settings)
 * Used in: useSettingsQueries.ts
 */
export const settingsKeys = QUERY_KEYS.settings;

/**
 * Draft query keys (from drafts)
 * Used in: useDraftQueries.ts
 */
export const draftKeys = QUERY_KEYS.drafts;

/**
 * Viewer 3D query keys (from viewer3d)
 * Used in: useViewer3DQueries.ts
 */
export const viewer3dKeys = QUERY_KEYS.viewer3d;

/**
 * Jobs query keys (from jobs)
 * Used in: useJobQueries.ts
 */
export const jobKeys = QUERY_KEYS.jobs;

/**
 * Analytics query keys (from analytics)
 * Used in: useAnalyticsQueries.ts
 */
export const analyticsKeys = QUERY_KEYS.analytics;

/**
 * Marketplace query keys (from integrations.marketplace)
 * Used in: integration query hooks
 */
export const marketplaceKeys = QUERY_KEYS.integrations.marketplace;

/**
 * Import/Export query keys (from integrations.importExport)
 * Used in: integration query hooks
 */
export const importExportKeys = QUERY_KEYS.integrations.importExport;

/**
 * System logs query keys (from system.logs)
 * Used in: observability hooks
 */
export const logsKeys = QUERY_KEYS.system.logs;

/**
 * System activity query keys (from system.activity)
 * Used in: observability hooks
 */
export const activityKeys = QUERY_KEYS.system.activity;

/**
 * System diagnostics query keys (from system.diagnostics)
 * Used in: observability hooks
 */
export const diagnosticsKeys = QUERY_KEYS.system.diagnostics;

/**
 * Playwright query keys (from playwright)
 * Used in: playwright hooks
 */
export const playwrightKeys = QUERY_KEYS.playwright;

/**
 * AI query keys (from ai)
 * This includes chatbot, aiPaths, agentTeaching, etc.
 */
export const aiKeys = QUERY_KEYS.ai;

/**
 * AI Paths query keys (from ai.aiPaths)
 * Used in: AI paths query hooks
 */
export const aiPathKeys = QUERY_KEYS.ai.aiPaths;

/**
 * Chatbot query keys (from ai.chatbot)
 */
export const chatbotKeys = QUERY_KEYS.ai.chatbot;

/**
 * Agent teaching query keys (from ai.agentTeaching)
 */
export const agentTeachingKeys = QUERY_KEYS.ai.agentTeaching;

/**
 * Agent runs query keys (from agentRuns)
 * Used in: useAgentRunsQueries.ts
 */
export const agentRunsKeys = QUERY_KEYS.agentRuns;

/**
 * Brain query keys (from brain)
 * Used in: useBrainQueries.ts (models, operations overview, metrics)
 */
export const brainKeys = QUERY_KEYS.brain;

/**
 * Internationalization query keys (from internationalization)
 * Used in: useInternationalizationQueries.ts
 */
export const i18nKeys = QUERY_KEYS.internationalization;

/**
 * Image Studio query keys (from imageStudio)
 * Used in: useImageStudioQueries.ts
 */
export const studioKeys = QUERY_KEYS.imageStudio;
