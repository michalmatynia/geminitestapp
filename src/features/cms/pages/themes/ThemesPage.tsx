'use client';

import { Edit, Trash2, Palette } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { useCmsThemes, useDeleteTheme } from '@/features/cms/hooks/useCmsQueries';
import type { CmsTheme } from '@/features/cms/types';
import { Button, ListPanel, EmptyState, DataTable } from '@/shared/ui';

import type { ColumnDef } from '@tanstack/react-table';

export default function ThemesPage(): React.ReactNode {
  const router = useRouter();
  const themesQuery = useCmsThemes();
  const deleteMutation = useDeleteTheme();

  const themes = useMemo(() => themesQuery.data ?? [], [themesQuery.data]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this theme?')) return;
    await deleteMutation.mutateAsync(id);
  };

  const columns = useMemo<ColumnDef<CmsTheme>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Theme Name',
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div className='flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary'>
            <Palette className='size-4' />
          </div>
          <Link
            href={`/admin/cms/themes/${row.original.id}/edit`}
            className='font-medium text-gray-200 hover:text-blue-300 transition-colors'
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      id: 'palette',
      header: 'Color Palette',
      cell: ({ row }) => (
        <div className='flex items-center gap-1.5'>
          {Object.values(row.original.colors).slice(0, 6).map((color, idx) => (
            <div
              key={idx}
              className='size-5 rounded-full border border-white/10 shadow-sm'
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          {Object.keys(row.original.colors).length > 6 && (
            <span className='text-[10px] text-gray-500 font-bold ml-1'>
              +{Object.keys(row.original.colors).length - 6}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => <span className='text-xs text-gray-500'>{row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : '—'}</span>,
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex justify-end gap-2'>
          <Link href={`/admin/cms/themes/${row.original.id}/edit`}>
            <Button variant='ghost' size='xs' className='h-7 w-7 p-0'>
              <Edit className='size-3.5' />
            </Button>
          </Link>
          <Button 
            variant='ghost' 
            size='xs' 
            className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
            onClick={() => void handleDelete(row.original.id)}
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ], [handleDelete]);

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <ListPanel
        title='Design Themes'
        description='Manage color palettes, typography and component style presets for your domains.'
        headerActions={
          <Button size='xs' className='h-8' onClick={() => router.push('/admin/cms/themes/create')}>
            <Palette className='size-3.5 mr-2' />
            Create Theme
          </Button>
        }
        isLoading={themesQuery.isLoading}
        emptyState={
          <EmptyState
            title='No themes defined'
            description='Themes allow you to maintain a consistent visual language across your storefront.'
            action={
              <Button onClick={() => router.push('/admin/cms/themes/create')} variant='outline' size='sm'>
                Create Your First Theme
              </Button>
            }
          />
        }
      >
        <div className='rounded-md border border-border bg-gray-950/20 overflow-hidden'>
          <DataTable
            columns={columns}
            data={themes}
          />
        </div>
      </ListPanel>
    </div>
  );
}
