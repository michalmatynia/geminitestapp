import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { authError, badRequestError } from '@/shared/errors/app-error';

const { assertSettingsManageAccessMock, getKangurKnowledgeGraphStatusSnapshotMock } = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  getKangurKnowledgeGraphStatusSnapshotMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/features/kangur/server/knowledge-graph/status-loader', () => ({
  getKangurKnowledgeGraphStatusSnapshot: getKangurKnowledgeGraphStatusSnapshotMock,
}));

import { GET_handler } from './handler';

const createRequestContext = (query?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-knowledge-graph-status-1',
    traceId: 'trace-kangur-knowledge-graph-status-1',
    correlationId: 'corr-kangur-knowledge-graph-status-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

describe('kangur knowledge graph status handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized users', async () => {
    assertSettingsManageAccessMock.mockRejectedValue(authError('Unauthorized.'));

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/kangur/knowledge-graph/status'),
        createRequestContext()
      )
    ).rejects.toMatchObject(authError('Unauthorized.'));
  });

  it('returns the Kangur knowledge graph status for elevated users', async () => {
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    getKangurKnowledgeGraphStatusSnapshotMock.mockResolvedValue({
      mode: 'status',
      graphKey: 'kangur-website-help-v1',
      present: true,
      locale: 'pl',
      syncedAt: '2026-03-12T12:00:00.000Z',
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
    });

    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/kangur/knowledge-graph/status?graphKey=kangur-website-help-v1'
      ),
      createRequestContext({ graphKey: 'kangur-website-help-v1' })
    );

    expect(getKangurKnowledgeGraphStatusSnapshotMock).toHaveBeenCalledWith(
      'kangur-website-help-v1'
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        status: expect.objectContaining({
          graphKey: 'kangur-website-help-v1',
          semanticReadiness: 'vector_ready',
        }),
      })
    );
  });

  it('rejects invalid graph keys', async () => {
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    const invalidGraphKey = 'x'.repeat(161);

    await expect(
      GET_handler(
        new NextRequest(
          `http://localhost/api/kangur/knowledge-graph/status?graphKey=${invalidGraphKey}`
        ),
        createRequestContext({ graphKey: invalidGraphKey })
      )
    ).rejects.toMatchObject(badRequestError('Invalid graph key'));
  });

  it('rejects invalid status payloads that do not match the shared contract', async () => {
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    getKangurKnowledgeGraphStatusSnapshotMock.mockResolvedValue({
      mode: 'status',
      graphKey: 'kangur-website-help-v1',
    });

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/kangur/knowledge-graph/status'),
        createRequestContext()
      )
    ).rejects.toMatchObject({
      message: 'Invalid Kangur knowledge graph status contract',
      code: 'INTERNAL_SERVER_ERROR',
      httpStatus: 500,
    });
  });
});
