import { z } from 'zod';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const aiPathRuntimeAnalyticsRangeSchema = z.enum(['1h', '24h', '7d', '30d']);
export type AiPathRuntimeAnalyticsRange = z.infer<typeof aiPathRuntimeAnalyticsRangeSchema>;

export const aiPathRuntimeAnalyticsRangeQuerySchema = z.object({
  range: optionalTrimmedQueryString(),
});
export type AiPathRuntimeAnalyticsRangeQuery = z.infer<
  typeof aiPathRuntimeAnalyticsRangeQuerySchema
>;

export const aiPathRuntimeAnalyticsSlowestSpanSchema = z.object({
  runId: z.string(),
  spanId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: z.string(),
  durationMs: z.number(),
});
export type AiPathRuntimeAnalyticsSlowestSpan = z.infer<
  typeof aiPathRuntimeAnalyticsSlowestSpanSchema
>;

export const aiPathRuntimeTraceSlowNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  spanCount: z.number(),
  avgDurationMs: z.number(),
  maxDurationMs: z.number(),
  totalDurationMs: z.number(),
});
export type AiPathRuntimeTraceSlowNode = z.infer<typeof aiPathRuntimeTraceSlowNodeSchema>;

export const aiPathRuntimeTraceFailedNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  failedCount: z.number(),
  spanCount: z.number(),
});
export type AiPathRuntimeTraceFailedNode = z.infer<typeof aiPathRuntimeTraceFailedNodeSchema>;

export const aiPathRuntimeKernelStrategyCountsSchema = z.object({
  code_object_v3: z.number(),
  unknown: z.number(),
});
export type AiPathRuntimeKernelStrategyCounts = z.infer<
  typeof aiPathRuntimeKernelStrategyCountsSchema
>;

export const aiPathRuntimeKernelResolutionSourceCountsSchema = z.object({
  override: z.number(),
  registry: z.number(),
  missing: z.number(),
  unknown: z.number(),
});
export type AiPathRuntimeKernelResolutionSourceCounts = z.infer<
  typeof aiPathRuntimeKernelResolutionSourceCountsSchema
>;

export const aiPathRuntimeKernelParityAnalyticsSchema = z.object({
  sampledRuns: z.number(),
  runsWithKernelParity: z.number(),
  sampledHistoryEntries: z.number(),
  strategyCounts: aiPathRuntimeKernelStrategyCountsSchema,
  resolutionSourceCounts: aiPathRuntimeKernelResolutionSourceCountsSchema,
  codeObjectIds: z.array(z.string()),
});
export type AiPathRuntimeKernelParityAnalytics = z.infer<
  typeof aiPathRuntimeKernelParityAnalyticsSchema
>;

export const aiPathRuntimeTraceAnalyticsSchema = z.object({
  source: z.enum(['none', 'db_sample']),
  sampledRuns: z.number(),
  sampledSpans: z.number(),
  completedSpans: z.number(),
  failedSpans: z.number(),
  cachedSpans: z.number(),
  avgDurationMs: z.number().nullable(),
  p95DurationMs: z.number().nullable(),
  slowestSpan: aiPathRuntimeAnalyticsSlowestSpanSchema.nullable(),
  topSlowNodes: z.array(aiPathRuntimeTraceSlowNodeSchema),
  topFailedNodes: z.array(aiPathRuntimeTraceFailedNodeSchema),
  kernelParity: aiPathRuntimeKernelParityAnalyticsSchema,
  truncated: z.boolean(),
});
export type AiPathRuntimeTraceAnalytics = z.infer<typeof aiPathRuntimeTraceAnalyticsSchema>;

export const aiPathRuntimePortableEngineCountsSchema = z.object({
  attempts: z.number(),
  successes: z.number(),
  failures: z.number(),
});
export type AiPathRuntimePortableEngineCounts = z.infer<
  typeof aiPathRuntimePortableEngineCountsSchema
