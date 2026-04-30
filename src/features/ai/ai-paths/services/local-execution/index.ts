/**
 * Pure (non-React) orchestration layer used by the local-execution hooks.
 *
 * The hooks themselves still live under
 * `components/ai-paths-settings/runtime/segments/` because they are tightly
 * coupled to React state and `LocalExecutionArgs` from the surrounding
 * runtime context. The pure helpers below — security evaluation, context
 * extraction, payload validation — are framework-free and re-exported from
 * this services-layer entry point so non-UI callers can consume them
 * without crossing the components/ boundary.
 *
 * Existing components/ files keep their local imports working; new code
 * (services, workers, server actions) should import from here.
 */

export {
  evaluateLocalExecutionSecurity,
  type LocalExecutionSecurityIssue,
} from '@/features/ai/ai-paths/components/ai-paths-settings/runtime/local-execution-security';

export {
  buildSimulationOutputsFromContext,
  extractDatabaseRuntimeMetadata,
  hasEntityReference,
  normalizeEntityType,
  readEntityIdFromContext,
  readEntityTypeFromContext,
  resolveFetcherSourceMode,
} from '@/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers';

export * from '@/features/ai/ai-paths/components/ai-paths-settings/runtime/payload-validation';
