'use client';

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Edit2,
  Eye,
  Folder,
  FolderOpen,
  Link2,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { UserPreferences } from '@/shared/types/domain/user-preferences';
import {
  Badge,
  Button,
  FilterPanel,
  Input,
  ListPanel,
  MultiSelect,
  SelectSimple,
  useToast,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import type { FilterField } from '@/shared/ui/templates/panels';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_SETTINGS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  getCaseResolverWorkspaceLatestTimestampMs,
  hasCaseResolverWorkspaceFilesArray,
  normalizeCaseResolverWorkspace,
  parseCaseResolverCategories,
  parseCaseResolverIdentifiers,
  parseCaseResolverSettings,
  parseCaseResolverTags,
  parseCaseResolverWorkspace,
} from '../settings';

import type {
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '../types';

const createId = (prefix: string): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatCaseTimestamp = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown';
  return `${new Date(parsed).toISOString().slice(0, 19).replace('T', ' ')} UTC`;
};

type CaseTreeNode = {
  file: CaseResolverFile;
  children: CaseTreeNode[];
};

type CaseSortKey = 'updated' | 'created' | 'name';
type CaseSortOrder = 'asc' | 'desc';
type CaseViewMode = 'hierarchy' | 'list';
type CaseSearchScope = 'all' | 'name' | 'folder' | 'content';
type CaseFileTypeFilter = 'all' | 'case';
type IndexedCaseRow = {
  file: CaseResolverFile;
  normalizedName: string;
  normalizedFolder: string;
  normalizedContent: string;
  normalizedTag: string;
  normalizedCaseIdentifier: string;
  normalizedCategory: string;
};
type CaseFileComparator = (
  left: CaseResolverFile,
  right: CaseResolverFile,
) => number;
type CaseIdentifierSelectorOption = {
  id: string;
  label: string;
  searchableLabel: string;
};

type CaseIdentifierTextSelectorProps = {
  value: string | null | undefined;
  identifiers: CaseResolverIdentifier[];
  identifierPathById: Map<string, string>;
  placeholder: string;
  onChange: (value: string | null) => void;
  onCreateIdentifier: (name: string) => Promise<string | null>;
  onPillClick?: (identifierId: string) => void;
  disabled?: boolean;
  inputClassName?: string;
};

const defaultCaseComparator: CaseFileComparator = (
  left: CaseResolverFile,
  right: CaseResolverFile,
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

const normalizeIdentifierTerm = (value: string): string =>
  value.trim().toLowerCase();

const buildCaseIdentifierOption = (
  identifier: CaseResolverIdentifier,
  identifierPathById: Map<string, string>,
): CaseIdentifierSelectorOption => {
  const label = identifierPathById.get(identifier.id) ?? identifier.name;
  return {
    id: identifier.id,
    label,
    searchableLabel: `${identifier.name} ${label}`.toLowerCase(),
  };
};

function CaseIdentifierTextSelector({
  value,
  identifiers,
  identifierPathById,
  placeholder,
  onChange,
  onCreateIdentifier,
  onPillClick,
  disabled = false,
  inputClassName,
}: CaseIdentifierTextSelectorProps): React.JSX.Element {
  const selectedIdentifier = useMemo(
    () =>
      value
        ? (identifiers.find(
          (identifier: CaseResolverIdentifier): boolean =>
            identifier.id === value,
        ) ?? null)
        : null,
    [identifiers, value],
  );
  const selectedIdentifierLabel = selectedIdentifier
    ? (identifierPathById.get(selectedIdentifier.id) ?? selectedIdentifier.name)
    : '';
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    if (!selectedIdentifierLabel || !value) {
      setQuery('');
    }
  }, [isOpen, selectedIdentifierLabel, value]);

  const normalizedQuery = normalizeIdentifierTerm(query);
  const options = useMemo(
    (): CaseIdentifierSelectorOption[] =>
      identifiers.map(
        (identifier: CaseResolverIdentifier): CaseIdentifierSelectorOption =>
          buildCaseIdentifierOption(identifier, identifierPathById),
      ),
    [identifierPathById, identifiers],
  );
  const filteredOptions = useMemo((): CaseIdentifierSelectorOption[] => {
    if (!normalizedQuery) return options.slice(0, 12);
    return options
      .filter((option: CaseIdentifierSelectorOption): boolean =>
        option.searchableLabel.includes(normalizedQuery),
      )
      .slice(0, 12);
  }, [normalizedQuery, options]);
  const exactMatch = useMemo((): CaseIdentifierSelectorOption | null => {
    if (!normalizedQuery) return null;
    return (
      options.find(
        (option: CaseIdentifierSelectorOption): boolean =>
          normalizeIdentifierTerm(option.label) === normalizedQuery,
      ) ??
      options.find((option: CaseIdentifierSelectorOption): boolean => {
        const identifier = identifiers.find(
          (entry: CaseResolverIdentifier): boolean => entry.id === option.id,
        );
        if (!identifier) return false;
        return normalizeIdentifierTerm(identifier.name) === normalizedQuery;
      }) ??
      null
    );
  }, [identifiers, normalizedQuery, options]);

  const applySelection = useCallback(
    (identifierId: string | null): void => {
      onChange(identifierId);
      setQuery('');
      setIsOpen(false);
    },
    [onChange],
  );

  const handleEnter = useCallback(async (): Promise<void> => {
    const normalizedValue = query.trim();
    if (!normalizedValue) {
      applySelection(null);
      return;
    }
    if (exactMatch) {
      applySelection(exactMatch.id);
      return;
    }
    const [firstFilteredOption] = filteredOptions;
    if (firstFilteredOption) {
      applySelection(firstFilteredOption.id);
      return;
    }

    setIsCreating(true);
    try {
      const createdIdentifierId = await onCreateIdentifier(normalizedValue);
      if (!createdIdentifierId) return;
      onChange(createdIdentifierId);
      setQuery('');
      setIsOpen(false);
    } finally {
      setIsCreating(false);
    }
  }, [
    applySelection,
    exactMatch,
    filteredOptions,
    onChange,
    onCreateIdentifier,
    query,
  ]);

  const isDisabled = disabled || isCreating;

  return (
    <div className='relative'>
      <Input
        value={query}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setIsOpen(true);
          if (!nextQuery.trim()) {
            onChange(null);
            return;
          }
          if (
            selectedIdentifierLabel &&
            normalizeIdentifierTerm(nextQuery) !==
              normalizeIdentifierTerm(selectedIdentifierLabel)
          ) {
            onChange(null);
          }
        }}
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void handleEnter();
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setIsOpen(false);
          }
        }}
        onFocus={(): void => {
          setIsOpen(true);
        }}
        onBlur={(): void => {
          setIsOpen(false);
        }}
        disabled={isDisabled}
        placeholder={placeholder}
        className={inputClassName}
      />
      {isOpen ? (
        <div className='absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-border/50 bg-popover/95 p-1 shadow-lg backdrop-blur-md'>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option: CaseIdentifierSelectorOption) => (
              <button
                key={option.id}
                type='button'
                className='block w-full rounded px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-muted/70'
                onMouseDown={(
                  event: React.MouseEvent<HTMLButtonElement>,
                ): void => {
                  event.preventDefault();
                  applySelection(option.id);
                }}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className='px-2 py-1.5 text-xs text-muted-foreground'>
              {query.trim()
                ? `No matching identifiers. Press Enter to create "${query.trim()}".`
                : 'Type to search case identifiers.'}
            </div>
          )}
        </div>
      ) : null}
      {selectedIdentifier ? (
        <div className='mt-2'>
          {onPillClick ? (
            <button
              type='button'
              className='rounded-full'
              onClick={(): void => {
                onPillClick(selectedIdentifier.id);
              }}
              title='Filter cases by this identifier'
            >
              <Badge
                variant='outline'
                className='w-fit cursor-pointer text-[10px] hover:bg-muted/60'
              >
                {selectedIdentifierLabel}
              </Badge>
            </button>
          ) : (
            <Badge variant='outline' className='w-fit text-[10px]'>
              {selectedIdentifierLabel}
            </Badge>
          )}
        </div>
      ) : null}
    </div>
  );
}

