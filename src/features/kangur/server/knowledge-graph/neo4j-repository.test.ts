import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runNeo4jStatementsMock } = vi.hoisted(() => ({
  runNeo4jStatementsMock: vi.fn(),
}));

vi.mock('@/shared/lib/neo4j/client', () => ({
  runNeo4jStatements: runNeo4jStatementsMock,
}));

import { buildKangurKnowledgeGraph } from '@/features/kangur/server/knowledge-graph/build-kangur-knowledge-graph';
import {
  buildKangurKnowledgeGraphSyncPayload,
  buildKangurKnowledgeGraphSyncStatements,
  getKangurKnowledgeGraphSyncStatusFromNeo4j,
  summarizeKangurKnowledgeGraphSourceIntegrity,
} from '@/features/kangur/server/knowledge-graph/neo4j-repository';

describe('buildKangurKnowledgeGraphSyncPayload', () => {
  beforeEach(() => {
    runNeo4jStatementsMock.mockReset();
  });

  it('serializes Kangur graph nodes and edges into Neo4j-safe payloads', () => {
    const snapshot = buildKangurKnowledgeGraph();
    const payload = buildKangurKnowledgeGraphSyncPayload(snapshot);

    expect(payload.graphKey).toBe(snapshot.graphKey);
    expect(payload.locale).toBe(snapshot.locale);
    expect(payload.generatedAt).toBe(snapshot.generatedAt);
    expect(payload.sourceIntegrity).toEqual(
      expect.objectContaining({
        canonicalNodeCount: expect.any(Number),
        validCanonicalNodeCount: expect.any(Number),
        invalidCanonicalNodeCount: 0,
      })
    );
    expect(payload.nodes[0]).toEqual(
      expect.objectContaining({
        graphKey: snapshot.graphKey,
        id: expect.any(String),
        kind: expect.any(String),
        metadataJson: expect.any(String),
      })
    );
    expect(payload.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'anchor:kangur:login',
          sourceCollection: 'kangur_ai_tutor_content',
          sourceRecordId: 'pl',
          sourcePath: 'common.signInLabel',
        }),
        expect.objectContaining({
          id: 'guide:native:lesson-header',
          surface: 'lesson',
          focusKind: 'lesson_header',
          focusIdPrefixes: ['kangur-lesson-header'],
          contentIdPrefixes: [],
          triggerPhrases: expect.arrayContaining(['naglowek']),
          semanticText: expect.stringContaining('Naglowek lekcji'),
          embedding: [],
          embeddingModel: null,
        }),
      ])
    );
    expect(payload.edges[0]).toEqual(
      expect.objectContaining({
        graphKey: snapshot.graphKey,
        from: expect.any(String),
        to: expect.any(String),
      })
    );
  });

  it('summarizes canonical source integrity for Kangur graph nodes', () => {
    const snapshot = buildKangurKnowledgeGraph();

    expect(summarizeKangurKnowledgeGraphSourceIntegrity(snapshot)).toEqual(
      expect.objectContaining({
        canonicalNodeCount: expect.any(Number),
        validCanonicalNodeCount: expect.any(Number),
        invalidCanonicalNodeCount: 0,
        issues: [],
      })
    );
  });

  it('fails fast when a canonical source node loses required references', () => {
    const snapshot = buildKangurKnowledgeGraph();
    const brokenSnapshot = {
      ...snapshot,
      nodes: snapshot.nodes.map((node) =>
        node.id === 'anchor:kangur:login'
          ? {
              ...node,
              sourceRecordId: '  ',
              sourcePath: '',
            }
          : node
      ),
    };

    expect(() => buildKangurKnowledgeGraphSyncPayload(brokenSnapshot)).toThrow(
      /anchor:kangur:login \[kangur_ai_tutor_content\] missing sourceRecordId, sourcePath/
    );
  });

  it('boots Neo4j schema before replacing Kangur graph contents', () => {
    const snapshot = buildKangurKnowledgeGraph();
    const payload = buildKangurKnowledgeGraphSyncPayload(snapshot);
    const statements = buildKangurKnowledgeGraphSyncStatements(payload);

    expect(statements.slice(0, 3)).toEqual([
      expect.objectContaining({
        statement: expect.stringContaining(
          'CREATE CONSTRAINT kangur_knowledge_node_identity IF NOT EXISTS'
        ),
      }),
      expect.objectContaining({
        statement: expect.stringContaining(
          'CREATE CONSTRAINT kangur_knowledge_graph_meta_identity IF NOT EXISTS'
        ),
      }),
      expect.objectContaining({
        statement: expect.stringContaining(
          'CREATE INDEX kangur_knowledge_node_graph_key IF NOT EXISTS'
        ),
      }),
    ]);
    expect(statements[3]).toEqual(
      expect.objectContaining({
        statement: 'MATCH (n:KangurKnowledgeNode {graphKey: $graphKey}) DETACH DELETE n',
        parameters: { graphKey: snapshot.graphKey },
      })
    );
    expect(statements.at(-1)).toEqual(
      expect.objectContaining({
        statement: expect.stringContaining('MERGE (meta:KangurKnowledgeGraphMeta {graphKey: $graphKey})'),
        parameters: expect.objectContaining({
          graphKey: snapshot.graphKey,
          locale: snapshot.locale,
          generatedAt: snapshot.generatedAt,
          canonicalNodeCount: expect.any(Number),
        }),
      })
    );
  });

  it('creates a Neo4j vector index when graph nodes include embeddings', () => {
    const snapshot = buildKangurKnowledgeGraph();
    const payload = buildKangurKnowledgeGraphSyncPayload({
      ...snapshot,
      nodes: snapshot.nodes.map((node, index) => ({
        ...node,
        embedding: [index + 1, 1],
        embeddingModel: 'text-embedding-3-small',
        embeddingDimensions: 2,
      })),
    });
    const statements = buildKangurKnowledgeGraphSyncStatements(payload);

    expect(statements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          statement: expect.stringContaining('DROP INDEX kangur_knowledge_node_embedding IF EXISTS'),
        }),
        expect.objectContaining({
          statement: expect.stringContaining('CREATE VECTOR INDEX kangur_knowledge_node_embedding IF NOT EXISTS'),
        }),
      ])
    );
  });

  it('reads live Kangur graph sync status from Neo4j metadata', async () => {
    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            graphKey: 'kangur-website-help-v1',
            locale: 'pl',
            syncedAt: '2026-03-11T20:00:00.000Z',
            syncedNodeCount: 87,
            syncedEdgeCount: 108,
            canonicalNodeCount: 80,
            validCanonicalNodeCount: 80,
            invalidCanonicalNodeCount: 0,
            liveNodeCount: 87,
            liveEdgeCount: 108,
          },
        ],
      },
    ]);

    await expect(
      getKangurKnowledgeGraphSyncStatusFromNeo4j('kangur-website-help-v1')
    ).resolves.toEqual({
      graphKey: 'kangur-website-help-v1',
      present: true,
      locale: 'pl',
      syncedAt: '2026-03-11T20:00:00.000Z',
      syncedNodeCount: 87,
      syncedEdgeCount: 108,
      liveNodeCount: 87,
      liveEdgeCount: 108,
      canonicalNodeCount: 80,
      validCanonicalNodeCount: 80,
      invalidCanonicalNodeCount: 0,
    });
    expect(runNeo4jStatementsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        statement: expect.stringContaining('OPTIONAL MATCH (meta:KangurKnowledgeGraphMeta {graphKey: $graphKey})'),
        parameters: { graphKey: 'kangur-website-help-v1' },
      }),
    ]);
  });
});
