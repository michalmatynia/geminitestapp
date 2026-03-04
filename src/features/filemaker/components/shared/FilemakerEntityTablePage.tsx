'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { EmptyState, PanelHeader, SearchInput, StandardDataTablePanel } from '@/shared/ui';

import type { PanelAction } from '@/shared/contracts/ui';
import type { ColumnDef } from '@tanstack/react-table';

export interface FilemakerEntityTablePageProps<TData> {
  title: string;
  description: string;
  icon: React.ReactNode;
  actions: PanelAction[];
  badges: React.ReactNode;
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder: string;
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
}

type FilemakerEntityTableRuntimeValue = {
  badges: React.ReactNode;
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
};

const {
  Context: FilemakerEntityTableRuntimeContext,
  useStrictContext: useFilemakerEntityTableRuntime,
} = createStrictContext<FilemakerEntityTableRuntimeValue>({
  hookName: 'useFilemakerEntityTableRuntime',
  providerName: 'FilemakerEntityTableRuntimeProvider',
  displayName: 'FilemakerEntityTableRuntimeContext',
});

function FilemakerEntityTableFilters(): React.JSX.Element {
  const runtime = useFilemakerEntityTableRuntime();

  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex items-center gap-2'>{runtime.badges}</div>
      <div className='w-full max-w-sm'>
        <SearchInput
          value={runtime.query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            runtime.onQueryChange(event.target.value);
          }}
          onClear={() => runtime.onQueryChange('')}
          placeholder={runtime.queryPlaceholder}
          size='sm'
        />
      </div>
    </div>
  );
}

function FilemakerEntityTableEmptyState(): React.JSX.Element {
  const runtime = useFilemakerEntityTableRuntime();
  return <EmptyState title={runtime.emptyTitle} description={runtime.emptyDescription} />;
}

export function FilemakerEntityTablePage<TData>({
  title,
  description,
  icon,
  actions,
  badges,
  query,
  onQueryChange,
  queryPlaceholder,
  columns,
  data,
  isLoading,
  emptyTitle,
  emptyDescription,
}: FilemakerEntityTablePageProps<TData>): React.JSX.Element {
  const runtimeValue = React.useMemo<FilemakerEntityTableRuntimeValue>(
    () => ({
      badges,
      query,
      onQueryChange,
      queryPlaceholder,
      emptyTitle,
      emptyDescription,
    }),
    [badges, query, onQueryChange, queryPlaceholder, emptyTitle, emptyDescription]
  );

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <PanelHeader title={title} description={description} icon={icon} actions={actions} />

      <FilemakerEntityTableRuntimeContext.Provider value={runtimeValue}>
        <StandardDataTablePanel
          filters={<FilemakerEntityTableFilters />}
          columns={columns}
          data={data}
          isLoading={isLoading}
          emptyState={<FilemakerEntityTableEmptyState />}
        />
      </FilemakerEntityTableRuntimeContext.Provider>
    </div>
  );
}
