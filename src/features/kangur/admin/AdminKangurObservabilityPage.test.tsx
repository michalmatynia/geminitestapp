/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurObservabilitySummaryMock,
  useKangurKnowledgeGraphStatusMock,
  apiPostMock,
  refetchMock,
  knowledgeGraphStatusRefetchMock,
  replaceMock,
  navigationState,
} = vi.hoisted(() => ({
  useKangurObservabilitySummaryMock: vi.fn(),
  useKangurKnowledgeGraphStatusMock: vi.fn(),
  apiPostMock: vi.fn(),
  refetchMock: vi.fn(),
  knowledgeGraphStatusRefetchMock: vi.fn(),
  replaceMock: vi.fn(),
  navigationState: {
    pathname: '/admin/kangur/observability',
    search: '',
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));

vi.mock('@/features/kangur/observability/hooks', () => ({
  useKangurObservabilitySummary: useKangurObservabilitySummaryMock,
  useKangurKnowledgeGraphStatus: useKangurKnowledgeGraphStatusMock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: () => ({
    enabled: false,
    helpSettings: {
      version: 1,
      docsTooltips: {
        enabled: false,
        homeEnabled: false,
        lessonsEnabled: false,
        testsEnabled: false,
        profileEnabled: false,
        parentDashboardEnabled: false,
        adminEnabled: false,
      },
    },
  }),
}));

import { AdminKangurObservabilityPage } from './AdminKangurObservabilityPage';

const createRouteHealth = (
  source: string,
  overrides?: {
    metrics?: {
      total: number;
      levels: { info: number; warn: number; error: number };
      last24Hours: number;
      last7Days: number;
      topSources: Array<{ source: string; count: number }>;
      topServices: Array<{ service: string; count: number }>;
      topPaths: Array<{ path: string; count: number }>;
      generatedAt: string;
    } | null;
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
  metrics: overrides?.metrics ?? null,
  latency: overrides?.latency ?? null,
  investigation: {
    label: 'Inspect route logs',
    href: `/admin/system/logs?source=${encodeURIComponent(source)}&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z`,
  },
});

const createSummary = (range: '24h' | '7d' | '30d' = '24h') => ({
  generatedAt: '2026-03-07T12:00:00.000Z',
  range,
  overallStatus: 'warning' as const,
  window: {
    from: '2026-03-06T12:00:00.000Z',
    to: '2026-03-07T12:00:00.000Z',
  },
  keyMetrics: {
    serverErrorRatePercent: 2.4,
    learnerSignInAttempts: 12,
    learnerSignInFailureRatePercent: 8.3,
    progressSyncFailures: 4,
    ttsRequests: 11,
    ttsGenerationFailures: 2,
    ttsFallbackRatePercent: 18.2,
  },
  alerts: [
    {
      id: 'kangur-knowledge-graph-readiness',
      title: 'Knowledge Graph Readiness',
      status: 'ok' as const,
      value: null,
      unit: 'status',
      warningThreshold: null,
      criticalThreshold: null,
      summary: 'Neo4j graph kangur-website-help-v1 is vector-ready with 87 nodes, 108 edges, and an online vector index.',
      investigation: {
        label: 'Open graph status',
        href: `/admin/kangur/observability?range=${range}#knowledge-graph-status`,
      },
    },
    {
      id: 'kangur-knowledge-graph-freshness',
      title: 'Knowledge Graph Freshness',
      status: 'warning' as const,
      value: 2,
      unit: 'hours',
      warningThreshold: 0,
      criticalThreshold: 24,
      summary:
        'Page content was updated after the latest Neo4j sync by about 2 hours. Last graph sync: 2026-03-07T12:00:00.000Z. Latest canonical update: 2026-03-07T14:00:00.000Z.',
      investigation: {
        label: 'Open graph status',
        href: `/admin/kangur/observability?range=${range}#knowledge-graph-status`,
      },
    },
    {
      id: 'kangur-server-error-rate',
      title: 'Server error rate',
      status: 'ok' as const,
      value: 2.4,
      unit: '%',
      warningThreshold: 3,
      criticalThreshold: 5,
      summary: 'Healthy.',
      investigation: {
        label: 'View error logs',
        href: '/admin/system/logs?query=kangur.&level=error&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z',
      },
    },
    {
      id: 'kangur-learner-signin-failure-rate',
      title: 'Learner sign-in failure rate',
      status: 'warning' as const,
      value: 8.3,
      unit: '%',
      warningThreshold: 5,
      criticalThreshold: 10,
      summary: 'Watch learner sign-in failures.',
      investigation: {
        label: 'Review sign-in analytics',
        href: `/admin/kangur/observability?range=${range}#recent-analytics-events`,
      },
    },
    {
      id: 'kangur-progress-sync-failures',
      title: 'Progress sync failures',
      status: 'warning' as const,
      value: 4,
      unit: 'count',
      warningThreshold: 3,
      criticalThreshold: 10,
      summary: 'Progress sync failures detected.',
      investigation: {
        label: 'Review sync analytics',
        href: `/admin/kangur/observability?range=${range}#recent-analytics-events`,
      },
    },
    {
      id: 'kangur-tts-generation-failures',
      title: 'TTS generation failures',
      status: 'warning' as const,
      value: 2,
      unit: 'count',
      warningThreshold: 1,
      criticalThreshold: 3,
      summary: 'Neural narration generation is failing before fallback.',
      investigation: {
        label: 'View generation failure logs',
        href: '/admin/system/logs?source=kangur.tts.generationFailed&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z',
      },
    },
    {
      id: 'kangur-tts-fallback-rate',
      title: 'TTS fallback rate',
      status: 'ok' as const,
      value: 18.2,
      unit: '%',
      warningThreshold: 20,
      criticalThreshold: 35,
      summary: 'Fallback rate within threshold.',
      investigation: {
        label: 'View fallback logs',
        href: '/admin/system/logs?source=kangur.tts.fallback&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z',
      },
    },
    {
      id: 'kangur-ai-tutor-bridge-completion-rate',
      title: 'AI Tutor Bridge Completion Rate',
      status: 'warning' as const,
      value: 33.3,
      unit: '%',
      warningThreshold: 40,
      criticalThreshold: 20,
      summary: 'Bridge suggestions are not converting into completed cross-surface follow-ups fast enough.',
      investigation: {
        label: 'Review tutor bridge analytics',
        href: `/admin/kangur/observability?range=${range}#recent-analytics-events`,
      },
    },
    {
      id: 'kangur-ai-tutor-direct-answer-rate',
      title: 'AI Tutor Direct Answer Rate',
      status: 'warning' as const,
      value: 50,
      unit: '%',
      warningThreshold: 60,
      criticalThreshold: 30,
      summary: 'Deterministic Tutor answers are below the preferred rollout target.',
      investigation: {
        label: 'Open AI Tutor graph metrics',
        href: `/admin/kangur/observability?range=${range}#ai-tutor-bridge`,
      },
    },
    {
      id: 'kangur-ai-tutor-graph-coverage-rate',
      title: 'AI Tutor Graph Coverage Rate',
      status: 'warning' as const,
      value: 66.7,
      unit: '%',
      warningThreshold: 60,
      criticalThreshold: 30,
      summary: 'Neo4j graph coverage is below the preferred Tutor reply share.',
      investigation: {
        label: 'Open AI Tutor graph metrics',
        href: `/admin/kangur/observability?range=${range}#ai-tutor-bridge`,
      },
    },
    {
      id: 'kangur-ai-tutor-vector-assist-rate',
      title: 'AI Tutor Vector Assist Rate',
      status: 'critical' as const,
      value: 12.5,
      unit: '%',
      warningThreshold: 40,
      criticalThreshold: 15,
      summary: 'Vector-assisted recall is contributing to too few semantic Tutor replies.',
      investigation: {
        label: 'Open AI Tutor graph metrics',
        href: `/admin/kangur/observability?range=${range}#ai-tutor-bridge`,
      },
    },
    {
      id: 'kangur-performance-baseline',
      title: 'Performance baseline',
      status: 'warning' as const,
      value: 1,
      unit: 'count',
      warningThreshold: 1,
      criticalThreshold: 2,
      summary: 'Latest baseline is degraded.',
      investigation: {
        label: 'Open baseline details',
        href: `/admin/kangur/observability?range=${range}#performance-baseline`,
      },
    },
  ],
  serverLogs: {
    metrics: {
      total: 14,
      levels: { info: 10, warn: 2, error: 2 },
      last24Hours: 14,
      last7Days: 20,
      topSources: [{ source: 'kangur.tts', count: 5 }],
      topServices: [{ service: 'app', count: 14 }],
      topPaths: [{ path: '/api/kangur/tts', count: 5 }],
      generatedAt: '2026-03-07T12:00:00.000Z',
    },
    recent: [
      {
        id: 'log-1',
        createdAt: '2026-03-07T11:45:00.000Z',
        level: 'error' as const,
        message: 'Kangur TTS fallback used.',
        source: 'kangur.tts.fallback',
        path: '/api/kangur/tts',
        requestId: 'req-1',
        traceId: 'trace-1',
      },
    ],
  },
  routes: {
    authMeGet: createRouteHealth('kangur.auth.me.GET'),
    learnerSignInPost: createRouteHealth('kangur.auth.learnerSignIn.POST'),
    progressPatch: createRouteHealth('kangur.progress.PATCH'),
    scoresPost: createRouteHealth('kangur.scores.POST'),
    assignmentsPost: createRouteHealth('kangur.assignments.POST'),
    learnersPost: createRouteHealth('kangur.learners.POST'),
    ttsPost: createRouteHealth('kangur.tts.POST', {
      metrics: {
        total: 5,
        levels: { info: 4, warn: 0, error: 1 },
        last24Hours: 5,
        last7Days: 5,
        topSources: [{ source: 'kangur.tts', count: 5 }],
        topServices: [{ service: 'app', count: 5 }],
        topPaths: [{ path: '/api/kangur/tts', count: 5 }],
        generatedAt: '2026-03-07T12:00:00.000Z',
      },
      latency: {
        sampleSize: 5,
        avgDurationMs: 540,
        p95DurationMs: 820,
        maxDurationMs: 910,
        slowRequestCount: 2,
        slowRequestRatePercent: 40,
        slowThresholdMs: 750,
      },
    }),
  },
  analytics: {
    totals: { events: 10, pageviews: 4 },
    visitors: 3,
    sessions: 5,
    topPaths: [{ path: '/kangur', count: 4 }],
    topEventNames: [{ name: 'kangur_game_completed', count: 3 }],
    importantEvents: [{ name: 'kangur_progress_sync_failed', count: 4 }],
    aiTutor: {
      messageSucceededCount: 6,
      pageContentAnswerCount: 2,
      nativeGuideAnswerCount: 1,
      brainAnswerCount: 3,
      knowledgeGraphAppliedCount: 4,
      knowledgeGraphSemanticCount: 3,
      knowledgeGraphWebsiteHelpCount: 1,
      knowledgeGraphMetadataOnlyRecallCount: 1,
      knowledgeGraphHybridRecallCount: 2,
      knowledgeGraphVectorOnlyRecallCount: 1,
      knowledgeGraphVectorRecallAttemptedCount: 3,
      bridgeSuggestionCount: 3,
      lessonToGameBridgeSuggestionCount: 2,
      gameToLessonBridgeSuggestionCount: 1,
      bridgeQuickActionClickCount: 2,
      bridgeFollowUpClickCount: 2,
      bridgeFollowUpCompletionCount: 1,
      directAnswerRatePercent: 50,
      brainFallbackRatePercent: 50,
      bridgeCompletionRatePercent: 33.3,
      knowledgeGraphCoverageRatePercent: 66.7,
      knowledgeGraphVectorAssistRatePercent: 100,
    },
    recent: [
      {
        id: 'event-1',
        ts: '2026-03-07T11:40:00.000Z',
        type: 'event' as const,
        name: 'kangur_progress_sync_failed',
        path: '/kangur/play',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        meta: null,
      },
    ],
  },
  knowledgeGraphStatus: {
    mode: 'status' as const,
    graphKey: 'kangur-website-help-v1',
    present: true,
    locale: 'pl',
    syncedAt: '2026-03-07T12:00:00.000Z',
    syncedNodeCount: 87,
    syncedEdgeCount: 108,
    liveNodeCount: 87,
    liveEdgeCount: 108,
    canonicalNodeCount: 80,
    validCanonicalNodeCount: 80,
    invalidCanonicalNodeCount: 0,
    semanticNodeCount: 87,
    embeddingNodeCount: 87,
    embeddingDimensions: 1536,
    embeddingModels: ['text-embedding-3-small'],
    vectorIndexPresent: true,
    vectorIndexState: 'ONLINE',
    vectorIndexType: 'VECTOR',
    vectorIndexDimensions: 1536,
    semanticCoverageRatePercent: 100,
    embeddingCoverageRatePercent: 100,
    semanticReadiness: 'vector_ready' as const,
  },
  performanceBaseline: {
    generatedAt: '2026-03-07T08:00:00.000Z',
    unitStatus: 'pass',
    unitDurationMs: 1000,
    e2eStatus: 'infra_fail',
    e2eDurationMs: 2000,
    infraFailures: 1,
    failedRuns: 0,
    bundleRiskTotalBytes: 100,
    bundleRiskTotalLines: 10,
  },
  errors: {
    analytics: 'Analytics aggregation is partially degraded.',
  },
});

describe('AdminKangurObservabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationState.pathname = '/admin/kangur/observability';
    navigationState.search = '';
    apiPostMock.mockResolvedValue({
      sync: {
        graphKey: 'kangur-website-help-v1',
        locale: 'pl',
        nodeCount: 87,
        edgeCount: 108,
        withEmbeddings: true,
      },
      status: createSummary('24h').knowledgeGraphStatus,
    });
    knowledgeGraphStatusRefetchMock.mockResolvedValue(undefined);
    useKangurObservabilitySummaryMock.mockImplementation((range: '24h' | '7d' | '30d') => ({
      data: createSummary(range),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchMock,
    }));
    useKangurKnowledgeGraphStatusMock.mockImplementation(() => ({
      data: createSummary('24h').knowledgeGraphStatus,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: knowledgeGraphStatusRefetchMock,
    }));
  });

  it('renders the Kangur observability summary cards and quick links', () => {
    navigationState.search = 'range=30d';
    render(<AdminKangurObservabilityPage />);

    expect(screen.getByText('Kangur Observability')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Observability'
    );
    expect(screen.getByText('Learner sign-in failure rate')).toBeInTheDocument();
    expect(screen.getByText('Progress sync failures detected.')).toBeInTheDocument();
    expect(screen.getByText('Kangur TTS fallback used.')).toBeInTheDocument();
    expect(screen.getByText('TTS Generation Failures')).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Graph Coverage Rate')).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Direct Answer Rate')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph Freshness')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph Readiness')).toBeInTheDocument();
    expect(screen.getByText('Freshness against canonical tutor content')).toBeInTheDocument();
    expect(screen.getAllByText('2.0 h lag').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        'Neo4j graph kangur-website-help-v1 is vector-ready with 87 nodes, 108 edges, and an online vector index.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Page content was updated after the latest Neo4j sync by about 2 hours. Last graph sync: 2026-03-07T12:00:00.000Z. Latest canonical update: 2026-03-07T14:00:00.000Z.'
      ).length
    ).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Deterministic Tutor answers are below the preferred rollout target.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Neo4j graph coverage is below the preferred Tutor reply share.')
    ).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Vector Assist Rate')).toBeInTheDocument();
    expect(
      screen.getByText('Vector-assisted recall is contributing to too few semantic Tutor replies.')
    ).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Bridge Completion Rate')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Bridge suggestions are not converting into completed cross-surface follow-ups fast enough.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Bridge Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Page-Content Answers')).toBeInTheDocument();
    expect(screen.getByText('Native Guide Answers')).toBeInTheDocument();
    expect(screen.getByText('Brain Fallback Replies')).toBeInTheDocument();
    expect(screen.getByText('Direct Answer Rate')).toBeInTheDocument();
    expect(screen.getByText('Brain Fallback Rate')).toBeInTheDocument();
    expect(screen.getByText('Bridge Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Lekcja -> Grajmy')).toBeInTheDocument();
    expect(screen.getByText('Grajmy -> Lekcja')).toBeInTheDocument();
    expect(screen.getByText('Bridge CTA Clicks')).toBeInTheDocument();
    expect(screen.getByText('Bridge Completions')).toBeInTheDocument();
    expect(screen.getByText('Bridge Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Neo4j-backed Replies')).toBeInTheDocument();
    expect(screen.getByText('Graph Coverage')).toBeInTheDocument();
    expect(screen.getByText('Semantic Graph Replies')).toBeInTheDocument();
    expect(screen.getByText('Recall Mix')).toBeInTheDocument();
    expect(screen.getByText('Vector Assist Rate')).toBeInTheDocument();
    expect(
      screen.getByText('Replies resolved directly from Mongo-backed section page content.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Replies resolved from linked native guides without Brain fallback.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Replies that still required Brain generation after deterministic sources were checked.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Page-content and native-guide replies as a share of 6 Tutor replies.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Brain fallbacks as a share of 6 Tutor replies. Direct answers: 3.')
    ).toBeInTheDocument();
    expect(screen.getByText('Metadata 1 / Hybrid 2 / Vector-only 1')).toBeInTheDocument();
    expect(screen.getByText('Website-help graph replies: 1.')).toBeInTheDocument();
    expect(screen.getByText('Vector recall attempts: 3.')).toBeInTheDocument();
    expect(screen.getByText('Opened: 2 bridge follow-ups. Completed: 1.')).toBeInTheDocument();
    expect(
      screen.getByText('Completed follow-ups as a share of 3 bridge suggestions.')
    ).toBeInTheDocument();
    expect(screen.getByText('Graph-backed share across 6 Tutor replies.')).toBeInTheDocument();
    expect(
      screen.getByText('Hybrid and vector-only recall as a share of 3 semantic graph replies.')
    ).toBeInTheDocument();
    expect(useKangurKnowledgeGraphStatusMock).toHaveBeenCalledWith('kangur-website-help-v1');
    expect(screen.getByText('Knowledge Graph Status')).toBeInTheDocument();
    expect(screen.getByText('Neo4j semantic retrieval graph')).toBeInTheDocument();
    expect(screen.getByText('Vector ready')).toBeInTheDocument();
    expect(screen.getByText('text-embedding-3-small')).toBeInTheDocument();
    expect(screen.getAllByText('87 nodes / 108 edges')).toHaveLength(2);
    expect(screen.getByText('All canonical nodes valid')).toBeInTheDocument();
    expect(useKangurObservabilitySummaryMock).toHaveBeenCalledWith('30d');
    const allLogsHref = screen.getByRole('link', { name: /all kangur logs/i }).getAttribute('href');
    const logsUrl = new URL(allLogsHref ?? '', 'http://localhost');
    expect(logsUrl.pathname).toBe('/admin/system/logs');
    expect(logsUrl.searchParams.get('query')).toBe('kangur.');
    expect(logsUrl.searchParams.get('from')).toBe('2026-03-06T12:00:00.000Z');
    expect(logsUrl.searchParams.get('to')).toBe('2026-03-07T12:00:00.000Z');
    expect(screen.getByRole('link', { name: /view error logs/i })).toHaveAttribute(
      'href',
      '/admin/system/logs?query=kangur.&level=error&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z'
    );
    expect(screen.getByRole('link', { name: /view generation failure logs/i })).toHaveAttribute(
      'href',
      '/admin/system/logs?source=kangur.tts.generationFailed&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z'
    );
    expect(screen.getByRole('link', { name: /tts generation failure logs/i })).toHaveAttribute(
      'href',
      '/admin/system/logs?source=kangur.tts.generationFailed&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z'
    );
    expect(screen.getByRole('link', { name: /knowledge graph status json/i })).toHaveAttribute(
      'href',
      '/api/kangur/knowledge-graph/status'
    );
    expect(screen.getByRole('link', { name: /open baseline details/i })).toHaveAttribute(
      'href',
      '/admin/kangur/observability?range=30d#performance-baseline'
    );
    expect(screen.getByText('820 ms')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: /^logs$/i })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/system/logs?source=kangur.auth.me.GET&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z'
        )
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: /^logs$/i })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/system/logs?source=kangur.tts.POST&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z'
        )
    ).toBe(true);
  });

  it('syncs the knowledge graph from the status section and refreshes observability data', async () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync graph now' }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/knowledge-graph/sync',
        {
          locale: 'pl',
          withEmbeddings: true,
        },
        { timeout: 120000 }
      )
    );
    expect(
      await screen.findByText('Synced 87 nodes and 108 edges with embeddings preserved.')
    ).toBeInTheDocument();
  });

  it('switches the summary range from the segmented control', async () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.click(screen.getByRole('button', { name: '7d' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/admin/kangur/observability?range=7d', {
        scroll: false,
      });
    });
  });

  it('renders a disabled Neo4j graph status state', () => {
    useKangurObservabilitySummaryMock.mockReturnValue({
      data: {
        ...createSummary('24h'),
        knowledgeGraphStatus: {
          mode: 'disabled' as const,
          graphKey: 'kangur-website-help-v1',
          message: 'Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.',
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchMock,
    });
    useKangurKnowledgeGraphStatusMock.mockReturnValue({
      data: {
        mode: 'disabled' as const,
        graphKey: 'kangur-website-help-v1',
        message: 'Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.',
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: knowledgeGraphStatusRefetchMock,
    });

    render(<AdminKangurObservabilityPage />);

    expect(screen.getByText('Knowledge Graph Status')).toBeInTheDocument();
    expect(screen.getByText('Neo4j graph status disabled')).toBeInTheDocument();
    expect(
      screen.getByText('Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.')
    ).toBeInTheDocument();
  });
});
