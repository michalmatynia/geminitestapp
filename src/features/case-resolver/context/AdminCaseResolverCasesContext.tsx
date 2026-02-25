'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import type { UserPreferences } from '@/shared/contracts/auth';
import type {
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { internalError } from '@/shared/errors/app-error';
import { logClientError } from '@/features/observability';

import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  hasCaseResolverWorkspaceFilesArray,
  parseCaseResolverCategories,
  parseCaseResolverIdentifiers,
  parseCaseResolverTags,
  parseCaseResolverWorkspace,
} from '../settings';
import {
  createCaseResolverWorkspaceMutationId,
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
  persistCaseResolverWorkspaceSnapshot,
  stampCaseResolverWorkspaceMutation,
} from '../workspace-persistence';

// ─── types ───────────────────────────────────────────────────────────────────

export type CaseViewMode = 'list' | 'hierarchy';
export type CaseSortKey =
  | 'updated'
  | 'created'
  | 'name'
  | 'status'
  | 'signature'
  | 'locked'
  | 'sent';
export type CaseSortOrder = 'asc' | 'desc';
export type CaseSearchScope = 'all' | 'name' | 'folder' | 'content';
export type CaseFileTypeFilter = 'all' | 'case' | 'document' | 'scanfile' | 'note';
export type CaseStatusFilter = 'all' | 'pending' | 'completed';
export type CaseLockedFilter = 'all' | 'locked' | 'unlocked';
export type CaseSentFilter = 'all' | 'sent' | 'not_sent';
export type CaseHierarchyFilter = 'all' | 'root' | 'child';
export type CaseReferencesFilter = 'all' | 'with_references' | 'without_references';

export type CaseListViewDefaults = {
  viewMode: CaseViewMode;
  sortBy: CaseSortKey;
  sortOrder: CaseSortOrder;
  searchScope: CaseSearchScope;
  filtersCollapsedByDefault: boolean;
};

export type AdminCaseResolverCasesContextValue = {
  // State
  workspace: CaseResolverWorkspace;
  caseDraft: Partial<CaseResolverFile>;
  isCreatingCase: boolean;
  isCreateCaseModalOpen: boolean;
  editingCaseId: string | null;
  editingCaseName: string;
  editingCaseParentId: string | null;
  editingCaseReferenceCaseIds: string[];
  editingCaseTagId: string | null;
  editingCaseCaseIdentifierId: string | null;
  editingCaseCategoryId: string | null;
  pendingCaseIdentifierIds: string[];
  collapsedCaseIds: Set<string>;
  caseSearchQuery: string;
  caseSearchScope: CaseSearchScope;
  caseFileTypeFilter: CaseFileTypeFilter;
  caseFilterTagIds: string[];
  caseFilterCaseIdentifierIds: string[];
  caseFilterCategoryIds: string[];
  caseFilterFolder: string;
  caseFilterStatus: CaseStatusFilter;
  caseFilterLocked: CaseLockedFilter;
  caseFilterSent: CaseSentFilter;
  caseFilterHierarchy: CaseHierarchyFilter;
  caseFilterReferences: CaseReferencesFilter;
  caseSortBy: CaseSortKey;
  caseSortOrder: CaseSortOrder;
  caseViewMode: CaseViewMode;
  caseFilterPanelDefaultExpanded: boolean;
  didHydrateCaseListViewDefaults: boolean;
  confirmation: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  } | null;

  // Actions
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  setCaseDraft: React.Dispatch<React.SetStateAction<Partial<CaseResolverFile>>>;
  setIsCreateCaseModalOpen: (open: boolean) => void;
  setEditingCaseId: (id: string | null) => void;
  setEditingCaseName: (name: string) => void;
  setEditingCaseParentId: (id: string | null) => void;
  setEditingCaseReferenceCaseIds: (ids: string[]) => void;
  setEditingCaseTagId: (id: string | null) => void;
  setEditingCaseCaseIdentifierId: (id: string | null) => void;
  setEditingCaseCategoryId: (id: string | null) => void;
  setPendingCaseIdentifierIds: (ids: string[]) => void;
  setCollapsedCaseIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setCaseSearchQuery: (query: string) => void;
  setCaseSearchScope: (scope: CaseSearchScope) => void;
  setCaseFileTypeFilter: (filter: CaseFileTypeFilter) => void;
  setCaseFilterTagIds: (ids: string[]) => void;
  setCaseFilterCaseIdentifierIds: (ids: string[]) => void;
  setCaseFilterCategoryIds: (ids: string[]) => void;
  setCaseFilterFolder: (folder: string) => void;
  setCaseFilterStatus: (status: CaseStatusFilter) => void;
  setCaseFilterLocked: (locked: CaseLockedFilter) => void;
  setCaseFilterSent: (sent: CaseSentFilter) => void;
  setCaseFilterHierarchy: (hierarchy: CaseHierarchyFilter) => void;
  setCaseFilterReferences: (references: CaseReferencesFilter) => void;
  setCaseSortBy: (sortBy: CaseSortKey) => void;
  setCaseSortOrder: (order: CaseSortOrder) => void;
  setCaseViewMode: (mode: CaseViewMode) => void;
  setCaseFilterPanelDefaultExpanded: (expanded: boolean) => void;
  setConfirmation: React.Dispatch<React.SetStateAction<AdminCaseResolverCasesContextValue['confirmation']>>;
  
  // High-level Actions
  handleCreateCase: () => Promise<void>;
  handleUpdateCase: () => Promise<void>;
  handleDeleteCase: (caseId: string) => void;
  handleToggleCaseCollapse: (caseId: string) => void;
  handleMoveCase: (
    caseId: string,
    targetParentCaseId: string | null,
    targetIndex?: number
  ) => Promise<void>;
  handleReorderCase: (
    caseId: string,
    targetCaseId: string,
    position: 'before' | 'after'
  ) => Promise<void>;
  handleRenameCase: (caseId: string, nextName: string) => Promise<void>;
  handleToggleCaseStatus: (caseId: string) => Promise<void>;
  handleSaveCaseDraft: () => Promise<void>;
  handleRefreshWorkspace: () => Promise<void>;
  handleSaveListViewDefaults: () => Promise<void>;

  // Derived / Constant
  caseResolverTags: CaseResolverTag[];
  caseResolverIdentifiers: CaseResolverIdentifier[];
  caseResolverCategories: CaseResolverCategory[];
  caseResolverTagOptions: Array<{ value: string; label: string }>;
  caseResolverCategoryOptions: Array<{ value: string; label: string }>;
  parentCaseOptions: Array<{ value: string; label: string }>;
  caseReferenceOptions: Array<{ value: string; label: string }>;
  caseIdentifierOptions: Array<{ value: string; label: string }>;
  folderOptions: Array<{ value: string; label: string }>;
  isLoading: boolean;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const CASE_RESOLVER_CASE_READY_MAX_ATTEMPTS = 15;
