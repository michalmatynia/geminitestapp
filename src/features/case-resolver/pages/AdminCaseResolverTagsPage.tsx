'use client';

import { Plus } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { logClientError } from '@/features/observability';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  EmptyState,
  FormSection,
  SectionHeader,
  Skeleton,
  Tag as UiTag,
  useToast,
  Breadcrumbs,
  ActionMenu,
  DropdownMenuItem,
  PropertyRow,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { serializeSetting } from '@/shared/utils/settings-json';

import { CaseResolverTagModal } from '../components/modals/CaseResolverTagModal';
import { CASE_RESOLVER_TAGS_KEY, parseCaseResolverTags } from '../settings';

import type { CaseResolverTag } from '../types';

type TagFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

const createTagId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `case-tag-${crypto.randomUUID()}`;
  }
  return `case-tag-${Math.random().toString(36).slice(2, 10)}`;
};

type TagPathOption = {
  id: string;
  label: string;
  pathIds: string[];
};

const buildTagPathOptions = (tags: CaseResolverTag[]): TagPathOption[] => {
  const byId = new Map<string, CaseResolverTag>(
    tags.map((tag: CaseResolverTag): [string, CaseResolverTag] => [tag.id, tag])
  );
  const cache = new Map<string, { ids: string[]; names: string[] }>();

  const resolvePath = (tagId: string, trail: Set<string>): { ids: string[]; names: string[] } => {
    const cached = cache.get(tagId);
    if (cached) return cached;
    const tag = byId.get(tagId);
    if (!tag) return { ids: [], names: [] };
    if (trail.has(tagId)) {
      const fallback = { ids: [tag.id], names: [tag.name] };
      cache.set(tagId, fallback);
      return fallback;
    }

    if (!tag.parentId || !byId.has(tag.parentId)) {
      const rootPath = { ids: [tag.id], names: [tag.name] };
      cache.set(tagId, rootPath);
      return rootPath;
    }

    const nextTrail = new Set(trail);
    nextTrail.add(tagId);
    const parentPath = resolvePath(tag.parentId, nextTrail);
    const fullPath = {
      ids: [...parentPath.ids, tag.id],
      names: [...parentPath.names, tag.name],
    };
    cache.set(tagId, fullPath);
    return fullPath;
  };

  return tags
    .map((tag: CaseResolverTag): TagPathOption => {
      const path = resolvePath(tag.id, new Set<string>());
      return {
        id: tag.id,
        label: path.names.join(' / '),
        pathIds: path.ids,
      };
    })
    .sort((left: TagPathOption, right: TagPathOption) => left.label.localeCompare(right.label));
};

const collectDescendantTagIds = (tags: CaseResolverTag[], rootTagId: string): Set<string> => {
  const descendants = new Set<string>([rootTagId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    tags.forEach((tag: CaseResolverTag): void => {
      if (!tag.parentId || descendants.has(tag.id)) return;
      if (!descendants.has(tag.parentId)) return;
      descendants.add(tag.id);
      expanded = true;
    });
  }
  return descendants;
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
    parentId: null,
  });
  const tagPathOptions = useMemo((): TagPathOption[] => buildTagPathOptions(tags), [tags]);
  const tagPathById = useMemo(() => {
    const map = new Map<string, string>();
    tagPathOptions.forEach((option: TagPathOption): void => {
      map.set(option.id, option.label);
    });
    return map;
  }, [tagPathOptions]);
  const blockedParentIds = useMemo(
    () => (editingTag ? collectDescendantTagIds(tags, editingTag.id) : new Set<string>()),
    [editingTag, tags]
  );
  const parentTagOptions = useMemo(
    () =>
      tagPathOptions
        .filter((option: TagPathOption): boolean => !blockedParentIds.has(option.id))
        .map((option: TagPathOption) => ({
          value: option.id,
          label: option.label,
        })),
    [blockedParentIds, tagPathOptions]
  );

  const openCreateModal = (): void => {
    setEditingTag(null);
    setFormData({ name: '', color: '#38bdf8', parentId: null });
    setShowModal(true);
  };

  const openEditModal = (tag: CaseResolverTag): void => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      parentId: tag.parentId,
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
    const normalizedParentId =
      formData.parentId && formData.parentId !== editingTag?.id ? formData.parentId : null;
    const nextTag: CaseResolverTag = editingTag
      ? {
        ...editingTag,
        name: normalizedName,
        parentId: normalizedParentId,
        color: formData.color.trim() || '#38bdf8',
        updatedAt: now,
      }
      : {
        id: createTagId(),
        name: normalizedName,
        parentId: normalizedParentId,
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
  }, [editingTag, formData.color, formData.name, formData.parentId, tags, toast, updateSetting]);

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!tagToDelete) return;
    const now = new Date().toISOString();
    const nextTags = tags
      .filter((tag: CaseResolverTag) => tag.id !== tagToDelete.id)
      .map((tag: CaseResolverTag): CaseResolverTag =>
        tag.parentId === tagToDelete.id
          ? {
            ...tag,
            parentId: null,
            updatedAt: now,
          }
          : tag
      );
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
        subtitle={(
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Case Resolver', href: '/admin/case-resolver' },
              { label: 'Tags' }
            ]}
          />
        )}
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
                    <PropertyRow label='Path' value={tagPathById.get(tag.id) ?? tag.name} className='mt-1' />
                  </div>
                  <ActionMenu ariaLabel={`Actions for tag ${tag.name}`}>
                    <DropdownMenuItem onSelect={() => openEditModal(tag)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className='text-destructive focus:text-destructive' onSelect={() => setTagToDelete(tag)}>
                      Delete
                    </DropdownMenuItem>
                  </ActionMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      <ConfirmModal
        isOpen={Boolean(tagToDelete)}
        onClose={() => setTagToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Tag'
        message={`Delete tag "${tagToDelete?.name ?? ''}"? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      <CaseResolverTagModal
        isOpen={showModal}
        onClose={(): void => setShowModal(false)}
        onSuccess={(): void => {}}
        item={editingTag}
        formData={formData}
        setFormData={setFormData}
        parentTagOptions={parentTagOptions}
        isSaving={updateSetting.isPending}
        onSave={(): void => {
          void handleSave();
        }}
      />
    </div>
  );
}
