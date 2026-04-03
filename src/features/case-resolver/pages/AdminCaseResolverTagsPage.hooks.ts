'use client';

import { useCallback, useMemo, useState } from 'react';

import type { CaseResolverTag } from '@/shared/contracts/case-resolver';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import type { CaseResolverTagFormData } from '../entity-form-data';
import { CASE_RESOLVER_TAGS_KEY, parseCaseResolverTags } from '../settings';
import {
  buildNextTagsForDelete,
  buildNextTagsForSave,
  buildParentTagOptions,
  buildTagPathLabelMap,
  buildTagPathOptions,
  collectDescendantTagIds,
  createCaseResolverTagFormData,
  createEmptyCaseResolverTagFormData,
} from './AdminCaseResolverTagsPage.helpers';

export function useAdminCaseResolverTagsPageRuntime() {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const tags = useMemo((): CaseResolverTag[] => parseCaseResolverTags(rawTags), [rawTags]);

  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<CaseResolverTag | null>(null);
  const [tagToDelete, setTagToDelete] = useState<CaseResolverTag | null>(null);
  const [formData, setFormData] = useState<CaseResolverTagFormData>(createEmptyCaseResolverTagFormData);

  const tagPathOptions = useMemo(() => buildTagPathOptions(tags), [tags]);
  const tagPathById = useMemo(() => buildTagPathLabelMap(tagPathOptions), [tagPathOptions]);
  const blockedParentIds = useMemo(
    () => (editingTag ? collectDescendantTagIds(tags, editingTag.id) : new Set<string>()),
    [editingTag, tags]
  );
  const parentTagOptions = useMemo(
    () => buildParentTagOptions(tagPathOptions, blockedParentIds),
    [blockedParentIds, tagPathOptions]
  );

  const openCreateModal = useCallback((): void => {
    setEditingTag(null);
    setFormData(createEmptyCaseResolverTagFormData());
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((tag: CaseResolverTag): void => {
    setEditingTag(tag);
    setFormData(createCaseResolverTagFormData(tag));
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    const nextTags = buildNextTagsForSave({
      editingTag,
      formData,
      tags,
      now: new Date().toISOString(),
    });
    if (!nextTags) {
      toast('Tag name is required.', { variant: 'error' });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: CASE_RESOLVER_TAGS_KEY,
        value: serializeSetting(nextTags),
      });
      toast(editingTag ? 'Tag updated.' : 'Tag created.', { variant: 'success' });
      setShowModal(false);
    } catch (error) {
      logClientCatch(error, {
        source: 'AdminCaseResolverTagsPage',
        action: 'saveTag',
        tagId: editingTag?.id,
      });
      toast(error instanceof Error ? error.message : 'Failed to save tag.', { variant: 'error' });
    }
  }, [editingTag, formData, tags, toast, updateSetting]);

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!tagToDelete) return;

    try {
      await updateSetting.mutateAsync({
        key: CASE_RESOLVER_TAGS_KEY,
        value: serializeSetting(
          buildNextTagsForDelete({
            tagToDelete,
            tags,
            now: new Date().toISOString(),
          })
        ),
      });
      toast('Tag deleted.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'AdminCaseResolverTagsPage',
        action: 'deleteTag',
        tagId: tagToDelete.id,
      });
      toast(error instanceof Error ? error.message : 'Failed to delete tag.', { variant: 'error' });
    } finally {
      setTagToDelete(null);
    }
  }, [tagToDelete, tags, toast, updateSetting]);

  return {
    editingTag,
    formData,
    handleConfirmDelete,
    handleSave,
    openCreateModal,
    openEditModal,
    parentTagOptions,
    setFormData,
    setShowModal,
    setTagToDelete,
    settingsStore,
    showModal,
    tagPathById,
    tagToDelete,
    tags,
    updateSetting,
  };
}
