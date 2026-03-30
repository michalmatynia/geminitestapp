import { describe, expect, it } from 'vitest';

import { __testables } from '../summary';

const createAnalyticsSnapshot = (overrides?: {
  signInSuccess?: number;
  signInFailure?: number;
  progressSyncFailure?: number;
  aiTutor?: {
    messageSucceededCount?: number;
    pageContentAnswerCount?: number;
    nativeGuideAnswerCount?: number;
    brainAnswerCount?: number;
    knowledgeGraphAppliedCount?: number;
    knowledgeGraphSemanticCount?: number;
    knowledgeGraphWebsiteHelpCount?: number;
    knowledgeGraphMetadataOnlyRecallCount?: number;
    knowledgeGraphHybridRecallCount?: number;
    knowledgeGraphVectorOnlyRecallCount?: number;
    knowledgeGraphVectorRecallAttemptedCount?: number;
    bridgeSuggestionCount?: number;
    lessonToGameBridgeSuggestionCount?: number;
    gameToLessonBridgeSuggestionCount?: number;
    bridgeQuickActionClickCount?: number;
    bridgeFollowUpClickCount?: number;
    bridgeFollowUpCompletionCount?: number;
    directAnswerRatePercent?: number | null;
    brainFallbackRatePercent?: number | null;
    bridgeCompletionRatePercent?: number | null;
    knowledgeGraphCoverageRatePercent?: number | null;
    knowledgeGraphVectorAssistRatePercent?: number | null;
  };
}): {
  totals: { events: number; pageviews: number };
  visitors: number;
  sessions: number;
  topPaths: Array<{ path: string; count: number }>;
  topEventNames: Array<{ name: string; count: number }>;
  importantEvents: Array<{ name: string; count: number }>;
  aiTutor: {
    messageSucceededCount: number;
    pageContentAnswerCount: number;
    nativeGuideAnswerCount: number;
    brainAnswerCount: number;
    knowledgeGraphAppliedCount: number;
    knowledgeGraphSemanticCount: number;
    knowledgeGraphWebsiteHelpCount: number;
    knowledgeGraphMetadataOnlyRecallCount: number;
    knowledgeGraphHybridRecallCount: number;
    knowledgeGraphVectorOnlyRecallCount: number;
    knowledgeGraphVectorRecallAttemptedCount: number;
    bridgeSuggestionCount: number;
    lessonToGameBridgeSuggestionCount: number;
    gameToLessonBridgeSuggestionCount: number;
    bridgeQuickActionClickCount: number;
    bridgeFollowUpClickCount: number;
    bridgeFollowUpCompletionCount: number;
    directAnswerRatePercent: number | null;
    brainFallbackRatePercent: number | null;
    bridgeCompletionRatePercent: number | null;
    knowledgeGraphCoverageRatePercent: number | null;
    knowledgeGraphVectorAssistRatePercent: number | null;
  };
  duelsLobby: {
    totals: {
      viewed: number;
      refreshClicked: number;
      filterChanged: number;
      sortChanged: number;
      joinClicked: number;
      createClicked: number;
      loginClicked: number;
    };
    byUser: {
      guest: {
        viewed: number;
        refreshClicked: number;
        filterChanged: number;
        sortChanged: number;
        joinClicked: number;
        createClicked: number;
        loginClicked: number;
      };
      authenticated: {
        viewed: number;
        refreshClicked: number;
        filterChanged: number;
        sortChanged: number;
        joinClicked: number;
        createClicked: number;
        loginClicked: number;
      };
    };
    byFilterMode: {
      all: number;
      challenge: number;
      quick_match: number;
    };
    bySort: {
      recent: number;
      time_fast: number;
      time_slow: number;
      questions_low: number;
      questions_high: number;
    };
    loginBySource: Record<string, number>;
  };
  recent: never[];
} => {
  const messageSucceededCount = overrides?.aiTutor?.messageSucceededCount ?? 0;
  const pageContentAnswerCount = overrides?.aiTutor?.pageContentAnswerCount ?? 0;
  const nativeGuideAnswerCount = overrides?.aiTutor?.nativeGuideAnswerCount ?? 0;
  const brainAnswerCount = overrides?.aiTutor?.brainAnswerCount ?? 0;
  const knowledgeGraphAppliedCount = overrides?.aiTutor?.knowledgeGraphAppliedCount ?? 0;
  const knowledgeGraphSemanticCount = overrides?.aiTutor?.knowledgeGraphSemanticCount ?? 0;
  const knowledgeGraphHybridRecallCount = overrides?.aiTutor?.knowledgeGraphHybridRecallCount ?? 0;
  const knowledgeGraphVectorOnlyRecallCount =
    overrides?.aiTutor?.knowledgeGraphVectorOnlyRecallCount ?? 0;
  const bridgeSuggestionCount = overrides?.aiTutor?.bridgeSuggestionCount ?? 0;
  const bridgeFollowUpCompletionCount = overrides?.aiTutor?.bridgeFollowUpCompletionCount ?? 0;

  return {
    totals: { events: 0, pageviews: 0 },
    visitors: 0,
    sessions: 0,
    topPaths: [],
    topEventNames: [],
    importantEvents: [
      {
        name: 'kangur_learner_signin_succeeded',
        count: overrides?.signInSuccess ?? 0,
      },
      {
        name: 'kangur_learner_signin_failed',
        count: overrides?.signInFailure ?? 0,
      },
      {
        name: 'kangur_progress_sync_failed',
        count: overrides?.progressSyncFailure ?? 0,
      },
    ],
    aiTutor: {
      messageSucceededCount,
      pageContentAnswerCount,
      nativeGuideAnswerCount,
      brainAnswerCount,
      knowledgeGraphAppliedCount,
      knowledgeGraphSemanticCount,
      knowledgeGraphWebsiteHelpCount: overrides?.aiTutor?.knowledgeGraphWebsiteHelpCount ?? 0,
      knowledgeGraphMetadataOnlyRecallCount:
        overrides?.aiTutor?.knowledgeGraphMetadataOnlyRecallCount ?? 0,
      knowledgeGraphHybridRecallCount,
      knowledgeGraphVectorOnlyRecallCount,
      knowledgeGraphVectorRecallAttemptedCount:
        overrides?.aiTutor?.knowledgeGraphVectorRecallAttemptedCount ?? 0,
      bridgeSuggestionCount,
      lessonToGameBridgeSuggestionCount:
        overrides?.aiTutor?.lessonToGameBridgeSuggestionCount ?? 0,
      gameToLessonBridgeSuggestionCount:
        overrides?.aiTutor?.gameToLessonBridgeSuggestionCount ?? 0,
      bridgeQuickActionClickCount: overrides?.aiTutor?.bridgeQuickActionClickCount ?? 0,
      bridgeFollowUpClickCount: overrides?.aiTutor?.bridgeFollowUpClickCount ?? 0,
      bridgeFollowUpCompletionCount,
      directAnswerRatePercent:
        overrides?.aiTutor?.directAnswerRatePercent ??
        (messageSucceededCount > 0
          ? Number(
              (
                (((pageContentAnswerCount + nativeGuideAnswerCount) / messageSucceededCount) *
                  100)
              ).toFixed(1)
            )
          : null),
      brainFallbackRatePercent:
        overrides?.aiTutor?.brainFallbackRatePercent ??
        (messageSucceededCount > 0
          ? Number(((brainAnswerCount / messageSucceededCount) * 100).toFixed(1))
          : null),
      bridgeCompletionRatePercent:
        overrides?.aiTutor?.bridgeCompletionRatePercent ??
        (bridgeSuggestionCount > 0
          ? Number(((bridgeFollowUpCompletionCount / bridgeSuggestionCount) * 100).toFixed(1))
          : null),
      knowledgeGraphCoverageRatePercent:
        overrides?.aiTutor?.knowledgeGraphCoverageRatePercent ??
        (messageSucceededCount > 0
          ? Number(((knowledgeGraphAppliedCount / messageSucceededCount) * 100).toFixed(1))
          : null),
      knowledgeGraphVectorAssistRatePercent:
        overrides?.aiTutor?.knowledgeGraphVectorAssistRatePercent ??
        (knowledgeGraphSemanticCount > 0
          ? Number(
              (
                ((knowledgeGraphHybridRecallCount + knowledgeGraphVectorOnlyRecallCount) /
                  knowledgeGraphSemanticCount) *
                100
              ).toFixed(1)
            )
          : null),
    },
    duelsLobby: {
      totals: {
        viewed: 0,
        refreshClicked: 0,
        filterChanged: 0,
        sortChanged: 0,
        joinClicked: 0,
        createClicked: 0,
        loginClicked: 0,
      },
      byUser: {
        guest: {
          viewed: 0,
          refreshClicked: 0,
          filterChanged: 0,
          sortChanged: 0,
          joinClicked: 0,
          createClicked: 0,
          loginClicked: 0,
        },
        authenticated: {
          viewed: 0,
          refreshClicked: 0,
          filterChanged: 0,
          sortChanged: 0,
          joinClicked: 0,
          createClicked: 0,
          loginClicked: 0,
        },
      },
      byFilterMode: {
        all: 0,
        challenge: 0,
        quick_match: 0,
      },
      bySort: {
        recent: 0,
        time_fast: 0,
        time_slow: 0,
        questions_low: 0,
        questions_high: 0,
      },
      loginBySource: {},
    },
    recent: [],
  };
};

