import 'server-only';

import { runNeo4jStatements, type Neo4jCypherStatement } from '@/shared/lib/neo4j/client';
import type { KangurKnowledgeCanonicalSourceCollection, KangurKnowledgeGraphSnapshot } from '@/shared/contracts/kangur-knowledge-graph';

type Neo4jSyncPayload = {
  graphKey: string;
  locale: string;
  generatedAt: string;
  sourceIntegrity: {
    canonicalNodeCount: number;
    validCanonicalNodeCount: number;
    invalidCanonicalNodeCount: number;
  };
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
};

type KangurKnowledgeGraphSourceIntegrityIssue = {
  nodeId: string;
  sourceCollection: KangurKnowledgeCanonicalSourceCollection;
  missingFields: Array<'sourceRecordId' | 'sourcePath'>;
};

type KangurKnowledgeGraphSourceIntegritySummary = {
  canonicalNodeCount: number;
  validCanonicalNodeCount: number;
  invalidCanonicalNodeCount: number;
  issues: KangurKnowledgeGraphSourceIntegrityIssue[];
};

export interface KangurKnowledgeGraphSyncStatus {
  graphKey: string;
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
}

export const KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX = 'kangur_knowledge_node_embedding';

const serializeMetadata = (metadata: Record<string, unknown> | undefined): string | null =>
  metadata ? JSON.stringify(metadata) : null;

const isBlank = (value: string | undefined): boolean => !value?.trim();

export const summarizeKangurKnowledgeGraphSourceIntegrity = (
  snapshot: KangurKnowledgeGraphSnapshot
): KangurKnowledgeGraphSourceIntegritySummary => {
  const issues = snapshot.nodes.flatMap<KangurKnowledgeGraphSourceIntegrityIssue>((node) => {
    if (!node.sourceCollection) {
      return [];
    }

    const missingFields: KangurKnowledgeGraphSourceIntegrityIssue['missingFields'] = [];
    if (isBlank(node.sourceRecordId)) {
      missingFields.push('sourceRecordId');
    }
    if (isBlank(node.sourcePath)) {
      missingFields.push('sourcePath');
    }

    if (missingFields.length === 0) {
      return [];
    }

    return [
      {
        nodeId: node.id,
        sourceCollection: node.sourceCollection,
        missingFields,
      },
    ];
  });

  const canonicalNodeCount = snapshot.nodes.filter((node) => node.sourceCollection).length;

  return {
    canonicalNodeCount,
    validCanonicalNodeCount: canonicalNodeCount - issues.length,
    invalidCanonicalNodeCount: issues.length,
    issues,
  };
};

export const validateKangurKnowledgeGraphSourceIntegrity = (
  snapshot: KangurKnowledgeGraphSnapshot
): void => {
  const summary = summarizeKangurKnowledgeGraphSourceIntegrity(snapshot);
  if (summary.issues.length === 0) {
    return;
  }

  const detail = summary.issues
    .map((issue) => `${issue.nodeId} [${issue.sourceCollection}] missing ${issue.missingFields.join(', ')}`)
    .join('; ');

  throw new Error(
    `Kangur knowledge graph contains ${summary.invalidCanonicalNodeCount} canonical nodes without complete source references: ${detail}`
  );
};

