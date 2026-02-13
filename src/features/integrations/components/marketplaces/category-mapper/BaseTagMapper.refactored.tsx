'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import {
  useFetchExternalTagsMutation,
  useSaveTagMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useExternalTags,
  useTagMappings,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import { useCatalogs } from '@/features/products/hooks/useProductMetadataQueries';
import type { CatalogRecord, ProductTag } from '@/features/products/types';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { GenericItemMapper } from './GenericItemMapper';
import type { TagMapping } from './types';

/**
 * Base.com Tag Mapper - REFACTORED to use GenericItemMapper
 * Maintains exact same API surface for backward compatibility.
 */
export function BaseTagMapper(): React.JSX.Element {
  const { connectionId } = useCategoryMapper();
  const catalogsQuery = useCatalogs();
  const internalTagsQuery = useQuery({
    queryKey: QUERY_KEYS.products.metadata.tags('all'),
    queryFn: () => api.get<ProductTag[]>('/api/products/tags/all'),
  });
  const externalTagsQuery = useExternalTags(connectionId);
  const mappingsQuery = useTagMappings(connectionId);
  const fetchMutation = useFetchExternalTagsMutation();
  const saveMutation = useSaveTagMappingsMutation();

  const catalogsById = useMemo(
    () =>
      new Map(
        (catalogsQuery.data ?? []).map((catalog: CatalogRecord) => [catalog.id, catalog.name])
      ),
    [catalogsQuery.data]
  );

  const internalTags = useMemo(
    (): ProductTag[] =>
      [...(internalTagsQuery.data ?? [])].sort((a: ProductTag, b: ProductTag) =>
        a.name.localeCompare(b.name)
      ),
    [internalTagsQuery.data]
  );

  const externalTagOptions = useMemo(
    () =>
      [...(externalTagsQuery.data ?? [])].map((tag) => ({
        value: tag.id,
        label: tag.name,
      })),
    [externalTagsQuery.data]
  );

  return (
    <GenericItemMapper<ProductTag, any, TagMapping>
      config={{
        title: 'Base.com Tags',
        internalColumnHeader: 'Internal Tag',
        externalColumnHeader: 'Base.com Tag',
        additionalColumnsHeader: 'Catalog',
        internalItems: internalTags,
        externalItems: externalTagOptions,
        currentMappings: mappingsQuery.data ?? [],
        getInternalId: (tag) => tag.id,
        getInternalLabel: (tag) => tag.name,
        getExternalId: (item) => item.value,
        getExternalLabel: (item) => item.label,
        getInternalAdditionalLabel: (tag) => catalogsById.get(tag.catalogId) ?? tag.catalogId,
        getMappingInternalId: (mapping) => mapping.internalTagId,
        getMappingExternalId: (mapping) => mapping.externalTagId,
        onFetch: () => fetchMutation.mutateAsync({ connectionId }),
        onSave: (mappings) =>
          saveMutation.mutateAsync({
            connectionId,
            mappings: mappings.map(m => ({ 
              internalTagId: m.internalId, 
              externalTagId: m.externalId 
            })),
          }),
        isLoadingInternal: internalTagsQuery.isLoading,
        isLoadingExternal: externalTagsQuery.isLoading,
        isLoadingMappings: mappingsQuery.isLoading,
        isFetching: fetchMutation.isPending,
        isSaving: saveMutation.isPending,
      }}
    />
  );
}
