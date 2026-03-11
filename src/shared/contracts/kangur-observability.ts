import { z } from 'zod';

import { systemLogMetricsSchema, systemLogRecordSchema } from './observability';

export const kangurObservabilityRangeSchema = z.enum(['24h', '7d', '30d']);
export type KangurObservabilityRange = z.infer<typeof kangurObservabilityRangeSchema>;

export const kangurObservabilityStatusSchema = z.enum([
  'ok',
  'warning',
  'critical',
  'insufficient_data',
]);
export type KangurObservabilityStatus = z.infer<typeof kangurObservabilityStatusSchema>;

export const kangurObservabilityOverallStatusSchema = z.enum(['ok', 'warning', 'critical']);
export type KangurObservabilityOverallStatus = z.infer<
  typeof kangurObservabilityOverallStatusSchema
>;

export const kangurAnalyticsEventTypeSchema = z.enum(['pageview', 'event']);
export type KangurAnalyticsEventType = z.infer<typeof kangurAnalyticsEventTypeSchema>;

export const kangurRecentAnalyticsEventSchema = z.object({
  id: z.string(),
  ts: z.string(),
  type: kangurAnalyticsEventTypeSchema,
  name: z.string().nullable(),
  path: z.string(),
  visitorId: z.string(),
  sessionId: z.string(),
  meta: z.record(z.string(), z.unknown()).nullable(),
});
export type KangurRecentAnalyticsEvent = z.infer<typeof kangurRecentAnalyticsEventSchema>;

export const kangurAnalyticsCountSchema = z.object({
  name: z.string(),
  count: z.number(),
});
export type KangurAnalyticsCount = z.infer<typeof kangurAnalyticsCountSchema>;

export const kangurAiTutorAnalyticsSnapshotSchema = z.object({
  messageSucceededCount: z.number(),
  knowledgeGraphAppliedCount: z.number(),
  knowledgeGraphSemanticCount: z.number(),
  knowledgeGraphWebsiteHelpCount: z.number(),
  knowledgeGraphMetadataOnlyRecallCount: z.number(),
  knowledgeGraphHybridRecallCount: z.number(),
  knowledgeGraphVectorOnlyRecallCount: z.number(),
  knowledgeGraphVectorRecallAttemptedCount: z.number(),
  bridgeSuggestionCount: z.number(),
  lessonToGameBridgeSuggestionCount: z.number(),
  gameToLessonBridgeSuggestionCount: z.number(),
  bridgeQuickActionClickCount: z.number(),
  bridgeFollowUpClickCount: z.number(),
  bridgeFollowUpCompletionCount: z.number(),
  bridgeCompletionRatePercent: z.number().nullable().optional(),
  knowledgeGraphCoverageRatePercent: z.number().nullable().optional(),
  knowledgeGraphVectorAssistRatePercent: z.number().nullable().optional(),
});
export type KangurAiTutorAnalyticsSnapshot = z.infer<
  typeof kangurAiTutorAnalyticsSnapshotSchema
>;

export const kangurKnowledgeGraphSemanticReadinessSchema = z.enum([
  'no_graph',
  'no_semantic_text',
  'metadata_only',
  'embeddings_without_index',
  'vector_index_pending',
  'vector_ready',
]);
export type KangurKnowledgeGraphSemanticReadiness = z.infer<
  typeof kangurKnowledgeGraphSemanticReadinessSchema
>;

const kangurKnowledgeGraphStatusModeSchema = z.object({
  mode: z.literal('status'),
  graphKey: z.string(),
  present: z.boolean(),
  locale: z.string().nullable(),
  syncedAt: z.string().nullable(),
  syncedNodeCount: z.number().nullable(),
  syncedEdgeCount: z.number().nullable(),
  liveNodeCount: z.number(),
  liveEdgeCount: z.number(),
  canonicalNodeCount: z.number().nullable(),
  validCanonicalNodeCount: z.number().nullable(),
  invalidCanonicalNodeCount: z.number().nullable(),
  semanticNodeCount: z.number(),
  embeddingNodeCount: z.number(),
  embeddingDimensions: z.number().nullable(),
  embeddingModels: z.array(z.string()),
  vectorIndexPresent: z.boolean(),
  vectorIndexState: z.string().nullable(),
  vectorIndexType: z.string().nullable(),
  vectorIndexDimensions: z.number().nullable(),
  semanticCoverageRatePercent: z.number().nullable(),
  embeddingCoverageRatePercent: z.number().nullable(),
  semanticReadiness: kangurKnowledgeGraphSemanticReadinessSchema,
});

const kangurKnowledgeGraphStatusDisabledSchema = z.object({
  mode: z.literal('disabled'),
  graphKey: z.string(),
  message: z.string(),
});

const kangurKnowledgeGraphStatusErrorSchema = z.object({
  mode: z.literal('error'),
  graphKey: z.string(),
  message: z.string(),
});

export const kangurKnowledgeGraphStatusSnapshotSchema = z.discriminatedUnion('mode', [
  kangurKnowledgeGraphStatusModeSchema,
  kangurKnowledgeGraphStatusDisabledSchema,
  kangurKnowledgeGraphStatusErrorSchema,
]);
export type KangurKnowledgeGraphStatusSnapshot = z.infer<
  typeof kangurKnowledgeGraphStatusSnapshotSchema
