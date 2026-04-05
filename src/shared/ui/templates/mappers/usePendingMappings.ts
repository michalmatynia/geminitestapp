'use client';

import { useCallback, useMemo, useState } from 'react';

import type { PendingExternalMappingsState, PendingMappingStats } from '@/shared/contracts/ui/ui/api';

type UsePendingMappingsConfig<TMapping> = {
  mappings: TMapping[];
  internalIds: string[];
  getInternalId: (mapping: TMapping) => string;
  getExternalId: (mapping: TMapping) => string | null;
  isActive?: (mapping: TMapping) => boolean;
};

type MappingStats = PendingMappingStats;

export function usePendingMappings<TMapping>({
  mappings,
  internalIds,
  getInternalId,
  getExternalId,
  isActive,
}: UsePendingMappingsConfig<TMapping>): PendingExternalMappingsState {
  const [pendingMappings, setPendingMappings] = useState<Map<string, string | null>>(new Map());

  const mappingByInternalId = useMemo(() => {
    const next = new Map<string, string | null>();
    for (const mapping of mappings) {
      if (isActive && !isActive(mapping)) continue;
      next.set(getInternalId(mapping), getExternalId(mapping));
    }
    return next;
  }, [getExternalId, getInternalId, isActive, mappings]);

  const getCurrentMapping = useCallback(
    (internalId: string): string | null => {
      if (pendingMappings.has(internalId)) {
        return pendingMappings.get(internalId) ?? null;
      }
      return mappingByInternalId.get(internalId) ?? null;
    },
    [mappingByInternalId, pendingMappings]
  );

  const handleMappingChange = useCallback(
    (internalId: string, externalId: string | null): void => {
      setPendingMappings((prev: Map<string, string | null>) => {
        const next = new Map(prev);
        const savedValue = mappingByInternalId.get(internalId) ?? null;
        if (savedValue === externalId) {
          next.delete(internalId);
        } else {
          next.set(internalId, externalId);
        }
        return next;
      });
    },
    [mappingByInternalId]
  );

  const resetPendingMappings = useCallback(() => {
    setPendingMappings(new Map());
  }, []);

  const stats = useMemo<MappingStats>(() => {
    const total = internalIds.length;
    const mapped = internalIds.filter((id: string) => getCurrentMapping(id) !== null).length;
    const unmapped = Math.max(0, total - mapped);
    return {
      total,
      mapped,
      unmapped,
      pending: pendingMappings.size,
    };
  }, [getCurrentMapping, internalIds, pendingMappings.size]);

  return {
    pendingMappings,
    getCurrentMapping,
    handleMappingChange,
    resetPendingMappings,
    stats,
  };
}

export { usePendingMappings as usePendingExternalMappings };
