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
  semanticNodeCount: number;
  embeddingNodeCount: number;
  embeddingDimensions: number | null;
  embeddingModels: string[];
  vectorIndexPresent: boolean;
  vectorIndexState: string | null;
  vectorIndexType: string | null;
  vectorIndexDimensions: number | null;
}

export const KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX = 'kangur_knowledge_node_embedding';
const KANGUR_KNOWLEDGE_GRAPH_SYNC_BATCH_SIZE = 100;

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

const buildDeleteStatements = (payload: Neo4jSyncPayload): Neo4jCypherStatement[] => [
  {
    statement: 'MATCH (n:KangurKnowledgeNode {graphKey: $graphKey}) DETACH DELETE n',
    parameters: { graphKey: payload.graphKey },
  },
];

const buildNodeWriteStatement = (
  nodes: Neo4jSyncPayload['nodes']
): Neo4jCypherStatement => ({
  statement: 'UNWIND $nodes AS node CREATE (n:KangurKnowledgeNode) SET n = node',
  parameters: { nodes },
});

const buildEdgeWriteStatement = (
  edges: Neo4jSyncPayload['edges']
): Neo4jCypherStatement => ({
  statement: `
      UNWIND $edges AS edge
      MATCH (source:KangurKnowledgeNode {graphKey: edge.graphKey, id: edge.from})
      MATCH (target:KangurKnowledgeNode {graphKey: edge.graphKey, id: edge.to})
      CREATE (source)-[relation:KANGUR_RELATION]->(target)
      SET relation = edge
    `,
  parameters: { edges },
});

const buildMetaStatement = (payload: Neo4jSyncPayload): Neo4jCypherStatement => ({
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
});

const chunkItems = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const buildKangurKnowledgeGraphSyncStatements = (
  payload: Neo4jSyncPayload
): Neo4jCypherStatement[] => [
  ...buildSchemaStatements(),
  ...buildDeleteStatements(payload),
  buildNodeWriteStatement(payload.nodes),
  buildEdgeWriteStatement(payload.edges),
  ...buildVectorIndexStatements(payload),
  buildMetaStatement(payload),
];

export async function getKangurKnowledgeGraphSyncStatusFromNeo4j(
  graphKey: string
): Promise<KangurKnowledgeGraphSyncStatus> {
  const [graphResult, indexResult] = await runNeo4jStatements([
    {
      statement: `
        OPTIONAL MATCH (meta:KangurKnowledgeGraphMeta {graphKey: $graphKey})
        WITH meta
        CALL {
          WITH $graphKey AS graphKey
          MATCH (n:KangurKnowledgeNode {graphKey: graphKey})
          RETURN
            count(n) AS liveNodeCount,
            sum(
              CASE
                WHEN n.semanticText IS NOT NULL AND trim(toString(n.semanticText)) <> ''
                THEN 1
                ELSE 0
              END
            ) AS semanticNodeCount,
            sum(
              CASE
                WHEN n.embedding IS NOT NULL AND size(n.embedding) > 0
                THEN 1
                ELSE 0
              END
            ) AS embeddingNodeCount,
            collect(
              DISTINCT CASE
                WHEN n.embeddingDimensions IS NOT NULL
                THEN toInteger(n.embeddingDimensions)
                ELSE null
              END
            ) AS rawEmbeddingDimensions,
            collect(
              DISTINCT CASE
                WHEN n.embeddingModel IS NOT NULL AND trim(toString(n.embeddingModel)) <> ''
                THEN toString(n.embeddingModel)
                ELSE null
              END
            ) AS rawEmbeddingModels
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
          liveEdgeCount,
          semanticNodeCount,
          embeddingNodeCount,
          rawEmbeddingDimensions,
          rawEmbeddingModels
      `,
      parameters: { graphKey },
    },
    {
      statement: `
        SHOW INDEXES
        YIELD name, type, state, options
        WHERE name = $indexName
        RETURN
          name AS vectorIndexName,
          type AS vectorIndexType,
          state AS vectorIndexState,
          options AS vectorIndexOptions
      `,
      parameters: { indexName: KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX },
    },
  ]);

  const record = graphResult?.records[0] ?? {};
  const liveNodeCount =
    typeof record['liveNodeCount'] === 'number' ? record['liveNodeCount'] : 0;
  const liveEdgeCount =
    typeof record['liveEdgeCount'] === 'number' ? record['liveEdgeCount'] : 0;
  const syncedAt = typeof record['syncedAt'] === 'string' ? record['syncedAt'] : null;
  const semanticNodeCount =
    typeof record['semanticNodeCount'] === 'number' ? record['semanticNodeCount'] : 0;
  const embeddingNodeCount =
    typeof record['embeddingNodeCount'] === 'number' ? record['embeddingNodeCount'] : 0;
  const rawEmbeddingDimensions = Array.isArray(record['rawEmbeddingDimensions'])
    ? record['rawEmbeddingDimensions']
    : [];
  const rawEmbeddingModels = Array.isArray(record['rawEmbeddingModels'])
    ? record['rawEmbeddingModels']
    : [];
  const embeddingDimensions = Array.from(
    new Set(
      rawEmbeddingDimensions.filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
      )
    )
  ).sort((left, right) => left - right);
  const embeddingModels = Array.from(
    new Set(
      rawEmbeddingModels.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    )
  ).sort((left, right) => left.localeCompare(right));
  const indexRecord = indexResult?.records[0] ?? {};
  const vectorIndexOptions =
    indexRecord['vectorIndexOptions'] &&
    typeof indexRecord['vectorIndexOptions'] === 'object' &&
    !Array.isArray(indexRecord['vectorIndexOptions'])
      ? (indexRecord['vectorIndexOptions'] as Record<string, unknown>)
      : null;
  const vectorIndexConfig =
    vectorIndexOptions?.['indexConfig'] &&
    typeof vectorIndexOptions['indexConfig'] === 'object' &&
    !Array.isArray(vectorIndexOptions['indexConfig'])
      ? (vectorIndexOptions['indexConfig'] as Record<string, unknown>)
      : vectorIndexOptions;
  const rawVectorIndexDimensions = vectorIndexConfig?.['vector.dimensions'];
  const vectorIndexDimensions =
    typeof rawVectorIndexDimensions === 'number' && Number.isFinite(rawVectorIndexDimensions)
      ? rawVectorIndexDimensions
      : typeof rawVectorIndexDimensions === 'string' && Number.isFinite(Number(rawVectorIndexDimensions))
        ? Number(rawVectorIndexDimensions)
        : null;

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
    semanticNodeCount,
    embeddingNodeCount,
    embeddingDimensions: embeddingDimensions.length === 1 ? (embeddingDimensions[0] ?? null) : null,
    embeddingModels,
    vectorIndexPresent:
      typeof indexRecord['vectorIndexName'] === 'string' &&
      indexRecord['vectorIndexName'] === KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX,
    vectorIndexState:
      typeof indexRecord['vectorIndexState'] === 'string' ? indexRecord['vectorIndexState'] : null,
    vectorIndexType:
      typeof indexRecord['vectorIndexType'] === 'string' ? indexRecord['vectorIndexType'] : null,
    vectorIndexDimensions,
  };
}

