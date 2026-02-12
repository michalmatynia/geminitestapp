'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import {
  useFetchExternalTagsMutation,
  useSaveTagMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useExternalTags,
  useTagMappings,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import { logClientError } from '@/features/observability';
import { useCatalogs } from '@/features/products/hooks/useProductMetadataQueries';
import type { CatalogRecord, ProductTag } from '@/features/products/types';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button, SectionHeader, UnifiedSelect, useToast } from '@/shared/ui';

import { usePendingExternalMappings } from './usePendingExternalMappings';

export function BaseTagMapper(): React.JSX.Element {
  const { connectionId, connectionName } = useCategoryMapper();
  const { toast } = useToast();
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
    () => [
      { value: '__unmapped__', label: '— Not mapped —' },
      ...(externalTagsQuery.data ?? []).map((tag) => ({
        value: tag.id,
        label: tag.name,
      })),
    ],
    [externalTagsQuery.data]
  );

  const {
    pendingMappings,
    getCurrentMapping,
    handleMappingChange,
    resetPendingMappings,
    stats,
  } = usePendingExternalMappings({
    mappings: mappingsQuery.data ?? [],
    internalIds: internalTags.map((tag: ProductTag) => tag.id),
    getInternalId: (mapping) => mapping.internalTagId,
    getExternalId: (mapping) => mapping.externalTagId,
    isActive: (mapping) => Boolean(mapping.isActive),
  });

  useEffect(() => {
    resetPendingMappings();
  }, [connectionId, resetPendingMappings]);

  const handleFetch = async (): Promise<void> => {
    try {
      const result = await fetchMutation.mutateAsync({ connectionId });
      toast(result.message, { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'BaseTagMapper', action: 'fetchFromBase', connectionId },
      });
      const message = error instanceof Error ? error.message : 'Failed to fetch tags';
      toast(message, { variant: 'error' });
    }
  };

  const handleSave = async (): Promise<void> => {
    if (pendingMappings.size === 0) {
      toast('No changes to save', { variant: 'info' });
      return;
    }

    try {
      const mappings = Array.from(pendingMappings.entries()).map(
        ([internalTagId, externalTagId]: [string, string | null]) => ({
          internalTagId,
          externalTagId,
        })
      );

      const result = await saveMutation.mutateAsync({
        connectionId,
        mappings,
      });
      toast(result.message, { variant: 'success' });
      resetPendingMappings();
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'BaseTagMapper', action: 'saveMappings', connectionId },
      });
      const message = error instanceof Error ? error.message : 'Failed to save tag mappings';
      toast(message, { variant: 'error' });
    }
  };

  const loading =
    internalTagsQuery.isLoading ||
    externalTagsQuery.isLoading ||
    mappingsQuery.isLoading ||
    catalogsQuery.isLoading;

  return (
    <div className='space-y-4 border-t border-border/60 pt-6'>
      <SectionHeader
        title='Base.com Tags'
        description={`Connection: ${connectionName}`}
        actions={
          <div className='flex items-center gap-3'>
            <Button
              onClick={(): void => {
                void handleFetch();
              }}
              disabled={fetchMutation.isPending}
              className='flex items-center gap-2 rounded-md border bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50'
            >
              {fetchMutation.isPending ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <Download className='h-4 w-4' />
              )}
              {fetchMutation.isPending ? 'Fetching...' : 'Fetch Tags'}
            </Button>
            <Button
              onClick={(): void => {
                void handleSave();
              }}
              disabled={saveMutation.isPending || pendingMappings.size === 0}
              className='flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50'
            >
              {saveMutation.isPending ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <Save className='h-4 w-4' />
              )}
              {saveMutation.isPending ? 'Saving...' : `Save (${pendingMappings.size})`}
            </Button>
          </div>
        }
      />

      <div className='flex gap-6 text-sm'>
        <div className='text-gray-400'>
          Total: <span className='text-white'>{stats.total}</span>
        </div>
        <div className='text-gray-400'>
          Mapped: <span className='text-emerald-400'>{stats.mapped}</span>
        </div>
        {stats.pending > 0 && (
          <div className='text-gray-400'>
            Unsaved changes: <span className='text-yellow-400'>{stats.pending}</span>
          </div>
        )}
      </div>

      <div className='overflow-hidden rounded-md border border-border'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-border bg-card/50'>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                Internal Tag
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                Catalog
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                Base.com Tag
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className='px-4 py-8 text-center text-gray-500'>
                  Loading tags...
                </td>
              </tr>
            ) : internalTags.length === 0 ? (
              <tr>
                <td colSpan={3} className='px-4 py-8 text-center text-gray-500'>
                  No internal tags found. Create tags first.
                </td>
              </tr>
            ) : (
              internalTags.map((tag: ProductTag) => {
                const currentMapping = getCurrentMapping(tag.id);
                const hasPendingChange = pendingMappings.has(tag.id);
                return (
                  <tr
                    key={tag.id}
                    className={`border-b border-border ${
                      hasPendingChange ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <td className='px-4 py-2 text-sm text-gray-200'>{tag.name}</td>
                    <td className='px-4 py-2 text-sm text-gray-400'>
                      {catalogsById.get(tag.catalogId) ?? tag.catalogId}
                    </td>
                    <td className='px-4 py-2'>
                      <UnifiedSelect
                        value={currentMapping ?? '__unmapped__'}
                        onValueChange={(value: string): void =>
                          handleMappingChange(tag.id, value === '__unmapped__' ? null : value)
                        }
                        disabled={externalTagsQuery.isLoading}
                        options={externalTagOptions}
                        triggerClassName='h-8 w-full border-border bg-gray-800 text-sm text-white'
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
