'use client';

import { useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import {
  useFetchExternalTagsMutation,
  useSaveTagMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import { useTagMappings } from '@/features/integrations/hooks/useMarketplaceQueries';
import { useTags } from '@/features/products/hooks/useProductMetadataQueries';
import { type ProductTag } from '@/shared/contracts/products';
import { type TagMapping } from '@/shared/contracts/integrations';
import { GenericMapper, type GenericItemMapperConfig } from '@/shared/ui';

export function BaseTagMapper(): React.JSX.Element {
  const { connectionId, connectionName, selectedCatalogId: catalogId } = useCategoryMapper();

  const tagsQuery = useTags(catalogId);
  const externalTagsQuery = useFetchExternalTagsMutation();
  const mappingsQuery = useTagMappings(connectionId ?? '');

  const fetchMutation = useFetchExternalTagsMutation();
  const saveMutation = useSaveTagMappingsMutation();

  const config: GenericItemMapperConfig<ProductTag, any, TagMapping> = useMemo(
    () => ({
      connectionId,
      connectionName,
      title: 'Tag Mappings',
      internalColumnHeader: 'Local Tag',
      externalColumnHeader: 'Marketplace Tag',
      internalItems: tagsQuery.data ?? [],
      externalItems: externalTagsQuery.data ?? [],
      currentMappings: (mappingsQuery.data ?? []) as unknown as TagMapping[],
      getInternalId: (item) => item.id,
      getInternalLabel: (item) => item.name,
      getExternalId: (item) => String(item.id),
      getExternalLabel: (item) => item.name,
      getMappingInternalId: (m) => m.tagId,
      getMappingExternalId: (m) => m.externalTagId,
      onFetch: async () => {
        const result = await fetchMutation.mutateAsync(connectionId ?? '');
        return { message: `Fetched ${result.length} tags` };
      },
      onSave: async (mappings) => {
        await saveMutation.mutateAsync({
          connectionId: connectionId ?? '',
          mappings: mappings.map((m) => ({
            tagId: m.internalId,
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