>;

export const kangurKnowledgeGraphStatusResponseSchema = z.object({
  status: kangurKnowledgeGraphStatusSnapshotSchema,
});
export type KangurKnowledgeGraphStatusResponse = z.infer<
  typeof kangurKnowledgeGraphStatusResponseSchema
>;

export const kangurPerformanceBaselineSchema = z.object({
  generatedAt: z.string().nullable(),
  unitStatus: z.string().nullable(),
  unitDurationMs: z.number().nullable(),
  e2eStatus: z.string().nullable(),
  e2eDurationMs: z.number().nullable(),
  infraFailures: z.number().nullable(),
  failedRuns: z.number().nullable(),
  bundleRiskTotalBytes: z.number().nullable(),
  bundleRiskTotalLines: z.number().nullable(),
});
export type KangurPerformanceBaseline = z.infer<typeof kangurPerformanceBaselineSchema>;

export const kangurObservabilityInvestigationSchema = z.object({
  label: z.string(),
  href: z.string(),
});
export type KangurObservabilityInvestigation = z.infer<
  typeof kangurObservabilityInvestigationSchema
>;

export const kangurObservabilityAlertSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: kangurObservabilityStatusSchema,
  value: z.number().nullable(),
  unit: z.string(),
  warningThreshold: z.number().nullable(),
  criticalThreshold: z.number().nullable(),
  summary: z.string(),
  investigation: kangurObservabilityInvestigationSchema.nullable(),
});
export type KangurObservabilityAlert = z.infer<typeof kangurObservabilityAlertSchema>;

export const kangurAnalyticsSnapshotSchema = z.object({
  totals: z.object({
    events: z.number(),
    pageviews: z.number(),
  }),
  visitors: z.number(),
  sessions: z.number(),
  topPaths: z.array(
    z.object({
      path: z.string(),
      count: z.number(),
    })
  ),
  topEventNames: z.array(kangurAnalyticsCountSchema),
  importantEvents: z.array(kangurAnalyticsCountSchema),
  aiTutor: kangurAiTutorAnalyticsSnapshotSchema,
  recent: z.array(kangurRecentAnalyticsEventSchema),
});
export type KangurAnalyticsSnapshot = z.infer<typeof kangurAnalyticsSnapshotSchema>;

export const kangurRouteLatencyStatsSchema = z.object({
  sampleSize: z.number(),
  avgDurationMs: z.number().nullable(),
  p95DurationMs: z.number().nullable(),
  maxDurationMs: z.number().nullable(),
  slowRequestCount: z.number(),
  slowRequestRatePercent: z.number().nullable(),
  slowThresholdMs: z.number(),
});
export type KangurRouteLatencyStats = z.infer<typeof kangurRouteLatencyStatsSchema>;

export const kangurRouteHealthSchema = z.object({
  metrics: systemLogMetricsSchema.nullable(),
  latency: kangurRouteLatencyStatsSchema.nullable(),
  investigation: kangurObservabilityInvestigationSchema,
});
export type KangurRouteHealth = z.infer<typeof kangurRouteHealthSchema>;

export const kangurRouteMetricsSchema = z.object({
  authMeGet: kangurRouteHealthSchema,
  learnerSignInPost: kangurRouteHealthSchema,
  progressPatch: kangurRouteHealthSchema,
  scoresPost: kangurRouteHealthSchema,
  assignmentsPost: kangurRouteHealthSchema,
  learnersPost: kangurRouteHealthSchema,
  ttsPost: kangurRouteHealthSchema,
});
export type KangurRouteMetrics = z.infer<typeof kangurRouteMetricsSchema>;

export const kangurObservabilitySummarySchema = z.object({
  generatedAt: z.string(),
  range: kangurObservabilityRangeSchema,
  overallStatus: kangurObservabilityOverallStatusSchema,
  window: z.object({
    from: z.string(),
    to: z.string(),
  }),
  keyMetrics: z.object({
    serverErrorRatePercent: z.number().nullable(),
    learnerSignInAttempts: z.number(),
    learnerSignInFailureRatePercent: z.number().nullable(),
    progressSyncFailures: z.number(),
    ttsRequests: z.number(),
    ttsGenerationFailures: z.number(),
    ttsFallbackRatePercent: z.number().nullable(),
  }),
  alerts: z.array(kangurObservabilityAlertSchema),
  serverLogs: z.object({
    metrics: systemLogMetricsSchema.nullable(),
    recent: z.array(systemLogRecordSchema),
  }),
  routes: kangurRouteMetricsSchema,
  analytics: kangurAnalyticsSnapshotSchema,
  knowledgeGraphStatus: kangurKnowledgeGraphStatusSnapshotSchema,
  performanceBaseline: kangurPerformanceBaselineSchema.nullable(),
  errors: z.record(z.string(), z.string()).nullable(),
});
export type KangurObservabilitySummary = z.infer<typeof kangurObservabilitySummarySchema>;

export const kangurObservabilitySummaryResponseSchema = z.object({
  summary: kangurObservabilitySummarySchema,
});
export type KangurObservabilitySummaryResponse = z.infer<
  typeof kangurObservabilitySummaryResponseSchema
>;
