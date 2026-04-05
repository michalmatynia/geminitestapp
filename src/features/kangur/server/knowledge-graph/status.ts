import type { KangurKnowledgeGraphSemanticReadiness } from '@/shared/contracts/kangur-observability';
import type { KangurKnowledgeGraphStatusSnapshot } from '@/shared/contracts/kangur-observability';

import type { KangurKnowledgeGraphSyncStatus } from './neo4j-repository';

const toPercent = (numerator: number, denominator: number): number | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
};

export const resolveKangurKnowledgeGraphSemanticReadiness = (
  status: KangurKnowledgeGraphSyncStatus
): KangurKnowledgeGraphSemanticReadiness => {
  if (!status.present || status.liveNodeCount <= 0) {
    return 'no_graph';
  }

  if (status.semanticNodeCount <= 0) {
    return 'no_semantic_text';
  }

  if (status.embeddingNodeCount <= 0) {
    return 'metadata_only';
  }

  if (!status.vectorIndexPresent) {
    return 'embeddings_without_index';
  }

  if ((status.vectorIndexState ?? '').toUpperCase() !== 'ONLINE') {
    return 'vector_index_pending';
  }

  return 'vector_ready';
};

export const buildKangurKnowledgeGraphStatusSnapshot = (
  status: KangurKnowledgeGraphSyncStatus
): Extract<KangurKnowledgeGraphStatusSnapshot, { mode: 'status' }> => ({
  mode: 'status',
  ...status,
  semanticCoverageRatePercent: toPercent(status.semanticNodeCount, status.liveNodeCount),
  embeddingCoverageRatePercent: toPercent(status.embeddingNodeCount, status.liveNodeCount),
  semanticReadiness: resolveKangurKnowledgeGraphSemanticReadiness(status),
});
