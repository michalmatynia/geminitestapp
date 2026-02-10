'use client';

import { Download, RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useFetchExternalProducersMutation,
  useSaveProducerMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useExternalProducers,
  useProducerMappings,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import type { ProducerMappingWithDetails } from '@/features/integrations/types/producer-mapping';
import { logClientError } from '@/features/observability';
import { useProducers } from '@/features/products/hooks/useProductMetadata';
import type { Producer } from '@/features/products/types';
import { Button, SectionHeader, UnifiedSelect, useToast } from '@/shared/ui';

type BaseProducerMapperProps = {
  connectionId: string;
  connectionName: string;
};

export function BaseProducerMapper({
  connectionId,
  connectionName,
}: BaseProducerMapperProps): React.JSX.Element {
  const { toast } = useToast();
  const producersQuery = useProducers();
  const externalProducersQuery = useExternalProducers(connectionId);
  const mappingsQuery = useProducerMappings(connectionId);
  const fetchMutation = useFetchExternalProducersMutation();
  const saveMutation = useSaveProducerMappingsMutation();
  const [pendingMappings, setPendingMappings] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    setPendingMappings(new Map());
  }, [connectionId]);

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

  const mappingByInternalProducerId = useMemo(() => {
    const next = new Map<string, ProducerMappingWithDetails>();
    (mappingsQuery.data ?? []).forEach((mapping: ProducerMappingWithDetails) => {
      if (mapping.isActive) {
        next.set(mapping.internalProducerId, mapping);
      }
    });
    return next;
  }, [mappingsQuery.data]);

  const getCurrentMapping = useCallback(
    (internalProducerId: string): string | null => {
      if (pendingMappings.has(internalProducerId)) {
        return pendingMappings.get(internalProducerId) ?? null;
      }
      return mappingByInternalProducerId.get(internalProducerId)?.externalProducerId ?? null;
    },
    [mappingByInternalProducerId, pendingMappings]
  );

  const handleMappingChange = useCallback(
    (internalProducerId: string, externalProducerId: string | null): void => {
      setPendingMappings((prev: Map<string, string | null>) => {
        const next = new Map(prev);
        const savedValue =
          mappingByInternalProducerId.get(internalProducerId)?.externalProducerId ?? null;

        if (savedValue === externalProducerId) {
          next.delete(internalProducerId);
        } else {
          next.set(internalProducerId, externalProducerId);
        }
        return next;
      });
    },
    [mappingByInternalProducerId]
  );

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
      setPendingMappings(new Map());
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'BaseProducerMapper', action: 'saveMappings', connectionId },
      });
      const message = error instanceof Error ? error.message : 'Failed to save producer mappings';
      toast(message, { variant: 'error' });
    }
  };

  const stats = useMemo(() => {
    const total = internalProducers.length;
    const mapped = internalProducers.filter(
      (producer: Producer) => getCurrentMapping(producer.id) !== null
    ).length;
    return {
      total,
      mapped,
      pending: pendingMappings.size,
    };
  }, [getCurrentMapping, internalProducers, pendingMappings.size]);

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
        <table className='w-full'>
          <thead>
            <tr className='border-b border-border bg-card/50'>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                Internal Producer
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                Base.com Producer
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                  Loading producers...
                </td>
              </tr>
            ) : internalProducers.length === 0 ? (
              <tr>
                <td colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                  No internal producers found. Create producers first.
                </td>
              </tr>
            ) : (
              internalProducers.map((producer: Producer) => {
                const currentMapping = getCurrentMapping(producer.id);
                const hasPendingChange = pendingMappings.has(producer.id);
                return (
                  <tr
                    key={producer.id}
                    className={`border-b border-border ${
                      hasPendingChange ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <td className='px-4 py-2 text-sm text-gray-200'>{producer.name}</td>
                    <td className='px-4 py-2'>
                      <UnifiedSelect
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