const createServerLogMetrics = (input: {
  total: number;
  errors: number;
}): {
  total: number;
  levels: { info: number; warn: number; error: number };
  last24Hours: number;
  last7Days: number;
  topSources: never[];
  topServices: never[];
  topPaths: never[];
  generatedAt: string;
} => ({
  total: input.total,
  levels: {
    info: Math.max(0, input.total - input.errors),
    warn: 0,
    error: input.errors,
  },
  last24Hours: input.total,
  last7Days: input.total,
  topSources: [],
  topServices: [],
  topPaths: [],
  generatedAt: '2026-03-07T12:00:00.000Z',
});

const createRouteHealth = (
  source: string,
  overrides?: {
    latency?: {
      sampleSize: number;
      avgDurationMs: number | null;
      p95DurationMs: number | null;
      maxDurationMs: number | null;
      slowRequestCount: number;
      slowRequestRatePercent: number | null;
      slowThresholdMs: number;
    } | null;
  }
) => ({
  metrics: null,
  latency: overrides?.latency ?? null,
  investigation: {
    label: 'Inspect route logs',
    href: `/admin/system/logs?source=${encodeURIComponent(source)}`,
  },
});

const createRouteMetrics = (overrides?: {
  progressPatchLatency?: {
    sampleSize: number;
    avgDurationMs: number | null;
    p95DurationMs: number | null;
    maxDurationMs: number | null;
    slowRequestCount: number;
    slowRequestRatePercent: number | null;
    slowThresholdMs: number;
  } | null;
}) => ({
  authMeGet: createRouteHealth('kangur.auth.me.GET'),
  learnerSignInPost: createRouteHealth('kangur.auth.learnerSignIn.POST'),
  progressPatch: createRouteHealth('kangur.progress.PATCH', {
    latency: overrides?.progressPatchLatency ?? null,
  }),
  scoresPost: createRouteHealth('kangur.scores.POST'),
  assignmentsPost: createRouteHealth('kangur.assignments.POST'),
  learnersPost: createRouteHealth('kangur.learners.POST'),
  ttsPost: createRouteHealth('kangur.tts.POST'),
});