>;

export const aiPathRuntimePortableEngineFailureSchema = z.object({
  at: z.string(),
  runner: z.enum(['client', 'server']),
  surface: z.enum(['canvas', 'product', 'api']),
  source: z
    .enum(['portable_package', 'portable_envelope', 'semantic_canvas', 'path_config'])
    .nullable(),
  stage: z.enum(['resolve', 'validation', 'runtime']),
  error: z.string(),
  durationMs: z.number(),
  validateBeforeRun: z.boolean(),
  validationMode: z.string().nullable(),
});
export type AiPathRuntimePortableEngineFailure = z.infer<
  typeof aiPathRuntimePortableEngineFailureSchema
>;

export const aiPathRuntimePortableEngineAnalyticsSchema = z.object({
  source: z.enum(['in_memory', 'unavailable']),
  totals: aiPathRuntimePortableEngineCountsSchema.extend({
    successRate: z.number(),
    failureRate: z.number(),
  }),
  byRunner: z.object({
    client: aiPathRuntimePortableEngineCountsSchema,
    server: aiPathRuntimePortableEngineCountsSchema,
  }),
  bySurface: z.object({
    canvas: aiPathRuntimePortableEngineCountsSchema,
    product: aiPathRuntimePortableEngineCountsSchema,
    api: aiPathRuntimePortableEngineCountsSchema,
  }),
  byInputSource: z.object({
    portable_package: aiPathRuntimePortableEngineCountsSchema,
    portable_envelope: aiPathRuntimePortableEngineCountsSchema,
    semantic_canvas: aiPathRuntimePortableEngineCountsSchema,
    path_config: aiPathRuntimePortableEngineCountsSchema,
  }),
  failureStageCounts: z.object({
    resolve: z.number(),
    validation: z.number(),
    runtime: z.number(),
  }),
  recentFailures: z.array(aiPathRuntimePortableEngineFailureSchema),
});
export type AiPathRuntimePortableEngineAnalytics = z.infer<
  typeof aiPathRuntimePortableEngineAnalyticsSchema
>;

export const aiPathRuntimeAnalyticsSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  range: z.string(),
  storage: z.enum(['redis', 'disabled']),
  runs: z.object({
    total: z.number(),
    queued: z.number(),
    started: z.number(),
    completed: z.number(),
    failed: z.number(),
    canceled: z.number(),
    deadLettered: z.number(),
    blockedOnLease: z.number().optional(),
    handoffReady: z.number().optional(),
    successRate: z.number(),
    failureRate: z.number(),
    deadLetterRate: z.number(),
    avgDurationMs: z.number().nullable(),
    p95DurationMs: z.number().nullable(),
  }),
  nodes: z.object({
    started: z.number(),
    completed: z.number(),
    failed: z.number(),
    queued: z.number(),
    running: z.number(),
    polling: z.number(),
    cached: z.number(),
    waitingCallback: z.number(),
  }),
  brain: z.object({
    analyticsReports: z.number(),
    logReports: z.number(),
    totalReports: z.number(),
    warningReports: z.number(),
    errorReports: z.number(),
  }),
  traces: aiPathRuntimeTraceAnalyticsSchema,
  portableEngine: aiPathRuntimePortableEngineAnalyticsSchema.optional(),
  generatedAt: z.string(),
});
export type AiPathRuntimeAnalyticsSummary = z.infer<typeof aiPathRuntimeAnalyticsSummarySchema>;

export const aiPathRuntimeAnalyticsSummaryResponseSchema = z.object({
  summary: aiPathRuntimeAnalyticsSummarySchema,
});
export type AiPathRuntimeAnalyticsSummaryResponse = z.infer<
  typeof aiPathRuntimeAnalyticsSummaryResponseSchema
>;
export type AiPathRuntimeAnalyticsSummaryResponseDto = AiPathRuntimeAnalyticsSummaryResponse;
