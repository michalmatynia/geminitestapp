'use client';

import { Download, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import {
  useFetchExternalProducersMutation,
  useSaveProducerMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useExternalProducers,
  useProducerMappings,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import { logClientError } from '@/features/observability';
import { useProducers } from '@/features/products/hooks/useProductMetadataQueries';
import type { Producer } from '@/features/products/types';
import { Button, SectionHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SelectSimple, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { usePendingExternalMappings } from './usePendingExternalMappings';

export function BaseProducerMapper(): React.JSX.Element {
  const { connectionId, connectionName } = useCategoryMapper();
  const { toast } = useToast();
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
    () => [
      { value: '__unmapped__', label: '— Not mapped —' },
      ...(externalProducersQuery.data ?? []).map((producer) => ({
        value: producer.id,
        label: producer.name,
      })),
    ],
    [externalProducersQuery.data]
  );

  const {
    pendingMappings,
    getCurrentMapping,
    handleMappingChange,
    resetPendingMappings,
    stats,
  } = usePendingExternalMappings({
    mappings: mappingsQuery.data ?? [],
    internalIds: internalProducers.map((producer: Producer) => producer.id),
    getInternalId: (mapping) => mapping.internalProducerId,
    getExternalId: (mapping) => mapping.externalProducerId,
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
        context: { source: 'BaseProducerMapper', action: 'fetchFromBase', connectionId },
      });
      const message = error instanceof Error ? error.message : 'Failed to fetch producers';
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
        ([internalProducerId, externalProducerId]: [string, string | null]) => ({
          internalProducerId,
          externalProducerId,
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
        context: { source: 'BaseProducerMapper', action: 'saveMappings', connectionId },
      });
      const message = error instanceof Error ? error.message : 'Failed to save producer mappings';
      toast(message, { variant: 'error' });
    }
  };

  const loading =
    producersQuery.isLoading || externalProducersQuery.isLoading || mappingsQuery.isLoading;

  return (
    <div className='space-y-4 border-t border-border/60 pt-6'>
      <SectionHeader
        title='Base.com Producers'
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
              {fetchMutation.isPending ? 'Fetching...' : 'Fetch Producers'}
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
        <Table>
          <TableHeader>
            <TableRow className='border-b border-border bg-card/50'>
              <TableHead className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                Internal Producer
              </TableHead>
              <TableHead className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                Base.com Producer
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                  Loading producers...
                </TableCell>
              </TableRow>
            ) : internalProducers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                  No internal producers found. Create producers first.
                </TableCell>
              </TableRow>
            ) : (
              internalProducers.map((producer: Producer) => {
                const currentMapping = getCurrentMapping(producer.id);
                const hasPendingChange = pendingMappings.has(producer.id);
                return (
                  <TableRow
                    key={producer.id}
                    className={cn(hasPendingChange && 'bg-yellow-500/5')}
                  >
                    <TableCell className='px-4 py-2 text-sm text-gray-200'>{producer.name}</TableCell>
                    <TableCell className='px-4 py-2'>
                      <SelectSimple
                        value={currentMapping ?? '__unmapped__'}
                        onValueChange={(value: string): void =>
                          handleMappingChange(
                            producer.id,
                            value === '__unmapped__' ? null : value
                          )
                        }
                        disabled={externalProducersQuery.isLoading}
                        options={externalProducerOptions}
                        triggerClassName='h-8 w-full border-border bg-gray-800 text-sm text-white'
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
