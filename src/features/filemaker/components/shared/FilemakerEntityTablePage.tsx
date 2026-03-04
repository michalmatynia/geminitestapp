'use client';

import React from 'react';

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
  return (
    <div className='container mx-auto space-y-6 py-8'>
      <PanelHeader title={title} description={description} icon={icon} actions={actions} />

      <StandardDataTablePanel
        filters={
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
                size='sm'
              />
            </div>
          </div>
        }
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />
    </div>
  );
}
