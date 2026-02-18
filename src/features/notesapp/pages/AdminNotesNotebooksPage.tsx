'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';

import {
  useCreateNotebook,
  useUpdateNotebook,
  useDeleteNotebook,
} from '@/features/notesapp/api/useNoteMutations';
import { useNotebooks } from '@/features/notesapp/api/useNoteQueries';
import { useNoteSettings } from '@/features/notesapp/hooks/NoteSettingsContext';
import { logClientError } from '@/features/observability';
import type { NotebookRecord } from '@/shared/types/domain/notes';
import { Button, useToast, Input, PageLayout, FormSection, FormField, RefreshButton, LoadingState, ActionMenu, DropdownMenuItem, DropdownMenuSeparator, StatusBadge } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

export function AdminNotesNotebooksPage(): React.JSX.Element {
  const { toast } = useToast();
  const { settings, updateSettings } = useNoteSettings();
  const { selectedNotebookId } = settings;
  const router = useRouter();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null);

  const notebooksQuery = useNotebooks();
  const notebooks = useMemo((): NotebookRecord[] => notebooksQuery.data ?? [], [notebooksQuery.data]);
  const loading = notebooksQuery.isPending;

  const createNotebook = useCreateNotebook();
  const updateNotebook = useUpdateNotebook();
  const deleteNotebook = useDeleteNotebook();

  useEffect((): void => {
    if (!selectedNotebookId && notebooks.length > 0) {
      updateSettings({ selectedNotebookId: notebooks[0]!.id });
    }
  }, [selectedNotebookId, notebooks, updateSettings]);

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) {
      toast('Notebook name is required', { variant: 'error' });
      return;
    }
    try {
      await createNotebook.mutateAsync({
        name: name.trim(),
        color: null,
        defaultThemeId: null,
      });
      setName('');
      toast('Notebook created', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminNotesNotebooksPage', action: 'createNotebook', name } });
      toast('Failed to create notebook', { variant: 'error' });
    }
  };

  const handleEditStart = useCallback((notebook: NotebookRecord): void => {
    setEditingId(notebook.id);
    setEditingName(notebook.name);
  }, []);

  const handleEditCancel = useCallback((): void => {
    setEditingId(null);
    setEditingName('');
  }, []);

  const handleUpdate = async (id: string): Promise<void> => {
    if (!editingName.trim()) {
      toast('Notebook name is required', { variant: 'error' });
      return;
    }
    try {
      await updateNotebook.mutateAsync({ id, name: editingName.trim() });
      toast('Notebook updated', { variant: 'success' });
      handleEditCancel();
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminNotesNotebooksPage', action: 'updateNotebook', id } });
      toast('Failed to update notebook', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteNotebook.mutateAsync(id);
      if (selectedNotebookId === id) {
        updateSettings({ selectedNotebookId: null });
      }
      toast('Notebook deleted', { variant: 'success' });
      setNotebookToDelete(null);
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminNotesNotebooksPage', action: 'deleteNotebook', id } });
      toast('Failed to delete notebook', { variant: 'error' });
    }
  };

  const handleDuplicate = async (notebook: NotebookRecord): Promise<void> => {
    const baseName = notebook.name.trim();
    const existing = notebooks
      .filter((item: NotebookRecord): boolean => item.name.startsWith(baseName))
      .map((item: NotebookRecord): number => {
        const match = item.name.match(/\((\d+)\)$/);
        return match ? Number(match[1]) : 0;
      });
    const nextNumber = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    const newName = `${baseName} (${nextNumber})`;
    try {
      await createNotebook.mutateAsync({
        name: newName,
        color: notebook.color ?? null,
        defaultThemeId: notebook.defaultThemeId ?? null,
      });
      toast('Notebook duplicated', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminNotesNotebooksPage', action: 'duplicateNotebook', originalId: notebook.id } });
      toast('Failed to duplicate notebook', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <PageLayout title='Notebooks' description='Loading notebooks...'>
        <div className='flex min-h-[400px] items-center justify-center'>
          <LoadingState message='Loading notebooks...' />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title='Notebooks'
      description='Create and manage notebooks. Notes, folders, and tags are scoped per notebook.'
    >
      <div className='max-w-3xl space-y-6'>
        <FormSection title='Create Notebook' className='p-6'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-end'>
            <FormField label='Notebook Name' className='flex-1'>
              <Input
                type='text'
                value={name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setName(event.target.value)}
                className='w-full'
                placeholder='Enter notebook name'
              />
            </FormField>
            <Button onClick={(): void => { void handleCreate(); }} disabled={createNotebook.isPending}>
              {createNotebook.isPending ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </FormSection>

        <FormSection
          title='Your Notebooks'
          className='p-6'
          actions={(
            <RefreshButton
              onRefresh={(): void => { void notebooksQuery.refetch(); }}
              isRefreshing={loading}
            />
          )}
        >
          {loading ? (
            <LoadingState message='Loading notebooks...' className='py-8' />
          ) : notebooks.length === 0 ? (
            <div className='text-sm text-gray-500'>No notebooks created yet.</div>
          ) : (
            <div className='grid gap-3 sm:grid-cols-2'>
              {notebooks.map((notebook: NotebookRecord) => {
                const isEditing = editingId === notebook.id;
                const isActive = selectedNotebookId === notebook.id;
                return (
                  <div
                    key={notebook.id}
                    className='flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/30 px-4 py-3 transition hover:border-border/80'
                    onClick={(): void => {
                      updateSettings({ selectedNotebookId: notebook.id });
                      router.push('/admin/notes');
                    }}
                  >
                    <div className='flex flex-1 items-center gap-3'>
                      {isEditing ? (
                        <div className='flex flex-1 flex-col gap-2 sm:flex-row sm:items-center'>
                          <Input
                            type='text'
                            value={editingName}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setEditingName(event.target.value)}
                            className='w-full'
                          />
                        </div>
                      ) : (
                        <div className='flex flex-col'>
                          <Button
                            type='button'
                            onClick={(event: React.MouseEvent): void => {
                              event.stopPropagation();
                              handleEditStart(notebook);
                            }}
                            className='text-left text-sm text-gray-200 hover:text-white'
                          >
                            {notebook.name}
                          </Button>
                          {isActive && (
                            <StatusBadge status='Active' variant='active' size='sm' className='font-bold ml-1' />
                          )}
                        </div>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      {isEditing ? (
                        <>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={(event: React.MouseEvent): void => {
                              event.stopPropagation();
                              void handleUpdate(notebook.id);
                            }}
                            disabled={updateNotebook.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={(event: React.MouseEvent): void => {
                              event.stopPropagation();
                              handleEditCancel();
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <ActionMenu ariaLabel={`Notebook actions for ${notebook.name}`}>
                          <DropdownMenuItem
                            onSelect={(event: Event): void => {
                              event.preventDefault();
                              handleEditStart(notebook);
                            }}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event: Event): void => {
                              event.preventDefault();
                              void handleDuplicate(notebook);
                            }}
                          >
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className='text-destructive focus:text-destructive'
                            onSelect={(event: Event): void => {
                              event.preventDefault();
                              setNotebookToDelete(notebook.id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </ActionMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FormSection>
      </div>

      <ConfirmModal
        isOpen={Boolean(notebookToDelete)}
        onClose={() => setNotebookToDelete(null)}
        title='Delete Notebook?'
        message='Delete this notebook and all its notes/tags/folders? This action cannot be undone.'
        confirmText='Destroy Notebook'
        isDangerous={true}
        onConfirm={(): void => {
          if (notebookToDelete) {
            void handleDelete(notebookToDelete);
          }
        }}
      />
    </PageLayout>
  );
}
