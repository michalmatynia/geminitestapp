import {
  buildKangurKnowledgeGraphStatusSnapshot,
  resolveKangurKnowledgeGraphSemanticReadiness,
} from '@/features/kangur/server/knowledge-graph/status';
import type { KangurKnowledgeGraphStatusSnapshot } from '@/shared/contracts/kangur-observability';

export type KangurKnowledgeGraphStatusOutput = Extract<
  KangurKnowledgeGraphStatusSnapshot,
  { mode: 'status' }
>;

export type KangurKnowledgeGraphStatusScanStatus = 'ok' | 'warning';
export const buildKangurKnowledgeGraphStatusOutput = buildKangurKnowledgeGraphStatusSnapshot;
export { resolveKangurKnowledgeGraphSemanticReadiness };

export const resolveKangurKnowledgeGraphStatusScanStatus = (
  status: KangurKnowledgeGraphStatusOutput
): KangurKnowledgeGraphStatusScanStatus => {
  if (
    status.semanticReadiness === 'no_graph' ||
    status.semanticReadiness === 'no_semantic_text' ||
    status.semanticReadiness === 'embeddings_without_index' ||
    status.semanticReadiness === 'vector_index_pending'
  ) {
    return 'warning';
  }

  return 'ok';
};
