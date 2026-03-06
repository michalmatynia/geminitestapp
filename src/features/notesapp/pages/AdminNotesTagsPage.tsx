'use client';

import { Trash2, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';

import {
  useCreateNoteTag,
  useDeleteNoteTag,
  useUpdateNoteTag,
} from '@/features/notesapp/api/useNoteMutations';
import { useNoteTags } from '@/features/notesapp/api/useNoteQueries';
import { useNotebookResource } from '@/features/notesapp/api/useNotebookResource';
import {
  useNoteSettingsActions,
  useNoteSettingsState,
} from '@/features/notesapp/hooks/NoteSettingsContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { TagRecord } from '@/shared/contracts/notes';
import {
  Button,
  useToast,
  Input,
  FormSection,
  FormField,
  StandardDataTablePanel,
  Tag,
  EmptyState,
  PageLayout,
  FilterPanel,
  FormActions,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import type { ColumnDef } from '@tanstack/react-table';

export function AdminNotesTagsPage(): React.JSX.Element {
  const { toast } = useToast();
  const { settings } = useNoteSettingsState();
  const { updateSettings } = useNoteSettingsActions();
  const { selectedNotebookId } = settings;
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#3b82f6');
  const [toDelete, setToDelete] = useState<TagRecord | null>(null);

  const { listQuery: notebooksQuery } = useNotebookResource();
  const tagsQuery = useNoteTags(selectedNotebookId ?? undefined);
  const createTag = useCreateNoteTag();
  const updateTag = useUpdateNoteTag();
  const deleteTag = useDeleteNoteTag();

  const tags = useMemo((): TagRecord[] => tagsQuery.data ?? [], [tagsQuery.data]);
  const loading = tagsQuery.isLoading;

  useEffect((): void => {
    if (selectedNotebookId) return;
    const firstId = notebooksQuery.data?.[0]?.id;
    if (firstId) {
      updateSettings({ selectedNotebookId: firstId });
    }
  }, [selectedNotebookId, updateSettings, notebooksQuery.data]);

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) {
      toast('Tag name is required', { variant: 'error' });
      return;
    }
    try {
      if (!selectedNotebookId) return;
      await createTag.mutateAsync({
        name: name.trim(),
        color,
        notebookId: selectedNotebookId,
      });
      setName('');
      toast('Tag created', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, {
        context: {
          source: 'AdminNotesTagsPage',
          action: 'createTag',
          name,
          notebookId: selectedNotebookId,
        },
      });
      toast('Failed to create tag', { variant: 'error' });
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!toDelete) return;
    try {
      await deleteTag.mutateAsync(toDelete.id);
      toast('Tag deleted', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, {
        context: {
          source: 'AdminNotesTagsPage',
          action: 'deleteTag',
          tagId: toDelete.id,
        },
      });
      toast('Failed to delete tag', { variant: 'error' });
    } finally {
      setToDelete(null);
    }
  };

  const handleEditStart = useCallback((tag: TagRecord): void => {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color || '#3b82f6');
  }, []);

  const handleEditCancel = useCallback((): void => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('#3b82f6');
  }, []);

  const handleUpdate = async (tagId: string): Promise<void> => {
    if (!editingName.trim()) {
      toast('Tag name is required', { variant: 'error' });
      return;
    }
    try {
      await updateTag.mutateAsync({
        id: tagId,
        name: editingName.trim(),
        color: editingColor,
      });
      toast('Tag updated', { variant: 'success' });
      handleEditCancel();
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'AdminNotesTagsPage', action: 'updateTag', tagId },
      });
      toast('Failed to update tag', { variant: 'error' });
    }
  };

  const filteredTags = useMemo(
    (): TagRecord[] =>
      tags.filter((tag: TagRecord) =>
        tag.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ),
    [tags, searchQuery]
  );

  const columns = useMemo<ColumnDef<TagRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tag',
        cell: ({ row }) => {
          const tag = row.original;
          const isEditing = editingId === tag.id;

          if (isEditing) {
            return (
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Input
                  type='text'
                  value={editingName}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setEditingName(event.target.value)
                  }
                  className='h-8 w-full sm:max-w-[200px]'
                  autoFocus
                />
                <div className='flex items-center gap-2'>
                  <Input
                    type='color'
                    value={editingColor}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setEditingColor(event.target.value)
                    }
                    className='h-8 w-12 p-1'
                  />
                  <span className='text-[10px] font-mono text-gray-500 uppercase'>
                    {editingColor}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <Tag
              label={tag.name || 'Unnamed'}
              color={tag.color || '#3b82f6'}
              dot
              className='h-7 font-semibold'
            />
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => {
          const tag = row.original;
          const isEditing = editingId === tag.id;

          return (
            <div className='flex items-center justify-end gap-2'>
              {isEditing ? (
                <FormActions
                  onSave={() => void handleUpdate(tag.id)}
                  onCancel={handleEditCancel}
                  saveText='Save'
                  isSaving={updateTag.isPending}
                  saveVariant='default'
                  cancelVariant='ghost'
                />
              ) : (
                <>
                  <Button variant='outline' size='xs' onClick={(): void => handleEditStart(tag)}>
                    Edit
                  </Button>
                  <Button
                    type='button'
                    size='xs'
                    variant='outline'
                    onClick={(): void => setToDelete(tag)}
                    className='text-red-300 hover:text-red-200'
                    aria-label={`Delete ${tag.name}`}
                  >
                    <Trash2 size={14} />
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
      editingColor,
      handleUpdate,
      updateTag.isPending,
      handleEditCancel,
      handleEditStart,
    ]
  );

  return (
    <PageLayout
      title='Note Tags'
      description='Create and remove tags used in the Notes app.'
      refresh={{
        onRefresh: () => {
          void tagsQuery.refetch();
        },
        isRefreshing: tagsQuery.isFetching,
      }}
    >
      <div className='max-w-4xl space-y-6'>
        <FormSection title='Create Tag' variant='subtle'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-end'>
            <FormField label='Tag Name' className='flex-1'>
              <Input
                type='text'
                value={name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setName(event.target.value)
                }
                className='w-full'
                placeholder='Enter tag name'
              />
            </FormField>
            <FormField label='Color'>
              <div className='flex items-center gap-2'>
                <Input
                  type='color'
                  value={color}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setColor(event.target.value)
                  }
                  className='h-10 w-16 p-1'
                />
                <span className='text-xs font-mono text-gray-500 uppercase'>{color}</span>
              </div>
            </FormField>
            <Button
              onClick={(): void => {
                void handleCreate();
              }}
              disabled={createTag.isPending}
            >
              <Plus className='mr-2 size-4' />
              {createTag.isPending ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </FormSection>

        <StandardDataTablePanel
          filters={
            <FilterPanel
              filters={[]}
              values={{}}
              search={searchQuery}
              searchPlaceholder='Search tags by name...'
              onFilterChange={() => {}}
              onSearchChange={setSearchQuery}
              onReset={() => setSearchQuery('')}
              showHeader={false}
              compact
            />
          }
          columns={columns}
          data={filteredTags}
          isLoading={loading}
          emptyState={
            <EmptyState
              title={searchQuery ? 'No tags found' : 'No tags created yet'}
              description={
                searchQuery
                  ? 'Try a different search query.'
                  : 'Create your first tag to start organizing notes.'
              }
              variant='compact'
              className='py-8'
            />
          }
        />
      </div>

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Tag'
        message={`Are you sure you want to delete tag "${toDelete?.name ?? ''}"? It will be removed from all notes.`}
        confirmText='Delete'
        isDangerous={true}
        loading={deleteTag.isPending}
      />
    </PageLayout>
  );
}
