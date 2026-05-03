'use client';

import { Trash2, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';

import { useNotebookResource } from '@/features/notesapp/api/useNotebookResource';
import {
  useCreateNoteTag,
  useDeleteNoteTag,
  useUpdateNoteTag,
} from '@/features/notesapp/api/useNoteMutations';
import { useNoteTags } from '@/features/notesapp/api/useNoteQueries';
import {
  useNoteSettingsActions,
  useNoteSettingsState,
} from '@/features/notesapp/hooks/NoteSettingsContext';
import type { TagRecord } from '@/shared/contracts/notes';
import { AdminNotesPageLayout } from '@/shared/ui/admin.public';
import { Button, useToast, Input } from '@/shared/ui/primitives.public';
import { FormSection, FormField, Tag, FormActions } from '@/shared/ui/forms-and-actions.public';
import { StandardDataTablePanel, FilterPanel } from '@/shared/ui/templates.public';
import { CompactEmptyState, UI_STACK_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

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
      logClientCatch(error, {
        source: 'AdminNotesTagsPage',
        action: 'createTag',
        name,
        notebookId: selectedNotebookId,
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
      logClientCatch(error, {
        source: 'AdminNotesTagsPage',
        action: 'deleteTag',
        tagId: toDelete.id,
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
      logClientCatch(error, {
        source: 'AdminNotesTagsPage',
        action: 'updateTag',
        tagId,
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
                  aria-label='Tag name'
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setEditingName(event.target.value)
                  }
                  className='h-8 w-full sm:max-w-[200px]'
                  ref={(node) => {
                    node?.focus();
                  }}
                 title='Input field'/>
                <div className='flex items-center gap-2'>
                  <Input
                    type='color'
                    value={editingColor}
                    aria-label='Tag color'
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setEditingColor(event.target.value)
                    }
                    className='h-8 w-12 p-1'
                   title='Input field'/>
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
                    title={`Delete ${tag.name}`}>
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
    <AdminNotesPageLayout
      title='Note Tags'
      current='Tags'
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
          <div className={`${UI_STACK_RELAXED_CLASSNAME} sm:flex-row sm:items-end`}>
            <FormField label='Tag Name' className='flex-1'>
              <Input
                type='text'
                value={name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setName(event.target.value)
                }
                className='w-full'
                placeholder='Enter tag name'
               aria-label='Enter tag name' title='Enter tag name'/>
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
                 aria-label='Color' title='Color'/>
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
            <CompactEmptyState
              title={searchQuery ? 'No tags found' : 'No tags created yet'}
              description={
                searchQuery
                  ? 'Try a different search query.'
                  : 'Create your first tag to start organizing notes.'
              }
              className='py-8'
             />
          }
        />
      </div>

      <ConfirmModal
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Tag'
        message={`Are you sure you want to delete tag "${toDelete?.name ?? ''}"? It will be removed from all notes.`}
        confirmText='Delete'
        isDangerous={true}
        loading={deleteTag.isPending}
      />
    </AdminNotesPageLayout>
  );
}
