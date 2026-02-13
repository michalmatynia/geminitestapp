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
import type { Producer } from '@/features/products/types';

import { GenericItemMapper } from './GenericItemMapper';
import type { ProducerMapping } from './types';

/**
 * Base.com Producer Mapper - REFACTORED to use GenericItemMapper
 * Maintains exact same API surface for backward compatibility.
 */
export function BaseProducerMapper(): React.JSX.Element {
  const { connectionId } = useCategoryMapper();
  const producersQuery = useProducers();
  const externalProducersQuery = useExternalProducers(connectionId);
  const mappingsQuery = useProducerMappings(connectionId);
  const fetchMutation = useFetchExternalProducersMutation();
  const saveMutation = useSaveProducerMappingsMutation();

  const internalProducers = useMemo(
    (): Producer[] =>
      [...(producersQuery.data ?? [])].sort((a: Producer, b: Producer) =>
        a.name.localeCompare(b.name)
      ),
    [producersQuery.data]
  );

  const externalProducerOptions = useMemo(
    () =>
      [...(externalProducersQuery.data ?? [])].map((producer) => ({
        value: producer.id,
        label: producer.name,
      })),
    [externalProducersQuery.data]
  );

  return (
    <GenericItemMapper<Producer, any, ProducerMapping>
      config={{
        title: 'Base.com Producers',
        internalColumnHeader: 'Internal Producer',
        externalColumnHeader: 'Base.com Producer',
        internalItems: internalProducers,
        externalItems: externalProducerOptions,
        currentMappings: mappingsQuery.data ?? [],
        getInternalId: (producer) => producer.id,
        getInternalLabel: (producer) => producer.name,
        getExternalId: (item) => item.value,
        getExternalLabel: (item) => item.label,
        getMappingInternalId: (mapping) => mapping.internalProducerId,
        getMappingExternalId: (mapping) => mapping.externalProducerId,
        onFetch: () => fetchMutation.mutateAsync({ connectionId }),
        onSave: (mappings) =>
          saveMutation.mutateAsync({
            connectionId,
            mappings: mappings.map(m => ({ 
              internalProducerId: m.internalId, 
              externalProducerId: m.externalId 
            })),
          }),
        isLoadingInternal: producersQuery.isLoading,
        isLoadingExternal: externalProducersQuery.isLoading,
        isLoadingMappings: mappingsQuery.isLoading,
        isFetching: fetchMutation.isPending,
        isSaving: saveMutation.isPending,
      }}
    />
  );
}
