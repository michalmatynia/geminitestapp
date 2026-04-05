'use client';

import { PlusIcon } from 'lucide-react';
import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Button } from '@/shared/ui/primitives.public';
import { SearchableSelect } from '@/shared/ui/forms-and-actions.public';

import {
  useCrudPanelActionsContext,
  useCrudPanelStateContext,
} from '../../context/CrudPanelContext';

export function DatabaseTableSelector(): React.JSX.Element {
  const { selectedTable, tableDetails, isFetching } = useCrudPanelStateContext();
  const { setSelectedTable, onRefresh, onAddRow, setPage, setMutationError, setSuccessMessage } =
    useCrudPanelActionsContext();
  const tableOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      tableDetails.map((table) => ({
        value: table.name,
        label: `${table.name} (~${table.rowEstimate} rows)`,
      })),
    [tableDetails]
  );
  return (
    <div className='flex flex-wrap items-center gap-3'>
      <SearchableSelect
        value={selectedTable}
        onChange={(v) => {
          setSelectedTable(v ?? '');
          setPage(1);
          setMutationError(null);
          setSuccessMessage(null);
        }}
        options={tableOptions}
        placeholder='Select a table to manage...'
        className='min-w-[280px]'
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
