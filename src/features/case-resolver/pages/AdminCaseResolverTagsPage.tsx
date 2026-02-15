'use client';

import { Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { logClientError } from '@/features/observability';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  FormField,
  FormModal,
  FormSection,
  Input,
  SectionHeader,
  Skeleton,
  Tag as UiTag,
  useToast,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { CASE_RESOLVER_TAGS_KEY, parseCaseResolverTags } from '../settings';

import type { CaseResolverTag } from '../types';

type TagFormData = {
  name: string;
  color: string;
};

const createTagId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `case-tag-${crypto.randomUUID()}`;
  }
  return `case-tag-${Math.random().toString(36).slice(2, 10)}`;
};

export function AdminCaseResolverTagsPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const tags = useMemo((): CaseResolverTag[] => parseCaseResolverTags(rawTags), [rawTags]);

  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<CaseResolverTag | null>(null);
  const [tagToDelete, setTagToDelete] = useState<CaseResolverTag | null>(null);
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    color: '#38bdf8',
  });

  const openCreateModal = (): void => {
    setEditingTag(null);
    setFormData({ name: '', color: '#38bdf8' });
    setShowModal(true);
  };

  const openEditModal = (tag: CaseResolverTag): void => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
    });
    setShowModal(true);
  };

  const handleSave = useCallback(async (): Promise<void> => {
    const normalizedName = formData.name.trim();
    if (!normalizedName) {
      toast('Tag name is required.', { variant: 'error' });
      return;
    }

    const now = new Date().toISOString();
    const nextTag: CaseResolverTag = editingTag
      ? {
        ...editingTag,
        name: normalizedName,
        color: formData.color.trim() || '#38bdf8',
        updatedAt: now,
      }
      : {
        id: createTagId(),
        name: normalizedName,
        color: formData.color.trim() || '#38bdf8',
        createdAt: now,
        updatedAt: now,
      };

    const nextTags = editingTag
      ? tags.map((tag: CaseResolverTag) => (tag.id === editingTag.id ? nextTag : tag))
      : [...tags, nextTag];

    try {
      await updateSetting.mutateAsync({
        key: CASE_RESOLVER_TAGS_KEY,
        value: serializeSetting(nextTags),
      });
      toast(editingTag ? 'Tag updated.' : 'Tag created.', { variant: 'success' });
      setShowModal(false);
    } catch (error) {
      logClientError(error, { context: { source: 'AdminCaseResolverTagsPage', action: 'saveTag', tagId: editingTag?.id } });
      toast(error instanceof Error ? error.message : 'Failed to save tag.', { variant: 'error' });
    }
  }, [editingTag, formData.color, formData.name, tags, toast, updateSetting]);

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!tagToDelete) return;
    const nextTags = tags.filter((tag: CaseResolverTag) => tag.id !== tagToDelete.id);
    try {
      await updateSetting.mutateAsync({
        key: CASE_RESOLVER_TAGS_KEY,
        value: serializeSetting(nextTags),
      });
      toast('Tag deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminCaseResolverTagsPage', action: 'deleteTag', tagId: tagToDelete.id },
      });
      toast(error instanceof Error ? error.message : 'Failed to delete tag.', { variant: 'error' });
    } finally {
      setTagToDelete(null);
    }
  }, [tagToDelete, tags, toast, updateSetting]);

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Case Resolver Tags'
        description='Manage document tags used across Case Resolver files.'
      />

      <div className='flex justify-start'>
        <Button
          onClick={openCreateModal}
          variant='outline'
          className='border-border/70 bg-transparent text-white hover:bg-muted/40'
        >
          <Plus className='mr-2 size-4' />
          Add Tag
        </Button>
      </div>

      <FormSection title='Tags' className='p-4'>
        <div className='mt-4'>
          {settingsStore.isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
          ) : tags.length === 0 ? (
            <EmptyState
              title='No tags yet'
              description='Create tags to classify Case Resolver documents.'
              action={(
                <Button onClick={openCreateModal} variant='outline'>
                  <Plus className='mr-2 size-4' />
                  Create First Tag
                </Button>
              )}
            />
          ) : (
            <div className='space-y-2'>
              {tags.map((tag: CaseResolverTag) => (
                <div
                  key={tag.id}
                  className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-gray-900/40 p-3'
                >
                  <div className='min-w-0'>
                    <UiTag
                      label={tag.name}
                      color={tag.color || '#38bdf8'}
                      dot
                    />
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      onClick={(): void => openEditModal(tag)}
                      className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700'
                    >
                      Edit
                    </Button>
                    <Button
                      type='button'
                      onClick={(): void => setTagToDelete(tag)}
                      className='rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600'
                      title='Delete tag'
                    >
                      <Trash2 className='size-3' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      <ConfirmDialog
        open={Boolean(tagToDelete)}
        onOpenChange={(open: boolean): void => {
          if (!open) setTagToDelete(null);
        }}
        onConfirm={(): void => {
          void handleConfirmDelete();
        }}
        title='Delete Tag'
        description={`Delete tag "${tagToDelete?.name ?? ''}"? This action cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
      />

      {showModal ? (
        <FormModal
          open={showModal}
          onClose={(): void => setShowModal(false)}
          title={editingTag ? 'Edit Tag' : 'Create Tag'}
          onSave={(): void => {
            void handleSave();
          }}
          isSaving={updateSetting.isPending}
          size='md'
        >
          <div className='space-y-4'>
            <FormField label='Name'>
              <Input
                className='h-9'
                value={formData.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setFormData((current: TagFormData) => ({
                    ...current,
                    name: event.target.value,
                  }));
                }}
                placeholder='Tag name'
              />
            </FormField>
            <FormField label='Color'>
              <div className='flex items-center gap-3'>
                <Input
                  type='color'
                  className='h-10 w-20 cursor-pointer rounded border border-border bg-gray-900 p-0'
                  value={formData.color}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setFormData((current: TagFormData) => ({
                      ...current,
                      color: event.target.value,
                    }));
                  }}
                />
                <Input
                  type='text'
                  className='h-10 flex-1 font-mono'
                  value={formData.color}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setFormData((current: TagFormData) => ({
                      ...current,
                      color: event.target.value,
                    }));
                  }}
                  placeholder='#38bdf8'
                />
              </div>
            </FormField>
          </div>
        </FormModal>
      ) : null}
    </div>
  );
}
