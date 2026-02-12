'use client';


import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useCmsThemes, useDeleteTheme } from '@/features/cms/hooks/useCmsQueries';
import type { CmsTheme } from '@/features/cms/types';
import { Button, ListPanel, EmptyState } from '@/shared/ui';

export default function ThemesPage(): React.ReactNode {
  const router = useRouter();
  const themesQuery = useCmsThemes();
  const deleteMutation = useDeleteTheme();

  const themes = themesQuery.data ?? [];

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Delete this theme?')) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className='container mx-auto py-10'>
      <ListPanel
        title='Themes'
        description='Manage color palettes, typography and spacing presets.'
        headerActions={
          <Button size='sm' onClick={() => router.push('/admin/cms/themes/create')}>
            Create Theme
          </Button>
        }
        isLoading={themesQuery.isLoading}
        emptyState={
          <EmptyState
            title='No themes yet'
            description='Create your first theme to define the visual style of your storefront.'
            action={
              <Button onClick={() => router.push('/admin/cms/themes/create')} variant='outline'>
                Create Theme
              </Button>
            }
          />
        }
      >
        <ul className='divide-y divide-border'>
          {themes.map((theme: CmsTheme) => (
            <li key={theme.id} className='flex items-center justify-between px-4 py-3'>
              <Link
                href={`/admin/cms/themes/${theme.id}/edit`}
                className='flex items-center gap-3 hover:underline'
              >
                <div className='flex gap-1'>
                  {Object.values(theme.colors).slice(0, 5).map((color: string, idx: number) => (
                    <span
                      key={idx}
                      className='inline-block size-4 rounded-full border border-border/50'
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className='text-sm font-medium'>{theme.name}</span>
              </Link>
              <Button
                size='sm'
                variant='destructive'
                onClick={() => { void handleDelete(theme.id); }}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </ListPanel>
    </div>
  );
}
