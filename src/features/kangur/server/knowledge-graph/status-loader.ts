import 'server-only';

import type { KangurKnowledgeGraphStatusSnapshot } from '@/shared/contracts/kangur-observability';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/features/kangur/shared/contracts/kangur-knowledge-graph';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';

import { getKangurKnowledgeGraphSyncStatusFromNeo4j } from './neo4j-repository';
import { buildKangurKnowledgeGraphStatusSnapshot } from './status';

export const getKangurKnowledgeGraphStatusSnapshot = async (
  graphKey: string = KANGUR_KNOWLEDGE_GRAPH_KEY
): Promise<KangurKnowledgeGraphStatusSnapshot> => {
  if (!isNeo4jEnabled()) {
    return {
      mode: 'disabled',
      graphKey,
      message: 'Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.',
    };
  }

  const status = await getKangurKnowledgeGraphSyncStatusFromNeo4j(graphKey);
  return buildKangurKnowledgeGraphStatusSnapshot(status);
};
