import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';
import { Button } from '@/shared/ui/button';
import { Trash2 } from 'lucide-react';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';

export function ProducersTable({ filtered, loading, openEdit, deleteProducer, openCreate, query }: any) {
  const columns = [
    {
      accessorKey: 'name',
      header: 'Producer Name',
      cell: ({ row }: any) => (
        <div className='min-w-0'>
          <div className='text-sm font-medium text-gray-100 truncate'>{row.original.name}</div>
          {row.original.website && <div className='text-xs text-muted-foreground truncate'>{row.original.website}</div>}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }: any) => (
        <div className='flex items-center justify-end gap-2'>
          <Button size='xs' variant='outline' onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size='xs' variant='outline' onClick={() => deleteProducer(row.original)} className='text-red-300'><Trash2 className='size-3.5' /></Button>
        </div>
      ),
    },
  ];

  return (
    <StandardDataTablePanel
      columns={columns}
      data={filtered}
      isLoading={loading}
      emptyState={<EmptyState title='No producers' description={query ? 'No producers match.' : 'Create one.'} action={!query ? <Button onClick={openCreate} variant='outline'>Create</Button> : undefined} />}
    />
  );
}
