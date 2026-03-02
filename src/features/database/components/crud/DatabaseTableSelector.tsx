import React from 'react';
import { PlusIcon } from 'lucide-react';

import { Button, SelectSimple } from '@/shared/ui';
import { useCrudPanelContext } from '../../context/CrudPanelContext';

export function DatabaseTableSelector(): React.JSX.Element {
  const {
    selectedTable,
    setSelectedTable,
    tableDetails,
    onRefresh,
    onAddRow,
    isFetching,
    setPage,
    setMutationError,
    setSuccessMessage,
  } = useCrudPanelContext();
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