const CASE_RESOLVER_CASE_READY_INTERVAL_MS = 1200;

const DEFAULT_CASE_LIST_VIEW_DEFAULTS: CaseListViewDefaults = {
  viewMode: 'hierarchy',
  sortBy: 'updated',
  sortOrder: 'desc',
  searchScope: 'all',
  filtersCollapsedByDefault: true,
};

const resolveCaseTreeOrderValue = (file: CaseResolverFile): number =>
  typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
    ? Math.max(0, Math.floor(file.caseTreeOrder))
    : Number.MAX_SAFE_INTEGER;

const compareCaseSiblings = (left: CaseResolverFile, right: CaseResolverFile): number => {
  const orderDelta = resolveCaseTreeOrderValue(left) - resolveCaseTreeOrderValue(right);
  if (orderDelta !== 0) return orderDelta;
  const nameDelta = left.name.localeCompare(right.name);
  if (nameDelta !== 0) return nameDelta;
  return left.id.localeCompare(right.id);
};

const normalizeCaseParentId = (
  file: CaseResolverFile,
  caseFilesById: Map<string, CaseResolverFile>
): string | null => {
  const rawParentCaseId = file.parentCaseId?.trim() ?? '';
  if (!rawParentCaseId) return null;
  if (rawParentCaseId === file.id) return null;
  if (!caseFilesById.has(rawParentCaseId)) return null;
  return rawParentCaseId;
};

const getSortedSiblingIds = (
  caseFilesById: Map<string, CaseResolverFile>,
  parentCaseId: string | null,
  options?: {
    excludeCaseId?: string | null;
    parentOverrideByCaseId?: Map<string, string | null>;
  }
): string[] => {
  const excludedCaseId = options?.excludeCaseId ?? null;
  const parentOverrides = options?.parentOverrideByCaseId ?? null;
  return Array.from(caseFilesById.values())
    .filter((file: CaseResolverFile): boolean => {
      if (excludedCaseId && file.id === excludedCaseId) return false;
      const resolvedParentCaseId = parentOverrides?.has(file.id)
        ? (parentOverrides.get(file.id) ?? null)
        : normalizeCaseParentId(file, caseFilesById);
      return resolvedParentCaseId === parentCaseId;
    })
    .sort(compareCaseSiblings)
    .map((file: CaseResolverFile): string => file.id);
};

const assignSiblingCaseOrder = (
  caseFilesById: Map<string, CaseResolverFile>,
  orderedCaseIds: string[]
): void => {
  orderedCaseIds.forEach((caseId: string, index: number): void => {
    const candidate = caseFilesById.get(caseId);
    if (!candidate) return;
    candidate.caseTreeOrder = index;
  });
};

const isDescendantCaseId = (
  caseFilesById: Map<string, CaseResolverFile>,
  candidateCaseId: string,
  ancestorCaseId: string
): boolean => {
  let currentCaseId: string | null = candidateCaseId;
  const seen = new Set<string>();

  while (currentCaseId && !seen.has(currentCaseId)) {
    seen.add(currentCaseId);
    if (currentCaseId === ancestorCaseId) return true;
    const currentCase = caseFilesById.get(currentCaseId);
    if (!currentCase) return false;
    currentCaseId = normalizeCaseParentId(currentCase, caseFilesById);
  }
  return false;
};