const buildPathLabelMap = <
  T extends { id: string; name: string; parentId: string | null },
>(
    items: T[],
  ): Map<string, string> => {
  const byId = new Map<string, T>(
    items.map((item: T): [string, T] => [item.id, item]),
  );
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
  comparator: CaseFileComparator = defaultCaseComparator,
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
  comparator: CaseFileComparator = defaultCaseComparator,
): CaseTreeNode[] => {
  const byId = new Map<string, CaseTreeNode>(
    files.map((file: CaseResolverFile): [string, CaseTreeNode] => [
      file.id,
      { file, children: [] },
    ]),
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
  depth = 0,
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
  preferences: UserPreferences | undefined,
): CaseListViewDefaults => ({
  viewMode:
    preferences?.caseResolverCaseListViewMode === 'list' ? 'list' : 'hierarchy',
  sortBy:
    preferences?.caseResolverCaseListSortBy === 'created' ||
    preferences?.caseResolverCaseListSortBy === 'name'
      ? preferences.caseResolverCaseListSortBy
      : 'updated',
  sortOrder:
    preferences?.caseResolverCaseListSortOrder === 'asc' ? 'asc' : 'desc',
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
    [preferencesQuery.data],
  );

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverIdentifiers = settingsStore.get(
    CASE_RESOLVER_IDENTIFIERS_KEY,
  );
  const rawCaseResolverCategories = settingsStore.get(
    CASE_RESOLVER_CATEGORIES_KEY,
  );
  const rawCaseResolverSettings = settingsStore.get(CASE_RESOLVER_SETTINGS_KEY);
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace],
  );
  const canHydrateWorkspaceFromStore = useMemo(
    (): boolean => hasCaseResolverWorkspaceFilesArray(rawWorkspace),
    [rawWorkspace],
  );
  const caseResolverTags = useMemo(
    (): CaseResolverTag[] => parseCaseResolverTags(rawCaseResolverTags),
    [rawCaseResolverTags],
  );
  const caseResolverIdentifiers = useMemo(
    (): CaseResolverIdentifier[] =>
      parseCaseResolverIdentifiers(rawCaseResolverIdentifiers),
    [rawCaseResolverIdentifiers],
  );
  const caseResolverCategories = useMemo(
    (): CaseResolverCategory[] =>
      parseCaseResolverCategories(rawCaseResolverCategories),
    [rawCaseResolverCategories],
  );
  const caseResolverSettings = useMemo(
    () => parseCaseResolverSettings(rawCaseResolverSettings),
    [rawCaseResolverSettings],
  );
  const caseResolverTagOptions = useMemo<
    Array<{ value: string; label: string }>
  >(
    () =>
      caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: tag.name,
      })),
    [caseResolverTags],
  );
  const caseResolverCategoryOptions = useMemo<
    Array<{ value: string; label: string }>
  >(() => {
    const byId = new Map<string, CaseResolverCategory>(
      caseResolverCategories.map(
        (category: CaseResolverCategory): [string, CaseResolverCategory] => [
          category.id,
          category,
        ],
      ),
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
  const [workspace, setWorkspace] =
    useState<CaseResolverWorkspace>(parsedWorkspace);

  const [caseDraft, setCaseDraft] = useState<Partial<CaseResolverFile>>({});
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingCaseName, setEditingCaseName] = useState('');
  const [editingCaseParentId, setEditingCaseParentId] = useState<string | null>(
    null,
  );
  const [editingCaseReferenceCaseIds, setEditingCaseReferenceCaseIds] =
    useState<string[]>([]);
  const [editingCaseTagId, setEditingCaseTagId] = useState<string | null>(null);
  const [editingCaseCaseIdentifierId, setEditingCaseCaseIdentifierId] =
    useState<string | null>(null);
  const [pendingCaseIdentifierIds, setPendingCaseIdentifierIds] = useState<
    string[]
  >([]);
  const [editingCaseCategoryId, setEditingCaseCategoryId] = useState<
    string | null
  >(null);
  const [collapsedCaseIds, setCollapsedCaseIds] = useState<Set<string>>(
    new Set<string>(),
  );
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [caseSearchScope, setCaseSearchScope] = useState<CaseSearchScope>(
    DEFAULT_CASE_LIST_VIEW_DEFAULTS.searchScope,
  );
  const [caseFileTypeFilter, setCaseFileTypeFilter] =
    useState<CaseFileTypeFilter>('all');
  const [caseFilterTagIds, setCaseFilterTagIds] = useState<string[]>([]);
  const [caseFilterCaseIdentifierIds, setCaseFilterCaseIdentifierIds] =
    useState<string[]>([]);
  const [caseFilterCategoryIds, setCaseFilterCategoryIds] = useState<string[]>(
    [],
  );
  const [caseFilterFolder, setCaseFilterFolder] = useState('__all__');
  const [caseSortBy, setCaseSortBy] = useState<CaseSortKey>(
    DEFAULT_CASE_LIST_VIEW_DEFAULTS.sortBy,
  );
  const [caseSortOrder, setCaseSortOrder] = useState<CaseSortOrder>(
    DEFAULT_CASE_LIST_VIEW_DEFAULTS.sortOrder,
  );
  const [caseViewMode, setCaseViewMode] = useState<CaseViewMode>(
    DEFAULT_CASE_LIST_VIEW_DEFAULTS.viewMode,
  );
  const [caseFilterPanelDefaultExpanded, setCaseFilterPanelDefaultExpanded] =
    useState<boolean>(
      !DEFAULT_CASE_LIST_VIEW_DEFAULTS.filtersCollapsedByDefault,
    );
  const [didHydrateCaseListViewDefaults, setDidHydrateCaseListViewDefaults] =
    useState(false);

  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
      } | null>(null);

  useEffect(() => {
    if (!canHydrateWorkspaceFromStore) return;
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
      const currentLatestMs =
        getCaseResolverWorkspaceLatestTimestampMs(current);
      const incomingLatestMs =
        getCaseResolverWorkspaceLatestTimestampMs(parsedWorkspace);
      const currentItemCount = current.files.length + current.assets.length;
      const incomingItemCount =
        parsedWorkspace.files.length + parsedWorkspace.assets.length;
      if (
        incomingLatestMs < currentLatestMs ||
        (incomingLatestMs === currentLatestMs &&
          incomingItemCount < currentItemCount)
      ) {
        return current;
      }
      return parsedWorkspace;
    });
  }, [canHydrateWorkspaceFromStore, parsedWorkspace]);

  useEffect(() => {
    if (didHydrateCaseListViewDefaults) return;
    if (!preferencesQuery.data) return;
    setCaseViewMode(caseListViewDefaults.viewMode);
    setCaseSortBy(caseListViewDefaults.sortBy);
    setCaseSortOrder(caseListViewDefaults.sortOrder);
    setCaseSearchScope(caseListViewDefaults.searchScope);
    setCaseFilterPanelDefaultExpanded(
      !caseListViewDefaults.filtersCollapsedByDefault,
    );
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
    setCaseDraft((prev) => {
      const current = prev.tagId;
      const next =
        !current || !caseResolverTags.some((tag) => tag.id === current)
          ? defaultTagId
          : current;
      if (next === current) return prev;
      return { ...prev, tagId: next };
    });
  }, [caseResolverTags, defaultTagId]);

  useEffect(() => {
    setCaseDraft((prev) => {
      const current = prev.caseIdentifierId;
      const next =
        !current || !caseResolverIdentifiers.some((id) => id.id === current)
          ? defaultCaseIdentifierId
          : current;
      if (next === current) return prev;
      return { ...prev, caseIdentifierId: next };
    });
  }, [caseResolverIdentifiers, defaultCaseIdentifierId]);

  useEffect(() => {
    setCaseDraft((prev) => {
      const current = prev.categoryId;
      const next =
        !current || !caseResolverCategories.some((cat) => cat.id === current)
          ? defaultCategoryId
          : current;
      if (next === current) return prev;
      return { ...prev, categoryId: next };
    });
  }, [caseResolverCategories, defaultCategoryId]);

  const files = useMemo(
    () =>
      workspace.files
        .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
        .sort((left: CaseResolverFile, right: CaseResolverFile) => {
          if (left.folder !== right.folder) {
            return left.folder.localeCompare(right.folder);
          }
          return left.name.localeCompare(right.name);
        }),
    [workspace.files],
  );

  useEffect(() => {
    const validCaseIds = new Set(
      files.map((file: CaseResolverFile) => file.id),
    );
    setCaseDraft((prev) => {
      const nextParentId =
        prev.parentCaseId && validCaseIds.has(prev.parentCaseId)
          ? prev.parentCaseId
          : null;
      const nextRefIds = (prev.referenceCaseIds || []).filter((id) =>
        validCaseIds.has(id),
      );
      if (
        nextParentId === prev.parentCaseId &&
        nextRefIds.length === (prev.referenceCaseIds || []).length
      )
        return prev;
      return {
        ...prev,
        parentCaseId: nextParentId,
        referenceCaseIds: nextRefIds,
      };
    });
  }, [files]);

  const caseTreeForParents = useMemo(
    (): CaseTreeNode[] => buildCaseTree(files),
    [files],
  );
  const caseParentOptions = useMemo(
    () => flattenCaseTreeOptions(caseTreeForParents),
    [caseTreeForParents],
  );
  const caseReferenceOptions = useMemo(
    () =>
      files.map((file: CaseResolverFile) => ({
        value: file.id,
        label: file.folder ? `${file.name} (${file.folder})` : file.name,
      })),
    [files],
  );
  const filesById = useMemo(
    () =>
      new Map<string, CaseResolverFile>(
        files.map((file: CaseResolverFile) => [file.id, file]),
      ),
    [files],
  );
  const caseTagPathById = useMemo(
    () => buildPathLabelMap(caseResolverTags),
    [caseResolverTags],
  );
  const caseIdentifierPathById = useMemo(
    () => buildPathLabelMap(caseResolverIdentifiers),
    [caseResolverIdentifiers],
  );
  const caseCategoryPathById = useMemo(
    () => buildPathLabelMap(caseResolverCategories),
    [caseResolverCategories],
  );
  const caseTagFilterOptions = useMemo(
    () =>
      caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: caseTagPathById.get(tag.id) ?? tag.name,
      })),
    [caseResolverTags, caseTagPathById],
  );
  const caseCategoryFilterOptions = useMemo(
    () =>
      caseResolverCategories.map((category: CaseResolverCategory) => ({
        value: category.id,
        label: caseCategoryPathById.get(category.id) ?? category.name,
      })),
    [caseResolverCategories, caseCategoryPathById],
  );
  const caseIdentifierFilterOptions = useMemo(
    () =>
      caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => ({
        value: identifier.id,
        label: caseIdentifierPathById.get(identifier.id) ?? identifier.name,
      })),
    [caseIdentifierPathById, caseResolverIdentifiers],
  );
  const folderFilterOptions = useMemo(() => {
    const folders = Array.from(
      new Set(
        files
          .map((file: CaseResolverFile): string => file.folder)
          .filter((folder: string): boolean => folder.trim() !== ''),
      ),
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
          { value: 'all', label: 'All case types' },
          { value: 'case', label: 'Case' },
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
    ],
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
    ],
  );
  const caseSortComparator = useMemo<CaseFileComparator>(
    () =>
      (left: CaseResolverFile, right: CaseResolverFile): number => {
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
    [caseSortBy, caseSortOrder],
  );
  const indexedCases = useMemo(
    (): IndexedCaseRow[] =>
      files.map(
        (file: CaseResolverFile): IndexedCaseRow => ({
          file,
          normalizedName: file.name.toLowerCase(),
          normalizedFolder: file.folder.toLowerCase(),
          normalizedContent: (file.documentContentPlainText.trim().length > 0
            ? file.documentContentPlainText
            : stripHtml(file.documentContent)
          ).toLowerCase(),
          normalizedTag: (file.tagId
            ? (caseTagPathById.get(file.tagId) ?? '')
            : ''
          ).toLowerCase(),
          normalizedCaseIdentifier: (file.caseIdentifierId
            ? (caseIdentifierPathById.get(file.caseIdentifierId) ?? '')
            : ''
          ).toLowerCase(),
          normalizedCategory: (file.categoryId
            ? (caseCategoryPathById.get(file.categoryId) ?? '')
            : ''
          ).toLowerCase(),
        }),
      ),
    [caseCategoryPathById, caseIdentifierPathById, caseTagPathById, files],
  );
  const filteredCases = useMemo((): CaseResolverFile[] => {
    const normalizedQuery = caseSearchQuery.trim().toLowerCase();
    const hasTagFilter = caseFilterTagIds.length > 0;
    const hasCaseIdentifierFilter = caseFilterCaseIdentifierIds.length > 0;
    const hasCategoryFilter = caseFilterCategoryIds.length > 0;

    const matchesSearch = (row: IndexedCaseRow): boolean => {
      if (!normalizedQuery) return true;
      if (caseSearchScope === 'name')
        return row.normalizedName.includes(normalizedQuery);
      if (caseSearchScope === 'folder')
        return row.normalizedFolder.includes(normalizedQuery);
      if (caseSearchScope === 'content')
        return row.normalizedContent.includes(normalizedQuery);
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
        if (
          caseFileTypeFilter !== 'all' &&
          row.file.fileType !== caseFileTypeFilter
        )
          return false;
        if (
          caseFilterFolder !== '__all__' &&
          row.file.folder !== caseFilterFolder
        )
          return false;
        if (
          hasTagFilter &&
          (!row.file.tagId || !caseFilterTagIds.includes(row.file.tagId))
        )
          return false;
        if (
          hasCaseIdentifierFilter &&
          (!row.file.caseIdentifierId ||
            !caseFilterCaseIdentifierIds.includes(row.file.caseIdentifierId))
        ) {
          return false;
        }
        if (
          hasCategoryFilter &&
          (!row.file.categoryId ||
            !caseFilterCategoryIds.includes(row.file.categoryId))
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
        current = current.parentCaseId
          ? filesById.get(current.parentCaseId)
          : undefined;
      }
    });

    const treeFiles = files.filter((file: CaseResolverFile): boolean =>
      includedIds.has(file.id),
    );
    return buildCaseTree(treeFiles, caseSortComparator);
  }, [caseSortComparator, filteredCases, files, filesById]);
  const flatCaseNodes = useMemo(
    (): CaseTreeNode[] =>
      filteredCases.map(
        (file: CaseResolverFile): CaseTreeNode => ({ file, children: [] }),
      ),
    [filteredCases],
  );
  const displayedCaseNodes = useMemo(
    (): CaseTreeNode[] =>
      caseViewMode === 'hierarchy' ? filteredCaseTree : flatCaseNodes,
    [caseViewMode, filteredCaseTree, flatCaseNodes],
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
    ],
  );
  const handleCaseFilterChange = useCallback(
    (key: string, value: unknown): void => {
      switch (key) {
        case 'fileType':
          setCaseFileTypeFilter(
            value === 'case' || value === 'all' ? value : 'all',
          );
          break;
        case 'folder':
          setCaseFilterFolder(
            typeof value === 'string' && value !== '' ? value : '__all__',
          );
          break;
        case 'tagIds':
          setCaseFilterTagIds(
            Array.isArray(value)
              ? value.filter(
                (entry): entry is string => typeof entry === 'string',
              )
              : [],
          );
          break;
        case 'caseIdentifierIds':
          setCaseFilterCaseIdentifierIds(
            Array.isArray(value)
              ? value.filter(
                (entry): entry is string => typeof entry === 'string',
              )
              : [],
          );
          break;
        case 'categoryIds':
          setCaseFilterCategoryIds(
            Array.isArray(value)
              ? value.filter(
                (entry): entry is string => typeof entry === 'string',
              )
              : [],
          );
          break;
        case 'searchScope':
          setCaseSearchScope(
            value === 'name' ||
              value === 'folder' ||
              value === 'content' ||
              value === 'all'
              ? value
              : 'all',
          );
          break;
        case 'sortBy':
          setCaseSortBy(
            value === 'created' || value === 'name' || value === 'updated'
              ? value
              : 'updated',
          );
          break;
        default:
          break;
      }
    },
    [],
  );
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
  const handleFilterByCaseIdentifier = useCallback(
    (caseIdentifierId: string): void => {
      setCaseSearchQuery('');
      setCaseSearchScope('all');
      setCaseFileTypeFilter('all');
      setCaseFilterFolder('__all__');
      setCaseFilterTagIds([]);
      setCaseFilterCategoryIds([]);
      setCaseFilterCaseIdentifierIds([caseIdentifierId]);
    },
    [],
  );

  useEffect(() => {
    if (caseFilterFolder === '__all__') return;
    if (
      files.some(
        (file: CaseResolverFile): boolean => file.folder === caseFilterFolder,
      )
    )
      return;
    setCaseFilterFolder('__all__');
  }, [caseFilterFolder, files]);

  useEffect(() => {
    const validTagIds = new Set(
      caseResolverTags.map((tag: CaseResolverTag): string => tag.id),
    );
    setCaseFilterTagIds((current: string[]): string[] =>
      current.filter((tagId: string): boolean => validTagIds.has(tagId)),
    );
  }, [caseResolverTags]);

  useEffect(() => {
    const validCaseIdentifierIds = new Set(
      caseResolverIdentifiers.map(
        (identifier: CaseResolverIdentifier): string => identifier.id,
      ),
    );
    setCaseFilterCaseIdentifierIds((current: string[]): string[] =>
      current.filter((caseIdentifierId: string): boolean =>
        validCaseIdentifierIds.has(caseIdentifierId),
      ),
    );
  }, [caseResolverIdentifiers]);

  useEffect(() => {
    const validCategoryIds = new Set(
      caseResolverCategories.map(
        (category: CaseResolverCategory): string => category.id,
      ),
    );
    setCaseFilterCategoryIds((current: string[]): string[] =>
      current.filter((categoryId: string): boolean =>
        validCategoryIds.has(categoryId),
      ),
    );
  }, [caseResolverCategories]);

  useEffect(() => {
    const validCaseIds = new Set(
      files.map((file: CaseResolverFile) => file.id),
    );
    setCaseDraft((prev) => {
      const nextParentId =
        prev.parentCaseId && validCaseIds.has(prev.parentCaseId)
          ? prev.parentCaseId
          : null;
      const nextRefIds = (prev.referenceCaseIds || []).filter((id) =>
        validCaseIds.has(id),
      );
      if (
        nextParentId === prev.parentCaseId &&
        nextRefIds.length === (prev.referenceCaseIds || []).length
      )
        return prev;
      return {
        ...prev,
        parentCaseId: nextParentId,
        referenceCaseIds: nextRefIds,
      };
    });
  }, [files]);

  const resetCreateCaseDraft = useCallback(
    (parentCaseId: string | null = null): void => {
      setCaseDraft({
        name: '',
        parentCaseId,
        referenceCaseIds: [],
        tagId: defaultTagId,
        caseIdentifierId: defaultCaseIdentifierId,
        categoryId: defaultCategoryId,
      });
    },
    [defaultCaseIdentifierId, defaultCategoryId, defaultTagId],
  );

  const handleOpenCreateCaseModal = useCallback(
    (parentCaseId: string | null = null): void => {
      const validCaseIds = new Set(
        files.map((file: CaseResolverFile): string => file.id),
      );
      const normalizedParentCaseId =
        parentCaseId && validCaseIds.has(parentCaseId) ? parentCaseId : null;
      resetCreateCaseDraft(normalizedParentCaseId);
      setIsCreateCaseModalOpen(true);
    },
    [files, resetCreateCaseDraft],
  );

  const handleCloseCreateCaseModal = useCallback((): void => {
    setIsCreateCaseModalOpen(false);
  }, []);

  const handleCreateCaseIdentifier = useCallback(
    async (rawName: string): Promise<string | null> => {
      const normalizedName = rawName.trim();
      if (!normalizedName) return null;

      const existingIdentifier = caseResolverIdentifiers.find(
        (identifier: CaseResolverIdentifier): boolean =>
          normalizeIdentifierTerm(identifier.name) ===
          normalizeIdentifierTerm(normalizedName),
      );
      if (existingIdentifier) return existingIdentifier.id;

      const now = new Date().toISOString();
      const nextIdentifier: CaseResolverIdentifier = {
        id: createId('case-identifier'),
        name: normalizedName,
        parentId: null,
        color: '#f59e0b',
        createdAt: now,
        updatedAt: now,
      };

      try {
        await updateSetting.mutateAsync({
          key: CASE_RESOLVER_IDENTIFIERS_KEY,
          value: serializeSetting([...caseResolverIdentifiers, nextIdentifier]),
        });
        setPendingCaseIdentifierIds((current: string[]): string[] =>
          current.includes(nextIdentifier.id)
            ? current
            : [...current, nextIdentifier.id],
        );
        toast('Case identifier created.', { variant: 'success' });
        return nextIdentifier.id;
      } catch (error: unknown) {
        toast(
          error instanceof Error
            ? error.message
            : 'Failed to create case identifier.',
          { variant: 'error' },
        );
        return null;
      }
    },
    [caseResolverIdentifiers, toast, updateSetting],
  );

  const createFields: SettingsField<Partial<CaseResolverFile>>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Case Name',
        type: 'text',
        placeholder: 'Enter a descriptive case name',
        required: true,
      },
      {
        key: 'parentCaseId',
        label: 'Parent Case (Optional)',
        type: 'select',
        options: [
          { value: '__none__', label: 'No parent (root case)' },
          ...caseParentOptions,
        ],
        placeholder: 'Select parent case',
      },
      {
        key: 'referenceCaseIds',
        label: 'Reference Cases',
        type: 'custom',
        render: () => (
          <MultiSelect
            options={caseReferenceOptions}
            selected={caseDraft.referenceCaseIds || []}
            onChange={(ids) =>
              setCaseDraft((prev) => ({ ...prev, referenceCaseIds: ids }))
            }
            placeholder='Link to other cases...'
            searchPlaceholder='Search cases...'
            emptyMessage='No other cases found.'
            className='w-full'
          />
        ),
      },
      {
        key: 'tagId',
        label: 'Tag',
        type: 'select',
        options: [
          {
            value: '__none__',
            label:
              caseResolverTags.length > 0 ? 'Select tag' : 'No tags defined',
          },
          ...caseResolverTagOptions,
        ],
        placeholder: 'Assign tag',
        required: true,
      },
      {
        key: 'caseIdentifierId',
        label: 'Case Identifier',
        type: 'custom',
        render: ({ value, onChange, disabled }) => (
          <CaseIdentifierTextSelector
            value={typeof value === 'string' ? value : null}
            identifiers={caseResolverIdentifiers}
            identifierPathById={caseIdentifierPathById}
            placeholder='Type to search identifier or press Enter to create'
            onChange={(nextValue: string | null): void => {
              onChange(nextValue);
            }}
            onCreateIdentifier={handleCreateCaseIdentifier}
            onPillClick={handleFilterByCaseIdentifier}
            disabled={Boolean(disabled)}
            inputClassName='h-9'
          />
        ),
        required: true,
      },
      {
        key: 'categoryId',
        label: 'Category',
        type: 'select',
        options: [
          {
            value: '__none__',
            label:
              caseResolverCategories.length > 0
                ? 'Select category'
                : 'No categories defined',
          },
          ...caseResolverCategoryOptions,
        ],
        placeholder: 'Assign category',
        required: true,
      },
    ],
    [
      caseDraft.referenceCaseIds,
      caseParentOptions,
      caseReferenceOptions,
      caseResolverCategories,
      caseResolverCategoryOptions,
      caseIdentifierPathById,
      caseResolverIdentifiers,
      caseResolverTagOptions,
      caseResolverTags,
      handleFilterByCaseIdentifier,
      handleCreateCaseIdentifier,
    ],
  );

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
    [childrenByParentId],
  );

  const persistWorkspace = useCallback(
    async (
      nextWorkspace: CaseResolverWorkspace,
      successMessage: string,
    ): Promise<void> => {
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
          { variant: 'error' },
        );
      }
    },
    [toast, updateSetting],
  );

  const handleCreateCase = useCallback(async (): Promise<void> => {
    const normalizedName = caseDraft.name?.trim();
    if (!normalizedName) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }

    const normalizedTagId =
      caseDraft.tagId &&
      caseResolverTags.some(
        (tag: CaseResolverTag) => tag.id === caseDraft.tagId,
      )
        ? caseDraft.tagId
        : null;
    const normalizedCaseIdentifierId =
      caseDraft.caseIdentifierId &&
      (caseResolverIdentifiers.some(
        (identifier: CaseResolverIdentifier) =>
          identifier.id === caseDraft.caseIdentifierId,
      ) ||
        pendingCaseIdentifierIds.includes(caseDraft.caseIdentifierId))
        ? caseDraft.caseIdentifierId
        : null;
    const normalizedCategoryId =
      caseDraft.categoryId &&
      caseResolverCategories.some(
        (category: CaseResolverCategory) =>
          category.id === caseDraft.categoryId,
      )
        ? caseDraft.categoryId
        : null;

    const validCaseIds = new Set(
      files.map((file: CaseResolverFile) => file.id),
    );
    const normalizedParentCaseId =
      caseDraft.parentCaseId && validCaseIds.has(caseDraft.parentCaseId)
        ? caseDraft.parentCaseId
        : null;
    const normalizedReferenceCaseIds = Array.from(
      new Set(
        (caseDraft.referenceCaseIds || []).filter(
          (referenceCaseId: string): boolean =>
            referenceCaseId !== '' && validCaseIds.has(referenceCaseId),
        ),
      ),
    );
    const file = createCaseResolverFile({
      id: createId('case-file'),
      fileType: 'case',
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
    caseDraft,
    files,
    pendingCaseIdentifierIds,
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
      editingCaseTagId &&
      caseResolverTags.some(
        (tag: CaseResolverTag) => tag.id === editingCaseTagId,
      )
        ? editingCaseTagId
        : null;
    const normalizedCaseIdentifierId =
      editingCaseCaseIdentifierId &&
      (caseResolverIdentifiers.some(
        (identifier: CaseResolverIdentifier) =>
          identifier.id === editingCaseCaseIdentifierId,
      ) ||
        pendingCaseIdentifierIds.includes(editingCaseCaseIdentifierId))
        ? editingCaseCaseIdentifierId
        : null;
    const normalizedCategoryId =
      editingCaseCategoryId &&
      caseResolverCategories.some(
        (category: CaseResolverCategory) =>
          category.id === editingCaseCategoryId,
      )
        ? editingCaseCategoryId
        : null;

    const validCaseIds = new Set(
      files.map((file: CaseResolverFile) => file.id),
    );
    const blockedParentIds = new Set<string>(
      editingCaseId
        ? [editingCaseId, ...collectDescendantCaseIds(editingCaseId)]
        : [],
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
            validCaseIds.has(referenceCaseId),
        ),
      ),
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
          : file,
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
    files,
    pendingCaseIdentifierIds,
    persistWorkspace,
    toast,
    workspace,
  ]);

  const handleDeleteCase = useCallback(
    async (fileId: string): Promise<void> => {
      const target = workspace.files.find(
        (file: CaseResolverFile) => file.id === fileId,
      );
      if (!target) return;
      if (target.isLocked) {
        toast('Case is locked. Unlock it in Case Resolver before removing.', {
          variant: 'warning',
        });
        return;
      }

      const runDelete = async (): Promise<void> => {
        const removedIds = new Set<string>([fileId]);
        let expanded = true;
        while (expanded) {
          expanded = false;
          workspace.files.forEach((file: CaseResolverFile): void => {
            if (removedIds.has(file.id)) return;
            if (!file.parentCaseId) return;
            if (!removedIds.has(file.parentCaseId)) return;
            removedIds.add(file.id);
            expanded = true;
          });
        }

        const now = new Date().toISOString();
        const nextFiles = workspace.files
          .filter((file: CaseResolverFile) => !removedIds.has(file.id))
          .map((file: CaseResolverFile): CaseResolverFile => {
            const nextReferenceCaseIds = file.referenceCaseIds.filter(
              (referenceCaseId: string): boolean =>
                !removedIds.has(referenceCaseId),
            );
            const referencesChanged =
              nextReferenceCaseIds.length !== file.referenceCaseIds.length;
            if (!referencesChanged) return file;
            return {
              ...file,
              referenceCaseIds: nextReferenceCaseIds,
              updatedAt: now,
            };
          });
        const nextWorkspace: CaseResolverWorkspace = {
          ...workspace,
          files: nextFiles,
          activeFileId:
            workspace.activeFileId && removedIds.has(workspace.activeFileId)
              ? (
                nextFiles.find((file: CaseResolverFile): boolean => file.fileType === 'case')?.id ??
                nextFiles[0]?.id ??
                null
              )
              : workspace.activeFileId,
        };

        await persistWorkspace(nextWorkspace, 'Case removed.');
        if (editingCaseId === fileId) {
          handleCancelEditCase();
        }
      };

      if (!caseResolverSettings.confirmDeleteDocument) {
        await runDelete();
        return;
      }

      setConfirmation({
        title: 'Delete Case?',
        message: `Are you sure you want to delete case "${target.name}"? This action cannot be undone.`,
        confirmText: 'Delete Case',
        isDangerous: true,
        onConfirm: runDelete,
      });
    },
    [
      caseResolverSettings.confirmDeleteDocument,
      editingCaseId,
      handleCancelEditCase,
      persistWorkspace,
      toast,
      workspace,
    ],
  );

  const handleViewCase = useCallback(
    (fileId: string): void => {
      router.push(`/admin/case-resolver?fileId=${encodeURIComponent(fileId)}`);
    },
    [router],
  );

  const handleCopyCaseId = useCallback(
    async (caseId: string): Promise<void> => {
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(caseId);
          toast('Case ID copied.', { variant: 'success' });
          return;
        }
        throw new Error('Clipboard is not available.');
      } catch (error) {
        toast(
          error instanceof Error ? error.message : 'Failed to copy case ID.',
          { variant: 'error' },
        );
      }
    },
    [toast],
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
    return caseParentOptions.filter(
      (option: { value: string; label: string }) =>
        !excludedIds.has(option.value),
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
          const caseIdentifierId = file.caseIdentifierId;
          const parentCase = file.parentCaseId
            ? (workspace.files.find(
              (candidate: CaseResolverFile) =>
                candidate.id === file.parentCaseId,
            ) ?? null)
            : null;
          const referencedCases = file.referenceCaseIds
            .map(
              (referenceCaseId: string) =>
                workspace.files.find(
                  (candidate: CaseResolverFile) =>
                    candidate.id === referenceCaseId,
                ) ?? null,
            )
            .filter(
              (
                candidate: CaseResolverFile | null,
              ): candidate is CaseResolverFile => candidate !== null,
            );
          const editReferenceOptions = caseReferenceOptions.filter(
            (option: { value: string; label: string }) =>
              option.value !== file.id,
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
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>,
                        ): void => {
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
                      <SelectSimple
                        size='sm'
                        value={editingCaseParentId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          setEditingCaseParentId(
                            value === '__none__' ? null : value,
                          );
                        }}
                        options={[
                          { value: '__none__', label: 'No parent (root case)' },
                          ...editingCaseParentOptions,
                        ]}
                        placeholder='Parent case'
                        triggerClassName='h-9'
                      />
                      <SelectSimple
                        size='sm'
                        value={editingCaseTagId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          setEditingCaseTagId(
                            value === '__none__' ? null : value,
                          );
                        }}
                        options={[
                          {
                            value: '__none__',
                            label:
                              caseResolverTags.length > 0
                                ? 'Select tag'
                                : 'No tags',
                          },
                          ...caseResolverTagOptions,
                        ]}
                        placeholder='Select tag'
                        triggerClassName='h-9'
                      />
                      <CaseIdentifierTextSelector
                        value={editingCaseCaseIdentifierId}
                        identifiers={caseResolverIdentifiers}
                        identifierPathById={caseIdentifierPathById}
                        onChange={setEditingCaseCaseIdentifierId}
                        onCreateIdentifier={handleCreateCaseIdentifier}
                        onPillClick={handleFilterByCaseIdentifier}
                        placeholder='Type to search identifier or press Enter to create'
                        disabled={updateSetting.isPending}
                        inputClassName='h-9'
                      />
                      <SelectSimple
                        size='sm'
                        value={editingCaseCategoryId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          setEditingCaseCategoryId(
                            value === '__none__' ? null : value,
                          );
                        }}
                        options={[
                          {
                            value: '__none__',
                            label:
                              caseResolverCategories.length > 0
                                ? 'Select category'
                                : 'No categories',
                          },
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
                            aria-label={
                              isCollapsed
                                ? `Expand ${file.name}`
                                : `Collapse ${file.name}`
                            }
                          >
                            {isCollapsed ? (
                              <ChevronRight className='size-3.5' />
                            ) : (
                              <ChevronDown className='size-3.5' />
                            )}
                          </button>
                        ) : (
                          <span className='inline-flex size-5 items-center justify-center text-xs opacity-30'>
                            •
                          </span>
                        )}
                        {hasChildren && !isCollapsed ? (
                          <FolderOpen className='size-3.5 text-gray-400' />
                        ) : (
                          <Folder className='size-3.5 text-gray-400' />
                        )}
                        <div className='truncate text-sm font-semibold text-gray-100'>
                          {file.name}
                        </div>
                        {file.isLocked ? (
                          <Badge
                            variant='outline'
                            className='text-[10px] text-amber-300'
                          >
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
                            {referencedCases.length} reference
                            {referencedCases.length === 1 ? '' : 's'}
                          </Badge>
                        ) : null}
                        {file.tagId ? (
                          <Badge variant='outline' className='text-[10px]'>
                            {caseResolverTags.find(
                              (tag: CaseResolverTag) => tag.id === file.tagId,
                            )?.name ?? 'Tag'}
                          </Badge>
                        ) : null}
                        {caseIdentifierId ? (
                          <button
                            type='button'
                            className='rounded-full'
                            onClick={(): void => {
                              handleFilterByCaseIdentifier(caseIdentifierId);
                            }}
                            title='Show cases with this identifier'
                          >
                            <Badge
                              variant='outline'
                              className='cursor-pointer text-[10px] hover:bg-muted/60'
                            >
                              {caseIdentifierPathById.get(caseIdentifierId) ??
                                caseResolverIdentifiers.find(
                                  (identifier: CaseResolverIdentifier) =>
                                    identifier.id === caseIdentifierId,
                                )?.name ??
                                'Case Identifier'}
                            </Badge>
                          </button>
                        ) : null}
                        {file.categoryId ? (
                          <Badge variant='outline' className='text-[10px]'>
                            {caseResolverCategories.find(
                              (category: CaseResolverCategory) =>
                                category.id === file.categoryId,
                            )?.name ?? 'Category'}
                          </Badge>
                        ) : null}
                      </div>
                      <div className='mt-0.5 text-xs text-gray-400'>
                        Folder: {file.folder || '(root)'} | Created:{' '}
                        {formatCaseTimestamp(file.createdAt)} | Updated:{' '}
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
              {hasChildren && !isCollapsed
                ? renderCaseTree(node.children, depth + 1)
                : null}
            </div>
          );
        })}
      </div>
    ),
    [
      caseIdentifierPathById,
      caseReferenceOptions,
      caseResolverCategories,
      caseResolverCategoryOptions,
      caseResolverIdentifiers,
      caseResolverTags,
      caseResolverTagOptions,
      collapsedCaseIds,
      handleCreateCaseIdentifier,
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
      handleFilterByCaseIdentifier,
      handleViewCase,
      toggleCaseCollapsed,
      updateSetting.isPending,
      workspace.files,
    ],
  );

  return (
    <>
      <SettingsPanelBuilder
        open={isCreateCaseModalOpen}
        onClose={handleCloseCreateCaseModal}
        title='Add Case'
        subtitle='Create a new case with optional hierarchy, references, tag, case identifier, and category.'
        size='lg'
        fields={createFields}
        values={caseDraft}
        onChange={(vals) => setCaseDraft((prev) => ({ ...prev, ...vals }))}
        onSave={handleCreateCase}
        isSaving={updateSetting.isPending}
      />

      <ListPanel
        header={
          <div className='space-y-4'>
            <div className='mb-2 flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                onClick={(): void => {
                  handleOpenCreateCaseModal();
                }}
                size='icon-lg'
                variant='outline'
                aria-label='Create new case'
                title='Create new case'
              >
                <Plus className='h-6 w-6' />
              </Button>
            </div>
            <div className='space-y-1'>
              <h1 className='text-3xl font-bold tracking-tight text-white'>
                Cases
              </h1>
              <nav
                aria-label='Breadcrumb'
                className='mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-400'
              >
                <Link
                  href='/admin'
                  className='transition-colors hover:text-gray-200'
                >
                  Admin
                </Link>
                <span>/</span>
                <Link
                  href='/admin/case-resolver'
                  className='transition-colors hover:text-gray-200'
                >
                  Case Resolver
                </Link>
                <span>/</span>
                <span className='text-gray-300'>Cases</span>
              </nav>
            </div>
          </div>
        }
      >
        <div className='space-y-6'>
          <div className='text-sm text-muted-foreground'>
            Case Hierarchy ({filteredCases.length} matches of {files.length}{' '}
            total cases)
          </div>

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

          <div className='flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-4'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                  Sort Order
                </span>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 min-w-32 justify-between px-3'
                  onClick={(): void => {
                    setCaseSortOrder((current: CaseSortOrder) =>
                      current === 'asc' ? 'desc' : 'asc',
                    );
                  }}
                >
                  <span className='flex items-center gap-2'>
                    {caseSortOrder === 'asc' ? (
                      <ArrowUp className='size-3' />
                    ) : (
                      <ArrowDown className='size-3' />
                    )}
                    {caseSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </span>
                </Button>
              </div>

              <div className='flex items-center gap-2'>
                <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                  View Mode
                </span>
                <div className='flex rounded-md border border-border/60 p-0.5 bg-background/50'>
                  <Button
                    type='button'
                    size='sm'
                    variant={
                      caseViewMode === 'hierarchy' ? 'secondary' : 'ghost'
                    }
                    className='h-7 px-3 text-xs'
                    onClick={(): void => setCaseViewMode('hierarchy')}
                  >
                    Hierarchy
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant={caseViewMode === 'list' ? 'secondary' : 'ghost'}
                    className='h-7 px-3 text-xs'
                    onClick={(): void => setCaseViewMode('list')}
                  >
                    Flat List
                  </Button>
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              {hasActiveCaseFilters && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-8 text-xs text-muted-foreground hover:text-foreground'
                  onClick={handleResetCaseFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <div className='min-h-[400px]'>
            {files.length === 0 ? (
              <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/20 py-20 text-center'>
                <Folder className='size-10 text-muted-foreground/20 mb-4' />
                <p className='text-sm text-muted-foreground'>
                  No cases found. Create your first case to get started.
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  className='mt-4'
                  onClick={() => handleOpenCreateCaseModal()}
                >
                  <Plus className='mr-2 size-4' />
                  Add Case
                </Button>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/20 py-20 text-center'>
                <p className='text-sm text-muted-foreground font-medium'>
                  No cases match your current filters.
                </p>
                <Button
                  variant='link'
                  size='sm'
                  className='mt-2'
                  onClick={handleResetCaseFilters}
                >
                  Reset all filters
                </Button>
              </div>
            ) : (
              renderCaseTree(displayedCaseNodes, 0)
            )}
          </div>
        </div>
      </ListPanel>

      <ConfirmModal
        isOpen={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title ?? ''}
        message={confirmation?.message ?? ''}
        confirmText={confirmation?.confirmText ?? 'Confirm'}
        isDangerous={confirmation?.isDangerous ?? false}
        onConfirm={async () => {
          if (confirmation?.onConfirm) {
            await confirmation.onConfirm();
          }
          setConfirmation(null);
        }}
      />
    </>
  );
}
