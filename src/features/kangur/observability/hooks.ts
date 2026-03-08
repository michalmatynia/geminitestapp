'use client';

import type {
  KangurObservabilityRange,
  KangurObservabilitySummary,
  KangurObservabilitySummaryResponse,
} from '@/shared/contracts';
import { kangurObservabilitySummaryResponseSchema } from '@/shared/contracts';
import type { SingleQuery } from '@/shared/contracts/ui';
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
