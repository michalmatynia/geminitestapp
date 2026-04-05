'use client';

import { useMemo } from 'react';

import { useCategoryMapperConfig } from '@/features/integrations/context/CategoryMapperContext';
import { useIntegrationProductProducers } from '@/features/integrations/hooks/useIntegrationProductQueries';
import {
  useFetchExternalProducersMutation,
  useSaveProducerMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useProducerMappings,
  useExternalProducers,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import { type ProducerMapping, type ExternalProducer } from '@/shared/contracts/integrations';
import { type Producer } from '@/shared/contracts/products';
import type { GenericItemMapperConfig } from '@/shared/contracts/ui/ui/api';
import { GenericMapper } from '@/shared/ui/templates.public';

export function BaseProducerMapper(): React.JSX.Element {
  const { connectionId, connectionName } = useCategoryMapperConfig();

  const producersQuery = useIntegrationProductProducers();
  const externalProducersQuery = useExternalProducers(connectionId ?? '');
  const mappingsQuery = useProducerMappings(connectionId ?? '');

  const fetchMutation = useFetchExternalProducersMutation();
  const saveMutation = useSaveProducerMappingsMutation();

  const config: GenericItemMapperConfig<Producer, ExternalProducer, ProducerMapping> = useMemo(
    () => ({
      connectionId,
      connectionName,
      title: 'Producer Mappings',
      internalColumnHeader: 'Local Producer',
      externalColumnHeader: 'Marketplace Producer',
      internalItems: producersQuery.data ?? [],
      externalItems: externalProducersQuery.data ?? [],
      currentMappings: mappingsQuery.data ?? [],
      getInternalId: (item) => item.id,
      getInternalLabel: (item) => item.name,
      getExternalId: (item) => String(item.id),
      getExternalLabel: (item) => item.name,
      getMappingInternalId: (m) => m.internalProducerId,
      getMappingExternalId: (m) => m.externalProducerId,
      onFetch: async () => {
        const result = await fetchMutation.mutateAsync({ connectionId: connectionId ?? '' });
        return { message: `Fetched ${result.fetched} producers` };
      },
      onSave: async (mappings) => {
        await saveMutation.mutateAsync({
          connectionId: connectionId ?? '',
          mappings: mappings.map((m) => ({
            internalProducerId: m.internalId,
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
