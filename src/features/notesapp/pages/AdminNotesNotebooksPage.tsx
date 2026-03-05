'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';

import {
  useCreateNotebook,
  useUpdateNotebook,
  useDeleteNotebook,
} from '@/features/notesapp/api/useNoteMutations';
import { useNotebooks } from '@/features/notesapp/api/useNoteQueries';
import {
  useNoteSettingsActions,
  useNoteSettingsState,
} from '@/features/notesapp/hooks/NoteSettingsContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { NotebookRecord } from '@/shared/contracts/notes';
import {
  Button,
  useToast,
  Input,
  PageLayout,
  FormSection,
  FormField,
  LoadingState,
  StatusBadge,
  StandardDataTablePanel,
  FormActions,
  FilterPanel,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import type { ColumnDef } from '@tanstack/react-table';

export function AdminNotesNotebooksPage(): React.JSX.Element {
  const { toast } = useToast();
  const { settings } = useNoteSettingsState();
  const { updateSettings } = useNoteSettingsActions();
  const { selectedNotebookId } = settings;
  const router = useRouter();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [search, setSearch] = useState('');
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null);

  const notebooksQuery = useNotebooks();
  const notebooks = useMemo(
    (): NotebookRecord[] => notebooksQuery.data ?? [],
    [notebooksQuery.data]
  );
  const filteredNotebooks = useMemo(() => {
    if (!search.trim()) return notebooks;
    const q = search.toLowerCase().trim();
    return notebooks.filter((nb) => nb.name.toLowerCase().includes(q));
  }, [notebooks, search]);
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
        description: null,
        color: null,
        defaultThemeId: null,
      });
      setName('');
      toast('Notebook created', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, {
        context: {
          source: 'AdminNotesNotebooksPage',
          action: 'createNotebook',
          name,
        },
      });
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
      logClientError(error, {
        context: {
          source: 'AdminNotesNotebooksPage',
          action: 'updateNotebook',
          id,
        },
      });
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
      logClientError(error, {
        context: {
          source: 'AdminNotesNotebooksPage',
          action: 'deleteNotebook',
          id,
        },
      });
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
      logClientError(error, {
        context: {
          source: 'AdminNotesNotebooksPage',
          action: 'duplicateNotebook',
          originalId: notebook.id,
        },
      });
      toast('Failed to duplicate notebook', { variant: 'error' });
    }
  };

  const columns = useMemo<ColumnDef<NotebookRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Notebook Name',
        cell: ({ row }) => {
          const nb = row.original;
          const isEditing = editingId === nb.id;

          if (isEditing) {
            return (
              <Input
                type='text'
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className='h-8 py-0'
                autoFocus
              />
            );
          }

          return (
            <div className='flex items-center gap-2'>
              <span className='font-medium'>{nb.name}</span>
              {selectedNotebookId === nb.id && (
                <StatusBadge status='Active' variant='active' size='sm' className='font-bold' />
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => {
          const nb = row.original;
          const isEditing = editingId === nb.id;

          return (
            <div className='flex items-center justify-end gap-2'>
              {isEditing ? (
                <FormActions
                  onSave={() => void handleUpdate(nb.id)}
                  onCancel={handleEditCancel}
                  saveText='Save'
                  isSaving={updateNotebook.isPending}
                  saveVariant='default'
                  cancelVariant='ghost'
                />
              ) : (
                <>
                  <Button
                    variant='outline'
                    size='xs'
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSettings({ selectedNotebookId: nb.id });
                      router.push('/admin/notes');
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    variant='outline'
                    size='xs'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStart(nb);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant='outline'
                    size='xs'
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDuplicate(nb);
                    }}
                  >
                    Duplicate
                  </Button>
                  <Button
                    variant='outline'
                    size='xs'
                    className='text-red-300 hover:text-red-200'
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotebookToDelete(nb.id);
                    }}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [
      editingId,
      editingName,
      selectedNotebookId,
      updateNotebook.isPending,
      updateSettings,
      router,
      handleUpdate,
      handleEditCancel,
      handleEditStart,
      handleDuplicate,
    ]
  );

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
      refresh={{
        onRefresh: () => {
          void notebooksQuery.refetch();
        },
        isRefreshing: notebooksQuery.isFetching,
      }}
    >
      <div className='max-w-4xl space-y-6'>
        <FormSection title='Create Notebook' className='p-6'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-end'>
            <FormField label='Notebook Name' className='flex-1'>
              <Input
                type='text'
                value={name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setName(event.target.value)
                }
                className='w-full'
                placeholder='Enter notebook name'
              />
            </FormField>
            <Button
              onClick={(): void => {
                void handleCreate();
              }}
              disabled={createNotebook.isPending}
            >
              {createNotebook.isPending ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </FormSection>

        <StandardDataTablePanel
          columns={columns}
          data={filteredNotebooks}
          filters={
            <FilterPanel
              filters={[]}
              values={{}}
              search={search}
              searchPlaceholder='Search notebooks by name...'
              onFilterChange={() => {}}
              onSearchChange={setSearch}
              onReset={() => setSearch('')}
              showHeader={false}
              compact
            />
          }
          isLoading={loading}
        />
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
