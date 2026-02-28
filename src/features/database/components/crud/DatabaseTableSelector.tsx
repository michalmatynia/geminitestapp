'use client';

import React from 'react';
import { PlusIcon } from 'lucide-react';

import { Button, SelectSimple } from '@/shared/ui';
import type { DatabaseTableDetail } from '@/shared/contracts/database';

export type DatabaseTableSelectorProps = {
  selectedTable: string;
  setSelectedTable: (table: string) => void;
  tableDetails: DatabaseTableDetail[];
  onRefresh: () => void;
  onAddRow: () => void;
  isFetching: boolean;
  setPage: (page: number) => void;
  setMutationError: (err: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
};

export function DatabaseTableSelector({
  selectedTable,
  setSelectedTable,
  tableDetails,
  onRefresh,
  onAddRow,
  isFetching,
  setPage,
  setMutationError,
  setSuccessMessage,
}: DatabaseTableSelectorProps): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-3'>
      <SelectSimple
        size='sm'
        value={selectedTable}
        onValueChange={(v) => {
          setSelectedTable(v);
          setPage(1);
          setMutationError(null);
          setSuccessMessage(null);
        }}
        options={tableDetails.map((t) => ({
          value: t.name,
          label: `${t.name} (~${t.rowEstimate} rows)`,
        }))}
        placeholder='Select a table to manage...'
        triggerClassName='h-8 min-w-[240px] text-xs'
      />

      {selectedTable && (
        <>
          <div className='h-4 w-px bg-border/60 mx-1' />
          <Button
            variant='outline'
            size='xs'
            onClick={onRefresh}
            disabled={isFetching}
            className='h-8'
            loading={isFetching}
          >
            Refresh
          </Button>
          <Button size='xs' onClick={onAddRow} className='h-8'>
            <PlusIcon className='size-3.5 mr-2' />
            Add Row
          </Button>
        </>
      )}
    </div>
  );
}
