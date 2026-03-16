import { z } from 'zod';

import { agentTeachingChatSourceSchema } from './agent-teaching';
import {
  kangurAiTutorConversationContextSchema,
  kangurAiTutorWebsiteHelpTargetSchema,
} from './kangur-ai-tutor';
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
  pageContentAnswerCount: z.number(),
  nativeGuideAnswerCount: z.number(),
  brainAnswerCount: z.number(),
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
  directAnswerRatePercent: z.number().nullable().optional(),
  brainFallbackRatePercent: z.number().nullable().optional(),
  bridgeCompletionRatePercent: z.number().nullable().optional(),
  knowledgeGraphCoverageRatePercent: z.number().nullable().optional(),
  knowledgeGraphVectorAssistRatePercent: z.number().nullable().optional(),
});
export type KangurAiTutorAnalyticsSnapshot = z.infer<
  typeof kangurAiTutorAnalyticsSnapshotSchema
>;

const kangurDuelLobbyCountsSchema = z.object({
  viewed: z.number(),
  refreshClicked: z.number(),
  filterChanged: z.number(),
  sortChanged: z.number(),
  joinClicked: z.number(),
  createClicked: z.number(),
  loginClicked: z.number(),
});

export const kangurDuelLobbyAnalyticsSnapshotSchema = z.object({
  totals: kangurDuelLobbyCountsSchema,
  byUser: z.object({
    guest: kangurDuelLobbyCountsSchema,
    authenticated: kangurDuelLobbyCountsSchema,
  }),
  byFilterMode: z.object({
    all: z.number(),
    challenge: z.number(),
    quick_match: z.number(),
  }),
  bySort: z.object({
    recent: z.number(),
    time_fast: z.number(),
    time_slow: z.number(),
    questions_low: z.number(),
    questions_high: z.number(),
  }),
  loginBySource: z.record(z.string(), z.number()),
});
export type KangurDuelLobbyAnalyticsSnapshot = z.infer<
  typeof kangurDuelLobbyAnalyticsSnapshotSchema
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

export const kangurKnowledgeGraphSyncRequestSchema = z.object({
  locale: z.string().trim().max(16).optional().default('pl'),
  withEmbeddings: z.boolean().optional().default(false),
});
export type KangurKnowledgeGraphSyncRequest = z.infer<typeof kangurKnowledgeGraphSyncRequestSchema>;

export const kangurKnowledgeGraphSyncResponseSchema = z.object({
  sync: z.object({
    graphKey: z.string(),
    locale: z.string(),
    nodeCount: z.number(),
    edgeCount: z.number(),
    withEmbeddings: z.boolean(),
  }),
  status: kangurKnowledgeGraphStatusSnapshotSchema,
});
export type KangurKnowledgeGraphSyncResponse = z.infer<
  typeof kangurKnowledgeGraphSyncResponseSchema
>;

export const kangurKnowledgeGraphPreviewRequestSchema = z.object({
  latestUserMessage: z.string().trim().min(1).max(1_000),
  learnerId: z.string().trim().max(120).optional(),
  locale: z.string().trim().max(16).optional().default('pl'),
  context: kangurAiTutorConversationContextSchema.optional(),
});
export type KangurKnowledgeGraphPreviewRequest = z.infer<
  typeof kangurKnowledgeGraphPreviewRequestSchema
>;

const kangurKnowledgeGraphPreviewHydrationSourceSchema = z.enum([
  'kangur_page_content',
  'kangur_ai_tutor_content',
  'kangur_ai_tutor_native_guides',
  'kangur-runtime-context',
  'graph_fallback',
]);

const kangurKnowledgeGraphPreviewRecallStrategySchema = z.enum([
  'metadata_only',
  'vector_only',
  'hybrid_vector',
]);

const kangurKnowledgeGraphPreviewQueryModeSchema = z.enum(['website_help', 'semantic']);

const kangurKnowledgeGraphPreviewHitSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  surface: z.string().nullable(),
  focusKind: z.string().nullable(),
  route: z.string().nullable(),
  anchorId: z.string().nullable(),
  sourceCollection: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  sourcePath: z.string().nullable(),
  semanticScore: z.number(),
  tokenHits: z.number(),
  relatedTargetIds: z.array(z.string()),
  canonicalTitle: z.string(),
  canonicalSummary: z.string().nullable(),
  canonicalSourceCollection: z.string(),
  hydrationSource: kangurKnowledgeGraphPreviewHydrationSourceSchema,
});

const kangurKnowledgeGraphPreviewFollowUpActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  page: z.string(),
  reason: z.string().nullable(),
});

const kangurKnowledgeGraphPreviewRetrievalMissSchema = z.object({
  status: z.enum(['disabled', 'skipped', 'miss']),
  queryMode: z.null(),
  querySeed: z.string(),
  normalizedQuerySeed: z.string(),
  tokens: z.array(z.string()),
  instructions: z.null(),
  sources: z.array(agentTeachingChatSourceSchema).max(0),
  nodeIds: z.array(z.string()).max(0),
  hits: z.array(kangurKnowledgeGraphPreviewHitSchema).max(0),
});

const kangurKnowledgeGraphPreviewRetrievalHitSchema = z.object({
  status: z.literal('hit'),
  queryMode: kangurKnowledgeGraphPreviewQueryModeSchema,
  recallStrategy: kangurKnowledgeGraphPreviewRecallStrategySchema,
  lexicalHitCount: z.number(),
  vectorHitCount: z.number(),
  vectorRecallAttempted: z.boolean(),
  querySeed: z.string(),
  normalizedQuerySeed: z.string(),
  tokens: z.array(z.string()),
  instructions: z.string(),
  sources: z.array(agentTeachingChatSourceSchema),
  nodeIds: z.array(z.string()),
  websiteHelpTarget: kangurAiTutorWebsiteHelpTargetSchema.nullable(),
  graphFollowUpActions: z.array(kangurKnowledgeGraphPreviewFollowUpActionSchema),
  hits: z.array(kangurKnowledgeGraphPreviewHitSchema),
  sourceCollections: z.array(z.string()),
  hydrationSources: z.array(kangurKnowledgeGraphPreviewHydrationSourceSchema),
});

export const kangurKnowledgeGraphPreviewRetrievalSchema = z.discriminatedUnion('status', [
  kangurKnowledgeGraphPreviewRetrievalMissSchema,
  kangurKnowledgeGraphPreviewRetrievalHitSchema,
]);
export type KangurKnowledgeGraphPreviewRetrieval = z.infer<
  typeof kangurKnowledgeGraphPreviewRetrievalSchema
>;

export const kangurKnowledgeGraphPreviewSummarySchema = z.object({
  requestedRefCount: z.number(),
  runtimeDocumentCount: z.number(),
  retrievalStatus: z.enum(['disabled', 'skipped', 'miss', 'hit']),
  queryMode: kangurKnowledgeGraphPreviewQueryModeSchema.nullable(),
  recallStrategy: kangurKnowledgeGraphPreviewRecallStrategySchema.nullable(),
  nodeCount: z.number(),
  sourceCount: z.number(),
  lexicalHitCount: z.number(),
  vectorHitCount: z.number(),
  vectorRecallAttempted: z.boolean(),
  tokenCount: z.number(),
  normalizedQuerySeed: z.string(),
  websiteHelpTargetNodeId: z.string().nullable(),
});
export type KangurKnowledgeGraphPreviewSummary = z.infer<
  typeof kangurKnowledgeGraphPreviewSummarySchema
>;

export const kangurKnowledgeGraphPreviewResponseSchema = z.object({
  learnerId: z.string(),
  locale: z.string(),
  runtimeResolution: z.enum(['live', 'skipped']),
  requestedRefIds: z.array(z.string()),
  runtimeDocumentIds: z.array(z.string()),
  summary: kangurKnowledgeGraphPreviewSummarySchema,
  retrieval: kangurKnowledgeGraphPreviewRetrievalSchema,
});
export type KangurKnowledgeGraphPreviewResponse = z.infer<
  typeof kangurKnowledgeGraphPreviewResponseSchema
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
  duelsLobby: kangurDuelLobbyAnalyticsSnapshotSchema,
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
