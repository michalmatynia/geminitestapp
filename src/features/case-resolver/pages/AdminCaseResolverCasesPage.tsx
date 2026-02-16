'use client';

import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Edit2, Eye, Folder, FolderOpen, Link2, Lock, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { UserPreferences } from '@/shared/types/domain/user-preferences';
import { AppModal, Badge, Button, FilterPanel, FormSection, Input, MultiSelect, SectionHeader, SelectSimple, useToast } from '@/shared/ui';
import type { FilterField } from '@/shared/ui/templates/panels';

import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  normalizeCaseResolverWorkspace,
  parseCaseResolverCategories,
  parseCaseResolverIdentifiers,
  parseCaseResolverTags,
  parseCaseResolverWorkspace,
} from '../settings';

import type {
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverFileType,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '../types';

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatCaseTimestamp = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown';
  return new Date(parsed).toLocaleString();
};

type CaseTreeNode = {
  file: CaseResolverFile;
  children: CaseTreeNode[];
};

type CaseSortKey = 'updated' | 'created' | 'name';
type CaseSortOrder = 'asc' | 'desc';
type CaseViewMode = 'hierarchy' | 'list';
type CaseSearchScope = 'all' | 'name' | 'folder' | 'content';
type CaseFileTypeFilter = 'all' | CaseResolverFileType;
type IndexedCaseRow = {
  file: CaseResolverFile;
  normalizedName: string;
  normalizedFolder: string;
  normalizedContent: string;
  normalizedTag: string;
  normalizedCaseIdentifier: string;
  normalizedCategory: string;
};
type CaseFileComparator = (left: CaseResolverFile, right: CaseResolverFile) => number;

const defaultCaseComparator: CaseFileComparator = (
  left: CaseResolverFile,
  right: CaseResolverFile
): number => {
  const nameDelta = left.name.localeCompare(right.name);
  if (nameDelta !== 0) return nameDelta;
  return left.id.localeCompare(right.id);
};

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const buildPathLabelMap = <T extends { id: string; name: string; parentId: string | null }>(
  items: T[]
): Map<string, string> => {
  const byId = new Map<string, T>(items.map((item: T): [string, T] => [item.id, item]));
  const cache = new Map<string, string>();

  const resolveLabel = (id: string, visited: Set<string>): string => {
    const cached = cache.get(id);
    if (cached) return cached;
    const item = byId.get(id);
    if (!item) return '';
    if (visited.has(id)) {
      cache.set(id, item.name);
      return item.name;
    }
    if (!item.parentId || !byId.has(item.parentId)) {
      cache.set(id, item.name);
      return item.name;
    }
    const nextVisited = new Set(visited);
    nextVisited.add(id);
    const parentLabel = resolveLabel(item.parentId, nextVisited);
    const label = `${parentLabel} / ${item.name}`;
    cache.set(id, label);
    return label;
  };

  items.forEach((item: T): void => {
    resolveLabel(item.id, new Set<string>());
  });

  return cache;
};

const sortCaseNodes = (
  nodes: CaseTreeNode[],
  comparator: CaseFileComparator = defaultCaseComparator
): void => {
  nodes.sort((left: CaseTreeNode, right: CaseTreeNode): number => {
    return comparator(left.file, right.file);
  });
  nodes.forEach((node: CaseTreeNode) => {
    sortCaseNodes(node.children, comparator);
  });
};

const buildCaseTree = (
  files: CaseResolverFile[],
  comparator: CaseFileComparator = defaultCaseComparator
): CaseTreeNode[] => {
  const byId = new Map<string, CaseTreeNode>(
    files.map((file: CaseResolverFile): [string, CaseTreeNode] => [
      file.id,
      { file, children: [] },
    ])
  );
  const roots: CaseTreeNode[] = [];

  byId.forEach((node: CaseTreeNode) => {
    const parentCaseId = node.file.parentCaseId;
    if (!parentCaseId || parentCaseId === node.file.id) {
      roots.push(node);
      return;
    }
    const parent = byId.get(parentCaseId);
    if (!parent) {
      roots.push(node);
      return;
    }
    parent.children.push(node);
  });

  sortCaseNodes(roots, comparator);
  return roots;
};

const flattenCaseTreeOptions = (
  nodes: CaseTreeNode[],
  depth = 0
): Array<{ value: string; label: string }> =>
  nodes.flatMap((node: CaseTreeNode) => [
    { value: node.file.id, label: `${' '.repeat(depth * 2)}${node.file.name}` },
    ...flattenCaseTreeOptions(node.children, depth + 1),
  ]);

type CaseListViewDefaults = {
  viewMode: CaseViewMode;
  sortBy: CaseSortKey;
  sortOrder: CaseSortOrder;
  searchScope: CaseSearchScope;
  filtersCollapsedByDefault: boolean;
};

const DEFAULT_CASE_LIST_VIEW_DEFAULTS: CaseListViewDefaults = {
  viewMode: 'hierarchy',
  sortBy: 'updated',
  sortOrder: 'desc',
  searchScope: 'all',
  filtersCollapsedByDefault: true,
};

const normalizeCaseListViewDefaults = (
  preferences: UserPreferences | undefined
): CaseListViewDefaults => ({
  viewMode: preferences?.caseResolverCaseListViewMode === 'list' ? 'list' : 'hierarchy',
  sortBy:
    preferences?.caseResolverCaseListSortBy === 'created' ||
    preferences?.caseResolverCaseListSortBy === 'name'
      ? preferences.caseResolverCaseListSortBy
      : 'updated',
  sortOrder: preferences?.caseResolverCaseListSortOrder === 'asc' ? 'asc' : 'desc',
  searchScope:
    preferences?.caseResolverCaseListSearchScope === 'name' ||
    preferences?.caseResolverCaseListSearchScope === 'folder' ||
    preferences?.caseResolverCaseListSearchScope === 'content'
      ? preferences.caseResolverCaseListSearchScope
      : 'all',
  filtersCollapsedByDefault:
    preferences?.caseResolverCaseListFiltersCollapsedByDefault ?? true,
});

