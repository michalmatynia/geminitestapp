'use client';

import React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';
import { PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';

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

type FilemakerEntityTableFiltersProps = Pick<
  FilemakerEntityTableRuntimeValue,
  'badges' | 'query' | 'onQueryChange' | 'queryPlaceholder'
>;

function renderFilemakerEntityTableFilters({
  badges,
  query,
  onQueryChange,
  queryPlaceholder,
}: FilemakerEntityTableFiltersProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex items-center gap-2'>{badges}</div>
      <div className='w-full max-w-sm'>
        <SearchInput
          value={query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onQueryChange(event.target.value);
          }}
          onClear={() => onQueryChange('')}
          placeholder={queryPlaceholder}
          aria-label={queryPlaceholder}
          size='sm'
        />
      </div>
    </div>
  );
}

export function FilemakerEntityTablePage<TData>(
  props: FilemakerEntityTablePageProps<TData>
): React.JSX.Element {
  const {
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
  } = props;

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader title={title} description={description} icon={icon} actions={actions} />

      <StandardDataTablePanel
        filters={renderFilemakerEntityTableFilters({
          badges,
          query,
          onQueryChange,
          queryPlaceholder,
        })}
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />
    </div>
  );
}
