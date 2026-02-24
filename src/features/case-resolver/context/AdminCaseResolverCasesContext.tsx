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
import { useUpdateSetting } from '@/shared/hooks/use-settings';
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
export type CaseSortKey = 'updated' | 'created' | 'name';
export type CaseSortOrder = 'asc' | 'desc';
export type CaseSearchScope = 'all' | 'name' | 'folder' | 'content';
export type CaseFileTypeFilter = 'all' | 'case' | 'document' | 'scanfile' | 'note';

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

const normalizeCaseListViewDefaults = (
  preferences?: UserPreferences,
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

const AdminCaseResolverCasesContext = createContext<AdminCaseResolverCasesContextValue | null>(null);

export function AdminCaseResolverCasesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
      const newFile = createCaseResolverFile({
        id: createCaseResolverWorkspaceMutationId('file'),
        name: caseDraft.name.trim(),
        folder: caseDraft.folder || '',
        parentCaseId: caseDraft.parentCaseId || null,
        referenceCaseIds: caseDraft.referenceCaseIds || [],
        tagId: caseDraft.tagId || null,
        caseIdentifierId: caseDraft.caseIdentifierId || null,
        categoryId: caseDraft.categoryId || null,
      });

      const nextWorkspace = {
        ...workspace,
        files: [...workspace.files, newFile],
      };
      stampCaseResolverWorkspaceMutation(nextWorkspace, mutationId);
      
      const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
      lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
      lastPersistedWorkspaceRevisionRef.current = revision;
      setWorkspace(nextWorkspace);

      await persistCaseResolverWorkspaceSnapshot(nextWorkspace, 'cases_page_create');
      
      setIsCreateCaseModalOpen(false);
      setCaseDraft({});
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
      stampCaseResolverWorkspaceMutation(nextWorkspace, mutationId);
      
      const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
      lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
      lastPersistedWorkspaceRevisionRef.current = revision;
      setWorkspace(nextWorkspace);

      await persistCaseResolverWorkspaceSnapshot(nextWorkspace, 'cases_page_update');
      
      setEditingCaseId(null);
      toast('Case updated successfully.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminCaseResolverCasesPage', action: 'updateCase' } });
      toast('Failed to update case.', { variant: 'error' });
    }
  }, [editingCaseId, editingCaseName, editingCaseParentId, editingCaseReferenceCaseIds, editingCaseTagId, editingCaseCaseIdentifierId, editingCaseCategoryId, toast, workspace]);

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
          stampCaseResolverWorkspaceMutation(nextWorkspace, mutationId);
          
          const revision = getCaseResolverWorkspaceRevision(nextWorkspace);
          lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
          lastPersistedWorkspaceRevisionRef.current = revision;
          setWorkspace(nextWorkspace);

          await persistCaseResolverWorkspaceSnapshot(nextWorkspace, 'cases_page_delete');
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
    setCaseSortBy,
    setCaseSortOrder,
    setCaseViewMode,
    setCaseFilterPanelDefaultExpanded,
    setConfirmation,
    handleCreateCase,
    handleUpdateCase,
    handleDeleteCase,
    handleToggleCaseCollapse,
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
