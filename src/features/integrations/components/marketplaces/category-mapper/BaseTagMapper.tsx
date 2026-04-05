'use client';

import { useMemo } from 'react';

import {
  useCategoryMapperConfig,
  useCategoryMapperData,
} from '@/features/integrations/context/CategoryMapperContext';
import { useIntegrationProductTags } from '@/features/integrations/hooks/useIntegrationProductQueries';
import {
  useFetchExternalTagsMutation,
  useSaveTagMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useTagMappings,
  useExternalTags,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import { type TagMapping, type ExternalTag } from '@/shared/contracts/integrations';
import { type ProductTag } from '@/shared/contracts/products';
import type { GenericItemMapperConfig } from '@/shared/contracts/ui/ui/api';
import { GenericMapper } from '@/shared/ui/templates.public';

export function BaseTagMapper(): React.JSX.Element {
  const { connectionId, connectionName } = useCategoryMapperConfig();
  const { selectedCatalogId: catalogId } = useCategoryMapperData();

  const tagsQuery = useIntegrationProductTags(catalogId ?? undefined);
  const externalTagsQuery = useExternalTags(connectionId ?? '');
  const mappingsQuery = useTagMappings(connectionId ?? '');

  const fetchMutation = useFetchExternalTagsMutation();
  const saveMutation = useSaveTagMappingsMutation();

  const config: GenericItemMapperConfig<ProductTag, ExternalTag, TagMapping> = useMemo(
    () => ({
      connectionId,
      connectionName,
      title: 'Tag Mappings',
      internalColumnHeader: 'Local Tag',
      externalColumnHeader: 'Marketplace Tag',
      internalItems: tagsQuery.data ?? [],
      externalItems: externalTagsQuery.data ?? [],
      currentMappings: mappingsQuery.data ?? [],
      getInternalId: (item) => item.id,
      getInternalLabel: (item) => item.name,
      getExternalId: (item) => String(item.id),
      getExternalLabel: (item) => item.name,
      getMappingInternalId: (m) => m.internalTagId,
      getMappingExternalId: (m) => m.externalTagId,
      onFetch: async () => {
        const result = await fetchMutation.mutateAsync({ connectionId: connectionId ?? '' });
        return { message: `Fetched ${result.fetched} tags` };
      },
      onSave: async (mappings) => {
        await saveMutation.mutateAsync({
          connectionId: connectionId ?? '',
          mappings: mappings.map((m) => ({
            internalTagId: m.internalId,
            externalTagId: m.externalId,
          })),
        });
        return { message: 'Tag mappings saved' };
      },
      isLoadingInternal: tagsQuery.isLoading,
      isLoadingExternal: externalTagsQuery.isLoading,
      isLoadingMappings: mappingsQuery.isLoading,
      isFetching: fetchMutation.isPending,
      isSaving: saveMutation.isPending,
    }),
    [
      connectionId,
      connectionName,
      tagsQuery.data,
      tagsQuery.isLoading,
      externalTagsQuery.data,
      externalTagsQuery.isLoading,
      mappingsQuery.data,
      mappingsQuery.isLoading,
      fetchMutation,
      saveMutation,
    ]
  );

  return <GenericMapper config={config} />;
}
