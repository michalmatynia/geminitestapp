'use client';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

import { useEffect, useMemo, useCallback, useState } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { StandardDataTablePanel } from '../StandardDataTablePanel';
import { EmptyState } from '../../empty-state';
import { useToast } from '../../use-toast';

import { GenericMapperHeaderActions } from './GenericMapperHeaderActions';
import { GenericMapperStats } from './GenericMapperStats';
import { GenericMapperExternalCell } from './GenericMapperExternalCell';

import type { ColumnDef, Row } from '@tanstack/react-table';

export interface GenericItemMapperConfig<TInternal, TExternal, TMapping> {
  // Context
  connectionId?: string | null;
  connectionName?: string | null;

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
  onSave: (
    mappings: Array<{ internalId: string; externalId: string | null }>
  ) => Promise<{ message: string }>;

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

type UsePendingMappingsConfig<TMapping> = {
  mappings: TMapping[];
  internalIds: string[];
  getInternalId: (mapping: TMapping) => string;
  getExternalId: (mapping: TMapping) => string | null;
  isActive?: (mapping: TMapping) => boolean;
};

type MappingStats = {
  total: number;
  mapped: number;
  pending: number;
};

export type PendingExternalMappingsState = {
  pendingMappings: Map<string, string | null>;
  getCurrentMapping: (internalId: string) => string | null;
  handleMappingChange: (internalId: string, externalId: string | null) => void;
  resetPendingMappings: () => void;
  stats: MappingStats;
};

function useMappingsState<TMapping>({
  mappings,
  internalIds,
  getInternalId,
  getExternalId,
  isActive,
}: UsePendingMappingsConfig<TMapping>): PendingExternalMappingsState {
  const [pendingMappings, setPendingMappings] = useState<Map<string, string | null>>(new Map());

  const mappingByInternalId = useMemo(() => {
    const next = new Map<string, string | null>();
    for (const mapping of mappings) {
      if (isActive && !isActive(mapping)) continue;
      next.set(getInternalId(mapping), getExternalId(mapping));
    }
    return next;
  }, [getExternalId, getInternalId, isActive, mappings]);

  const getCurrentMapping = useCallback(
    (internalId: string): string | null => {
      if (pendingMappings.has(internalId)) {
        return pendingMappings.get(internalId) ?? null;
      }
      return mappingByInternalId.get(internalId) ?? null;
    },
    [mappingByInternalId, pendingMappings]
  );

  const handleMappingChange = useCallback(
    (internalId: string, externalId: string | null): void => {
      setPendingMappings((prev: Map<string, string | null>) => {
        const next = new Map(prev);
        const savedValue = mappingByInternalId.get(internalId) ?? null;
        if (savedValue === externalId) {
          next.delete(internalId);
        } else {
          next.set(internalId, externalId);
        }
        return next;
      });
    },
    [mappingByInternalId]
  );

  const resetPendingMappings = useCallback(() => {
    setPendingMappings(new Map());
  }, []);

  const stats = useMemo<MappingStats>(() => {
    const total = internalIds.length;
    const mapped = internalIds.filter((id: string) => getCurrentMapping(id) !== null).length;
    return {
      total,
      mapped,
      pending: pendingMappings.size,
    };
  }, [getCurrentMapping, internalIds, pendingMappings.size]);

  return {
    pendingMappings,
    getCurrentMapping,
    handleMappingChange,
    resetPendingMappings,
    stats,
  };
}

export function GenericMapper<TInternal, TExternal, TMapping>({
  config,
}: GenericItemMapperProps<TInternal, TExternal, TMapping>): React.JSX.Element {
  const { toast } = useToast();

  const {
    connectionId,
    connectionName,
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

  const { pendingMappings, getCurrentMapping, handleMappingChange, resetPendingMappings, stats }: PendingExternalMappingsState =
    useMappingsState<TMapping>({
      mappings: currentMappings,
      internalIds: sortedInternalItems.map((item) => getInternalId(item)),
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
        context: { source: 'GenericMapper', action: 'fetch', connectionId, title },
      });
      const message =
        error instanceof Error ? error.message : `Failed to fetch ${title.toLowerCase()}`;
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
        context: { source: 'GenericMapper', action: 'save', connectionId, title },
      });
      const message =
        error instanceof Error ? error.message : `Failed to save ${title.toLowerCase()}`;
      toast(message, { variant: 'error' });
    }
  };

  const loading = isLoadingInternal || isLoadingExternal || isLoadingMappings;

  const columns = useMemo<ColumnDef<TInternal>[]>(() => {
    const cols: ColumnDef<TInternal>[] = [
      {
        id: 'internal',
        header: internalColumnHeader,
        cell: ({ row }) => (
          <span className='text-sm text-gray-200'>{getInternalLabel(row.original)}</span>
        ),
      },
    ];

    if (additionalColumnsHeader && getInternalAdditionalLabel) {
      cols.push({
        id: 'additional',
        header: additionalColumnsHeader,
        cell: ({ row }) => (
          <span className='text-sm text-gray-400'>{getInternalAdditionalLabel(row.original)}</span>
        ),
      });
    }

    cols.push({
      id: 'external',
      header: externalColumnHeader,
      cell: ({ row }) => {
        const internalId = getInternalId(row.original);
        const currentMapping = getCurrentMapping(internalId);

        return (
          <GenericMapperExternalCell
            value={currentMapping}
            onChange={(value) => handleMappingChange(internalId, value)}
            options={externalOptions}
            disabled={isLoadingExternal}
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
    externalOptions,
  ]);

  return (
    <div className='space-y-4 border-t border-border/60 pt-6'>
      <StandardDataTablePanel
        title={title}
        description={connectionName ? `Connection: ${connectionName}` : undefined}
        headerActions={
          <GenericMapperHeaderActions
            onFetch={() => void handleFetch()}
            isFetching={isFetching}
            onSave={() => void handleSave()}
            isSaving={isSaving}
            pendingCount={pendingMappings.size}
          />
        }
        alerts={
          <GenericMapperStats
            total={stats.total}
            mapped={stats.mapped}
            pending={stats.pending}
            itemLabel={title}
          />
        }
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
          const hasPendingChange =
            pendingMappings.size > 0 && pendingMappings.has(getInternalId(row.original));
          return hasPendingChange ? 'bg-amber-500/5 hover:bg-amber-500/10' : '';
        }}
        variant='flat'
      />
    </div>
  );
}
