import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, badRequestError } from '@/shared/errors/app-error';

const {
  authMock,
  isNeo4jEnabledMock,
  getKangurAiTutorContentMock,
  getKangurAiTutorNativeGuideStoreMock,
  getKangurPageContentStoreMock,
  buildKangurKnowledgeGraphMock,
  enrichKangurKnowledgeGraphWithEmbeddingsMock,
  syncKangurKnowledgeGraphToNeo4jMock,
  getKangurKnowledgeGraphStatusSnapshotMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  isNeo4jEnabledMock: vi.fn(),
  getKangurAiTutorContentMock: vi.fn(),
  getKangurAiTutorNativeGuideStoreMock: vi.fn(),
  getKangurPageContentStoreMock: vi.fn(),
  buildKangurKnowledgeGraphMock: vi.fn(),
  enrichKangurKnowledgeGraphWithEmbeddingsMock: vi.fn(),
  syncKangurKnowledgeGraphToNeo4jMock: vi.fn(),
  getKangurKnowledgeGraphStatusSnapshotMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('@/shared/lib/neo4j/config', () => ({
  isNeo4jEnabled: isNeo4jEnabledMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-content-repository', () => ({
  getKangurAiTutorContent: getKangurAiTutorContentMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-native-guide-repository', () => ({
  getKangurAiTutorNativeGuideStore: getKangurAiTutorNativeGuideStoreMock,
}));

vi.mock('@/features/kangur/server/page-content-repository', () => ({
  getKangurPageContentStore: getKangurPageContentStoreMock,
}));

vi.mock('@/features/kangur/server/knowledge-graph/build-kangur-knowledge-graph', () => ({
  buildKangurKnowledgeGraph: buildKangurKnowledgeGraphMock,
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

import { POST_handler } from './handler';

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
    getKangurAiTutorContentMock.mockResolvedValue({ sections: [] });
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue({ locale: 'pl', version: 1, entries: [] });
    getKangurPageContentStoreMock.mockResolvedValue({ locale: 'pl', version: 1, entries: [] });
    buildKangurKnowledgeGraphMock.mockReturnValue({
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
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: false,
        permissions: [],
      },
    });

    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/kangur/knowledge-graph/sync', { method: 'POST' }),
        createRequestContext({})
      )
    ).rejects.toMatchObject(authError('Unauthorized.'));
  });

  it('rejects sync when Neo4j is not enabled', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: true,
        permissions: [],
      },
    });
    isNeo4jEnabledMock.mockReturnValue(false);

    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/kangur/knowledge-graph/sync', { method: 'POST' }),
        createRequestContext({})
      )
    ).rejects.toMatchObject(
      badRequestError('Neo4j is not enabled for Kangur knowledge graph sync.')
    );
  });

  it('syncs the Kangur knowledge graph and returns the refreshed status', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: true,
        permissions: [],
      },
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/kangur/knowledge-graph/sync', { method: 'POST' }),
      createRequestContext({
        locale: 'pl',
        withEmbeddings: true,
      })
    );

    expect(getKangurAiTutorContentMock).toHaveBeenCalledWith('pl');
    expect(getKangurAiTutorNativeGuideStoreMock).toHaveBeenCalledWith('pl');
    expect(getKangurPageContentStoreMock).toHaveBeenCalledWith('pl');
    expect(buildKangurKnowledgeGraphMock).toHaveBeenCalledWith({
      locale: 'pl',
      tutorContent: { sections: [] },
      nativeGuideStore: { locale: 'pl', version: 1, entries: [] },
      pageContentStore: { locale: 'pl', version: 1, entries: [] },
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
