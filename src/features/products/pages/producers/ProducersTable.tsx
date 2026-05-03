import type { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';

import type { Producer } from '@/shared/contracts/products/producers';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';
import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';
import { Button } from '@/shared/ui/button';

type ProducersTableProps = {
  filtered: Producer[];
  loading: boolean;
  openEdit: (producer: Producer) => void;
  deleteProducer: (producer: Producer) => void;
  openCreate: () => void;
  query: string;
};

const renderProducerNameCell = ({ row }: { row: { original: Producer } }): React.JSX.Element => (
  <div className='min-w-0'>
    <div className='truncate text-sm font-medium text-gray-100'>{row.original.name}</div>
    {row.original.website !== null && row.original.website !== '' ? (
      <div className='truncate text-xs text-muted-foreground'>{row.original.website}</div>
    ) : null}
  </div>
);

export function ProducersTable({
  filtered,
  loading,
  openEdit,
  deleteProducer,
  openCreate,
  query,
}: ProducersTableProps): React.JSX.Element {
  const columns: Array<ColumnDef<Producer, unknown>> = [
    {
      accessorKey: 'name',
      header: 'Producer Name',
      cell: renderProducerNameCell,
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }: { row: { original: Producer } }) => (
        <div className='flex items-center justify-end gap-2'>
          <Button size='xs' variant='outline' onClick={() => openEdit(row.original)}>
            Edit
          </Button>
          <Button
            size='xs'
            variant='outline'
            onClick={() => deleteProducer(row.original)}
            className='text-red-300'
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ];

  const hasQuery = query.trim() !== '';

  return (
    <StandardDataTablePanel
      columns={columns}
      data={filtered}
      isLoading={loading}
      emptyState={
        <EmptyState
          title='No producers'
          description={hasQuery ? 'No producers match.' : 'Create one.'}
          action={!hasQuery ? <Button onClick={openCreate} variant='outline'>Create</Button> : undefined}
        />
      }
    />
  );
}
