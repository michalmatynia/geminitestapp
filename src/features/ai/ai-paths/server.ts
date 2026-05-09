/**
 * AI Paths Feature - Server Entry Point
 * 
 * This module serves as the primary entry point for the AI Paths feature within 
 * the server-side (Node.js runtime) environment. It exports key services,
 * management utilities, and access control helpers.
 * 
 * Boundary Warning: This module must only be imported into server-side code.
 */

export type { AiPathsAccessContext } from './server/access';

/**
 * Access control and authorization utilities for AI Paths.
 */
export {
  assertAiPathRunAccess,
  canAccessGlobalAiPathRuns,
  enforceAiPathsActionRateLimit,
  enforceAiPathsRunRateLimit,
  ensureAiPathsPermission,
  isAiPathsInternalRequest,
  requireAiPathsAccess,
  requireAiPathsAccessOrInternal,
  requireAiPathsRunAccess,
} from './server/access';

/**
 * Security and collection validation utilities.
 */
export { isCollectionAllowed } from './server/collection-allowlist';

/**
 * Persistence layer and settings management services.
 */
export {
  applyAiPathsSettingsMaintenance,
  deleteAiPathsSettings,
  getAiPathsSetting,
  getAiPathsSettings,
  ensureCanonicalStarterWorkflowSettingsForPathIds,
  inspectAiPathsSettingsMaintenance,
  listAiPathsSettings,
  upsertAiPathsSetting,
  upsertAiPathsSettingsBulk,
} from './server/settings-store';

/**
 * Constants for AI Paths maintenance actions.
 */
export { AI_PATHS_MAINTENANCE_ACTION_IDS } from './server/settings-store.constants';

/**
 * Service for enqueueing path runs.
 */
export { enqueuePathRun } from './services/path-run-enqueue-service';

/**
 * Services for managing path run lifecycle (cancellation, deletion).
 */
export {
  cancelPathRun,
  cancelPathRunWithRepository,
  deletePathRunWithRepository,
  deletePathRunsWithRepository,
} from './services/path-run-management-service';

/**
 * Analytics services for monitoring AI Path run performance.
 */
export {
  getRuntimeAnalyticsSummary,
  resolveRuntimeAnalyticsRangeWindow,
} from './services/runtime-analytics-service';
