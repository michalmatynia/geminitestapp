'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useFetchExternalTagsMutation,
  useSaveTagMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useExternalTags,
  useTagMappings,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import type { TagMappingWithDetails } from '@/features/integrations/types/tag-mapping';
import { logClientError } from '@/features/observability';
import { useCatalogs } from '@/features/products/hooks/useProductMetadata';
import type { CatalogRecord, ProductTag } from '@/features/products/types';
import { api } from '@/shared/lib/api-client';
import { Button, SectionHeader, UnifiedSelect, useToast } from '@/shared/ui';

type BaseTagMapperProps = {
  connectionId: string;
  connectionName: string;
};

export function BaseTagMapper({
  connectionId,
  connectionName,
}: BaseTagMapperProps): React.JSX.Element {
  const { toast } = useToast();
  const catalogsQuery = useCatalogs();
  const internalTagsQuery = useQuery({
    queryKey: ['products', 'tags', 'all'],
    queryFn: () => api.get<ProductTag[]>('/api/products/tags/all'),
  });
  const externalTagsQuery = useExternalTags(connectionId);
  const mappingsQuery = useTagMappings(connectionId);
  const fetchMutation = useFetchExternalTagsMutation();
  const saveMutation = useSaveTagMappingsMutation();
  const [pendingMappings, setPendingMappings] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    setPendingMappings(new Map());
  }, [connectionId]);

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

  const mappingByInternalTagId = useMemo(() => {
    const next = new Map<string, TagMappingWithDetails>();
    (mappingsQuery.data ?? []).forEach((mapping: TagMappingWithDetails) => {
      if (mapping.isActive) {
        next.set(mapping.internalTagId, mapping);
      }
    });
    return next;
  }, [mappingsQuery.data]);

  const getCurrentMapping = useCallback(
    (internalTagId: string): string | null => {
      if (pendingMappings.has(internalTagId)) {
        return pendingMappings.get(internalTagId) ?? null;
      }
      return mappingByInternalTagId.get(internalTagId)?.externalTagId ?? null;
    },
    [mappingByInternalTagId, pendingMappings]
  );

  const handleMappingChange = useCallback(
    (internalTagId: string, externalTagId: string | null): void => {
      setPendingMappings((prev: Map<string, string | null>) => {
        const next = new Map(prev);
        const savedValue = mappingByInternalTagId.get(internalTagId)?.externalTagId ?? null;
        if (savedValue === externalTagId) {
          next.delete(internalTagId);
        } else {
          next.set(internalTagId, externalTagId);
        }
        return next;
      });
    },
    [mappingByInternalTagId]
  );

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
      setPendingMappings(new Map());
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'BaseTagMapper', action: 'saveMappings', connectionId },
      });
      const message = error instanceof Error ? error.message : 'Failed to save tag mappings';
      toast(message, { variant: 'error' });
    }
  };

  const stats = useMemo(() => {
    const total = internalTags.length;
    const mapped = internalTags.filter((tag: ProductTag) => getCurrentMapping(tag.id) !== null).length;
    return {
      total,
      mapped,
      pending: pendingMappings.size,
    };
  }, [getCurrentMapping, internalTags, pendingMappings.size]);

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