export async function syncKangurKnowledgeGraphToNeo4j(
  snapshot: KangurKnowledgeGraphSnapshot
): Promise<{ graphKey: string; nodeCount: number; edgeCount: number }> {
  const payload = buildKangurKnowledgeGraphSyncPayload(snapshot);
  const schemaStatements = buildSchemaStatements();
  const deleteStatements = buildDeleteStatements(payload);
  const nodeStatements = chunkItems(payload.nodes, KANGUR_KNOWLEDGE_GRAPH_SYNC_BATCH_SIZE).map(
    (chunk) => buildNodeWriteStatement(chunk)
  );
  const edgeStatements = chunkItems(payload.edges, KANGUR_KNOWLEDGE_GRAPH_SYNC_BATCH_SIZE).map(
    (chunk) => buildEdgeWriteStatement(chunk)
  );
  const metaStatement = buildMetaStatement(payload);
  const vectorIndexStatements = buildVectorIndexStatements(payload);
  const runStage = async (label: string, statements: Neo4jCypherStatement[]): Promise<void> => {
    if (statements.length === 0) {
      return;
    }
    try {
      await runNeo4jStatements(statements);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Kangur knowledge graph sync failed during ${label}: ${message}`);
    }
  };

  if (schemaStatements.length > 0) {
    await runStage('schema bootstrap', schemaStatements);
  }

  for (const [index, statement] of deleteStatements.entries()) {
    await runStage(`delete batch ${index + 1}/${deleteStatements.length}`, [statement]);
  }

  for (const [index, statement] of nodeStatements.entries()) {
    await runStage(`node batch ${index + 1}/${nodeStatements.length}`, [statement]);
  }

  for (const [index, statement] of edgeStatements.entries()) {
    await runStage(`edge batch ${index + 1}/${edgeStatements.length}`, [statement]);
  }

  if (vectorIndexStatements.length > 0) {
    await runStage('vector index bootstrap', vectorIndexStatements);
  }

  await runStage('metadata upsert', [metaStatement]);

  return {
    graphKey: snapshot.graphKey,
    nodeCount: payload.nodes.length,
    edgeCount: payload.edges.length,
  };
}
