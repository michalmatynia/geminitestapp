'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import type {
  CaseResolverCategory,
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
  hasCaseResolverWorkspaceFilesArray,
  parseCaseResolverCategories,
  parseCaseResolverIdentifiers,
  parseCaseResolverTags,
  parseCaseResolverWorkspace,
} from '../settings';
import {
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
} from '../workspace-persistence';

import { 
  type CaseViewMode,
  type CaseSortKey,
  type CaseSortOrder,
  type CaseSearchScope,
  type CaseFileTypeFilter,
  type CaseStatusFilter,
  type CaseLockedFilter,
  type CaseSentFilter,
  type CaseHierarchyFilter,
  type CaseReferencesFilter,
  type AdminCaseResolverCasesContextValue
} from './admin-cases/types';

import {
  normalizeCaseListViewDefaults,
} from './admin-cases/utils';
import { useAdminCaseResolverCasesState } from './admin-cases/useAdminCaseResolverCasesState';
import { useAdminCaseResolverCasesActions } from './admin-cases/useAdminCaseResolverCasesActions';

export type { 
  CaseViewMode,
  CaseSortKey,
  CaseSortOrder,
  CaseSearchScope,
  CaseFileTypeFilter,
  CaseStatusFilter,
  CaseLockedFilter,
  CaseSentFilter,
  CaseHierarchyFilter,
  CaseReferencesFilter,
  AdminCaseResolverCasesContextValue
};

const AdminCaseResolverCasesContext = createContext<AdminCaseResolverCasesContextValue | null>(null);

