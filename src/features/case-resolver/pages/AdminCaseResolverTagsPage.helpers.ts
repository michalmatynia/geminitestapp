import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CaseResolverTag } from '@/shared/contracts/case-resolver';
import type { SimpleSettingsListItem } from '@/shared/contracts/ui';
import { Tag as UiTag } from '@/shared/ui/forms-and-actions.public';

import type { CaseResolverTagFormData } from '../entity-form-data';

export const DEFAULT_CASE_RESOLVER_TAG_COLOR = '#38bdf8';

export type TagPathOption = {
  id: string;
  label: string;
  pathIds: string[];
};

export type CaseResolverTagListItem = SimpleSettingsListItem & {
  original: CaseResolverTag;
};

export const createCaseResolverTagId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `case-tag-${crypto.randomUUID()}`;
  }
  return `case-tag-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEmptyCaseResolverTagFormData = (): CaseResolverTagFormData => ({
  name: '',
  color: DEFAULT_CASE_RESOLVER_TAG_COLOR,
  parentId: null,
});

export const createCaseResolverTagFormData = (
  tag: CaseResolverTag
): CaseResolverTagFormData => ({
  name: tag.label,
  color: tag.color ?? DEFAULT_CASE_RESOLVER_TAG_COLOR,
  parentId: tag.parentId ?? null,
});

export const buildTagPathOptions = (tags: CaseResolverTag[]): TagPathOption[] => {
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
      const fallback = { ids: [tag.id], names: [tag.label] };
      cache.set(tagId, fallback);
      return fallback;
    }

    if (!tag.parentId || !byId.has(tag.parentId)) {
      const rootPath = { ids: [tag.id], names: [tag.label] };
      cache.set(tagId, rootPath);
      return rootPath;
    }

    const nextTrail = new Set(trail);
    nextTrail.add(tagId);
    const parentPath = resolvePath(tag.parentId, nextTrail);
    const fullPath = {
      ids: [...parentPath.ids, tag.id],
      names: [...parentPath.names, tag.label],
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

export const buildTagPathLabelMap = (
  tagPathOptions: TagPathOption[]
): Map<string, string> =>
  new Map(tagPathOptions.map((option: TagPathOption): [string, string] => [option.id, option.label]));

export const collectDescendantTagIds = (
  tags: CaseResolverTag[],
  rootTagId: string
): Set<string> => {
  const descendants = new Set<string>([rootTagId]);
  let expanded = true;

  while (expanded) {
    expanded = false;
    tags.forEach((tag: CaseResolverTag): void => {
      if (!tag.parentId || descendants.has(tag.id) || !descendants.has(tag.parentId)) {
        return;
      }

      descendants.add(tag.id);
      expanded = true;
    });
  }

  return descendants;
};

export const buildParentTagOptions = (
  tagPathOptions: TagPathOption[],
  blockedParentIds: Set<string>
): Array<LabeledOptionDto<string>> =>
  tagPathOptions
    .filter((option: TagPathOption): boolean => !blockedParentIds.has(option.id))
    .map((option: TagPathOption) => ({
      value: option.id,
      label: option.label,
    }));

export const buildCaseResolverTagListItems = (
  tags: CaseResolverTag[],
  tagPathById: Map<string, string>
): CaseResolverTagListItem[] =>
  tags.map((tag: CaseResolverTag) => ({
    id: tag.id,
    title: React.createElement(
      'div',
      { className: 'flex items-center gap-2' },
      React.createElement(UiTag, {
        label: tag.label,
        color: tag.color || DEFAULT_CASE_RESOLVER_TAG_COLOR,
        dot: true,
      })
    ),
    description: tagPathById.get(tag.id) ?? tag.label,
    original: tag,
  }));

export const buildNextTagsForSave = (args: {
  editingTag: CaseResolverTag | null;
  formData: CaseResolverTagFormData;
  tags: CaseResolverTag[];
  now: string;
}): CaseResolverTag[] | null => {
  const { editingTag, formData, now, tags } = args;
  const normalizedName = formData.name.trim();
  if (!normalizedName) {
    return null;
  }

  const normalizedParentId =
    formData.parentId && formData.parentId !== editingTag?.id ? formData.parentId : null;
  const color = formData.color.trim() || DEFAULT_CASE_RESOLVER_TAG_COLOR;

  const nextTag: CaseResolverTag = editingTag
    ? {
        ...editingTag,
        label: normalizedName,
        parentId: normalizedParentId,
        color,
        updatedAt: now,
      }
    : {
        id: createCaseResolverTagId(),
        label: normalizedName,
        parentId: normalizedParentId,
        color,
        createdAt: now,
        updatedAt: now,
      };

  return editingTag
    ? tags.map((tag: CaseResolverTag) => (tag.id === editingTag.id ? nextTag : tag))
    : [...tags, nextTag];
};

export const buildNextTagsForDelete = (args: {
  tagToDelete: CaseResolverTag;
  tags: CaseResolverTag[];
  now: string;
}): CaseResolverTag[] => {
  const { now, tagToDelete, tags } = args;

  return tags
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
};
