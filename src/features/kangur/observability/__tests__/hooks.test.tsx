/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { kangurKeys } from '@/shared/lib/query-key-exports';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/features/kangur/shared/contracts/kangur-knowledge-graph';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
}));

import { useKangurKnowledgeGraphStatus, useKangurObservabilitySummary } from '../hooks';

const createTestClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const createSummaryResponse = () => ({
  summary: {
    generatedAt: '2026-03-07T12:00:00.000Z',
    range: '7d' as const,
    overallStatus: 'warning' as const,
    window: {
      from: '2026-02-28T12:00:00.000Z',
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
    alerts: [],
    serverLogs: {
      metrics: null,
      recent: [],
    },
    routes: {
      authMeGet: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.auth.me.GET',
        },
      },
      learnerSignInPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.auth.learnerSignIn.POST',
        },
      },
      progressPatch: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.progress.PATCH',
        },
      },
      scoresPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.scores.POST',
        },
      },
      assignmentsPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.assignments.POST',
        },
      },
      learnersPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.learners.POST',
        },
      },
      ttsPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.tts.POST',
        },
      },
    },
    analytics: {
      totals: { events: 10, pageviews: 4 },
      visitors: 3,
      sessions: 5,
      topPaths: [],
      topEventNames: [],
      importantEvents: [],
      aiTutor: {
        messageSucceededCount: 4,
        pageContentAnswerCount: 1,
        nativeGuideAnswerCount: 1,
        brainAnswerCount: 2,
        knowledgeGraphAppliedCount: 3,
        knowledgeGraphSemanticCount: 2,
        knowledgeGraphWebsiteHelpCount: 1,
        knowledgeGraphMetadataOnlyRecallCount: 1,
        knowledgeGraphHybridRecallCount: 1,
        knowledgeGraphVectorOnlyRecallCount: 1,
        knowledgeGraphVectorRecallAttemptedCount: 2,
        bridgeSuggestionCount: 2,
        lessonToGameBridgeSuggestionCount: 1,
        gameToLessonBridgeSuggestionCount: 1,
        bridgeQuickActionClickCount: 1,
        bridgeFollowUpClickCount: 1,
        bridgeFollowUpCompletionCount: 1,
        directAnswerRatePercent: 50,
        brainFallbackRatePercent: 50,
        bridgeCompletionRatePercent: 50,
        knowledgeGraphCoverageRatePercent: 75,
        knowledgeGraphVectorAssistRatePercent: 100,
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
    performanceBaseline: null,
    errors: null,
  },
});

const createKnowledgeGraphStatusResponse = () => ({
  status: {
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
});

describe('useKangurObservabilitySummary', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestClient();
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('loads the Kangur observability summary through the shared API client', async () => {
    apiGetMock.mockResolvedValue(createSummaryResponse());

    const { result } = renderHook(() => useKangurObservabilitySummary('7d'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/observability/summary', {
      params: { range: '7d' },
    });
    expect(result.current.data).toEqual(createSummaryResponse().summary);
    expect(
      queryClient.getQueryCache().find({
        queryKey: kangurKeys.observability.summary('7d'),
      })
    ).toBeDefined();
  });

  it('fails when the API payload does not match the shared summary contract', async () => {
    apiGetMock.mockResolvedValue({
      summary: {
        generatedAt: '2026-03-07T12:00:00.000Z',
        range: '7d',
      },
    });

    const { result } = renderHook(() => useKangurObservabilitySummary('7d'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Invalid Kangur observability summary response');
  });
});

describe('useKangurKnowledgeGraphStatus', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestClient();
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('loads the Kangur knowledge graph status through the shared API client', async () => {
    apiGetMock.mockResolvedValue(createKnowledgeGraphStatusResponse());

    const { result } = renderHook(() => useKangurKnowledgeGraphStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/knowledge-graph/status', {
      params: { graphKey: KANGUR_KNOWLEDGE_GRAPH_KEY },
    });
    expect(result.current.data).toEqual(createKnowledgeGraphStatusResponse().status);
    expect(
      queryClient.getQueryCache().find({
        queryKey: kangurKeys.observability.knowledgeGraphStatus(KANGUR_KNOWLEDGE_GRAPH_KEY),
      })
    ).toBeDefined();
  });

  it('fails when the graph status API payload does not match the shared contract', async () => {
    apiGetMock.mockResolvedValue({
      status: {
        mode: 'status',
        graphKey: 'kangur-website-help-v1',
      },
    });

    const { result } = renderHook(() => useKangurKnowledgeGraphStatus(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Invalid Kangur knowledge graph status response');
  });
});
