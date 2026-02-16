'use client';

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
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { GenericItemMapper, type GenericItemMapperConfig } from './GenericItemMapper';

// Define the mapping type explicitly to match GenericItemMapper's expectations
interface TagMapping {
  internalTagId: string;
  externalTagId: string | null;
  isActive: boolean;
}

export function BaseTagMapper(): React.JSX.Element {
  const { connectionId } = useCategoryMapper();
  const catalogsQuery = useCatalogs();

  const internalTagsQueryKey = QUERY_KEYS.products.metadata.tags('all');
  const internalTagsQuery = createListQueryV2({
    queryKey: internalTagsQueryKey,
    queryFn: () => api.get<ProductTag[]>('/api/products/tags/all'),
    meta: {
      source: 'integrations.components.BaseTagMapper.internalTagsQuery',
      operation: 'list',
      resource: 'products.metadata.tags.all',
      domain: 'integrations',
      queryKey: internalTagsQueryKey,
      tags: ['integrations', 'marketplace', 'tags', 'internal'],
    },
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
    (): ProductTag[] => internalTagsQuery.data ?? [],
    [internalTagsQuery.data]
  );

  const mappings = useMemo(
    (): TagMapping[] => (mappingsQuery.data ?? []).map((m: { internalTagId: string; externalTagId: string | null; isActive: boolean }) => ({
      internalTagId: m.internalTagId,
      externalTagId: m.externalTagId,
      isActive: Boolean(m.isActive)
    })),
    [mappingsQuery.data]
  );

  // Configure the generic mapper
  const config: GenericItemMapperConfig<ProductTag, { id: string; name: string }, TagMapping> = {
    title: 'Base.com Tags',
    internalColumnHeader: 'Internal Tag',
    externalColumnHeader: 'Base.com Tag',
    additionalColumnsHeader: 'Catalog',

    internalItems: internalTags,
    externalItems: externalTagsQuery.data ?? [],
    currentMappings: mappings,

    getInternalId: (tag) => tag.id,
    getInternalLabel: (tag) => tag.name,
    getInternalAdditionalLabel: (tag) => catalogsById.get(tag.catalogId) ?? tag.catalogId,

    getExternalId: (tag) => tag.id,
    getExternalLabel: (tag) => tag.name,

    getMappingInternalId: (m) => m.internalTagId,
    getMappingExternalId: (m) => m.externalTagId,

    onFetch: async () => {
      const result = await fetchMutation.mutateAsync({ connectionId });
      return { message: result.message };
    },
    onSave: async (newMappings) => {
      const result = await saveMutation.mutateAsync({
        connectionId,
        mappings: newMappings.map((m) => ({
          internalTagId: m.internalId,
          externalTagId: m.externalId,
        })),
      });
      return { message: result.message };
    },

    isLoadingInternal: internalTagsQuery.isLoading || catalogsQuery.isLoading,
    isLoadingExternal: externalTagsQuery.isLoading,
    isLoadingMappings: mappingsQuery.isLoading,
    isFetching: fetchMutation.isPending,
    isSaving: saveMutation.isPending,
  };

  return <GenericItemMapper config={config} />;
}
