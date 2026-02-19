'use client';

import { useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import {
  useFetchExternalProducersMutation,
  useSaveProducerMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useExternalProducers,
  useProducerMappings,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import { useProducers } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProducerDto as Producer } from '@/shared/contracts/products';

import { GenericItemMapper, type GenericItemMapperConfig } from './GenericItemMapper';

// Define the mapping type explicitly to match GenericItemMapper's expectations
interface ProducerMapping {
  internalProducerId: string;
  externalProducerId: string | null;
  isActive: boolean;
}

export function BaseProducerMapper(): React.JSX.Element {
  const { connectionId } = useCategoryMapper();
  const producersQuery = useProducers();
  const externalProducersQuery = useExternalProducers(connectionId);
  const mappingsQuery = useProducerMappings(connectionId);
  const fetchMutation = useFetchExternalProducersMutation();
  const saveMutation = useSaveProducerMappingsMutation();


  const internalProducers = useMemo(
    (): Producer[] => producersQuery.data ?? [],
    [producersQuery.data]
  );

  const mappings = useMemo(
    (): ProducerMapping[] => (mappingsQuery.data ?? []).map((m: { internalProducerId: string; externalProducerId: string | null; isActive: boolean }) => ({
      internalProducerId: m.internalProducerId,
      externalProducerId: m.externalProducerId,
      isActive: Boolean(m.isActive)
    })),
    [mappingsQuery.data]
  );

  // Configure the generic mapper
  const config: GenericItemMapperConfig<Producer, { id: string; name: string }, ProducerMapping> = {
    title: 'Base.com Producers',
    internalColumnHeader: 'Internal Producer',
    externalColumnHeader: 'Base.com Producer',

    internalItems: internalProducers,
    externalItems: externalProducersQuery.data ?? [],
    currentMappings: mappings,

    getInternalId: (producer) => producer.id,
    getInternalLabel: (producer) => producer.name,

    getExternalId: (producer) => producer.id,
    getExternalLabel: (producer) => producer.name,

    getMappingInternalId: (m) => m.internalProducerId,
    getMappingExternalId: (m) => m.externalProducerId,

    onFetch: async () => {
      const result = await fetchMutation.mutateAsync({ connectionId });
      return { message: result.message };
    },
    onSave: async (newMappings) => {
      const result = await saveMutation.mutateAsync({
        connectionId,
        mappings: newMappings.map((m) => ({
          internalProducerId: m.internalId,
          externalProducerId: m.externalId,
        })),
      });
      return { message: result.message };
    },

    isLoadingInternal: producersQuery.isLoading,
    isLoadingExternal: externalProducersQuery.isLoading,
    isLoadingMappings: mappingsQuery.isLoading,
    isFetching: fetchMutation.isPending,
    isSaving: saveMutation.isPending,
  };

  return <GenericItemMapper config={config} />;
}