export const buildKangurKnowledgeGraphSyncPayload = (
  snapshot: KangurKnowledgeGraphSnapshot
): Neo4jSyncPayload => {
  const sourceIntegrity = summarizeKangurKnowledgeGraphSourceIntegrity(snapshot);
  validateKangurKnowledgeGraphSourceIntegrity(snapshot);

  return {
    graphKey: snapshot.graphKey,
    locale: snapshot.locale,
    generatedAt: snapshot.generatedAt,
    sourceIntegrity: {
      canonicalNodeCount: sourceIntegrity.canonicalNodeCount,
      validCanonicalNodeCount: sourceIntegrity.validCanonicalNodeCount,
      invalidCanonicalNodeCount: sourceIntegrity.invalidCanonicalNodeCount,
    },
    nodes: snapshot.nodes.map((node) => ({
      graphKey: snapshot.graphKey,
      id: node.id,
      kind: node.kind,
      title: node.title,
      summary: node.summary ?? null,
      source: node.source,
      locale: node.locale ?? snapshot.locale,
      surface: node.surface ?? null,
      focusKind: node.focusKind ?? null,
      route: node.route ?? null,
      anchorId: node.anchorId ?? null,
      refId: node.refId ?? null,
      focusIdPrefixes: node.focusIdPrefixes ?? [],
      contentIdPrefixes: node.contentIdPrefixes ?? [],
      triggerPhrases: node.triggerPhrases ?? [],
      semanticText: node.semanticText ?? null,
      embedding: node.embedding ?? [],
      embeddingModel: node.embeddingModel ?? null,
      embeddingDimensions: node.embeddingDimensions ?? null,
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
  };
};

const buildSchemaStatements = (): Neo4jCypherStatement[] => [
  {
    statement:
      'CREATE CONSTRAINT kangur_knowledge_node_identity IF NOT EXISTS FOR (n:KangurKnowledgeNode) REQUIRE (n.graphKey, n.id) IS UNIQUE',
  },
  {
    statement:
      'CREATE CONSTRAINT kangur_knowledge_graph_meta_identity IF NOT EXISTS FOR (n:KangurKnowledgeGraphMeta) REQUIRE n.graphKey IS UNIQUE',
  },
  {
    statement:
      'CREATE INDEX kangur_knowledge_node_graph_key IF NOT EXISTS FOR (n:KangurKnowledgeNode) ON (n.graphKey)',
  },
];

const resolveEmbeddingDimensions = (payload: Neo4jSyncPayload): number | null => {
  const dimensions = Array.from(
    new Set(
      payload.nodes
        .map((node) =>
          typeof node['embeddingDimensions'] === 'number' ? node['embeddingDimensions'] : null
        )
        .filter((value): value is number => typeof value === 'number' && value > 0)
    )
  );

  return dimensions.length === 1 ? (dimensions[0] ?? null) : null;
};

const buildVectorIndexStatements = (payload: Neo4jSyncPayload): Neo4jCypherStatement[] => {
  const dimensions = resolveEmbeddingDimensions(payload);
  if (!dimensions) {
    return [];
  }

  return [
    {
      statement: `DROP INDEX ${KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX} IF EXISTS`,
    },
    {
      statement: `
        CREATE VECTOR INDEX ${KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX} IF NOT EXISTS
        FOR (n:KangurKnowledgeNode)
        ON (n.embedding)
        OPTIONS {
          indexConfig: {
            \`vector.dimensions\`: ${dimensions},
            \`vector.similarity_function\`: 'cosine'
          }
        }
      `,
    },
  ];
};

export const buildKangurKnowledgeGraphSyncStatements = (
  payload: Neo4jSyncPayload
): Neo4jCypherStatement[] => [
  ...buildSchemaStatements(),
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
  ...buildVectorIndexStatements(payload),
  {
    statement: `
      MERGE (meta:KangurKnowledgeGraphMeta {graphKey: $graphKey})
      SET meta.locale = $locale,
          meta.syncedAt = $generatedAt,
          meta.nodeCount = $nodeCount,
          meta.edgeCount = $edgeCount,
          meta.canonicalNodeCount = $canonicalNodeCount,
          meta.validCanonicalNodeCount = $validCanonicalNodeCount,
          meta.invalidCanonicalNodeCount = $invalidCanonicalNodeCount
    `,
    parameters: {
      graphKey: payload.graphKey,
      locale: payload.locale,
      generatedAt: payload.generatedAt,
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
      canonicalNodeCount: payload.sourceIntegrity.canonicalNodeCount,
      validCanonicalNodeCount: payload.sourceIntegrity.validCanonicalNodeCount,
      invalidCanonicalNodeCount: payload.sourceIntegrity.invalidCanonicalNodeCount,
    },
  },
];

export async function getKangurKnowledgeGraphSyncStatusFromNeo4j(
  graphKey: string
): Promise<KangurKnowledgeGraphSyncStatus> {
  const [result] = await runNeo4jStatements([
    {
      statement: `
        OPTIONAL MATCH (meta:KangurKnowledgeGraphMeta {graphKey: $graphKey})
        WITH meta
        CALL {
          WITH $graphKey AS graphKey
          MATCH (n:KangurKnowledgeNode {graphKey: graphKey})
          RETURN count(n) AS liveNodeCount
        }
        CALL {
          WITH $graphKey AS graphKey
          MATCH (:KangurKnowledgeNode {graphKey: graphKey})-[r:KANGUR_RELATION]->(:KangurKnowledgeNode {graphKey: graphKey})
          RETURN count(r) AS liveEdgeCount
        }
        RETURN
          meta.graphKey AS graphKey,
          meta.locale AS locale,
          meta.syncedAt AS syncedAt,
          meta.nodeCount AS syncedNodeCount,
          meta.edgeCount AS syncedEdgeCount,
          meta.canonicalNodeCount AS canonicalNodeCount,
          meta.validCanonicalNodeCount AS validCanonicalNodeCount,
          meta.invalidCanonicalNodeCount AS invalidCanonicalNodeCount,
          liveNodeCount,
          liveEdgeCount
      `,
      parameters: { graphKey },
    },
  ]);

  const record = result?.records[0] ?? {};
  const liveNodeCount =
    typeof record['liveNodeCount'] === 'number' ? record['liveNodeCount'] : 0;
  const liveEdgeCount =
    typeof record['liveEdgeCount'] === 'number' ? record['liveEdgeCount'] : 0;
  const syncedAt = typeof record['syncedAt'] === 'string' ? record['syncedAt'] : null;

  return {
    graphKey,
    present: Boolean(syncedAt) || liveNodeCount > 0 || liveEdgeCount > 0,
    locale: typeof record['locale'] === 'string' ? record['locale'] : null,
    syncedAt,
    syncedNodeCount:
      typeof record['syncedNodeCount'] === 'number' ? record['syncedNodeCount'] : null,
    syncedEdgeCount:
      typeof record['syncedEdgeCount'] === 'number' ? record['syncedEdgeCount'] : null,
    liveNodeCount,
    liveEdgeCount,
    canonicalNodeCount:
      typeof record['canonicalNodeCount'] === 'number' ? record['canonicalNodeCount'] : null,
    validCanonicalNodeCount:
      typeof record['validCanonicalNodeCount'] === 'number'
        ? record['validCanonicalNodeCount']
        : null,
    invalidCanonicalNodeCount:
      typeof record['invalidCanonicalNodeCount'] === 'number'
        ? record['invalidCanonicalNodeCount']
        : null,
  };
}

export async function syncKangurKnowledgeGraphToNeo4j(
  snapshot: KangurKnowledgeGraphSnapshot
): Promise<{ graphKey: string; nodeCount: number; edgeCount: number }> {
  const payload = buildKangurKnowledgeGraphSyncPayload(snapshot);
  await runNeo4jStatements(buildKangurKnowledgeGraphSyncStatements(payload));
  return {
    graphKey: snapshot.graphKey,
    nodeCount: payload.nodes.length,
    edgeCount: payload.edges.length,
  };
}