const createKnowledgeGraphStatus = (
  overrides?: Partial<{
    mode: 'status' | 'disabled' | 'error';
    graphKey: string;
    message: string;
    present: boolean;
    locale: string | null;
    syncedAt: string | null;
    syncedNodeCount: number | null;
    syncedEdgeCount: number | null;
    liveNodeCount: number;
    liveEdgeCount: number;
    canonicalNodeCount: number | null;
    validCanonicalNodeCount: number | null;
    invalidCanonicalNodeCount: number | null;
    semanticNodeCount: number;
    embeddingNodeCount: number;
    embeddingDimensions: number | null;
    embeddingModels: string[];
    vectorIndexPresent: boolean;
    vectorIndexState: string | null;
    vectorIndexType: string | null;
    vectorIndexDimensions: number | null;
    semanticCoverageRatePercent: number | null;
    embeddingCoverageRatePercent: number | null;
    semanticReadiness:
      | 'no_graph'
      | 'no_semantic_text'
      | 'metadata_only'
      | 'embeddings_without_index'
      | 'vector_index_pending'
      | 'vector_ready';
  }>
) => {
  if (overrides?.mode === 'disabled') {
    return {
      mode: 'disabled' as const,
      graphKey: overrides.graphKey ?? 'kangur-website-help-v1',
      message:
        overrides.message ??
        'Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.',
    };
  }

  if (overrides?.mode === 'error') {
    return {
      mode: 'error' as const,
      graphKey: overrides.graphKey ?? 'kangur-website-help-v1',
      message: overrides.message ?? 'Neo4j query failed.',
    };
  }

  return {
    mode: 'status' as const,
    graphKey: overrides?.graphKey ?? 'kangur-website-help-v1',
    present: overrides?.present ?? true,
    locale: overrides?.locale ?? 'pl',
    syncedAt: overrides?.syncedAt ?? '2026-03-07T12:00:00.000Z',
    syncedNodeCount: overrides?.syncedNodeCount ?? 87,
    syncedEdgeCount: overrides?.syncedEdgeCount ?? 108,
    liveNodeCount: overrides?.liveNodeCount ?? 87,
    liveEdgeCount: overrides?.liveEdgeCount ?? 108,
    canonicalNodeCount: overrides?.canonicalNodeCount ?? 80,
    validCanonicalNodeCount: overrides?.validCanonicalNodeCount ?? 80,
    invalidCanonicalNodeCount: overrides?.invalidCanonicalNodeCount ?? 0,
    semanticNodeCount: overrides?.semanticNodeCount ?? 87,
    embeddingNodeCount: overrides?.embeddingNodeCount ?? 87,
    embeddingDimensions: overrides?.embeddingDimensions ?? 1536,
    embeddingModels: overrides?.embeddingModels ?? ['text-embedding-3-small'],
    vectorIndexPresent: overrides?.vectorIndexPresent ?? true,
    vectorIndexState: overrides?.vectorIndexState ?? 'ONLINE',
    vectorIndexType: overrides?.vectorIndexType ?? 'VECTOR',
    vectorIndexDimensions: overrides?.vectorIndexDimensions ?? 1536,
    semanticCoverageRatePercent: overrides?.semanticCoverageRatePercent ?? 100,
    embeddingCoverageRatePercent: overrides?.embeddingCoverageRatePercent ?? 100,
    semanticReadiness: overrides?.semanticReadiness ?? 'vector_ready',
  };
};

