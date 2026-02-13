'use client';

import { Download, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import { logClientError } from '@/features/observability';
import { Button, SectionHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, UnifiedSelect, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { usePendingExternalMappings } from './usePendingExternalMappings';

/**
 * Generic mapper component for mapping internal items to external items.
 * Consolidates BaseTagMapper, BaseProducerMapper, and similar mapping patterns.
 *
 * @template TInternal - Type of internal items (e.g., ProductTag, Producer)
 * @template TExternal - Type of external items (e.g., ExternalTag, ExternalProducer)
 * @template TMapping - Type of mapping records
 */
export interface GenericItemMapperConfig<TInternal, TExternal, TMapping> {
  // UI Labels
  title: string;
  internalColumnHeader: string;
  externalColumnHeader: string;
  additionalColumnsHeader?: string;

  // Data
  internalItems: TInternal[];
  externalItems: TExternal[];
  currentMappings: TMapping[];

  // Callbacks for extracting/transforming data
  getInternalId: (item: TInternal) => string;
  getInternalLabel: (item: TInternal) => string;
  getExternalId: (item: TExternal) => string;
  getExternalLabel: (item: TExternal) => string;
  getInternalAdditionalLabel?: (item: TInternal) => string | null;

  // Mapping accessors
  getMappingInternalId: (mapping: TMapping) => string;
  getMappingExternalId: (mapping: TMapping) => string | null;

  // Async operations
  onFetch: () => Promise<{ message: string }>;
  onSave: (mappings: Array<{ internalId: string; externalId: string | null }>) => Promise<{ message: string }>;

  // Loading states
  isLoadingInternal?: boolean;
  isLoadingExternal?: boolean;
  isLoadingMappings?: boolean;
  isFetching?: boolean;
  isSaving?: boolean;
}

export interface GenericItemMapperProps<TInternal, TExternal, TMapping> {
  config: GenericItemMapperConfig<TInternal, TExternal, TMapping>;
}

/**
 * Generic item mapper component
 *
 * @example
 * <GenericItemMapper
 *   config={{
 *     title: 'Base.com Tags',
 *     internalColumnHeader: 'Internal Tag',
 *     externalColumnHeader: 'Base.com Tag',
 *     internalItems: tags,
 *     externalItems: externalTags,
 *     currentMappings: mappings,
 *     getInternalId: (tag) => tag.id,
 *     getInternalLabel: (tag) => tag.name,
 *     getExternalId: (tag) => tag.id,
 *     getExternalLabel: (tag) => tag.name,
 *     getMappingInternalId: (m) => m.internalTagId,
 *     getMappingExternalId: (m) => m.externalTagId,
 *     onFetch: async () => await api.fetchTags(),
 *     onSave: async (mappings) => await api.saveMappings(mappings),
 *   }}
 * />
 */
export function GenericItemMapper<TInternal, TExternal, TMapping>({
  config,
}: GenericItemMapperProps<TInternal, TExternal, TMapping>): React.JSX.Element {
  const { connectionId, connectionName } = useCategoryMapper();
  const { toast } = useToast();

  const {
    title,
    internalColumnHeader,
    externalColumnHeader,
    additionalColumnsHeader,
    internalItems,
    externalItems,
    currentMappings,
    getInternalId,
    getInternalLabel,
    getExternalId,
    getExternalLabel,
    getInternalAdditionalLabel,
    getMappingInternalId,
    getMappingExternalId,
    onFetch,
    onSave,
    isLoadingInternal = false,
    isLoadingExternal = false,
    isLoadingMappings = false,
    isFetching = false,
    isSaving = false,
  } = config;

  // Sort internal items
  const sortedInternalItems = useMemo(
    () =>
      [...internalItems].sort((a: TInternal, b: TInternal) =>
        getInternalLabel(a).localeCompare(getInternalLabel(b))
      ),
    [internalItems, getInternalLabel]
  );

  // Create external options with "Not mapped" option
  const externalOptions = useMemo(
    () => [
      { value: '__unmapped__', label: '— Not mapped —' },
      ...externalItems.map((item: TExternal) => ({
        value: getExternalId(item),
        label: getExternalLabel(item),
      })),
    ],
    [externalItems, getExternalId, getExternalLabel]
  );

  // Use pending mappings hook
  const {
    pendingMappings,
    getCurrentMapping,
    handleMappingChange,
    resetPendingMappings,
    stats,
  } = usePendingExternalMappings({
    mappings: currentMappings,
    internalIds: sortedInternalItems.map(item => getInternalId(item)),
    getInternalId: getMappingInternalId,
    getExternalId: getMappingExternalId,
    isActive: () => true,
  });

  // Reset on connection change
  useEffect(() => {
    resetPendingMappings();
  }, [connectionId, resetPendingMappings]);

  // Fetch handler
  const handleFetch = async (): Promise<void> => {
    try {
      const result = await onFetch();
      toast(result.message, { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'GenericItemMapper', action: 'fetch', connectionId, title },
      });
      const message = error instanceof Error ? error.message : `Failed to fetch ${title.toLowerCase()}`;
      toast(message, { variant: 'error' });
    }
  };

  // Save handler
  const handleSave = async (): Promise<void> => {
    if (pendingMappings.size === 0) {
      toast('No changes to save', { variant: 'info' });
      return;
    }

    try {
      const mappings = Array.from(pendingMappings.entries()).map(
        ([internalId, externalId]: [string, string | null]) => ({
          internalId,
          externalId,
        })
      );

      const result = await onSave(mappings);
      toast(result.message, { variant: 'success' });
      resetPendingMappings();
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'GenericItemMapper', action: 'save', connectionId, title },
      });
      const message = error instanceof Error ? error.message : `Failed to save ${title.toLowerCase()}`;
      toast(message, { variant: 'error' });
    }
  };

  const loading = isLoadingInternal || isLoadingExternal || isLoadingMappings;

  return (
    <div className='space-y-4 border-t border-border/60 pt-6'>
      <SectionHeader
        title={title}
        description={`Connection: ${connectionName}`}
        actions={
          <div className='flex items-center gap-3'>
            <Button
              onClick={(): void => {
                void handleFetch();
              }}
              disabled={isFetching}
              className='flex items-center gap-2 rounded-md border bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50'
            >
              {isFetching ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <Download className='h-4 w-4' />
              )}
              {isFetching ? 'Fetching...' : 'Fetch'}
            </Button>
            <Button
              onClick={(): void => {
                void handleSave();
              }}
              disabled={isSaving || pendingMappings.size === 0}
              className='flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50'
            >
              {isSaving ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <Save className='h-4 w-4' />
              )}
              {isSaving ? 'Saving...' : `Save (${pendingMappings.size})`}
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
            <TableRow className={cn(additionalColumnsHeader ? 'bg-card/50' : 'bg-card/50')}>
              <TableHead className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                {internalColumnHeader}
              </TableHead>
              {additionalColumnsHeader && (
                <TableHead className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                  {additionalColumnsHeader}
                </TableHead>
              )}
              <TableHead className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                {externalColumnHeader}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={additionalColumnsHeader ? 3 : 2} className='px-4 py-8 text-center text-gray-500'>
                  Loading...
                </TableCell>
              </TableRow>
            ) : sortedInternalItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={additionalColumnsHeader ? 3 : 2} className='px-4 py-8 text-center text-gray-500'>
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              sortedInternalItems.map((item: TInternal) => {
                const internalId = getInternalId(item);
                const currentMapping = getCurrentMapping(internalId);
                const hasPendingChange = pendingMappings.has(internalId);

                return (
                  <TableRow
                    key={internalId}
                    className={cn(hasPendingChange && 'bg-yellow-500/5')}
                  >
                    <TableCell className='px-4 py-2 text-sm text-gray-200'>
                      {getInternalLabel(item)}
                    </TableCell>
                    {getInternalAdditionalLabel && (
                      <TableCell className='px-4 py-2 text-sm text-gray-400'>
                        {getInternalAdditionalLabel(item)}
                      </TableCell>
                    )}
                    <TableCell className='px-4 py-2'>
                      <UnifiedSelect
                        value={currentMapping ?? '__unmapped__'}
                        onValueChange={(value: string): void =>
                          handleMappingChange(
                            internalId,
                            value === '__unmapped__' ? null : value
                          )
                        }
                        disabled={isLoadingExternal}
                        options={externalOptions}
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
