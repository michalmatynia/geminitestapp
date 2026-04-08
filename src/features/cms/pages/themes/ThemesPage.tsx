'use client';

import { Palette } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useMemo, startTransition } from 'react';

import { useCmsThemes, useDeleteTheme } from '@/features/cms/hooks/useCmsQueries';
import type { CmsTheme } from '@/shared/contracts/cms';
import { AdminCmsPageLayout } from '@/shared/ui/admin.public';
import { Button, DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives.public';
import { EmptyState, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { StandardDataTablePanel, FilterPanel } from '@/shared/ui/templates.public';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ColumnDef } from '@tanstack/react-table';

export default function ThemesPage(): React.ReactNode {
  const router = useRouter();
  const themesQuery = useCmsThemes();
  const deleteMutation = useDeleteTheme();

  const themes = useMemo(() => themesQuery.data ?? [], [themesQuery.data]);
  const [themeToDelete, setThemeToDelete] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  const filteredThemes = useMemo(() => {
    if (!search.trim()) return themes;
    const q = search.toLowerCase().trim();
    return themes.filter((t) => t.name.toLowerCase().includes(q));
  }, [themes, search]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setThemeToDelete(null);
    } catch (error) {
      logClientCatch(error, {
        service: 'cms',
        action: 'deleteTheme',
        themeId: id,
      });
    }  };

  const columns = useMemo<ColumnDef<CmsTheme>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Theme Name',
        cell: ({ row }) => (
          <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
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
            {Object.values(row.original.colors)
              .slice(0, 6)
              .map((color, idx) => (
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
        cell: ({ row }) => (
          <span className='text-xs text-gray-500'>
            {row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <ActionMenu ariaLabel={`Actions for theme ${row.original.name}`}>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  startTransition(() => { router.push(`/admin/cms/themes/${row.original.id}/edit`); });
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  setThemeToDelete(row.original.id);
                }}
              >
                Delete
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <AdminCmsPageLayout
      title='Design Themes'
      current='Themes'
      description='Manage color palettes, typography and component style presets for your domains.'
      icon={<Palette className='size-4' />}
      headerActions={
        <Button size='xs' className='h-8' onClick={() => startTransition(() => { router.push('/admin/cms/themes/create'); })}>
          <Palette className='size-3.5 mr-2' />
          Create Theme
        </Button>
      }
    >
      <StandardDataTablePanel
        filters={
          <FilterPanel
            filters={[]}
            values={{}}
            search={search}
            searchPlaceholder='Search themes by name...'
            onFilterChange={() => {}}
            onSearchChange={setSearch}
            onReset={() => setSearch('')}
            showHeader={false}
            compact
          />
        }
        isLoading={themesQuery.isLoading}
        columns={columns}
        data={filteredThemes}
        emptyState={
          <EmptyState
            title='No themes defined'
            description='Themes allow you to maintain a consistent visual language across your storefront.'
            action={
              <Button
                onClick={() => startTransition(() => { router.push('/admin/cms/themes/create'); })}
                variant='outline'
                size='sm'
              >
                Create Your First Theme
              </Button>
            }
          />
        }
      />

      <ConfirmModal
        isOpen={Boolean(themeToDelete)}
        onClose={() => setThemeToDelete(null)}
        title='Delete Theme?'
        message='Are you sure you want to delete this theme? This action cannot be undone and will affect all pages using this theme.'
        confirmText='Destroy Theme'
        isDangerous={true}
        onConfirm={(): void => {
          if (themeToDelete) {
            void handleDelete(themeToDelete);
          }
        }}
      />
    </AdminCmsPageLayout>
  );
}
