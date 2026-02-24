'use client';

import { Download, Save } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import { logClientError } from '@/features/observability';
import { Button, SelectSimple, StandardDataTablePanel, MetadataItem, EmptyState } from '@/shared/ui';
import { useToast } from '@/shared/ui/toast';

import { usePendingExternalMappings } from './usePendingExternalMappings';

import type { ColumnDef, Row } from '@tanstack/react-table';

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

  const sortedInternalItems = useMemo(
    () =>
      [...internalItems].sort((a: TInternal, b: TInternal) =>
        getInternalLabel(a).localeCompare(getInternalLabel(b))
      ),
    [internalItems, getInternalLabel]
  );

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

  useEffect(() => {
    resetPendingMappings();
  }, [connectionId, resetPendingMappings]);

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

  const columns = useMemo<ColumnDef<TInternal>[]>(() => {
    const cols: ColumnDef<TInternal>[] = [
      {
        id: 'internal',
        header: internalColumnHeader,
        cell: ({ row }) => <span className='text-sm text-gray-200'>{getInternalLabel(row.original)}</span>,
      },
    ];

    if (additionalColumnsHeader && getInternalAdditionalLabel) {
      cols.push({
        id: 'additional',
        header: additionalColumnsHeader,
        cell: ({ row }) => <span className='text-sm text-gray-400'>{getInternalAdditionalLabel(row.original)}</span>,
      });
    }

    cols.push({
      id: 'external',
      header: externalColumnHeader,
      cell: ({ row }) => {
        const internalId = getInternalId(row.original);
        const currentMapping = getCurrentMapping(internalId);
        
        return (
          <SelectSimple
            value={currentMapping ?? '__unmapped__'}
            onValueChange={(value) =>
              handleMappingChange(
                internalId,
                value === '__unmapped__' ? null : value
              )
            }
            disabled={isLoadingExternal}
            options={externalOptions}
            variant='subtle'
            size='sm'
            triggerClassName='w-full max-w-md'
          />
        );
      },
    });

    return cols;
  }, [
    internalColumnHeader, 
    externalColumnHeader, 
    additionalColumnsHeader, 
    getInternalLabel, 
    getInternalAdditionalLabel, 
    getInternalId, 
    getCurrentMapping, 
    handleMappingChange, 
    isLoadingExternal, 
    externalOptions
  ]);

  const alerts = (
    <div className='flex gap-4 mb-4'>
      <MetadataItem label='Total' value={stats.total} variant='minimal' />
      <MetadataItem label='Mapped' value={stats.mapped} variant='minimal' valueClassName='text-emerald-400 font-bold' />
      {stats.pending > 0 && (
        <MetadataItem label='Pending' value={stats.pending} variant='minimal' valueClassName='text-yellow-400 font-bold' />
      )}
    </div>
  );

  return (
    <div className='space-y-4 border-t border-border/60 pt-6'>
      <StandardDataTablePanel
        title={title}
        description={`Connection: ${connectionName}`}
        headerActions={
          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void handleFetch()}
              loading={isFetching}
            >
              <Download className='mr-2 h-3.5 w-3.5' />
              Fetch
            </Button>
            <Button
              size='sm'
              onClick={() => void handleSave()}
              loading={isSaving}
              disabled={pendingMappings.size === 0}
            >
              <Save className='mr-2 h-3.5 w-3.5' />
              Save {pendingMappings.size > 0 ? `(${pendingMappings.size})` : ''}
            </Button>
          </div>
        }
        alerts={alerts}
        columns={columns}
        data={sortedInternalItems}
        isLoading={loading}
        getRowId={(row) => getInternalId(row)}
        maxHeight='60vh'
        stickyHeader
        emptyState={
          <EmptyState
            title={`No ${title.toLowerCase()} found`}
            description={`Try fetching ${title.toLowerCase()} from the marketplace.`}
            variant='compact'
            className='py-8'
          />
        }
        getRowClassName={(row: Row<TInternal>) => {
          const hasPendingChange = pendingMappings.size > 0 && pendingMappings.has(getInternalId(row.original));
          return hasPendingChange ? 'bg-amber-500/5 hover:bg-amber-500/10' : '';
        }}
        variant='flat'
      />
    </div>
  );
}
