'use client';

import { useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import {
  useFetchExternalProducersMutation,
  useSaveProducerMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import { useProducerMappings } from '@/features/integrations/hooks/useMarketplaceQueries';
import { useProducers } from '@/features/products/hooks/useProductMetadataQueries';
import { type Producer } from '@/shared/contracts/products';
import { type ProducerMapping } from '@/shared/contracts/integrations';
import { GenericMapper, type GenericItemMapperConfig } from '@/shared/ui';

export function BaseProducerMapper(): React.JSX.Element {
  const { connectionId, connectionName } = useCategoryMapper();

  const producersQuery = useProducers();
  const externalProducersQuery = useFetchExternalProducersMutation();
  const mappingsQuery = useProducerMappings(connectionId ?? '');

  const fetchMutation = useFetchExternalProducersMutation();
  const saveMutation = useSaveProducerMappingsMutation();

  const config: GenericItemMapperConfig<Producer, any, ProducerMapping> = useMemo(
    () => ({
      connectionId,
      connectionName,
      title: 'Producer Mappings',
      internalColumnHeader: 'Local Producer',
      externalColumnHeader: 'Marketplace Producer',
      internalItems: producersQuery.data ?? [],
      externalItems: externalProducersQuery.data ?? [],
      currentMappings: (mappingsQuery.data ?? []) as unknown as ProducerMapping[],
      getInternalId: (item) => item.id,
      getInternalLabel: (item) => item.name,
      getExternalId: (item) => String(item.id),
      getExternalLabel: (item) => item.name,
      getMappingInternalId: (m) => m.producerId,
      getMappingExternalId: (m) => m.externalProducerId,
      onFetch: async () => {
        const result = await fetchMutation.mutateAsync(connectionId ?? '');
        return { message: `Fetched ${result.length} producers` };
      },
      onSave: async (mappings) => {
        await saveMutation.mutateAsync({
          connectionId: connectionId ?? '',
          mappings: mappings.map((m) => ({
            producerId: m.internalId,
            externalProducerId: m.externalId,
          })),
        });
        return { message: 'Producer mappings saved' };
      },
      isLoadingInternal: producersQuery.isLoading,
      isLoadingExternal: externalProducersQuery.isLoading,
      isLoadingMappings: mappingsQuery.isLoading,
      isFetching: fetchMutation.isPending,
      isSaving: saveMutation.isPending,
    }),
    [
      connectionId,
      connectionName,
      producersQuery.data,
      producersQuery.isLoading,
      externalProducersQuery.data,
      externalProducersQuery.isLoading,
      mappingsQuery.data,
      mappingsQuery.isLoading,
      fetchMutation,
      saveMutation,
    ]
  );

  return <GenericMapper config={config} />;
}