export function AdminCaseResolverCasesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
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

  const state = useAdminCaseResolverCasesState(parsedWorkspace);
  
  const {
    workspace, setWorkspace,
    lastPersistedWorkspaceValueRef,
    lastPersistedWorkspaceRevisionRef,
    isCreatingCase,
    setIsCreatingCase,
    createCaseMutationIdRef,
    caseDraft, setCaseDraft,
    isCreateCaseModalOpen,
    setIsCreateCaseModalOpen,
    editingCaseId, setEditingCaseId,
    editingCaseName, setEditingCaseName,
    editingCaseParentId, setEditingCaseParentId,
    editingCaseReferenceCaseIds, setEditingCaseReferenceCaseIds,
    editingCaseTagId, setEditingCaseTagId,
    editingCaseCaseIdentifierId, setEditingCaseCaseIdentifierId,
    pendingCaseIdentifierIds, setPendingCaseIdentifierIds,
    editingCaseCategoryId, setEditingCaseCategoryId,
    collapsedCaseIds, setCollapsedCaseIds,
    heldCaseId, setHeldCaseId,
    caseSearchQuery, setCaseSearchQuery,
    caseSearchScope, setCaseSearchScope,
    caseFileTypeFilter, setCaseFileTypeFilter,
    caseFilterTagIds, setCaseFilterTagIds,
    caseFilterCaseIdentifierIds, setCaseFilterCaseIdentifierIds,
    caseFilterCategoryIds, setCaseFilterCategoryIds,
    caseFilterFolder, setCaseFilterFolder,
    caseFilterStatus, setCaseFilterStatus,
    caseFilterLocked, setCaseFilterLocked,
    caseFilterSent, setCaseFilterSent,
    caseFilterHierarchy, setCaseFilterHierarchy,
    caseFilterReferences, setCaseFilterReferences,
    caseSortBy, setCaseSortBy,
    caseSortOrder, setCaseSortOrder,
    caseViewMode, setCaseViewMode,
    caseShowNestedContent, setCaseShowNestedContent,
    caseFilterPanelDefaultExpanded, setCaseFilterPanelDefaultExpanded,
    didHydrateCaseListViewDefaults, setDidHydrateCaseListViewDefaults,
    confirmation, setConfirmation,
    requestedCaseIdentifierFilterFromQuery,
    appliedCaseIdentifierFilterFromQueryRef,
  } = state;

  const actions = useAdminCaseResolverCasesActions({
    workspace,
    setWorkspace,
    lastPersistedWorkspaceValueRef,
    lastPersistedWorkspaceRevisionRef,
    setIsCreatingCase,
    createCaseMutationIdRef,
    caseDraft,
    setCaseDraft,
    setIsCreateCaseModalOpen,
    editingCaseId,
    setEditingCaseId,
    editingCaseName,
    editingCaseParentId,
    editingCaseReferenceCaseIds,
    editingCaseTagId,
    editingCaseCaseIdentifierId,
    editingCaseCategoryId,
    setConfirmation,
    toast,
    settingsStoreRefetchRef,
  });

  const {
    handleCreateCase,
    handleUpdateCase,
    handleSaveCaseDraft,
    handleDeleteCase,
    handleMoveCase,
    handleReorderCase,
    handleRenameCase,
    handleToggleCaseStatus,
  } = actions;

  const handleToggleCaseCollapse = useCallback((caseId: string): void => {
    setCollapsedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  }, [setCollapsedCaseIds]);

  const handleToggleHeldCase = useCallback((caseId: string): void => {
    const normalizedCaseId = caseId.trim();
    if (!normalizedCaseId) return;
    setHeldCaseId((current: string | null): string | null =>
      current === normalizedCaseId ? null : normalizedCaseId
    );
  }, [setHeldCaseId]);

  const handleClearHeldCase = useCallback((): void => {
    setHeldCaseId(null);
  }, [setHeldCaseId]);

  const handleRefreshWorkspace = useCallback(async (): Promise<void> => {
    settingsStoreRefetchRef.current();
    const snapshot = await fetchCaseResolverWorkspaceSnapshot('cases_page_manual_refresh');
    if (snapshot) {
      setWorkspace(snapshot);
      toast('Workspace refreshed.', { variant: 'success' });
    }
  }, [setWorkspace, toast]);

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
  }, [pathname, setWorkspace]);

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
  }, [canHydrateWorkspaceFromStore, parsedWorkspace, pathname, setWorkspace]);

  useEffect(() => {
    if (didHydrateCaseListViewDefaults || !preferencesQuery.isFetched) return;
    setCaseSortBy(caseListViewDefaults.sortBy);
    setCaseSortOrder(caseListViewDefaults.sortOrder);
    setCaseViewMode(caseListViewDefaults.viewMode);
    setCaseShowNestedContent(caseListViewDefaults.showNestedContent);
    setCaseSearchScope(caseListViewDefaults.searchScope);
    setCaseFilterPanelDefaultExpanded(!caseListViewDefaults.filtersCollapsedByDefault);
    setDidHydrateCaseListViewDefaults(true);
  }, [caseListViewDefaults, didHydrateCaseListViewDefaults, preferencesQuery.isFetched, setCaseFilterPanelDefaultExpanded, setCaseSearchScope, setCaseShowNestedContent, setCaseSortBy, setCaseSortOrder, setCaseViewMode, setDidHydrateCaseListViewDefaults]);

  useEffect(() => {
    if (appliedCaseIdentifierFilterFromQueryRef.current === requestedCaseIdentifierFilterFromQuery) return;
    appliedCaseIdentifierFilterFromQueryRef.current = requestedCaseIdentifierFilterFromQuery;
    if (!requestedCaseIdentifierFilterFromQuery) return;
    setCaseFilterCaseIdentifierIds([requestedCaseIdentifierFilterFromQuery]);
    setCaseFilterPanelDefaultExpanded(true);
  }, [requestedCaseIdentifierFilterFromQuery, setCaseFilterCaseIdentifierIds, setCaseFilterPanelDefaultExpanded]);

  const handleSaveListViewDefaults = useCallback(async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync([
        { key: 'caseResolverCaseListViewMode', value: caseViewMode },
        { key: 'caseResolverCaseListSortBy', value: caseSortBy },
        { key: 'caseResolverCaseListSortOrder', value: caseSortOrder },
        { key: 'caseResolverCaseListSearchScope', value: caseSearchScope },
        { key: 'caseResolverCaseListFiltersCollapsedByDefault', value: (!caseFilterPanelDefaultExpanded).toString() },
        { key: 'caseResolverCaseListShowNestedContent', value: caseShowNestedContent.toString() },
      ]);
      toast('Default view settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminCaseResolverCasesPage', action: 'saveDefaults' } });
      toast('Failed to save default settings.', { variant: 'error' });
    }
  }, [caseViewMode, caseSortBy, caseSortOrder, caseSearchScope, caseFilterPanelDefaultExpanded, caseShowNestedContent, updateSetting, toast]);

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

  const isLoading = settingsStore.isLoading;
  const value = useMemo((): AdminCaseResolverCasesContextValue => ({
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
    heldCaseId,
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
    caseShowNestedContent,
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
    setHeldCaseId,
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
    setCaseShowNestedContent,
    setCaseFilterPanelDefaultExpanded,
    setConfirmation,
    handleCreateCase,
    handleUpdateCase,
    handleDeleteCase,
    handleToggleCaseCollapse,
    handleToggleHeldCase,
    handleClearHeldCase,
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
    isLoading,
  }), [
    workspace, caseDraft, isCreatingCase, isCreateCaseModalOpen, editingCaseId,
    editingCaseName, editingCaseParentId, editingCaseReferenceCaseIds,
    editingCaseTagId, editingCaseCaseIdentifierId, editingCaseCategoryId,
    pendingCaseIdentifierIds, collapsedCaseIds, heldCaseId,
    caseSearchQuery, caseSearchScope, caseFileTypeFilter,
    caseFilterTagIds, caseFilterCaseIdentifierIds, caseFilterCategoryIds,
    caseFilterFolder, caseFilterStatus, caseFilterLocked, caseFilterSent,
    caseFilterHierarchy, caseFilterReferences,
    caseSortBy, caseSortOrder, caseViewMode, caseShowNestedContent, caseFilterPanelDefaultExpanded,
    didHydrateCaseListViewDefaults, confirmation,
    setWorkspace, setCaseDraft, setIsCreateCaseModalOpen, setEditingCaseId,
    setEditingCaseName, setEditingCaseParentId, setEditingCaseReferenceCaseIds,
    setEditingCaseTagId, setEditingCaseCaseIdentifierId, setEditingCaseCategoryId,
    setPendingCaseIdentifierIds, setCollapsedCaseIds, setHeldCaseId,
    setCaseSearchQuery, setCaseSearchScope, setCaseFileTypeFilter,
    setCaseFilterTagIds, setCaseFilterCaseIdentifierIds, setCaseFilterCategoryIds,
    setCaseFilterFolder, setCaseFilterStatus, setCaseFilterLocked, setCaseFilterSent,
    setCaseFilterHierarchy, setCaseFilterReferences,
    setCaseSortBy, setCaseSortOrder, setCaseViewMode, setCaseShowNestedContent, setCaseFilterPanelDefaultExpanded,
    setConfirmation,
    handleCreateCase, handleUpdateCase, handleDeleteCase,
    handleToggleCaseCollapse, handleToggleHeldCase, handleClearHeldCase,
    handleMoveCase, handleReorderCase, handleRenameCase,
    handleToggleCaseStatus, handleSaveCaseDraft, handleRefreshWorkspace,
    handleSaveListViewDefaults,
    caseResolverTags, caseResolverIdentifiers, caseResolverCategories,
    caseResolverTagOptions, caseResolverCategoryOptions,
    parentCaseOptions, caseReferenceOptions, caseIdentifierOptions, folderOptions,
    isLoading,
  ]);

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
