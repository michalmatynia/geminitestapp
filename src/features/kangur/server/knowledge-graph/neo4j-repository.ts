import 'server-only';

import { runNeo4jStatements, type Neo4jCypherStatement } from '@/shared/lib/neo4j/client';
import type { KangurKnowledgeGraphSnapshot } from '@/shared/contracts/kangur-knowledge-graph';

type Neo4jSyncPayload = {
  graphKey: string;
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
};

const serializeMetadata = (metadata: Record<string, unknown> | undefined): string | null =>
  metadata ? JSON.stringify(metadata) : null;

export const buildKangurKnowledgeGraphSyncPayload = (
  snapshot: KangurKnowledgeGraphSnapshot
): Neo4jSyncPayload => ({
  graphKey: snapshot.graphKey,
  nodes: snapshot.nodes.map((node) => ({
    graphKey: snapshot.graphKey,
    id: node.id,
    kind: node.kind,
    title: node.title,
    summary: node.summary ?? null,
    source: node.source,
    locale: node.locale ?? snapshot.locale,
    route: node.route ?? null,
    anchorId: node.anchorId ?? null,
    refId: node.refId ?? null,
    sourceCollection: node.sourceCollection ?? null,
    sourceRecordId: node.sourceRecordId ?? null,
    sourcePath: node.sourcePath ?? null,
    tags: node.tags ?? [],
    metadataJson: serializeMetadata(node.metadata),
  })),
  edges: snapshot.edges.map((edge) => ({
    graphKey: snapshot.graphKey,
    id: edge.id,
    kind: edge.kind,
    from: edge.from,
    to: edge.to,
    description: edge.description ?? null,
    weight: edge.weight ?? null,
    metadataJson: serializeMetadata(edge.metadata),
  })),
});

const buildSyncStatements = (payload: Neo4jSyncPayload): Neo4jCypherStatement[] => [
  {
    statement: 'MATCH (n:KangurKnowledgeNode {graphKey: $graphKey}) DETACH DELETE n',
    parameters: { graphKey: payload.graphKey },
  },
  {
    statement: 'UNWIND $nodes AS node CREATE (n:KangurKnowledgeNode) SET n = node',
    parameters: { nodes: payload.nodes },
  },
  {
    statement: `
      UNWIND $edges AS edge
      MATCH (source:KangurKnowledgeNode {graphKey: edge.graphKey, id: edge.from})
      MATCH (target:KangurKnowledgeNode {graphKey: edge.graphKey, id: edge.to})
      CREATE (source)-[relation:KANGUR_RELATION]->(target)
      SET relation = edge
    `,
    parameters: { edges: payload.edges },
  },
];

export async function syncKangurKnowledgeGraphToNeo4j(
  snapshot: KangurKnowledgeGraphSnapshot
): Promise<{ graphKey: string; nodeCount: number; edgeCount: number }> {
  const payload = buildKangurKnowledgeGraphSyncPayload(snapshot);
  await runNeo4jStatements(buildSyncStatements(payload));
  return {
    graphKey: snapshot.graphKey,
    nodeCount: payload.nodes.length,
    edgeCount: payload.edges.length,
  };
}
