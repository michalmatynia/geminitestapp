import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, badRequestError } from '@/shared/errors/app-error';

const {
  assertSettingsManageAccessMock,
  isNeo4jEnabledMock,
  buildKangurKnowledgeGraphFromRepositoriesMock,
  enrichKangurKnowledgeGraphWithEmbeddingsMock,
  syncKangurKnowledgeGraphToNeo4jMock,
  getKangurKnowledgeGraphStatusSnapshotMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  isNeo4jEnabledMock: vi.fn(),
  buildKangurKnowledgeGraphFromRepositoriesMock: vi.fn(),
  enrichKangurKnowledgeGraphWithEmbeddingsMock: vi.fn(),
  syncKangurKnowledgeGraphToNeo4jMock: vi.fn(),
  getKangurKnowledgeGraphStatusSnapshotMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/neo4j/config', () => ({
  isNeo4jEnabled: isNeo4jEnabledMock,
}));

vi.mock('@/features/kangur/server/knowledge-graph/source-loader', () => ({
  buildKangurKnowledgeGraphFromRepositories: buildKangurKnowledgeGraphFromRepositoriesMock,
}));

vi.mock('@/features/kangur/server/knowledge-graph/semantic', () => ({
  enrichKangurKnowledgeGraphWithEmbeddings: enrichKangurKnowledgeGraphWithEmbeddingsMock,
}));

vi.mock('@/features/kangur/server/knowledge-graph/neo4j-repository', () => ({
  syncKangurKnowledgeGraphToNeo4j: syncKangurKnowledgeGraphToNeo4jMock,
}));

vi.mock('@/features/kangur/server/knowledge-graph/status-loader', () => ({
  getKangurKnowledgeGraphStatusSnapshot: getKangurKnowledgeGraphStatusSnapshotMock,
}));

import { postHandler } from './handler';

const createRequestContext = (body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-knowledge-graph-sync-1',
    traceId: 'trace-kangur-knowledge-graph-sync-1',
    correlationId: 'corr-kangur-knowledge-graph-sync-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('kangur knowledge graph sync handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNeo4jEnabledMock.mockReturnValue(true);
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    buildKangurKnowledgeGraphFromRepositoriesMock.mockResolvedValue({
      graphKey: 'kangur-website-help-v1',
      locale: 'pl',
      generatedAt: '2026-03-12T12:00:00.000Z',
      nodes: [],
      edges: [],
    });
    enrichKangurKnowledgeGraphWithEmbeddingsMock.mockImplementation(async (snapshot) => snapshot);
    syncKangurKnowledgeGraphToNeo4jMock.mockResolvedValue({
      graphKey: 'kangur-website-help-v1',
      nodeCount: 87,
      edgeCount: 108,
    });
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
  });

  it('rejects unauthorized users', async () => {
    assertSettingsManageAccessMock.mockRejectedValue(authError('Unauthorized.'));

    await expect(
      postHandler(
        new NextRequest('http://localhost/api/kangur/knowledge-graph/sync', { method: 'POST' }),
        createRequestContext({})
      )
    ).rejects.toMatchObject(authError('Unauthorized.'));
  });

  it('rejects sync when Neo4j is not enabled', async () => {
    isNeo4jEnabledMock.mockReturnValue(false);

    await expect(
      postHandler(
        new NextRequest('http://localhost/api/kangur/knowledge-graph/sync', { method: 'POST' }),
        createRequestContext({})
      )
    ).rejects.toMatchObject(
      badRequestError('Neo4j is not enabled for Kangur knowledge graph sync.')
    );
  });

  it('syncs the Kangur knowledge graph and returns the refreshed status', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/kangur/knowledge-graph/sync', { method: 'POST' }),
      createRequestContext({
        locale: 'pl',
        withEmbeddings: true,
      })
    );

    expect(buildKangurKnowledgeGraphFromRepositoriesMock).toHaveBeenCalledWith({
      locale: 'pl',
    });
    expect(enrichKangurKnowledgeGraphWithEmbeddingsMock).toHaveBeenCalled();
    expect(syncKangurKnowledgeGraphToNeo4jMock).toHaveBeenCalledWith({
      graphKey: 'kangur-website-help-v1',
      locale: 'pl',
      generatedAt: '2026-03-12T12:00:00.000Z',
      nodes: [],
      edges: [],
    });
    expect(getKangurKnowledgeGraphStatusSnapshotMock).toHaveBeenCalledWith(
      'kangur-website-help-v1'
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        sync: expect.objectContaining({
          graphKey: 'kangur-website-help-v1',
          locale: 'pl',
          nodeCount: 87,
          edgeCount: 108,
          withEmbeddings: true,
        }),
        status: expect.objectContaining({
          graphKey: 'kangur-website-help-v1',
          semanticReadiness: 'vector_ready',
        }),
      })
    );
  });
});
