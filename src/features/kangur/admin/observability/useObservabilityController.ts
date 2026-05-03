import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { useKangurObservabilitySummary } from '@/features/kangur/observability/hooks';
import { useKangurKnowledgeGraphStatus } from '@/features/kangur/observability/hooks';
import { kangurObservabilityRangeSchema } from '@/shared/contracts/kangur-observability';
import type { KangurObservabilityRange } from '@/shared/contracts/kangur-observability';

export function useObservabilityController() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const parsedRange = kangurObservabilityRangeSchema.safeParse(searchParams.get('range'));
  const range: KangurObservabilityRange = parsedRange.success ? parsedRange.data : '24h';
  
  const summaryQuery = useKangurObservabilitySummary(range);
  const knowledgeGraphStatusQuery = useKangurKnowledgeGraphStatus(
    summaryQuery.data?.knowledgeGraphStatus.graphKey ?? ''
  );

  const handleRangeChange = useCallback((nextRange: KangurObservabilityRange) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('range', nextRange);
    const query = nextParams.toString();
    startTransition(() => { router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }); });
  }, [pathname, router, searchParams]);

  return {
    range,
    summaryQuery,
    knowledgeGraphStatusQuery,
    handleRangeChange
  };
}
