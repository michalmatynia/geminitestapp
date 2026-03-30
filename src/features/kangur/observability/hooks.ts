import type {
  KangurKnowledgeGraphStatusResponse,
  KangurKnowledgeGraphStatusSnapshot,
  KangurObservabilityRange,
  KangurObservabilitySummary,
  KangurObservabilitySummaryResponse,
} from '@/shared/contracts';
import {
  kangurKnowledgeGraphStatusResponseSchema,
  kangurObservabilitySummaryResponseSchema,
} from '@/shared/contracts';
import type { SingleQuery } from '@/shared/contracts/ui';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/features/kangur/shared/contracts/kangur-knowledge-graph';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { kangurKeys } from '@/shared/lib/query-key-exports';

export { kangurKeys };

export function useKangurObservabilitySummary(
  range: KangurObservabilityRange = '24h'
): SingleQuery<KangurObservabilitySummary> {
  const queryKey = kangurKeys.observability.summary(range);

  return createSingleQueryV2<KangurObservabilitySummaryResponse, KangurObservabilitySummary>({
    id: range,
    queryKey,
    queryFn: () =>
      api.get<KangurObservabilitySummaryResponse>('/api/kangur/observability/summary', {
        params: { range },
      }),
    select: (response) => {
      const parsed = kangurObservabilitySummaryResponseSchema.safeParse(response);
      if (!parsed.success) {
        throw new Error('Invalid Kangur observability summary response');
      }
      return parsed.data.summary;
    },
    staleTime: 1000 * 60,
    meta: {
      source: 'kangur.observability.hooks.useKangurObservabilitySummary',
      operation: 'detail',
      resource: 'kangur.observability.summary',
      domain: 'observability',
      queryKey,
      tags: ['kangur', 'observability', 'summary'],
      description: 'Loads the Kangur observability summary for the selected range.',
    },
  });
}

export function useKangurKnowledgeGraphStatus(
  graphKey: string = KANGUR_KNOWLEDGE_GRAPH_KEY
): SingleQuery<KangurKnowledgeGraphStatusSnapshot> {
  const queryKey = kangurKeys.observability.knowledgeGraphStatus(graphKey);

  return createSingleQueryV2<
    KangurKnowledgeGraphStatusResponse,
    KangurKnowledgeGraphStatusSnapshot
  >({
    id: graphKey,
    queryKey,
    queryFn: () =>
      api.get<KangurKnowledgeGraphStatusResponse>('/api/kangur/knowledge-graph/status', {
        params: { graphKey },
      }),
    select: (response) => {
      const parsed = kangurKnowledgeGraphStatusResponseSchema.safeParse(response);
      if (!parsed.success) {
        throw new Error('Invalid Kangur knowledge graph status response');
      }
      return parsed.data.status;
    },
    staleTime: 1000 * 60,
    meta: {
      source: 'kangur.observability.hooks.useKangurKnowledgeGraphStatus',
      operation: 'detail',
      resource: 'kangur.knowledge-graph.status',
      domain: 'observability',
      queryKey,
      tags: ['kangur', 'observability', 'knowledge-graph'],
      description: 'Loads the live Kangur Neo4j knowledge graph status snapshot.',
    },
  });
}