describe('kangur observability alerts', () => {
  it('flags sign-in failure rate warnings when enough attempts exist', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 100, errors: 1 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot({ signInSuccess: 19, signInFailure: 1 }),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 1,
      performanceBaseline: {
        generatedAt: '2026-03-07T12:00:00.000Z',
        unitStatus: 'pass',
        unitDurationMs: 1000,
        e2eStatus: 'pass',
        e2eDurationMs: 2000,
        infraFailures: 0,
        failedRuns: 0,
        bundleRiskTotalBytes: 100,
        bundleRiskTotalLines: 10,
      },
    });

    const signInAlert = alerts.find((alert) => alert.id === 'kangur-learner-signin-failure-rate');
    expect(signInAlert?.status).toBe('warning');
    expect(signInAlert?.value).toBe(5);
    expect(signInAlert?.investigation).toEqual({
      label: 'Review sign-in analytics',
      href: '/admin/kangur/observability?range=24h#recent-analytics-events',
    });
  });

  it('treats tts fallback rate as insufficient data below the minimum sample', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot(),
      ttsRequestCount: 5,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 2,
      performanceBaseline: null,
    });

    const ttsAlert = alerts.find((alert) => alert.id === 'kangur-tts-fallback-rate');
    expect(ttsAlert?.status).toBe('insufficient_data');
    expect(ttsAlert?.value).toBe(40);
    expect(ttsAlert?.investigation).toEqual({
      label: 'View fallback logs',
      href: '/admin/system/logs?source=kangur.tts.fallback&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z',
    });
  });

  it('marks the performance baseline warning when the latest e2e run is infra-failed', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot(),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 0,
      performanceBaseline: {
        generatedAt: '2026-03-07T12:00:00.000Z',
        unitStatus: 'pass',
        unitDurationMs: 1000,
        e2eStatus: 'infra_fail',
        e2eDurationMs: 2000,
        infraFailures: 1,
        failedRuns: 0,
        bundleRiskTotalBytes: 100,
        bundleRiskTotalLines: 10,
      },
    });

    const performanceAlert = alerts.find((alert) => alert.id === 'kangur-performance-baseline');
    expect(performanceAlert?.status).toBe('warning');
    expect(performanceAlert?.investigation).toEqual({
      label: 'Open baseline details',
      href: '/admin/kangur/observability?range=24h#performance-baseline',
    });
  });

  it('flags progress sync latency when p95 exceeds the slow-request threshold', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics({
        progressPatchLatency: {
          sampleSize: 12,
          avgDurationMs: 420,
          p95DurationMs: 980,
          maxDurationMs: 1200,
          slowRequestCount: 3,
          slowRequestRatePercent: 25,
          slowThresholdMs: 750,
        },
      }),
      analytics: createAnalyticsSnapshot(),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const latencyAlert = alerts.find((alert) => alert.id === 'kangur-progress-sync-latency');
    expect(latencyAlert?.status).toBe('warning');
    expect(latencyAlert?.value).toBe(980);
    expect(latencyAlert?.investigation).toEqual({
      label: 'View slow sync logs',
      href: '/admin/system/logs?source=kangur.progress.PATCH&minDurationMs=750&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z',
    });
  });

  it('flags degraded ai tutor bridge completion when bridge suggestions do not convert', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot({
        aiTutor: {
          bridgeSuggestionCount: 6,
          bridgeFollowUpCompletionCount: 1,
        },
      }),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const bridgeAlert = alerts.find((alert) => alert.id === 'kangur-ai-tutor-bridge-completion-rate');
    expect(bridgeAlert?.status).toBe('critical');
    expect(bridgeAlert?.value).toBe(16.7);
    expect(bridgeAlert?.investigation).toEqual({
      label: 'Review tutor bridge analytics',
      href: '/admin/kangur/observability?range=24h#recent-analytics-events',
    });
  });

  it('flags low Neo4j graph coverage across successful tutor replies', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot({
        aiTutor: {
          messageSucceededCount: 12,
          knowledgeGraphAppliedCount: 3,
        },
      }),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const graphCoverageAlert = alerts.find(
      (alert) => alert.id === 'kangur-ai-tutor-graph-coverage-rate'
    );
    expect(graphCoverageAlert?.status).toBe('critical');
    expect(graphCoverageAlert?.value).toBe(25);
    expect(graphCoverageAlert?.investigation).toEqual({
      label: 'Open AI Tutor graph metrics',
      href: '/admin/kangur/observability?range=24h#ai-tutor-bridge',
    });
  });

  it('flags low deterministic tutor answer coverage when too many replies fall back to Brain', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot({
        aiTutor: {
          messageSucceededCount: 12,
          pageContentAnswerCount: 2,
          nativeGuideAnswerCount: 1,
          brainAnswerCount: 9,
        },
      }),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const directAnswerAlert = alerts.find(
      (alert) => alert.id === 'kangur-ai-tutor-direct-answer-rate'
    );
    expect(directAnswerAlert?.status).toBe('critical');
    expect(directAnswerAlert?.value).toBe(25);
    expect(directAnswerAlert?.summary).toBe(
      '3 Tutor replies were resolved directly from page content or native guides out of 12 successful Tutor replies in the selected window.'
    );
    expect(directAnswerAlert?.investigation).toEqual({
      label: 'Open AI Tutor graph metrics',
      href: '/admin/kangur/observability?range=24h#ai-tutor-bridge',
    });
  });

  it('warns when canonical tutor content is newer than the latest Neo4j sync', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot(),
      knowledgeGraphStatus: createKnowledgeGraphStatus(),
      knowledgeGraphFreshness: {
        latestCanonicalUpdateAt: new Date('2026-03-07T13:30:00.000Z'),
        latestPageContentUpdateAt: new Date('2026-03-07T13:30:00.000Z'),
        latestNativeGuideUpdateAt: new Date('2026-03-07T11:15:00.000Z'),
        graphSyncedAt: new Date('2026-03-07T12:00:00.000Z'),
        lagMs: 90 * 60 * 1000,
        staleSources: ['page_content'],
      },
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const freshnessAlert = alerts.find((alert) => alert.id === 'kangur-knowledge-graph-freshness');
    expect(freshnessAlert?.status).toBe('warning');
    expect(freshnessAlert?.value).toBe(1.5);
    expect(freshnessAlert?.summary).toBe(
      'Page content was updated after the latest Neo4j sync by about 2 hours. Last graph sync: 2026-03-07T12:00:00.000Z. Latest canonical update: 2026-03-07T13:30:00.000Z.'
    );
    expect(freshnessAlert?.investigation).toEqual({
      label: 'Open graph status',
      href: '/admin/kangur/observability?range=24h#knowledge-graph-status',
    });
  });

  it('flags knowledge graph readiness when the vector index is missing', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot(),
      knowledgeGraphStatus: createKnowledgeGraphStatus({
        semanticReadiness: 'embeddings_without_index',
        vectorIndexPresent: false,
        vectorIndexState: null,
        vectorIndexType: null,
        vectorIndexDimensions: null,
      }),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const graphReadinessAlert = alerts.find(
      (alert) => alert.id === 'kangur-knowledge-graph-readiness'
    );
    expect(graphReadinessAlert?.status).toBe('critical');
    expect(graphReadinessAlert?.summary).toContain('vector index is missing');
    expect(graphReadinessAlert?.investigation).toEqual({
      label: 'Open graph status',
      href: '/admin/kangur/observability?range=24h#knowledge-graph-status',
    });
  });

  it('treats disabled knowledge graph status as insufficient data', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot(),
      knowledgeGraphStatus: createKnowledgeGraphStatus({
        mode: 'disabled',
      }),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const graphReadinessAlert = alerts.find(
      (alert) => alert.id === 'kangur-knowledge-graph-readiness'
    );
    expect(graphReadinessAlert?.status).toBe('insufficient_data');
    expect(graphReadinessAlert?.summary).toContain('Neo4j is not enabled');
  });

  it('flags low vector-assisted recall across semantic tutor replies', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot({
        aiTutor: {
          knowledgeGraphSemanticCount: 8,
          knowledgeGraphHybridRecallCount: 1,
          knowledgeGraphVectorOnlyRecallCount: 0,
        },
      }),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 0,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const vectorAssistAlert = alerts.find(
      (alert) => alert.id === 'kangur-ai-tutor-vector-assist-rate'
    );
    expect(vectorAssistAlert?.status).toBe('critical');
    expect(vectorAssistAlert?.value).toBe(12.5);
    expect(vectorAssistAlert?.investigation).toEqual({
      label: 'Open AI Tutor graph metrics',
      href: '/admin/kangur/observability?range=24h#ai-tutor-bridge',
    });
  });

  it('flags neural narration generation failures independently of fallback rate', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot(),
      ttsRequestCount: 20,
      ttsGenerationFailureCount: 2,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const generationAlert = alerts.find((alert) => alert.id === 'kangur-tts-generation-failures');
    expect(generationAlert?.status).toBe('warning');
    expect(generationAlert?.value).toBe(2);
    expect(generationAlert?.investigation).toEqual({
      label: 'View generation failure logs',
      href: '/admin/system/logs?source=kangur.tts.generationFailed&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z',
    });
  });
});