const normalizeCaseListViewDefaults = (
  preferences?: UserPreferences,
): CaseListViewDefaults => ({
  viewMode:
    preferences?.caseResolverCaseListViewMode === 'list' ? 'list' : 'hierarchy',
  sortBy:
    preferences?.caseResolverCaseListSortBy === 'created' ||
    preferences?.caseResolverCaseListSortBy === 'name' ||
    preferences?.caseResolverCaseListSortBy === 'status' ||
    preferences?.caseResolverCaseListSortBy === 'signature' ||
    preferences?.caseResolverCaseListSortBy === 'locked' ||
    preferences?.caseResolverCaseListSortBy === 'sent'
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

const AdminCaseResolverCasesContext = createContext<AdminCaseResolverCasesContextValue | null>(null);

export function AdminCaseResolverCasesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preferencesQuery = useUserPreferences();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSettingsBulk();
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

  const caseResolverTagOptions = useMemo<
    Array<{ value: string; label: string }>
  >(
    () =>
      caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: tag.label,
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

  const settingsStoreRefetchRef = useRef(settingsStore.refetch);
  settingsStoreRefetchRef.current = settingsStore.refetch;

  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(parsedWorkspace);
  const lastPersistedWorkspaceValueRef = useRef<string>(JSON.stringify(parsedWorkspace));
  const lastPersistedWorkspaceRevisionRef = useRef<number>(getCaseResolverWorkspaceRevision(parsedWorkspace));
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const createCaseMutationIdRef = useRef<string | null>(null);

  const [caseDraft, setCaseDraft] = useState<Partial<CaseResolverFile>>({});
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingCaseName, setEditingCaseName] = useState('');
  const [editingCaseParentId, setEditingCaseParentId] = useState<string | null>(null);
  const [editingCaseReferenceCaseIds, setEditingCaseReferenceCaseIds] = useState<string[]>([]);
  const [editingCaseTagId, setEditingCaseTagId] = useState<string | null>(null);
  const [editingCaseCaseIdentifierId, setEditingCaseCaseIdentifierId] = useState<string | null>(null);
  const [pendingCaseIdentifierIds, setPendingCaseIdentifierIds] = useState<string[]>([]);
  const [editingCaseCategoryId, setEditingCaseCategoryId] = useState<string | null>(null);
  const [collapsedCaseIds, setCollapsedCaseIds] = useState<Set<string>>(new Set<string>());
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [caseSearchScope, setCaseSearchScope] = useState<CaseSearchScope>(DEFAULT_CASE_LIST_VIEW_DEFAULTS.searchScope);
  const [caseFileTypeFilter, setCaseFileTypeFilter] = useState<CaseFileTypeFilter>('all');
  const [caseFilterTagIds, setCaseFilterTagIds] = useState<string[]>([]);
  const [caseFilterCaseIdentifierIds, setCaseFilterCaseIdentifierIds] = useState<string[]>([]);
  const [caseFilterCategoryIds, setCaseFilterCategoryIds] = useState<string[]>([]);
  const [caseFilterFolder, setCaseFilterFolder] = useState('__all__');
  const [caseFilterStatus, setCaseFilterStatus] = useState<CaseStatusFilter>('all');
  const [caseFilterLocked, setCaseFilterLocked] = useState<CaseLockedFilter>('all');
  const [caseFilterSent, setCaseFilterSent] = useState<CaseSentFilter>('all');
  const [caseFilterHierarchy, setCaseFilterHierarchy] =
    useState<CaseHierarchyFilter>('all');
  const [caseFilterReferences, setCaseFilterReferences] =
    useState<CaseReferencesFilter>('all');
  const [caseSortBy, setCaseSortBy] = useState<CaseSortKey>(DEFAULT_CASE_LIST_VIEW_DEFAULTS.sortBy);
  const [caseSortOrder, setCaseSortOrder] = useState<CaseSortOrder>(DEFAULT_CASE_LIST_VIEW_DEFAULTS.sortOrder);
  const [caseViewMode, setCaseViewMode] = useState<CaseViewMode>(DEFAULT_CASE_LIST_VIEW_DEFAULTS.viewMode);
  const [caseFilterPanelDefaultExpanded, setCaseFilterPanelDefaultExpanded] = useState<boolean>(!DEFAULT_CASE_LIST_VIEW_DEFAULTS.filtersCollapsedByDefault);
  const [didHydrateCaseListViewDefaults, setDidHydrateCaseListViewDefaults] = useState(false);
  const [confirmation, setConfirmation] = useState<AdminCaseResolverCasesContextValue['confirmation']>(null);

  const requestedCaseIdentifierFilterFromQuery = useMemo((): string | null => {
    const rawCaseIdentifierId = searchParams.get('caseIdentifierId');
    if (!rawCaseIdentifierId) return null;
    const normalized = rawCaseIdentifierId.trim();
    return normalized.length > 0 ? normalized : null;
  }, [searchParams]);
  const appliedCaseIdentifierFilterFromQueryRef = useRef<string | null>(null);

  const waitForCaseAvailability = useCallback(
    async (
      caseId: string,
      options?: {
        source?: string;
        maxAttempts?: number;
        intervalMs?: number;
      },
    ): Promise<boolean> => {
      const source = options?.source ?? 'cases_page_case_sync';
      const maxAttempts =
        options?.maxAttempts ?? CASE_RESOLVER_CASE_READY_MAX_ATTEMPTS;
      const intervalMs =
        options?.intervalMs ?? CASE_RESOLVER_CASE_READY_INTERVAL_MS;
      const wait = async (ms: number): Promise<void> =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, ms);
        });

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const snapshot = await fetchCaseResolverWorkspaceSnapshot(source);
        if (snapshot) {
          const hasCase = snapshot.files.some(
            (file: CaseResolverFile): boolean =>
              file.id === caseId && file.fileType === 'case',
          );
          if (hasCase) {
            const serialized = JSON.stringify(snapshot);
            const revision = getCaseResolverWorkspaceRevision(snapshot);
            if (revision >= lastPersistedWorkspaceRevisionRef.current) {
              lastPersistedWorkspaceValueRef.current = serialized;
              lastPersistedWorkspaceRevisionRef.current = revision;
              setWorkspace(snapshot);
            }
            settingsStoreRefetchRef.current();
            logCaseResolverWorkspaceEvent({
              source,
              action: 'case_availability_confirmed',
              workspaceRevision: revision,
            });
            return true;
          }
        }

        if (attempt === 0) {
          settingsStoreRefetchRef.current();
        }
        if (attempt < maxAttempts - 1) {
          await wait(intervalMs);
        }
      }

      logCaseResolverWorkspaceEvent({
        source,
        action: 'case_availability_missing',
        message: `Case was not visible after sync attempts: ${caseId}`,
      });
      return false;
    },
    [],
  );

  const handleCreateCase = useCallback(async (): Promise<void> => {
    if (!caseDraft.name?.trim()) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }
    setIsCreatingCase(true);
    try {
      const mutationId = createCaseResolverWorkspaceMutationId();
      createCaseMutationIdRef.current = mutationId;
      const parentCaseId = caseDraft.parentCaseId?.trim() || null;
      const siblingCaseOrders = workspace.files
        .filter(
          (file: CaseResolverFile): boolean =>
            file.fileType === 'case' &&
            (file.parentCaseId?.trim() || null) === parentCaseId
        )
        .map((file: CaseResolverFile): number =>
          typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
            ? Math.max(0, Math.floor(file.caseTreeOrder))
            : -1
        );
      const nextCaseTreeOrder =
        siblingCaseOrders.length > 0 ? Math.max(...siblingCaseOrders) + 1 : 0;
      const newFile = createCaseResolverFile({
        id: createCaseResolverWorkspaceMutationId('file'),
        fileType: 'case',
        name: caseDraft.name.trim(),
        folder: caseDraft.folder || '',
        parentCaseId,
        caseStatus: caseDraft.caseStatus === 'completed' ? 'completed' : 'pending',
        caseTreeOrder: nextCaseTreeOrder,
        referenceCaseIds: caseDraft.referenceCaseIds || [],
        documentContent:
          typeof caseDraft.documentContent === 'string'
            ? caseDraft.documentContent
            : '',
        documentCity:
          typeof caseDraft.documentCity === 'string'
            ? caseDraft.documentCity
            : null,
        documentDate:
          typeof caseDraft.documentDate === 'string'
            ? caseDraft.documentDate
            : caseDraft.documentDate ?? null,
        activeDocumentVersion:
          caseDraft.activeDocumentVersion === 'exploded'
            ? 'exploded'
            : 'original',
        isLocked: caseDraft.isLocked === true,
        isSent: caseDraft.isSent === true,
        tagId: caseDraft.tagId || null,
        caseIdentifierId: caseDraft.caseIdentifierId || null,
        categoryId: caseDraft.categoryId || null,
      });

      const nextWorkspace = {
        ...workspace,
        files: [...workspace.files, newFile],
      };
      stampCaseResolverWorkspaceMutation(nextWorkspace, { baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace), mutationId });

      const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
      lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
      lastPersistedWorkspaceRevisionRef.current = revision;
      setWorkspace(nextWorkspace);

      await persistCaseResolverWorkspaceSnapshot({ workspace: nextWorkspace, expectedRevision: revision, mutationId, source: 'cases_page_create' });
      
      setIsCreateCaseModalOpen(false);
      setCaseDraft({});
      setEditingCaseId(null);
      toast('Case created successfully.', { variant: 'success' });
      
      void waitForCaseAvailability(newFile.id, { source: 'cases_page_create_sync' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminCaseResolverCasesPage', action: 'createCase' } });
      toast('Failed to create case.', { variant: 'error' });
    } finally {
      setIsCreatingCase(false);
    }
  }, [caseDraft, toast, waitForCaseAvailability, workspace]);

  const handleUpdateCase = useCallback(async (): Promise<void> => {
    if (!editingCaseId || !editingCaseName.trim()) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }
    try {
      const mutationId = createCaseResolverWorkspaceMutationId();
      const nextWorkspace = {
        ...workspace,
        files: workspace.files.map((file) =>
          file.id === editingCaseId
            ? {
              ...file,
              name: editingCaseName.trim(),
              parentCaseId: editingCaseParentId,
              referenceCaseIds: editingCaseReferenceCaseIds,
              tagId: editingCaseTagId,
              caseIdentifierId: editingCaseCaseIdentifierId,
              categoryId: editingCaseCategoryId,
              updatedAt: new Date().toISOString(),
            }
            : file
        ),
      };
      stampCaseResolverWorkspaceMutation(nextWorkspace, { baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace), mutationId });

      const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
      lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
      lastPersistedWorkspaceRevisionRef.current = revision;
      setWorkspace(nextWorkspace);

      await persistCaseResolverWorkspaceSnapshot({ workspace: nextWorkspace, expectedRevision: revision, mutationId, source: 'cases_page_update' });
      
      setEditingCaseId(null);
      toast('Case updated successfully.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminCaseResolverCasesPage', action: 'updateCase' } });
      toast('Failed to update case.', { variant: 'error' });
    }
  }, [editingCaseId, editingCaseName, editingCaseParentId, editingCaseReferenceCaseIds, editingCaseTagId, editingCaseCaseIdentifierId, editingCaseCategoryId, toast, workspace]);

  const handleSaveCaseDraft = useCallback(async (): Promise<void> => {
    if (!editingCaseId) {
      await handleCreateCase();
      return;
    }

    const existingCase = workspace.files.find(
      (file: CaseResolverFile): boolean =>
        file.id === editingCaseId && file.fileType === 'case',
    );
    if (!existingCase) {
      toast('Selected case no longer exists.', { variant: 'error' });
      return;
    }

    const resolvedName =
      typeof caseDraft.name === 'string'
        ? caseDraft.name.trim()
        : existingCase.name.trim();
    if (!resolvedName) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }

    const caseFiles = workspace.files.filter(
      (file: CaseResolverFile): boolean => file.fileType === 'case',
    );
    const caseFilesById = new Map<string, CaseResolverFile>(
      caseFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [
        file.id,
        file,
      ]),
    );
    const normalizeOptionalCaseId = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    };

    const requestedParentCaseId =
      caseDraft.parentCaseId !== undefined
        ? normalizeOptionalCaseId(caseDraft.parentCaseId)
        : normalizeOptionalCaseId(existingCase.parentCaseId);
    const normalizedParentCaseId =
      requestedParentCaseId &&
      requestedParentCaseId !== editingCaseId &&
      caseFilesById.has(requestedParentCaseId)
        ? requestedParentCaseId
        : null;
    if (
      normalizedParentCaseId &&
      isDescendantCaseId(caseFilesById, normalizedParentCaseId, editingCaseId)
    ) {
      toast('A case cannot be moved under one of its descendants.', {
        variant: 'error',
      });
      return;
    }

    const sourceReferenceCaseIds = Array.isArray(caseDraft.referenceCaseIds)
      ? caseDraft.referenceCaseIds
      : existingCase.referenceCaseIds;
    const normalizedReferenceCaseIds = Array.from(
      new Set(
        sourceReferenceCaseIds
          .map((referenceCaseId: string): string => referenceCaseId.trim())
          .filter((referenceCaseId: string): boolean => referenceCaseId.length > 0)
          .filter(
            (referenceCaseId: string): boolean =>
              referenceCaseId !== editingCaseId && caseFilesById.has(referenceCaseId),
          ),
      ),
    );

    const resolvedCaseStatus =
      caseDraft.caseStatus === 'completed' || caseDraft.caseStatus === 'pending'
        ? caseDraft.caseStatus
        : existingCase.caseStatus === 'completed'
          ? 'completed'
          : 'pending';
    const resolvedFolder =
      typeof caseDraft.folder === 'string'
        ? caseDraft.folder
        : existingCase.folder ?? '';
    const resolvedDocumentContent =
      typeof caseDraft.documentContent === 'string'
        ? caseDraft.documentContent
        : existingCase.documentContent ?? '';
    const resolvedDocumentCity =
      typeof caseDraft.documentCity === 'string'
        ? caseDraft.documentCity
        : existingCase.documentCity ?? null;
    const resolvedDocumentDate =
      caseDraft.documentDate !== undefined
        ? typeof caseDraft.documentDate === 'string'
          ? caseDraft.documentDate
          : caseDraft.documentDate ?? null
        : existingCase.documentDate ?? null;
    const resolvedDocumentVersion =
      caseDraft.activeDocumentVersion === 'exploded' ||
      caseDraft.activeDocumentVersion === 'original'
        ? caseDraft.activeDocumentVersion
        : existingCase.activeDocumentVersion === 'exploded'
          ? 'exploded'
          : 'original';
    const resolvedTagId =
      caseDraft.tagId !== undefined
        ? normalizeOptionalCaseId(caseDraft.tagId)
        : normalizeOptionalCaseId(existingCase.tagId);
    const resolvedCaseIdentifierId =
      caseDraft.caseIdentifierId !== undefined
        ? normalizeOptionalCaseId(caseDraft.caseIdentifierId)
        : normalizeOptionalCaseId(existingCase.caseIdentifierId);
    const resolvedCategoryId =
      caseDraft.categoryId !== undefined
        ? normalizeOptionalCaseId(caseDraft.categoryId)
        : normalizeOptionalCaseId(existingCase.categoryId);
    const resolvedIsLocked =
      caseDraft.isLocked !== undefined
        ? caseDraft.isLocked === true
        : existingCase.isLocked === true;
    const resolvedIsSent =
      caseDraft.isSent !== undefined
        ? caseDraft.isSent === true
        : existingCase.isSent === true;

    setIsCreatingCase(true);
    try {
      const mutationId = createCaseResolverWorkspaceMutationId();
      const now = new Date().toISOString();
      const nextWorkspace: CaseResolverWorkspace = {
        ...workspace,
        files: workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
          if (file.id !== editingCaseId || file.fileType !== 'case') return file;
          return createCaseResolverFile({
            ...file,
            id: file.id,
            fileType: 'case',
            name: resolvedName,
            folder: resolvedFolder,
            parentCaseId: normalizedParentCaseId,
            caseStatus: resolvedCaseStatus,
            referenceCaseIds: normalizedReferenceCaseIds,
            documentContent: resolvedDocumentContent,
            documentCity: resolvedDocumentCity,
            documentDate: resolvedDocumentDate,
            activeDocumentVersion: resolvedDocumentVersion,
            isLocked: resolvedIsLocked,
            isSent: resolvedIsSent,
            tagId: resolvedTagId,
            caseIdentifierId: resolvedCaseIdentifierId,
            categoryId: resolvedCategoryId,
            createdAt: file.createdAt,
            updatedAt: now,
          });
        }),
      };
      stampCaseResolverWorkspaceMutation(nextWorkspace, {
        baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
        mutationId,
      });

      const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
      lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
      lastPersistedWorkspaceRevisionRef.current = revision;
      setWorkspace(nextWorkspace);

      await persistCaseResolverWorkspaceSnapshot({
        workspace: nextWorkspace,
        expectedRevision: revision,
        mutationId,
        source: 'cases_page_update',
      });

      setIsCreateCaseModalOpen(false);
      setCaseDraft({});
      setEditingCaseId(null);
      toast('Case updated successfully.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminCaseResolverCasesPage', action: 'saveCaseDraft' },
      });
      toast('Failed to save case.', { variant: 'error' });
    } finally {
      setIsCreatingCase(false);
    }
  }, [caseDraft, editingCaseId, handleCreateCase, toast, workspace]);

  const handleDeleteCase = useCallback((caseId: string): void => {
    setConfirmation({
      title: 'Delete Case',
      message: 'Are you sure you want to delete this case? This action cannot be undone.',
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const mutationId = createCaseResolverWorkspaceMutationId();
          const nextWorkspace = {
            ...workspace,
            files: workspace.files.filter((file) => file.id !== caseId),
          };
          stampCaseResolverWorkspaceMutation(nextWorkspace, { baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace), mutationId });

          const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
          lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
          lastPersistedWorkspaceRevisionRef.current = revision;
          setWorkspace(nextWorkspace);

          await persistCaseResolverWorkspaceSnapshot({ workspace: nextWorkspace, expectedRevision: revision, mutationId, source: 'cases_page_delete' });
          toast('Case deleted successfully.', { variant: 'success' });
        } catch (error) {
          logClientError(error, { context: { source: 'AdminCaseResolverCasesPage', action: 'deleteCase' } });
          toast('Failed to delete case.', { variant: 'error' });
        } finally {
          setConfirmation(null);
        }
      },
    });
  }, [toast, workspace]);

  const handleMoveCase = useCallback(
    async (
      caseId: string,
      targetParentCaseId: string | null,
      targetIndex?: number
    ): Promise<void> => {
      try {
        const caseFilesById = new Map<string, CaseResolverFile>(
          workspace.files
            .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
            .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, { ...file }])
        );
        const movingCase = caseFilesById.get(caseId);
        if (!movingCase || movingCase.isLocked) return;

        const sourceParentCaseId = normalizeCaseParentId(movingCase, caseFilesById);
        const requestedParentCaseId = targetParentCaseId?.trim() ?? '';
        const normalizedTargetParentCaseId =
          requestedParentCaseId.length > 0 &&
          requestedParentCaseId !== caseId &&
          caseFilesById.has(requestedParentCaseId)
            ? requestedParentCaseId
            : null;

        if (
          normalizedTargetParentCaseId &&
          isDescendantCaseId(caseFilesById, normalizedTargetParentCaseId, caseId)
        ) {
          return;
        }

        movingCase.parentCaseId = normalizedTargetParentCaseId;
        const targetSiblingIds = getSortedSiblingIds(caseFilesById, normalizedTargetParentCaseId, {
          excludeCaseId: caseId,
        });
        const normalizedTargetIndex =
          typeof targetIndex === 'number' && Number.isFinite(targetIndex)
            ? Math.max(0, Math.min(Math.floor(targetIndex), targetSiblingIds.length))
            : targetSiblingIds.length;
        const nextTargetSiblingIds = [...targetSiblingIds];
        nextTargetSiblingIds.splice(normalizedTargetIndex, 0, caseId);
        assignSiblingCaseOrder(caseFilesById, nextTargetSiblingIds);

        if (sourceParentCaseId !== normalizedTargetParentCaseId) {
          const sourceSiblingIds = getSortedSiblingIds(caseFilesById, sourceParentCaseId, {
            excludeCaseId: caseId,
          });
          assignSiblingCaseOrder(caseFilesById, sourceSiblingIds);
        }

        const now = new Date().toISOString();
        const nextFiles = workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
          if (file.fileType !== 'case') return file;
          const nextCase = caseFilesById.get(file.id);
          if (!nextCase) return file;

          const previousParentCaseId = file.parentCaseId?.trim() ?? null;
          const nextParentCaseId = normalizeCaseParentId(nextCase, caseFilesById);
          const previousCaseTreeOrder =
            typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
              ? Math.max(0, Math.floor(file.caseTreeOrder))
              : null;
          const nextCaseTreeOrder =
            typeof nextCase.caseTreeOrder === 'number' && Number.isFinite(nextCase.caseTreeOrder)
              ? Math.max(0, Math.floor(nextCase.caseTreeOrder))
              : null;

          const didChangeParent = previousParentCaseId !== nextParentCaseId;
          const didChangeOrder = previousCaseTreeOrder !== nextCaseTreeOrder;
          if (!didChangeParent && !didChangeOrder) return file;

          return {
            ...file,
            parentCaseId: nextParentCaseId,
            caseTreeOrder: nextCaseTreeOrder ?? undefined,
            updatedAt: now,
          };
        });

        const mutationId = createCaseResolverWorkspaceMutationId();
        const nextWorkspace: CaseResolverWorkspace = {
          ...workspace,
          files: nextFiles,
        };
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        lastPersistedWorkspaceRevisionRef.current = revision;
        setWorkspace(nextWorkspace);

        await persistCaseResolverWorkspaceSnapshot({
          workspace: nextWorkspace,
          expectedRevision: revision,
          mutationId,
          source: 'cases_page_move_case',
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminCaseResolverCasesPage',
            action: 'moveCase',
            caseId,
            targetParentCaseId,
          },
        });
        throw error;
      }
    },
    [workspace]
  );

  const handleReorderCase = useCallback(
    async (caseId: string, targetCaseId: string, position: 'before' | 'after'): Promise<void> => {
      try {
        if (caseId === targetCaseId) return;

        const caseFilesById = new Map<string, CaseResolverFile>(
          workspace.files
            .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
            .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, { ...file }])
        );
        const movingCase = caseFilesById.get(caseId);
        const targetCase = caseFilesById.get(targetCaseId);
        if (!movingCase || !targetCase || movingCase.isLocked) return;

        const sourceParentCaseId = normalizeCaseParentId(movingCase, caseFilesById);
        const targetParentCaseId = normalizeCaseParentId(targetCase, caseFilesById);
        if (targetParentCaseId && isDescendantCaseId(caseFilesById, targetParentCaseId, caseId)) {
          return;
        }

        movingCase.parentCaseId = targetParentCaseId;
        const targetSiblingIds = getSortedSiblingIds(caseFilesById, targetParentCaseId, {
          excludeCaseId: caseId,
        });
        const targetIndex = targetSiblingIds.indexOf(targetCaseId);
        if (targetIndex < 0) return;
        const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
        const nextTargetSiblingIds = [...targetSiblingIds];
        nextTargetSiblingIds.splice(insertIndex, 0, caseId);
        assignSiblingCaseOrder(caseFilesById, nextTargetSiblingIds);

        if (sourceParentCaseId !== targetParentCaseId) {
          const sourceSiblingIds = getSortedSiblingIds(caseFilesById, sourceParentCaseId, {
            excludeCaseId: caseId,
          });
          assignSiblingCaseOrder(caseFilesById, sourceSiblingIds);
        }

        const now = new Date().toISOString();
        const nextFiles = workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
          if (file.fileType !== 'case') return file;
          const nextCase = caseFilesById.get(file.id);
          if (!nextCase) return file;

          const previousParentCaseId = file.parentCaseId?.trim() ?? null;
          const nextParentCaseId = normalizeCaseParentId(nextCase, caseFilesById);
          const previousCaseTreeOrder =
            typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
              ? Math.max(0, Math.floor(file.caseTreeOrder))
              : null;
          const nextCaseTreeOrder =
            typeof nextCase.caseTreeOrder === 'number' && Number.isFinite(nextCase.caseTreeOrder)
              ? Math.max(0, Math.floor(nextCase.caseTreeOrder))
              : null;

          const didChangeParent = previousParentCaseId !== nextParentCaseId;
          const didChangeOrder = previousCaseTreeOrder !== nextCaseTreeOrder;
          if (!didChangeParent && !didChangeOrder) return file;

          return {
            ...file,
            parentCaseId: nextParentCaseId,
            caseTreeOrder: nextCaseTreeOrder ?? undefined,
            updatedAt: now,
          };
        });

        const mutationId = createCaseResolverWorkspaceMutationId();
        const nextWorkspace: CaseResolverWorkspace = {
          ...workspace,
          files: nextFiles,
        };
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        lastPersistedWorkspaceRevisionRef.current = revision;
        setWorkspace(nextWorkspace);

        await persistCaseResolverWorkspaceSnapshot({
          workspace: nextWorkspace,
          expectedRevision: revision,
          mutationId,
          source: 'cases_page_reorder_case',
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminCaseResolverCasesPage',
            action: 'reorderCase',
            caseId,
            targetCaseId,
            position,
          },
        });
        throw error;
      }
    },
    [workspace]
  );

  const handleRenameCase = useCallback(
    async (caseId: string, nextName: string): Promise<void> => {
      const normalizedName = nextName.trim();
      if (!normalizedName) return;

      const targetCase = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === caseId && file.fileType === 'case'
      );
      if (!targetCase || targetCase.isLocked || targetCase.name === normalizedName) return;

      try {
        const now = new Date().toISOString();
        const nextWorkspace: CaseResolverWorkspace = {
          ...workspace,
          files: workspace.files.map((file: CaseResolverFile): CaseResolverFile =>
            file.id === caseId
              ? {
                ...file,
                name: normalizedName,
                updatedAt: now,
              }
              : file
          ),
        };

        const mutationId = createCaseResolverWorkspaceMutationId();
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        lastPersistedWorkspaceRevisionRef.current = revision;
        setWorkspace(nextWorkspace);

        await persistCaseResolverWorkspaceSnapshot({
          workspace: nextWorkspace,
          expectedRevision: revision,
          mutationId,
          source: 'cases_page_rename_case',
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminCaseResolverCasesPage',
            action: 'renameCase',
            caseId,
          },
        });
        throw error;
      }
    },
    [workspace]
  );

  const handleToggleCaseStatus = useCallback(
    async (caseId: string): Promise<void> => {
      const targetCase = workspace.files.find(
        (file: CaseResolverFile): boolean =>
          file.id === caseId && file.fileType === 'case',
      );
      if (!targetCase || targetCase.isLocked) return;

      const nextStatus =
        targetCase.caseStatus === 'completed' ? 'pending' : 'completed';
      const now = new Date().toISOString();

      try {
        const mutationId = createCaseResolverWorkspaceMutationId();
        const nextWorkspace: CaseResolverWorkspace = {
          ...workspace,
          files: workspace.files.map((file: CaseResolverFile): CaseResolverFile =>
            file.id === caseId && file.fileType === 'case'
              ? {
                ...file,
                caseStatus: nextStatus,
                updatedAt: now,
              }
              : file,
          ),
        };
        stampCaseResolverWorkspaceMutation(nextWorkspace, {
          baseRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
          mutationId,
        });

        const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
        lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
        lastPersistedWorkspaceRevisionRef.current = revision;
        setWorkspace(nextWorkspace);

        await persistCaseResolverWorkspaceSnapshot({
          workspace: nextWorkspace,
          expectedRevision: revision,
          mutationId,
          source: 'cases_page_toggle_status',
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminCaseResolverCasesPage',
            action: 'toggleCaseStatus',
            caseId,
          },
        });
        toast('Failed to update case status.', { variant: 'error' });
      }
    },
    [toast, workspace],
  );

  const handleToggleCaseCollapse = useCallback((caseId: string): void => {
    setCollapsedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  }, []);

  const handleRefreshWorkspace = useCallback(async (): Promise<void> => {
    settingsStoreRefetchRef.current();
    const snapshot = await fetchCaseResolverWorkspaceSnapshot('cases_page_manual_refresh');
    if (snapshot) {
      setWorkspace(snapshot);
      toast('Workspace refreshed.', { variant: 'success' });
    }
  }, [toast]);

  useEffect(() => {
    if (pathname !== '/admin/case-resolver/cases') return;
    settingsStoreRefetchRef.current();
    let isCancelled = false;
    void (async (): Promise<void> => {
      const latestWorkspace = await fetchCaseResolverWorkspaceSnapshot(
        'cases_page_route_sync',
      );
      if (!latestWorkspace || isCancelled) return;
      const latestRevision = getCaseResolverWorkspaceRevision(latestWorkspace);
      setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
        const currentRevision = getCaseResolverWorkspaceRevision(current);
        if (latestRevision <= currentRevision) return current;
        lastPersistedWorkspaceValueRef.current = JSON.stringify(latestWorkspace);
        lastPersistedWorkspaceRevisionRef.current = latestRevision;
        logCaseResolverWorkspaceEvent({
          source: 'cases_page',
          action: 'route_sync_workspace',
          workspaceRevision: latestRevision,
        });
        return latestWorkspace;
      });
    })();
    return (): void => {
      isCancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/admin/case-resolver/cases') return;
    if (!canHydrateWorkspaceFromStore) return;
    const incomingRevision = getCaseResolverWorkspaceRevision(parsedWorkspace);
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
      const currentRevision = getCaseResolverWorkspaceRevision(current);
      if (incomingRevision <= currentRevision) return current;
      lastPersistedWorkspaceValueRef.current = JSON.stringify(parsedWorkspace);
      lastPersistedWorkspaceRevisionRef.current = incomingRevision;
      logCaseResolverWorkspaceEvent({
        source: 'cases_page',
        action: 'hydrate_workspace',
        workspaceRevision: incomingRevision,
      });
      return parsedWorkspace;
    });
  }, [canHydrateWorkspaceFromStore, parsedWorkspace, pathname]);

  useEffect(() => {
    if (didHydrateCaseListViewDefaults || !preferencesQuery.isFetched) return;
    setCaseSortBy(caseListViewDefaults.sortBy);
    setCaseSortOrder(caseListViewDefaults.sortOrder);
    setCaseViewMode(caseListViewDefaults.viewMode);
    setCaseSearchScope(caseListViewDefaults.searchScope);
    setCaseFilterPanelDefaultExpanded(!caseListViewDefaults.filtersCollapsedByDefault);
    setDidHydrateCaseListViewDefaults(true);
  }, [caseListViewDefaults, didHydrateCaseListViewDefaults, preferencesQuery.isFetched]);

  useEffect(() => {
    if (appliedCaseIdentifierFilterFromQueryRef.current === requestedCaseIdentifierFilterFromQuery) return;
    appliedCaseIdentifierFilterFromQueryRef.current = requestedCaseIdentifierFilterFromQuery;
    if (!requestedCaseIdentifierFilterFromQuery) return;
    setCaseFilterCaseIdentifierIds([requestedCaseIdentifierFilterFromQuery]);
    setCaseFilterPanelDefaultExpanded(true);
  }, [requestedCaseIdentifierFilterFromQuery]);

  const handleSaveListViewDefaults = useCallback(async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync([
        { key: 'caseResolverCaseListViewMode', value: caseViewMode },
        { key: 'caseResolverCaseListSortBy', value: caseSortBy },
        { key: 'caseResolverCaseListSortOrder', value: caseSortOrder },
        { key: 'caseResolverCaseListSearchScope', value: caseSearchScope },
        { key: 'caseResolverCaseListFiltersCollapsedByDefault', value: (!caseFilterPanelDefaultExpanded).toString() },
      ]);
      toast('Default view settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminCaseResolverCasesPage', action: 'saveDefaults' } });
      toast('Failed to save default settings.', { variant: 'error' });
    }
  }, [caseViewMode, caseSortBy, caseSortOrder, caseSearchScope, caseFilterPanelDefaultExpanded, updateSetting, toast]);

  // Options
  const parentCaseOptions = useMemo(
    () =>
      workspace.files
        .filter((f) => f.fileType === 'case')
        .map((f) => ({ value: f.id, label: f.name })),
    [workspace.files],
  );

  const caseReferenceOptions = useMemo(
    () =>
      workspace.files
        .filter((f) => f.fileType === 'case')
        .map((f) => ({ value: f.id, label: f.name })),
    [workspace.files],
  );

  const caseIdentifierOptions = useMemo(
    () =>
      caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => {
        const identifierRecord = identifier as unknown as Record<string, unknown>;
        const id = typeof identifier.id === 'string' ? identifier.id.trim() : '';
        const name = typeof identifierRecord['name'] === 'string' ? identifierRecord['name'].trim() : '';
        const label = typeof identifierRecord['label'] === 'string' ? identifierRecord['label'].trim() : '';
        const type = typeof identifierRecord['type'] === 'string' ? identifierRecord['type'].trim() : '';
        const value = typeof identifierRecord['value'] === 'string' ? identifierRecord['value'].trim() : '';
        const resolvedLabel = label || name || [type, value].filter(part => part.length > 0).join(': ') || id;
        return { value: id, label: resolvedLabel };
      }),
    [caseResolverIdentifiers],
  );

  const folderOptions = useMemo(() => {
    const folders = new Set<string>();
    workspace.files.forEach((f) => {
      if (f.folder) folders.add(f.folder);
    });
    return Array.from(folders)
      .sort()
      .map((folder) => ({ value: folder, label: folder }));
  }, [workspace.files]);

  const value: AdminCaseResolverCasesContextValue = {
    workspace,
    caseDraft,
    isCreatingCase,
    isCreateCaseModalOpen,
    editingCaseId,
    editingCaseName,
    editingCaseParentId,
    editingCaseReferenceCaseIds,
    editingCaseTagId,
    editingCaseCaseIdentifierId,
    editingCaseCategoryId,
    pendingCaseIdentifierIds,
    collapsedCaseIds,
    caseSearchQuery,
    caseSearchScope,
    caseFileTypeFilter,
    caseFilterTagIds,
    caseFilterCaseIdentifierIds,
    caseFilterCategoryIds,
    caseFilterFolder,
    caseFilterStatus,
    caseFilterLocked,
    caseFilterSent,
    caseFilterHierarchy,
    caseFilterReferences,
    caseSortBy,
    caseSortOrder,
    caseViewMode,
    caseFilterPanelDefaultExpanded,
    didHydrateCaseListViewDefaults,
    confirmation,
    setWorkspace,
    setCaseDraft,
    setIsCreateCaseModalOpen,
    setEditingCaseId,
    setEditingCaseName,
    setEditingCaseParentId,
    setEditingCaseReferenceCaseIds,
    setEditingCaseTagId,
    setEditingCaseCaseIdentifierId,
    setEditingCaseCategoryId,
    setPendingCaseIdentifierIds,
    setCollapsedCaseIds,
    setCaseSearchQuery,
    setCaseSearchScope,
    setCaseFileTypeFilter,
    setCaseFilterTagIds,
    setCaseFilterCaseIdentifierIds,
    setCaseFilterCategoryIds,
    setCaseFilterFolder,
    setCaseFilterStatus,
    setCaseFilterLocked,
    setCaseFilterSent,
    setCaseFilterHierarchy,
    setCaseFilterReferences,
    setCaseSortBy,
    setCaseSortOrder,
    setCaseViewMode,
    setCaseFilterPanelDefaultExpanded,
    setConfirmation,
    handleCreateCase,
    handleUpdateCase,
    handleDeleteCase,
    handleToggleCaseCollapse,
    handleMoveCase,
    handleReorderCase,
    handleRenameCase,
    handleToggleCaseStatus,
    handleSaveCaseDraft,
    handleRefreshWorkspace,
    handleSaveListViewDefaults,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    caseResolverTagOptions,
    caseResolverCategoryOptions,
    parentCaseOptions,
    caseReferenceOptions,
    caseIdentifierOptions,
    folderOptions,
    isLoading: settingsStore.isLoading,
  };

  return (
    <AdminCaseResolverCasesContext.Provider value={value}>
      {children}
    </AdminCaseResolverCasesContext.Provider>
  );
}

export function useAdminCaseResolverCases(): AdminCaseResolverCasesContextValue {
  const context = useContext(AdminCaseResolverCasesContext);
  if (!context) {
    throw internalError('useAdminCaseResolverCases must be used within AdminCaseResolverCasesProvider');
  }
  return context;
}
