import { describe, expect, it } from 'vitest';

import { buildKangurKnowledgeGraph } from '@/features/kangur/server/knowledge-graph/build-kangur-knowledge-graph';
import { buildKangurKnowledgeGraphSyncPayload } from '@/features/kangur/server/knowledge-graph/neo4j-repository';

describe('buildKangurKnowledgeGraphSyncPayload', () => {
  it('serializes Kangur graph nodes and edges into Neo4j-safe payloads', () => {
    const snapshot = buildKangurKnowledgeGraph();
    const payload = buildKangurKnowledgeGraphSyncPayload(snapshot);

    expect(payload.graphKey).toBe(snapshot.graphKey);
    expect(payload.nodes[0]).toEqual(
      expect.objectContaining({
        graphKey: snapshot.graphKey,
        id: expect.any(String),
        kind: expect.any(String),
        metadataJson: expect.any(String),
      })
    );
    expect(payload.edges[0]).toEqual(
      expect.objectContaining({
        graphKey: snapshot.graphKey,
        from: expect.any(String),
        to: expect.any(String),
      })
    );
  });
});