describe('kangur route latency stats', () => {
  it('computes sample, avg, p95, and slow-request rate for route durations', () => {
    const latency = __testables.buildRouteLatencyStats([120, 250, 400, 800, 900], 750);

    expect(latency).toEqual({
      sampleSize: 5,
      avgDurationMs: 494,
      p95DurationMs: 900,
      maxDurationMs: 900,
      slowRequestCount: 2,
      slowRequestRatePercent: 40,
      slowThresholdMs: 750,
    });
  });
});

describe('kangur ai tutor bridge analytics summary', () => {
  it('summarizes bridge suggestions, clicks, and completions from tutor analytics events', () => {
    expect(
      __testables.summarizeKangurAiTutorAnalytics([
        {
          name: 'kangur_ai_tutor_message_succeeded',
          meta: {
            answerResolutionMode: 'page_content',
          },
        },
        {
          name: 'kangur_ai_tutor_message_succeeded',
          meta: {
            answerResolutionMode: 'native_guide',
            knowledgeGraphApplied: true,
            knowledgeGraphQueryMode: 'website_help',
            knowledgeGraphRecallStrategy: 'metadata_only',
            knowledgeGraphVectorRecallAttempted: false,
            hasBridgeFollowUpAction: true,
            bridgeFollowUpDirection: 'lesson_to_game',
          },
        },
        {
          name: 'kangur_ai_tutor_message_succeeded',
          meta: {
            answerResolutionMode: 'brain',
            knowledgeGraphApplied: true,
            knowledgeGraphQueryMode: 'semantic',
            knowledgeGraphRecallStrategy: 'hybrid_vector',
            knowledgeGraphVectorRecallAttempted: true,
            hasBridgeFollowUpAction: true,
            bridgeFollowUpDirection: 'game_to_lesson',
          },
        },
        {
          name: 'kangur_ai_tutor_quick_action_clicked',
          meta: {
            isBridgeAction: true,
          },
        },
        {
          name: 'kangur_ai_tutor_follow_up_clicked',
          meta: {
            actionId: 'bridge:lesson-to-game:adding',
          },
        },
        {
          name: 'kangur_ai_tutor_follow_up_completed',
          meta: {
            actionId: 'bridge:game-to-lesson:adding',
          },
        },
      ])
    ).toEqual({
      messageSucceededCount: 3,
      pageContentAnswerCount: 1,
      nativeGuideAnswerCount: 1,
      brainAnswerCount: 1,
      knowledgeGraphAppliedCount: 2,
      knowledgeGraphSemanticCount: 1,
      knowledgeGraphWebsiteHelpCount: 1,
      knowledgeGraphMetadataOnlyRecallCount: 1,
      knowledgeGraphHybridRecallCount: 1,
      knowledgeGraphVectorOnlyRecallCount: 0,
      knowledgeGraphVectorRecallAttemptedCount: 1,
      bridgeSuggestionCount: 2,
      lessonToGameBridgeSuggestionCount: 1,
      gameToLessonBridgeSuggestionCount: 1,
      bridgeQuickActionClickCount: 1,
      bridgeFollowUpClickCount: 1,
      bridgeFollowUpCompletionCount: 1,
      directAnswerRatePercent: 66.7,
      brainFallbackRatePercent: 33.3,
      bridgeCompletionRatePercent: 50,
      knowledgeGraphCoverageRatePercent: 66.7,
      knowledgeGraphVectorAssistRatePercent: 100,
    });
  });
});