export function AdminCaseResolverCasesPage(): React.JSX.Element {
  const router = useRouter();
  const preferencesQuery = useUserPreferences();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const caseListViewDefaults = useMemo(
    () => normalizeCaseListViewDefaults(preferencesQuery.data),
    [preferencesQuery.data]
  );

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverIdentifiers = settingsStore.get(CASE_RESOLVER_IDENTIFIERS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const caseResolverTags = useMemo(
    (): CaseResolverTag[] => parseCaseResolverTags(rawCaseResolverTags),
    [rawCaseResolverTags]
  );
  const caseResolverIdentifiers = useMemo(
    (): CaseResolverIdentifier[] => parseCaseResolverIdentifiers(rawCaseResolverIdentifiers),
    [rawCaseResolverIdentifiers]
  );
  const caseResolverCategories = useMemo(
    (): CaseResolverCategory[] => parseCaseResolverCategories(rawCaseResolverCategories),
    [rawCaseResolverCategories]
  );
  const caseResolverTagOptions = useMemo(
    () =>
      caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: tag.name,
      })),
    [caseResolverTags]
  );
  const caseResolverIdentifierOptions = useMemo(
    () =>
      caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => ({
        value: identifier.id,
        label: identifier.name,
      })),
    [caseResolverIdentifiers]
  );
  const caseResolverCategoryOptions = useMemo(() => {
    const byId = new Map<string, CaseResolverCategory>(
      caseResolverCategories.map(
        (category: CaseResolverCategory): [string, CaseResolverCategory] => [category.id, category]
      )
    );
    const resolveDepth = (category: CaseResolverCategory): number => {
      let depth = 0;
      let parentId = category.parentId;
      while (parentId) {
        const parent = byId.get(parentId);
        if (!parent) break;
        depth += 1;
        parentId = parent.parentId;
      }
      return depth;
    };
    return caseResolverCategories
      .map((category: CaseResolverCategory) => ({
        value: category.id,
        label: `${' '.repeat(resolveDepth(category) * 2)}${category.name}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [caseResolverCategories]);
  const defaultTagId = caseResolverTags[0]?.id ?? null;
  const defaultCaseIdentifierId = caseResolverIdentifiers[0]?.id ?? null;
  const defaultCategoryId = caseResolverCategories[0]?.id ?? null;
  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(parsedWorkspace);

  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseParentId, setNewCaseParentId] = useState<string | null>(null);
  const [newCaseReferenceCaseIds, setNewCaseReferenceCaseIds] = useState<string[]>([]);
  const [newCaseTagId, setNewCaseTagId] = useState<string | null>(defaultTagId);
  const [newCaseCaseIdentifierId, setNewCaseCaseIdentifierId] = useState<string | null>(
    defaultCaseIdentifierId
  );
  const [newCaseCategoryId, setNewCaseCategoryId] = useState<string | null>(defaultCategoryId);
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingCaseName, setEditingCaseName] = useState('');
  const [editingCaseParentId, setEditingCaseParentId] = useState<string | null>(null);
  const [editingCaseReferenceCaseIds, setEditingCaseReferenceCaseIds] = useState<string[]>([]);
  const [editingCaseTagId, setEditingCaseTagId] = useState<string | null>(null);
  const [editingCaseCaseIdentifierId, setEditingCaseCaseIdentifierId] = useState<string | null>(
    null
  );
  const [editingCaseCategoryId, setEditingCaseCategoryId] = useState<string | null>(null);
  const [collapsedCaseIds, setCollapsedCaseIds] = useState<Set<string>>(new Set<string>());
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [caseSearchScope, setCaseSearchScope] = useState<CaseSearchScope>(
    DEFAULT_CASE_LIST_VIEW_DEFAULTS.searchScope
  );
  const [caseFileTypeFilter, setCaseFileTypeFilter] = useState<CaseFileTypeFilter>('all');
  const [caseFilterTagIds, setCaseFilterTagIds] = useState<string[]>([]);
  const [caseFilterCaseIdentifierIds, setCaseFilterCaseIdentifierIds] = useState<string[]>([]);
  const [caseFilterCategoryIds, setCaseFilterCategoryIds] = useState<string[]>([]);
  const [caseFilterFolder, setCaseFilterFolder] = useState('__all__');
  const [caseSortBy, setCaseSortBy] = useState<CaseSortKey>(
    DEFAULT_CASE_LIST_VIEW_DEFAULTS.sortBy
  );
  const [caseSortOrder, setCaseSortOrder] = useState<CaseSortOrder>(
    DEFAULT_CASE_LIST_VIEW_DEFAULTS.sortOrder
  );
  const [caseViewMode, setCaseViewMode] = useState<CaseViewMode>(
    DEFAULT_CASE_LIST_VIEW_DEFAULTS.viewMode
  );
  const [caseFilterPanelDefaultExpanded, setCaseFilterPanelDefaultExpanded] = useState<boolean>(
    !DEFAULT_CASE_LIST_VIEW_DEFAULTS.filtersCollapsedByDefault
  );
  const [didHydrateCaseListViewDefaults, setDidHydrateCaseListViewDefaults] =
    useState(false);

  useEffect(() => {
    setWorkspace(parsedWorkspace);
  }, [parsedWorkspace]);

  useEffect(() => {
    if (didHydrateCaseListViewDefaults) return;
    if (!preferencesQuery.data) return;
    setCaseViewMode(caseListViewDefaults.viewMode);
    setCaseSortBy(caseListViewDefaults.sortBy);
    setCaseSortOrder(caseListViewDefaults.sortOrder);
    setCaseSearchScope(caseListViewDefaults.searchScope);
    setCaseFilterPanelDefaultExpanded(!caseListViewDefaults.filtersCollapsedByDefault);
    setDidHydrateCaseListViewDefaults(true);
  }, [
    caseListViewDefaults.filtersCollapsedByDefault,
    caseListViewDefaults.searchScope,
    caseListViewDefaults.sortBy,
    caseListViewDefaults.sortOrder,
    caseListViewDefaults.viewMode,
    didHydrateCaseListViewDefaults,
    preferencesQuery.data,
  ]);

  useEffect(() => {
    setNewCaseTagId((current: string | null) => {
      if (!current) return defaultTagId;
      return caseResolverTags.some((tag: CaseResolverTag) => tag.id === current)
        ? current
        : defaultTagId;
    });
  }, [caseResolverTags, defaultTagId]);

  useEffect(() => {
    setNewCaseCaseIdentifierId((current: string | null) => {
      if (!current) return defaultCaseIdentifierId;
      return caseResolverIdentifiers.some(
        (identifier: CaseResolverIdentifier) => identifier.id === current
      )
        ? current
        : defaultCaseIdentifierId;
    });
  }, [caseResolverIdentifiers, defaultCaseIdentifierId]);

  useEffect(() => {
    setNewCaseCategoryId((current: string | null) => {
      if (!current) return defaultCategoryId;
      return caseResolverCategories.some((category: CaseResolverCategory) => category.id === current)
        ? current
        : defaultCategoryId;
    });
  }, [caseResolverCategories, defaultCategoryId]);

  const files = useMemo(
    () =>
      [...workspace.files].sort((left: CaseResolverFile, right: CaseResolverFile) => {
        if (left.folder !== right.folder) {
          return left.folder.localeCompare(right.folder);
        }
        return left.name.localeCompare(right.name);
      }),
    [workspace.files]
  );
  const caseTreeForParents = useMemo((): CaseTreeNode[] => buildCaseTree(files), [files]);
  const caseParentOptions = useMemo(
    () => flattenCaseTreeOptions(caseTreeForParents),
    [caseTreeForParents]
  );
  const caseReferenceOptions = useMemo(
    () =>
      files.map((file: CaseResolverFile) => ({
        value: file.id,
        label: file.folder ? `${file.name} (${file.folder})` : file.name,
      })),
    [files]
  );
  const filesById = useMemo(
    () => new Map<string, CaseResolverFile>(files.map((file: CaseResolverFile) => [file.id, file])),
    [files]
  );
  const caseTagPathById = useMemo(
    () => buildPathLabelMap(caseResolverTags),
    [caseResolverTags]
  );
  const caseIdentifierPathById = useMemo(
    () => buildPathLabelMap(caseResolverIdentifiers),
    [caseResolverIdentifiers]
  );
  const caseCategoryPathById = useMemo(
    () => buildPathLabelMap(caseResolverCategories),
    [caseResolverCategories]
  );
  const caseTagFilterOptions = useMemo(
    () =>
      caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: caseTagPathById.get(tag.id) ?? tag.name,
      })),
    [caseResolverTags, caseTagPathById]
  );
  const caseCategoryFilterOptions = useMemo(
    () =>
      caseResolverCategories.map((category: CaseResolverCategory) => ({
        value: category.id,
        label: caseCategoryPathById.get(category.id) ?? category.name,
      })),
    [caseResolverCategories, caseCategoryPathById]
  );
  const caseIdentifierFilterOptions = useMemo(
    () =>
      caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => ({
        value: identifier.id,
        label: caseIdentifierPathById.get(identifier.id) ?? identifier.name,
      })),
    [caseIdentifierPathById, caseResolverIdentifiers]
  );
  const folderFilterOptions = useMemo(() => {
    const folders = Array.from(
      new Set(
        files
          .map((file: CaseResolverFile): string => file.folder)
          .filter((folder: string): boolean => folder.trim() !== '')
      )
    ).sort((left: string, right: string) => left.localeCompare(right));
    return [
      { value: '__all__', label: 'All folders' },
      ...folders.map((folder: string) => ({ value: folder, label: folder })),
    ];
  }, [files]);
  const caseFilterConfig = useMemo<FilterField[]>(
    () => [
      {
        key: 'fileType',
        label: 'File Type',
        type: 'select',
        options: [
          { value: 'all', label: 'All file types' },
          { value: 'document', label: 'Document' },
          { value: 'scanfile', label: 'Scan File' },
        ],
        width: '180px',
      },
      {
        key: 'folder',
        label: 'Folder',
        type: 'select',
        options: folderFilterOptions,
        width: '220px',
      },
      {
        key: 'tagIds',
        label: 'Tags',
        type: 'select',
        options: caseTagFilterOptions,
        multi: true,
        width: '280px',
      },
      {
        key: 'caseIdentifierIds',
        label: 'Case Identifiers',
        type: 'select',
        options: caseIdentifierFilterOptions,
        multi: true,
        width: '280px',
      },
      {
        key: 'categoryIds',
        label: 'Categories',
        type: 'select',
        options: caseCategoryFilterOptions,
        multi: true,
        width: '280px',
      },
      {
        key: 'searchScope',
        label: 'Search Scope',
        type: 'select',
        options: [
          { value: 'all', label: 'Name + Folder + Content' },
          { value: 'name', label: 'Name only' },
          { value: 'folder', label: 'Folder only' },
          { value: 'content', label: 'Content only' },
        ],
        width: '220px',
      },
      {
        key: 'sortBy',
        label: 'Sort By',
        type: 'select',
        options: [
          { value: 'updated', label: 'Date modified' },
          { value: 'created', label: 'Date created' },
          { value: 'name', label: 'Name' },
        ],
        width: '180px',
      },
    ],
    [
      caseCategoryFilterOptions,
      caseIdentifierFilterOptions,
      caseTagFilterOptions,
      folderFilterOptions,
    ]
  );
  const caseFilterValues = useMemo(
    () => ({
      fileType: caseFileTypeFilter,
      folder: caseFilterFolder,
      tagIds: caseFilterTagIds,
      caseIdentifierIds: caseFilterCaseIdentifierIds,
      categoryIds: caseFilterCategoryIds,
      searchScope: caseSearchScope,
      sortBy: caseSortBy,
    }),
    [
      caseFileTypeFilter,
      caseFilterCaseIdentifierIds,
      caseFilterFolder,
      caseFilterTagIds,
      caseFilterCategoryIds,
      caseSearchScope,
      caseSortBy,
    ]
  );
  const caseSortComparator = useMemo<CaseFileComparator>(
    () => (left: CaseResolverFile, right: CaseResolverFile): number => {
      const factor = caseSortOrder === 'asc' ? 1 : -1;
      let delta = 0;
      if (caseSortBy === 'name') {
        delta = left.name.localeCompare(right.name);
      } else if (caseSortBy === 'created') {
        const leftCreatedAt = Date.parse(left.createdAt);
        const rightCreatedAt = Date.parse(right.createdAt);
        delta =
          (Number.isNaN(leftCreatedAt) ? 0 : leftCreatedAt) -
          (Number.isNaN(rightCreatedAt) ? 0 : rightCreatedAt);
      } else {
        const leftUpdatedAt = Date.parse(left.updatedAt);
        const rightUpdatedAt = Date.parse(right.updatedAt);
        delta =
          (Number.isNaN(leftUpdatedAt) ? 0 : leftUpdatedAt) -
          (Number.isNaN(rightUpdatedAt) ? 0 : rightUpdatedAt);
      }

      if (delta === 0) {
        delta = left.name.localeCompare(right.name);
      }
      if (delta === 0) {
        delta = left.id.localeCompare(right.id);
      }

      return delta * factor;
    },
    [caseSortBy, caseSortOrder]
  );
  const indexedCases = useMemo(
    (): IndexedCaseRow[] =>
      files.map((file: CaseResolverFile): IndexedCaseRow => ({
        file,
        normalizedName: file.name.toLowerCase(),
        normalizedFolder: file.folder.toLowerCase(),
        normalizedContent: (
          file.documentContentPlainText.trim().length > 0
            ? file.documentContentPlainText
            : stripHtml(file.documentContent)
        ).toLowerCase(),
        normalizedTag: (file.tagId ? (caseTagPathById.get(file.tagId) ?? '') : '').toLowerCase(),
        normalizedCaseIdentifier: (file.caseIdentifierId
          ? (caseIdentifierPathById.get(file.caseIdentifierId) ?? '')
          : ''
        ).toLowerCase(),
        normalizedCategory: (file.categoryId
          ? (caseCategoryPathById.get(file.categoryId) ?? '')
          : ''
        ).toLowerCase(),
      })),
    [caseCategoryPathById, caseIdentifierPathById, caseTagPathById, files]
  );
  const filteredCases = useMemo((): CaseResolverFile[] => {
    const normalizedQuery = caseSearchQuery.trim().toLowerCase();
    const hasTagFilter = caseFilterTagIds.length > 0;
    const hasCaseIdentifierFilter = caseFilterCaseIdentifierIds.length > 0;
    const hasCategoryFilter = caseFilterCategoryIds.length > 0;

    const matchesSearch = (row: IndexedCaseRow): boolean => {
      if (!normalizedQuery) return true;
      if (caseSearchScope === 'name') return row.normalizedName.includes(normalizedQuery);
      if (caseSearchScope === 'folder') return row.normalizedFolder.includes(normalizedQuery);
      if (caseSearchScope === 'content') return row.normalizedContent.includes(normalizedQuery);
      return (
        row.normalizedName.includes(normalizedQuery) ||
        row.normalizedFolder.includes(normalizedQuery) ||
        row.normalizedContent.includes(normalizedQuery) ||
        row.normalizedTag.includes(normalizedQuery) ||
        row.normalizedCaseIdentifier.includes(normalizedQuery) ||
        row.normalizedCategory.includes(normalizedQuery)
      );
    };

    return indexedCases
      .filter((row: IndexedCaseRow): boolean => {
        if (caseFileTypeFilter !== 'all' && row.file.fileType !== caseFileTypeFilter) return false;
        if (caseFilterFolder !== '__all__' && row.file.folder !== caseFilterFolder) return false;
        if (hasTagFilter && (!row.file.tagId || !caseFilterTagIds.includes(row.file.tagId))) return false;
        if (
          hasCaseIdentifierFilter &&
          (!row.file.caseIdentifierId ||
            !caseFilterCaseIdentifierIds.includes(row.file.caseIdentifierId))
        ) {
          return false;
        }
        if (
          hasCategoryFilter &&
          (!row.file.categoryId || !caseFilterCategoryIds.includes(row.file.categoryId))
        ) {
          return false;
        }
        return matchesSearch(row);
      })
      .map((row: IndexedCaseRow): CaseResolverFile => row.file)
      .sort(caseSortComparator);
  }, [
    caseFileTypeFilter,
    caseFilterCaseIdentifierIds,
    caseFilterCategoryIds,
    caseFilterFolder,
    caseFilterTagIds,
    caseSearchQuery,
    caseSearchScope,
    caseSortComparator,
    indexedCases,
  ]);
  const filteredCaseTree = useMemo((): CaseTreeNode[] => {
    if (filteredCases.length === 0) return [];
    const includedIds = new Set<string>();

    filteredCases.forEach((file: CaseResolverFile): void => {
      let current: CaseResolverFile | undefined = file;
      while (current) {
        if (includedIds.has(current.id)) break;
        includedIds.add(current.id);
        current = current.parentCaseId ? filesById.get(current.parentCaseId) : undefined;
      }
    });

    const treeFiles = files.filter((file: CaseResolverFile): boolean => includedIds.has(file.id));
    return buildCaseTree(treeFiles, caseSortComparator);
  }, [caseSortComparator, filteredCases, files, filesById]);
  const flatCaseNodes = useMemo(
    (): CaseTreeNode[] =>
      filteredCases.map((file: CaseResolverFile): CaseTreeNode => ({ file, children: [] })),
    [filteredCases]
  );
  const displayedCaseNodes = useMemo(
    (): CaseTreeNode[] => (caseViewMode === 'hierarchy' ? filteredCaseTree : flatCaseNodes),
    [caseViewMode, filteredCaseTree, flatCaseNodes]
  );
  const hasActiveCaseFilters = useMemo(
    (): boolean =>
      caseSearchQuery.trim() !== '' ||
      caseSearchScope !== caseListViewDefaults.searchScope ||
      caseFileTypeFilter !== 'all' ||
      caseFilterFolder !== '__all__' ||
      caseFilterTagIds.length > 0 ||
      caseFilterCaseIdentifierIds.length > 0 ||
      caseFilterCategoryIds.length > 0 ||
      caseSortBy !== caseListViewDefaults.sortBy ||
      caseSortOrder !== caseListViewDefaults.sortOrder,
    [
      caseFileTypeFilter,
      caseFilterCaseIdentifierIds,
      caseFilterCategoryIds,
      caseFilterFolder,
      caseFilterTagIds,
      caseListViewDefaults.searchScope,
      caseListViewDefaults.sortBy,
      caseListViewDefaults.sortOrder,
      caseSearchQuery,
      caseSearchScope,
      caseSortBy,
      caseSortOrder,
    ]
  );
  const handleCaseFilterChange = useCallback((key: string, value: unknown): void => {
    switch (key) {
      case 'fileType':
        setCaseFileTypeFilter(
          value === 'document' || value === 'scanfile' || value === 'all' ? value : 'all'
        );
        break;
      case 'folder':
        setCaseFilterFolder(typeof value === 'string' && value !== '' ? value : '__all__');
        break;
      case 'tagIds':
        setCaseFilterTagIds(
          Array.isArray(value)
            ? value.filter((entry): entry is string => typeof entry === 'string')
            : []
        );
        break;
      case 'caseIdentifierIds':
        setCaseFilterCaseIdentifierIds(
          Array.isArray(value)
            ? value.filter((entry): entry is string => typeof entry === 'string')
            : []
        );
        break;
      case 'categoryIds':
        setCaseFilterCategoryIds(
          Array.isArray(value)
            ? value.filter((entry): entry is string => typeof entry === 'string')
            : []
        );
        break;
      case 'searchScope':
        setCaseSearchScope(
          value === 'name' || value === 'folder' || value === 'content' || value === 'all'
            ? value
            : 'all'
        );
        break;
      case 'sortBy':
        setCaseSortBy(value === 'created' || value === 'name' || value === 'updated' ? value : 'updated');
        break;
      default:
        break;
    }
  }, []);
  const handleResetCaseFilters = useCallback((): void => {
    setCaseSearchQuery('');
    setCaseSearchScope(caseListViewDefaults.searchScope);
    setCaseFileTypeFilter('all');
    setCaseFilterFolder('__all__');
    setCaseFilterTagIds([]);
    setCaseFilterCaseIdentifierIds([]);
    setCaseFilterCategoryIds([]);
    setCaseSortBy(caseListViewDefaults.sortBy);
    setCaseSortOrder(caseListViewDefaults.sortOrder);
  }, [
    caseListViewDefaults.searchScope,
    caseListViewDefaults.sortBy,
    caseListViewDefaults.sortOrder,
  ]);

  useEffect(() => {
    if (caseFilterFolder === '__all__') return;
    if (files.some((file: CaseResolverFile): boolean => file.folder === caseFilterFolder)) return;
    setCaseFilterFolder('__all__');
  }, [caseFilterFolder, files]);

  useEffect(() => {
    const validTagIds = new Set(caseResolverTags.map((tag: CaseResolverTag): string => tag.id));
    setCaseFilterTagIds((current: string[]): string[] =>
      current.filter((tagId: string): boolean => validTagIds.has(tagId))
    );
  }, [caseResolverTags]);

  useEffect(() => {
    const validCaseIdentifierIds = new Set(
      caseResolverIdentifiers.map((identifier: CaseResolverIdentifier): string => identifier.id)
    );
    setCaseFilterCaseIdentifierIds((current: string[]): string[] =>
      current.filter((caseIdentifierId: string): boolean =>
        validCaseIdentifierIds.has(caseIdentifierId)
      )
    );
  }, [caseResolverIdentifiers]);

  useEffect(() => {
    const validCategoryIds = new Set(
      caseResolverCategories.map((category: CaseResolverCategory): string => category.id)
    );
    setCaseFilterCategoryIds((current: string[]): string[] =>
      current.filter((categoryId: string): boolean => validCategoryIds.has(categoryId))
    );
  }, [caseResolverCategories]);

  useEffect(() => {
    const validCaseIds = new Set(files.map((file: CaseResolverFile) => file.id));
    setNewCaseParentId((current: string | null) =>
      current && validCaseIds.has(current) ? current : null
    );
    setNewCaseReferenceCaseIds((current: string[]) =>
      current.filter((referenceId: string): boolean => validCaseIds.has(referenceId))
    );
  }, [files]);

  const resetCreateCaseDraft = useCallback(
    (parentCaseId: string | null = null): void => {
      setNewCaseName('');
      setNewCaseParentId(parentCaseId);
      setNewCaseReferenceCaseIds([]);
      setNewCaseTagId(defaultTagId);
      setNewCaseCaseIdentifierId(defaultCaseIdentifierId);
      setNewCaseCategoryId(defaultCategoryId);
    },
    [defaultCaseIdentifierId, defaultCategoryId, defaultTagId]
  );

  const handleOpenCreateCaseModal = useCallback(
    (parentCaseId: string | null = null): void => {
      const validCaseIds = new Set(files.map((file: CaseResolverFile): string => file.id));
      const normalizedParentCaseId =
        parentCaseId && validCaseIds.has(parentCaseId) ? parentCaseId : null;
      resetCreateCaseDraft(normalizedParentCaseId);
      setIsCreateCaseModalOpen(true);
    },
    [files, resetCreateCaseDraft]
  );

  const handleCloseCreateCaseModal = useCallback((): void => {
    setIsCreateCaseModalOpen(false);
  }, []);

  const childrenByParentId = useMemo((): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    files.forEach((file: CaseResolverFile): void => {
      if (!file.parentCaseId) return;
      const children = map.get(file.parentCaseId) ?? [];
      children.push(file.id);
      map.set(file.parentCaseId, children);
    });
    return map;
  }, [files]);

  const collectDescendantCaseIds = useCallback(
    (caseId: string): string[] => {
      const descendants: string[] = [];
      const visited = new Set<string>();
      const visit = (targetCaseId: string): void => {
        if (visited.has(targetCaseId)) return;
        visited.add(targetCaseId);
        const children = childrenByParentId.get(targetCaseId) ?? [];
        children.forEach((childId: string): void => {
          descendants.push(childId);
          visit(childId);
        });
      };
      visit(caseId);
      return descendants;
    },
    [childrenByParentId]
  );

  const persistWorkspace = useCallback(
    async (nextWorkspace: CaseResolverWorkspace, successMessage: string): Promise<void> => {
      const normalized = normalizeCaseResolverWorkspace(nextWorkspace);
      try {
        await updateSetting.mutateAsync({
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(normalized),
        });
        setWorkspace(normalized);
        toast(successMessage, { variant: 'success' });
      } catch (error: unknown) {
        toast(
          error instanceof Error
            ? error.message
            : 'Failed to save Case Resolver cases.',
          { variant: 'error' }
        );
      }
    },
    [toast, updateSetting]
  );

  const handleCreateCase = useCallback(async (): Promise<void> => {
    const normalizedName = newCaseName.trim();
    if (!normalizedName) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }

    const normalizedTagId =
      newCaseTagId && caseResolverTags.some((tag: CaseResolverTag) => tag.id === newCaseTagId)
        ? newCaseTagId
        : null;
    const normalizedCaseIdentifierId =
      newCaseCaseIdentifierId &&
      caseResolverIdentifiers.some(
        (identifier: CaseResolverIdentifier) => identifier.id === newCaseCaseIdentifierId
      )
        ? newCaseCaseIdentifierId
        : null;
    const normalizedCategoryId =
      newCaseCategoryId && caseResolverCategories.some((category: CaseResolverCategory) => category.id === newCaseCategoryId)
        ? newCaseCategoryId
        : null;
    if (caseResolverTags.length > 0 && !normalizedTagId) {
      toast('Select a document tag.', { variant: 'error' });
      return;
    }
    if (caseResolverIdentifiers.length > 0 && !normalizedCaseIdentifierId) {
      toast('Select a case identifier.', { variant: 'error' });
      return;
    }
    if (caseResolverCategories.length > 0 && !normalizedCategoryId) {
      toast('Select a document category.', { variant: 'error' });
      return;
    }

    const validCaseIds = new Set(workspace.files.map((file: CaseResolverFile) => file.id));
    const normalizedParentCaseId =
      newCaseParentId && validCaseIds.has(newCaseParentId) ? newCaseParentId : null;
    const normalizedReferenceCaseIds = Array.from(
      new Set(
        newCaseReferenceCaseIds.filter(
          (referenceCaseId: string): boolean =>
            referenceCaseId !== '' && validCaseIds.has(referenceCaseId)
        )
      )
    );
    const file = createCaseResolverFile({
      id: createId('case-file'),
      fileType: 'document',
      name: normalizedName,
      parentCaseId: normalizedParentCaseId,
      referenceCaseIds: normalizedReferenceCaseIds,
      tagId: normalizedTagId,
      caseIdentifierId: normalizedCaseIdentifierId,
      categoryId: normalizedCategoryId,
    });

    const nextWorkspace: CaseResolverWorkspace = {
      ...workspace,
      files: [...workspace.files, file],
      activeFileId: file.id,
      folders: workspace.folders,
    };

    await persistWorkspace(nextWorkspace, 'Case created.');
    resetCreateCaseDraft();
    setIsCreateCaseModalOpen(false);
  }, [
    caseResolverCategories,
    caseResolverIdentifiers,
    caseResolverTags,
    newCaseCaseIdentifierId,
    newCaseCategoryId,
    newCaseParentId,
    newCaseReferenceCaseIds,
    newCaseName,
    newCaseTagId,
    persistWorkspace,
    resetCreateCaseDraft,
    toast,
    workspace,
  ]);

  const handleStartEditCase = useCallback((file: CaseResolverFile): void => {
    setEditingCaseId(file.id);
    setEditingCaseName(file.name);
    setEditingCaseParentId(file.parentCaseId);
    setEditingCaseReferenceCaseIds(file.referenceCaseIds);
    setEditingCaseTagId(file.tagId);
    setEditingCaseCaseIdentifierId(file.caseIdentifierId);
    setEditingCaseCategoryId(file.categoryId);
  }, []);

  const handleCancelEditCase = useCallback((): void => {
    setEditingCaseId(null);
    setEditingCaseName('');
    setEditingCaseParentId(null);
    setEditingCaseReferenceCaseIds([]);
    setEditingCaseTagId(null);
    setEditingCaseCaseIdentifierId(null);
    setEditingCaseCategoryId(null);
  }, []);

  const handleSaveCase = useCallback(async (): Promise<void> => {
    if (!editingCaseId) return;
    const normalizedName = editingCaseName.trim();
    if (!normalizedName) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }
    const normalizedTagId =
      editingCaseTagId && caseResolverTags.some((tag: CaseResolverTag) => tag.id === editingCaseTagId)
        ? editingCaseTagId
        : null;
    const normalizedCaseIdentifierId =
      editingCaseCaseIdentifierId &&
      caseResolverIdentifiers.some(
        (identifier: CaseResolverIdentifier) => identifier.id === editingCaseCaseIdentifierId
      )
        ? editingCaseCaseIdentifierId
        : null;
    const normalizedCategoryId =
      editingCaseCategoryId &&
      caseResolverCategories.some((category: CaseResolverCategory) => category.id === editingCaseCategoryId)
        ? editingCaseCategoryId
        : null;
    if (caseResolverTags.length > 0 && !normalizedTagId) {
      toast('Select a document tag.', { variant: 'error' });
      return;
    }
    if (caseResolverIdentifiers.length > 0 && !normalizedCaseIdentifierId) {
      toast('Select a case identifier.', { variant: 'error' });
      return;
    }
    if (caseResolverCategories.length > 0 && !normalizedCategoryId) {
      toast('Select a document category.', { variant: 'error' });
      return;
    }
    const validCaseIds = new Set(workspace.files.map((file: CaseResolverFile) => file.id));
    const blockedParentIds = new Set<string>(
      editingCaseId ? [editingCaseId, ...collectDescendantCaseIds(editingCaseId)] : []
    );
    const normalizedParentCaseId =
      editingCaseParentId &&
      validCaseIds.has(editingCaseParentId) &&
      !blockedParentIds.has(editingCaseParentId)
        ? editingCaseParentId
        : null;
    const normalizedReferenceCaseIds = Array.from(
      new Set(
        editingCaseReferenceCaseIds.filter(
          (referenceCaseId: string): boolean =>
            referenceCaseId !== '' &&
            referenceCaseId !== editingCaseId &&
            validCaseIds.has(referenceCaseId)
        )
      )
    );

    const nextWorkspace: CaseResolverWorkspace = {
      ...workspace,
      files: workspace.files.map((file: CaseResolverFile) =>
        file.id === editingCaseId
          ? {
            ...file,
            name: normalizedName,
            parentCaseId: normalizedParentCaseId,
            referenceCaseIds: normalizedReferenceCaseIds,
            tagId: normalizedTagId,
            caseIdentifierId: normalizedCaseIdentifierId,
            categoryId: normalizedCategoryId,
            updatedAt: new Date().toISOString(),
          }
          : file
      ),
      folders: workspace.folders,
    };

    await persistWorkspace(nextWorkspace, 'Case updated.');
    handleCancelEditCase();
  }, [
    editingCaseId,
    editingCaseName,
    editingCaseParentId,
    editingCaseReferenceCaseIds,
    editingCaseCaseIdentifierId,
    editingCaseCategoryId,
    editingCaseTagId,
    collectDescendantCaseIds,
    handleCancelEditCase,
    caseResolverCategories,
    caseResolverIdentifiers,
    caseResolverTags,
    persistWorkspace,
    toast,
    workspace,
  ]);

  const handleDeleteCase = useCallback(
    async (fileId: string): Promise<void> => {
      const target = workspace.files.find((file: CaseResolverFile) => file.id === fileId);
      if (!target) return;
      if (target.isLocked) {
        toast('Case is locked. Unlock it in Case Resolver before removing.', { variant: 'warning' });
        return;
      }
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(`Delete case "${target.name}"?`);
        if (!confirmed) return;
      }

      const now = new Date().toISOString();
      const nextFiles = workspace.files
        .filter((file: CaseResolverFile) => file.id !== fileId)
        .map((file: CaseResolverFile): CaseResolverFile => {
          const nextParentCaseId = file.parentCaseId === fileId ? null : file.parentCaseId;
          const nextReferenceCaseIds = file.referenceCaseIds.filter(
            (referenceCaseId: string): boolean => referenceCaseId !== fileId
          );
          const parentChanged = nextParentCaseId !== file.parentCaseId;
          const referencesChanged = nextReferenceCaseIds.length !== file.referenceCaseIds.length;
          if (!parentChanged && !referencesChanged) return file;
          return {
            ...file,
            parentCaseId: nextParentCaseId,
            referenceCaseIds: nextReferenceCaseIds,
            updatedAt: now,
          };
        });
      const nextWorkspace: CaseResolverWorkspace = {
        ...workspace,
        files: nextFiles,
        activeFileId:
          workspace.activeFileId === fileId
            ? (nextFiles[0]?.id ?? null)
            : workspace.activeFileId,
      };

      await persistWorkspace(nextWorkspace, 'Case removed.');
      if (editingCaseId === fileId) {
        handleCancelEditCase();
      }
    },
    [editingCaseId, handleCancelEditCase, persistWorkspace, workspace]
  );

  const handleViewCase = useCallback(
    (fileId: string): void => {
      router.push(`/admin/case-resolver?fileId=${encodeURIComponent(fileId)}`);
    },
    [router]
  );

  const handleCopyCaseId = useCallback(
    async (caseId: string): Promise<void> => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(caseId);
          toast('Case ID copied.', { variant: 'success' });
          return;
        }
        throw new Error('Clipboard is not available.');
      } catch (error) {
        toast(
          error instanceof Error ? error.message : 'Failed to copy case ID.',
          { variant: 'error' }
        );
      }
    },
    [toast]
  );

  const toggleCaseCollapsed = useCallback((fileId: string): void => {
    setCollapsedCaseIds((current: Set<string>) => {
      const next = new Set(current);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const editingCaseParentOptions = useMemo(() => {
    const excludedIds = new Set<string>();
    if (editingCaseId) {
      excludedIds.add(editingCaseId);
      collectDescendantCaseIds(editingCaseId).forEach((caseId: string) => {
        excludedIds.add(caseId);
      });
    }
    return caseParentOptions.filter((option: { value: string; label: string }) =>
      !excludedIds.has(option.value)
    );
  }, [caseParentOptions, collectDescendantCaseIds, editingCaseId]);

  const renderCaseTree = useCallback(
    (nodes: CaseTreeNode[], depth: number): React.JSX.Element => (
      <div className='space-y-2'>
        {nodes.map((node: CaseTreeNode) => {
          const file = node.file;
          const isEditing = editingCaseId === file.id;
          const hasChildren = node.children.length > 0;
          const isCollapsed = collapsedCaseIds.has(file.id);
          const parentCase = file.parentCaseId
            ? workspace.files.find((candidate: CaseResolverFile) => candidate.id === file.parentCaseId) ?? null
            : null;
          const referencedCases = file.referenceCaseIds
            .map((referenceCaseId: string) =>
              workspace.files.find((candidate: CaseResolverFile) => candidate.id === referenceCaseId) ?? null
            )
            .filter((candidate: CaseResolverFile | null): candidate is CaseResolverFile => candidate !== null);
          const editReferenceOptions = caseReferenceOptions.filter(
            (option: { value: string; label: string }) => option.value !== file.id
          );

          return (
            <div key={file.id} className='space-y-2'>
              <div
                className='relative rounded-lg border border-border/60 bg-card/35 p-3 pb-9'
                style={{ marginLeft: `${depth * 16}px` }}
              >
                {isEditing ? (
                  <div className='space-y-3'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Input
                        autoFocus
                        value={editingCaseName}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingCaseName(event.target.value);
                        }}
                        placeholder='Case name'
                        className='h-9 min-w-[240px] flex-1'
                      />
                      <Button
                        type='button'
                        onClick={(): void => {
                          void handleSaveCase();
                        }}
                        disabled={updateSetting.isPending}
                        className='h-9'
                      >
                        Save
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={handleCancelEditCase}
                        className='h-9'
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className='grid gap-3 md:grid-cols-4'>
                      <SelectSimple size='sm'
                        value={editingCaseParentId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          setEditingCaseParentId(value === '__none__' ? null : value);
                        }}
                        options={[
                          { value: '__none__', label: 'No parent (root case)' },
                          ...editingCaseParentOptions,
                        ]}
                        placeholder='Parent case'
                        triggerClassName='h-9'
                      />
                      <SelectSimple size='sm'
                        value={editingCaseTagId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          setEditingCaseTagId(value === '__none__' ? null : value);
                        }}
                        options={[
                          { value: '__none__', label: caseResolverTags.length > 0 ? 'Select tag' : 'No tags' },
                          ...caseResolverTagOptions,
                        ]}
                        placeholder='Select tag'
                        triggerClassName='h-9'
                      />
                      <SelectSimple
                        size='sm'
                        value={editingCaseCaseIdentifierId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          setEditingCaseCaseIdentifierId(value === '__none__' ? null : value);
                        }}
                        options={[
                          {
                            value: '__none__',
                            label:
                              caseResolverIdentifiers.length > 0
                                ? 'Select case identifier'
                                : 'No case identifiers',
                          },
                          ...caseResolverIdentifierOptions,
                        ]}
                        placeholder='Select case identifier'
                        triggerClassName='h-9'
                      />
                      <SelectSimple size='sm'
                        value={editingCaseCategoryId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          setEditingCaseCategoryId(value === '__none__' ? null : value);
                        }}
                        options={[
                          { value: '__none__', label: caseResolverCategories.length > 0 ? 'Select category' : 'No categories' },
                          ...caseResolverCategoryOptions,
                        ]}
                        placeholder='Select category'
                        triggerClassName='h-9'
                      />
                    </div>
                    <MultiSelect
                      options={editReferenceOptions}
                      selected={editingCaseReferenceCaseIds}
                      onChange={setEditingCaseReferenceCaseIds}
                      placeholder='Reference cases'
                      searchPlaceholder='Search cases...'
                      emptyMessage='No cases available.'
                      className='w-full'
                    />
                  </div>
                ) : (
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        {hasChildren ? (
                          <button
                            type='button'
                            className='inline-flex size-5 items-center justify-center rounded hover:bg-muted/50'
                            onClick={(): void => {
                              toggleCaseCollapsed(file.id);
                            }}
                            aria-label={isCollapsed ? `Expand ${file.name}` : `Collapse ${file.name}`}
                          >
                            {isCollapsed ? (
                              <ChevronRight className='size-3.5' />
                            ) : (
                              <ChevronDown className='size-3.5' />
                            )}
                          </button>
                        ) : (
                          <span className='inline-flex size-5 items-center justify-center text-xs opacity-30'>•</span>
                        )}
                        {hasChildren && !isCollapsed ? (
                          <FolderOpen className='size-3.5 text-gray-400' />
                        ) : (
                          <Folder className='size-3.5 text-gray-400' />
                        )}
                        <div className='truncate text-sm font-semibold text-gray-100'>{file.name}</div>
                        {file.isLocked ? (
                          <Badge variant='outline' className='text-[10px] text-amber-300'>
                            <Lock className='mr-1 size-3' />
                            Locked
                          </Badge>
                        ) : null}
                        {parentCase ? (
                          <Badge variant='outline' className='text-[10px]'>
                            Parent: {parentCase.name}
                          </Badge>
                        ) : null}
                        {referencedCases.length > 0 ? (
                          <Badge variant='outline' className='text-[10px]'>
                            <Link2 className='mr-1 size-3' />
                            {referencedCases.length} reference{referencedCases.length === 1 ? '' : 's'}
                          </Badge>
                        ) : null}
                        {file.tagId ? (
                          <Badge variant='outline' className='text-[10px]'>
                            {caseResolverTags.find((tag: CaseResolverTag) => tag.id === file.tagId)?.name ?? 'Tag'}
                          </Badge>
                        ) : null}
                        {file.caseIdentifierId ? (
                          <Badge variant='outline' className='text-[10px]'>
                            {caseResolverIdentifiers.find(
                              (identifier: CaseResolverIdentifier) =>
                                identifier.id === file.caseIdentifierId
                            )?.name ?? 'Case Identifier'}
                          </Badge>
                        ) : null}
                        {file.categoryId ? (
                          <Badge variant='outline' className='text-[10px]'>
                            {caseResolverCategories.find((category: CaseResolverCategory) => category.id === file.categoryId)?.name ?? 'Category'}
                          </Badge>
                        ) : null}
                      </div>
                      <div className='mt-0.5 text-xs text-gray-400'>
                        Folder: {file.folder || '(root)'} | Created: {formatCaseTimestamp(file.createdAt)} | Updated:{' '}
                        {formatCaseTimestamp(file.updatedAt)}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-8 px-2'
                        onClick={(): void => handleViewCase(file.id)}
                      >
                        <Eye className='mr-1.5 size-3.5' />
                        View
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-8 px-2'
                        onClick={(): void => {
                          handleOpenCreateCaseModal(file.id);
                        }}
                      >
                        <Plus className='mr-1.5 size-3.5' />
                        Add Child
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-8 px-2'
                        onClick={(): void => handleStartEditCase(file)}
                      >
                        <Edit2 className='mr-1.5 size-3.5' />
                        Edit
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-8 px-2 text-red-300 hover:text-red-200'
                        disabled={file.isLocked}
                        onClick={(): void => {
                          void handleDeleteCase(file.id);
                        }}
                      >
                        <Trash2 className='mr-1.5 size-3.5' />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
                <button
                  type='button'
                  onClick={(): void => {
                    void handleCopyCaseId(file.id);
                  }}
                  className='absolute bottom-2 right-2 rounded border border-border/60 bg-black/20 px-2 py-0.5 font-mono text-[10px] text-gray-300 transition-colors hover:border-border hover:bg-black/30 hover:text-white'
                  title='Copy Case ID'
                  aria-label={`Copy Case ID ${file.id}`}
                >
                  ID: {file.id}
                </button>
              </div>
              {hasChildren && !isCollapsed ? renderCaseTree(node.children, depth + 1) : null}
            </div>
          );
        })}
      </div>
    ),
    [
      caseReferenceOptions,
      caseResolverCategories,
      caseResolverCategoryOptions,
      caseResolverIdentifierOptions,
      caseResolverIdentifiers,
      caseResolverTags,
      caseResolverTagOptions,
      collapsedCaseIds,
      editingCaseCaseIdentifierId,
      editingCaseCategoryId,
      editingCaseId,
      editingCaseName,
      editingCaseParentId,
      editingCaseReferenceCaseIds,
      editingCaseTagId,
      editingCaseParentOptions,
      handleCancelEditCase,
      handleDeleteCase,
      handleOpenCreateCaseModal,
      handleCopyCaseId,
      handleSaveCase,
      handleStartEditCase,
      handleViewCase,
      toggleCaseCollapsed,
      updateSetting.isPending,
      workspace.files,
    ]
  );

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Case Resolver Cases'
        description='Manage all cases in one place. Open a case to work on its full node-map editor.'
        eyebrow={(
          <div className='mb-2 flex items-center gap-2'>
            <Button
              type='button'
              size='icon-lg'
              variant='outline'
              aria-label='Create new case'
              title='Create new case'
              onClick={(): void => {
                handleOpenCreateCaseModal();
              }}
            >
              <Plus className='h-6 w-6' />
            </Button>
          </div>
        )}
      />

      <AppModal
        open={isCreateCaseModalOpen}
        onOpenChange={setIsCreateCaseModalOpen}
        title='Add Case'
        subtitle='Create a new case with optional hierarchy, references, tag, case identifier, and category.'
        size='lg'
        bodyClassName='h-auto max-h-[78vh]'
        footer={(
          <>
            <Button type='button' variant='outline' onClick={handleCloseCreateCaseModal}>
              Cancel
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                void handleCreateCase();
              }}
              disabled={updateSetting.isPending}
            >
              <Plus className='mr-1.5 size-3.5' />
              Add Case
            </Button>
          </>
        )}
      >
        <div className='space-y-4'>
          <div className='grid gap-3 md:grid-cols-2'>
            <Input
              autoFocus
              value={newCaseName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setNewCaseName(event.target.value);
              }}
              placeholder='Case name'
              className='h-9'
            />
            <SelectSimple size='sm'
              value={newCaseParentId ?? '__none__'}
              onValueChange={(value: string): void => {
                setNewCaseParentId(value === '__none__' ? null : value);
              }}
              options={[
                { value: '__none__', label: 'No parent (root case)' },
                ...caseParentOptions,
              ]}
              placeholder='Parent case'
              triggerClassName='h-9'
            />
          </div>
          <MultiSelect
            options={caseReferenceOptions}
            selected={newCaseReferenceCaseIds}
            onChange={setNewCaseReferenceCaseIds}
            placeholder='Reference cases'
            searchPlaceholder='Search cases...'
            emptyMessage='No cases available.'
            className='w-full'
          />
          <div className='grid gap-3 md:grid-cols-3'>
            <SelectSimple size='sm'
              value={newCaseTagId ?? '__none__'}
              onValueChange={(value: string): void => {
                setNewCaseTagId(value === '__none__' ? null : value);
              }}
              options={[
                { value: '__none__', label: caseResolverTags.length > 0 ? 'Select tag' : 'No tags' },
                ...caseResolverTagOptions,
              ]}
              placeholder='Select tag'
              triggerClassName='h-9'
            />
            <SelectSimple
              size='sm'
              value={newCaseCaseIdentifierId ?? '__none__'}
              onValueChange={(value: string): void => {
                setNewCaseCaseIdentifierId(value === '__none__' ? null : value);
              }}
              options={[
                {
                  value: '__none__',
                  label:
                    caseResolverIdentifiers.length > 0
                      ? 'Select case identifier'
                      : 'No case identifiers',
                },
                ...caseResolverIdentifierOptions,
              ]}
              placeholder='Select case identifier'
              triggerClassName='h-9'
            />
            <SelectSimple size='sm'
              value={newCaseCategoryId ?? '__none__'}
              onValueChange={(value: string): void => {
                setNewCaseCategoryId(value === '__none__' ? null : value);
              }}
              options={[
                { value: '__none__', label: caseResolverCategories.length > 0 ? 'Select category' : 'No categories' },
                ...caseResolverCategoryOptions,
              ]}
              placeholder='Select category'
              triggerClassName='h-9'
            />
          </div>
        </div>
      </AppModal>

      <FormSection
        title='All Cases'
        className='space-y-3 p-4'
        actions={(
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={(): void => {
                router.push('/admin/case-resolver/preferences');
              }}
            >
              Preferences
            </Button>
            <Badge variant='outline' className='text-[10px]'>
              {filteredCases.length} shown
            </Badge>
            <Badge variant='outline' className='text-[10px]'>
              {files.length} total
            </Badge>
          </div>
        )}
      >
        {files.length === 0 ? (
          <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-6 text-sm text-gray-400'>
            No cases found.
          </div>
        ) : (
          <div className='space-y-4'>
            <FilterPanel
              key={`case-resolver-filters-${caseFilterPanelDefaultExpanded ? 'expanded' : 'collapsed'}`}
              filters={caseFilterConfig}
              values={caseFilterValues}
              search={caseSearchQuery}
              searchPlaceholder='Search cases by name, folder, tag, case identifier, category, or content...'
              onFilterChange={handleCaseFilterChange}
              onSearchChange={setCaseSearchQuery}
              onReset={handleResetCaseFilters}
              showHeader={false}
              collapsible
              defaultExpanded={caseFilterPanelDefaultExpanded}
            />
            <div className='flex flex-wrap items-center gap-3 border-t border-border/40 pt-3'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-gray-400'>Sort Order:</span>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 px-2.5'
                  onClick={(): void => {
                    setCaseSortOrder((current: CaseSortOrder) =>
                      current === 'asc' ? 'desc' : 'asc'
                    );
                  }}
                  title={`Sorting ${caseSortOrder === 'asc' ? 'ascending' : 'descending'}`}
                >
                  {caseSortOrder === 'asc' ? (
                    <ArrowUp className='mr-1.5 size-3.5' />
                  ) : (
                    <ArrowDown className='mr-1.5 size-3.5' />
                  )}
                  {caseSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </div>

              <div className='h-4 w-px bg-border/40' />

              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-gray-400'>View:</span>
                <Button
                  type='button'
                  size='sm'
                  variant={caseViewMode === 'hierarchy' ? 'default' : 'outline'}
                  className='h-8 px-2.5'
                  onClick={(): void => {
                    setCaseViewMode('hierarchy');
                  }}
                >
                  Hierarchy
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={caseViewMode === 'list' ? 'default' : 'outline'}
                  className='h-8 px-2.5'
                  onClick={(): void => {
                    setCaseViewMode('list');
                  }}
                >
                  List
                </Button>
              </div>
            </div>
            {filteredCases.length === 0 ? (
              <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-6 text-sm text-gray-300'>
                <div>No cases match the current search and filters.</div>
                {hasActiveCaseFilters ? (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='mt-3'
                    onClick={handleResetCaseFilters}
                  >
                    Reset Filters
                  </Button>
                ) : null}
              </div>
            ) : (
              renderCaseTree(displayedCaseNodes, 0)
            )}
          </div>
        )}
      </FormSection>
    </div>
  );
}
