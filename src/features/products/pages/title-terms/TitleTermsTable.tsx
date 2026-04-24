import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';
import { Button } from '@/shared/ui/button';
import { Trash2 } from 'lucide-react';

export function TitleTermsTable({ filteredTerms, isLoading, catalogNameById, openEdit, deleteTerm }: any) {
  const columns = [
    {
      accessorKey: 'name_en',
      header: 'English',
      cell: ({ row }: any) => (
        <div className='text-sm font-medium text-gray-100'>{row.original.name_en}</div>
      ),
    },
    {
      id: 'catalog',
      header: 'Catalog',
      cell: ({ row }: any) => catalogNameById.get(row.original.catalogId) ?? row.original.catalogId,
    },
    {
      accessorKey: 'type',
      header: 'Type',
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }: any) => (
        <div className='flex justify-end gap-2'>
          <Button size='xs' variant='outline' onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size='xs' variant='outline' onClick={() => deleteTerm(row.original)} className='text-rose-400'><Trash2 className='size-3.5' /></Button>
        </div>
      ),
    },
  ];

  return <StandardDataTablePanel columns={columns} data={filteredTerms} isLoading={isLoading} />;
}
