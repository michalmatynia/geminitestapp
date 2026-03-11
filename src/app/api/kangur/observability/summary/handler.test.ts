import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authError, badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { authMock, getKangurObservabilitySummaryMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getKangurObservabilitySummaryMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('@/features/kangur/observability/summary', () => ({
  getKangurObservabilitySummary: getKangurObservabilitySummaryMock,
}));

import { GET_handler } from './handler';

const createRequestContext = (query?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-observability-summary-1',
    traceId: 'trace-kangur-observability-summary-1',
    correlationId: 'corr-kangur-observability-summary-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

const createRouteHealth = (source: string) => ({
  metrics: null,
  latency: null,
  investigation: {
    label: 'Inspect route logs',
    href: `/admin/system/logs?source=${encodeURIComponent(source)}`,
  },
});

describe('kangur observability summary handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized users', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: false,
        permissions: [],
      },
    });

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/kangur/observability/summary'),
        createRequestContext()
      )
    ).rejects.toMatchObject(authError('Unauthorized.'));
  });

  it('returns the Kangur summary for elevated users', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: true,
        permissions: [],
      },
    });
    getKangurObservabilitySummaryMock.mockResolvedValue({
      generatedAt: '2026-03-07T12:00:00.000Z',
      range: '7d',
      overallStatus: 'warning',
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
        authMeGet: createRouteHealth('kangur.auth.me.GET'),
        learnerSignInPost: createRouteHealth('kangur.auth.learnerSignIn.POST'),
        progressPatch: createRouteHealth('kangur.progress.PATCH'),
        scoresPost: createRouteHealth('kangur.scores.POST'),
        assignmentsPost: createRouteHealth('kangur.assignments.POST'),
        learnersPost: createRouteHealth('kangur.learners.POST'),
        ttsPost: createRouteHealth('kangur.tts.POST'),
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
          knowledgeGraphAppliedCount: 3,
          knowledgeGraphSemanticCount: 2,
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
          bridgeCompletionRatePercent: 50,
          knowledgeGraphCoverageRatePercent: 75,
          knowledgeGraphVectorAssistRatePercent: 50,
        },
        recent: [],
      },
      knowledgeGraphStatus: {
        mode: 'status',
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
        semanticReadiness: 'vector_ready',
      },
      performanceBaseline: null,
      errors: null,
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/kangur/observability/summary?range=7d'),
      createRequestContext({ range: '7d' })
    );

    expect(getKangurObservabilitySummaryMock).toHaveBeenCalledWith({ range: '7d' });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({
          range: '7d',
          overallStatus: 'warning',
        }),
      })
    );
  });

  it('rejects invalid ranges', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: true,
        permissions: [],
      },
    });

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/kangur/observability/summary?range=2h'),
        createRequestContext({ range: '2h' })
      )
    ).rejects.toMatchObject(badRequestError('Invalid range'));
  });

  it('rejects invalid summary payloads that do not match the shared contract', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: true,
        permissions: [],
      },
    });
    getKangurObservabilitySummaryMock.mockResolvedValue({
      generatedAt: '2026-03-07T12:00:00.000Z',
      range: '7d',
    });

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/kangur/observability/summary?range=7d'),
        createRequestContext({ range: '7d' })
      )
    ).rejects.toMatchObject({
      message: 'Invalid Kangur observability summary contract',
      code: 'INTERNAL_SERVER_ERROR',
      httpStatus: 500,
    });
  });
});
