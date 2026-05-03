'use client';

import { Plus, Pencil, Trash2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { Button } from './button';
import { EmptyState } from './empty-state';
import { FormModal } from './FormModal';
import { InsetPanel } from './InsetPanel';
import { Input } from './input';
import { Label } from './label';
import { LoadingState } from './LoadingState';
import { ResourceCard } from './ResourceCard';
import { SectionHeader } from './section-header';
import { Textarea } from './textarea';
import { UI_GRID_RELAXED_CLASSNAME } from './layout';
import { ConfirmModal } from './templates/modals';

export interface LibraryItem {
  id: string;
  name: string;
  description?: string | null | undefined;
  createdAt?: string | Date | null | undefined;
  updatedAt?: string | Date | null | undefined;
}

interface ItemLibraryProps<T extends LibraryItem> {
  title: string;
  description: string;
  items: T[];
  isLoading: boolean;
  onSave: (item: Partial<T>) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  renderExtraFields?: (
    item: T,
    onChange: (updates: Partial<T>) => void,
    context: { originalItem: T | null }
  ) => React.ReactNode;
  renderItemTags?: (item: T) => string[];
  buildDefaultItem: () => Partial<T>;
  entityName: string;
  backLink?: React.ReactNode;
  headerActions?: React.ReactNode;
  isSaving?: boolean;
  onEditorClose?: (args: {
    draft: Partial<T>;
    originalItem: T | null;
    saved: boolean;
  }) => Promise<void> | void;
}

export function ItemLibrary<T extends LibraryItem>(props: ItemLibraryProps<T>): React.JSX.Element {
  const {
    title,
    description,
    items,
    isLoading,
    onSave,
    onDelete,
    renderExtraFields,
    renderItemTags,
    buildDefaultItem,
    entityName,
    backLink,
    headerActions,
    isSaving = false,
    onEditorClose,
  } = props;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [draft, setDraft] = useState<Partial<T>>({});
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const fieldId = React.useId().replace(/:/g, '');
  const normalizedEntityName = entityName.toLowerCase().replace(/\s+/g, '-');
  const nameId = `${normalizedEntityName}-name-${fieldId}`;
  const descriptionId = `${normalizedEntityName}-description-${fieldId}`;

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt;
      const bTime = b.updatedAt || b.createdAt;
      const aDate = new Date(aTime || 0).getTime();
      const bDate = new Date(bTime || 0).getTime();
      return bDate - aDate;
    });
  }, [items]);

  const openCreate = () => {
    setEditingItem(null);
    setDraft(buildDefaultItem());
    setModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditingItem(item);
    setDraft({ ...item });
    setModalOpen(true);
  };

  const closeModal = (saved = false) => {
    const currentDraft = draft;
    const originalItem = editingItem;
    setModalOpen(false);
    setEditingItem(null);
    setDraft({});
    if (!onEditorClose) {
      return;
    }
    void Promise.resolve(onEditorClose({ draft: currentDraft, originalItem, saved })).catch(
      (error) => {
        logClientCatch(error, {
          source: 'ItemLibrary',
          action: 'onEditorClose',
        });
      }
    );
  };

  const handleSave = (): void => {
    if (!draft.name?.trim()) return;
    void onSave(draft)
      .then((): void => {
        closeModal(true);
      })
      .catch(() => {
        // Per-screen save handlers surface the error to users; keep the modal open here.
      });
  };

  const formatTime = (value: string | Date | null | undefined): string => {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleString();
  };

  return (
    <div className='page-section space-y-6'>
      <SectionHeader
        title={title}
        description={description}
        eyebrow={backLink}
        actions={
          <div className='flex items-center gap-2'>
            {headerActions}
            <Button onClick={openCreate} className='gap-2'>
              <Plus className='size-4' />
              New {entityName}
            </Button>
          </div>
        }
      />

      <InsetPanel padding='md'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm font-semibold text-white'>{entityName} library</p>
            <p className='mt-1 text-xs text-gray-400'>
              Manage your collection of {entityName.toLowerCase()}s.
            </p>
          </div>
          <div className='text-xs text-gray-500' aria-live='polite'>
            {isLoading ? 'Loading...' : `${items.length} ${entityName.toLowerCase()}(s)`}
          </div>
        </div>
      </InsetPanel>

      {isLoading ? (
        <LoadingState
          message={`Loading ${entityName.toLowerCase()}s...`}
          className='rounded-md border border-dashed border-border p-12 text-sm text-gray-400'
        />
      ) : sortedItems.length === 0 ? (
        <EmptyState
          title={`No ${entityName.toLowerCase()}s yet`}
          description={`Create your first ${entityName.toLowerCase()} to get started.`}
          action={
            <Button onClick={openCreate} variant='outline'>
              <Plus className='mr-2 h-4 w-4' />
              New {entityName}
            </Button>
          }
        />
      ) : (
        <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 xl:grid-cols-3`}>
          {sortedItems.map((item) => (
            <ResourceCard
              key={item.id}
              title={item.name}
              description={item.description || 'No description provided.'}
              className='h-auto'
              actions={
                <div className='flex gap-1'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => openEdit(item)}
                    disabled={isSaving}
                    title='Edit'
                    aria-label={`Edit ${item.name || entityName}`}>
                    <Pencil className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => setItemToDelete(item)}
                    disabled={isSaving}
                    title='Delete'
                    className='text-destructive hover:text-destructive'
                    aria-label={`Delete ${item.name || entityName}`}>
                    <Trash2 className='size-3.5' />
                  </Button>
                </div>
              }
              footer={
                <div className='flex flex-col gap-1.5'>
                  {renderItemTags && (
                    <div className='flex flex-wrap gap-2'>
                      {renderItemTags(item).map((tag) => (
                        <span
                          key={tag}
                          className='rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-gray-400'
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className='flex flex-wrap items-center gap-3 text-[10px] text-gray-500'>
                    <span>Updated: {formatTime(item.updatedAt)}</span>
                    <span>Created: {formatTime(item.createdAt)}</span>
                  </div>
                </div>
              }
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={(): void => {
          setItemToDelete(null);
        }}
        onConfirm={(): void => {
          if (itemToDelete) {
            void onDelete(itemToDelete).then((): void => {
              setItemToDelete(null);
            });
          }
        }}
        title={`Delete ${entityName}`}
        message={`Are you sure you want to delete ${entityName.toLowerCase()} "${itemToDelete?.name}"? This cannot be undone.`}
        confirmText='Delete'
        isDangerous
      />

      <FormModal
        open={modalOpen}
        onClose={closeModal}
        title={editingItem ? `Edit ${entityName}` : `New ${entityName}`}
        onSave={handleSave}
        isSaving={isSaving}
        isSaveDisabled={!draft.name?.trim()}
        saveText={editingItem ? 'Save Changes' : `Create ${entityName}`}
      >
        <div className='space-y-6'>
          <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
            <div className='space-y-2'>
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                value={draft.name || ''}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    name: e.target.value,
                  }))
                }
                placeholder={`Enter ${entityName.toLowerCase()} name`}
               aria-label={`Enter ${entityName.toLowerCase()} name`} title={`Enter ${entityName.toLowerCase()} name`}/>
            </div>
            <div className='space-y-2'>
              <Label htmlFor={descriptionId}>Description</Label>
              <Textarea
                id={descriptionId}
                value={draft.description || ''}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
                placeholder='Optional description'
                className='min-h-[90px]'
               aria-label='Optional description' title='Optional description'/>
            </div>
          </div>

          {renderExtraFields?.(
            draft as T,
            (updates) =>
              setDraft((current) => ({
                ...current,
                ...updates,
              })),
            { originalItem: editingItem }
          )}
        </div>
      </FormModal>
    </div>
  );
}
