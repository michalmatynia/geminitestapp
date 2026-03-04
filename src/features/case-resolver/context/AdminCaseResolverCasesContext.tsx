'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import {
  useUpdateUserPreferencesMutation,
  useUserPreferences,
} from '@/features/auth/hooks/useUserPreferences';
import type {
  CaseResolverCategory,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import type { ToastVariant } from '@/shared/contracts/ui';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { internalError } from '@/shared/errors/app-error';

import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  parseCaseResolverCategories,
  parseCaseResolverIdentifiers,
  parseCaseResolverTags,
  safeParseCaseResolverWorkspace,
} from '../settings';

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
  type AdminCaseResolverCasesContextValue,
} from './admin-cases/types';

import { useAdminCaseResolverCasesState } from './admin-cases/useAdminCaseResolverCasesState';
import {
  useAdminCaseResolverCasesActions,
} from './admin-cases/useAdminCaseResolverCasesActions';

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
  AdminCaseResolverCasesContextValue,
};

const AdminCaseResolverCasesContext = createContext<AdminCaseResolverCasesContextValue | null>(
  null
);

const normalizeToastVariant = (value: string | undefined): ToastVariant | undefined => {
  if (value === 'success') return 'success';
  if (value === 'error') return 'error';
  if (value === 'info') return 'info';
  if (value === 'warning') return 'warning';
  if (value === 'default') return 'default';
  return undefined;
};

export function AdminCaseResolverCasesProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const preferencesQuery = useUserPreferences();
  const updatePreferencesMutation = useUpdateUserPreferencesMutation();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverIdentifiers = settingsStore.get(CASE_RESOLVER_IDENTIFIERS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);

  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => safeParseCaseResolverWorkspace(rawWorkspace),
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

  const caseResolverTagOptions = useMemo<Array<{ value: string; label: string }>>(
    () =>
      caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: tag.label,
      })),
    [caseResolverTags]
  );

  const caseResolverCategoryOptions = useMemo<Array<{ value: string; label: string }>>(() => {
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

  const state = useAdminCaseResolverCasesState(parsedWorkspace);

  const {
    workspace,
    setWorkspace,
    lastPersistedWorkspaceValueRef,
    lastPersistedWorkspaceRevisionRef,
    isCreatingCase,
    setIsCreatingCase,
    createCaseMutationIdRef,
    caseDraft,
    setCaseDraft,
    isCreateCaseModalOpen,
    setIsCreateCaseModalOpen,
    editingCaseId,
    setEditingCaseId,
    editingCaseName,
    setEditingCaseName,
    editingCaseParentId,
    setEditingCaseParentId,
    editingCaseReferenceCaseIds,
    setEditingCaseReferenceCaseIds,
    editingCaseTagId,
    setEditingCaseTagId,
    editingCaseCaseIdentifierId,
    setEditingCaseCaseIdentifierId,
    pendingCaseIdentifierIds,
    setPendingCaseIdentifierIds,
    editingCaseCategoryId,
    setEditingCaseCategoryId,
    collapsedCaseIds,
    setCollapsedCaseIds,
    heldCaseId,
    setHeldCaseId,
    caseSearchQuery,
    setCaseSearchQuery,
    caseSearchScope,
    setCaseSearchScope,
    caseFileTypeFilter,
    setCaseFileTypeFilter,
    caseFilterTagIds,
    setCaseFilterTagIds,
    caseFilterCaseIdentifierIds,
    setCaseFilterCaseIdentifierIds,
    caseFilterCategoryIds,
    setCaseFilterCategoryIds,
    caseFilterFolder,
    setCaseFilterFolder,
    caseFilterStatus,
    setCaseFilterStatus,
    caseFilterLocked,
    setCaseFilterLocked,
    caseFilterSent,
    setCaseFilterSent,
    caseFilterHierarchy,
    setCaseFilterHierarchy,
    caseFilterReferences,
    setCaseFilterReferences,
    caseSortBy,
    setCaseSortBy,
    caseSortOrder,
    setCaseSortOrder,
    caseViewMode,
    setCaseViewMode,
    caseShowNestedContent,
    setCaseShowNestedContent,
    caseFilterPanelDefaultExpanded,
    setCaseFilterPanelDefaultExpanded,
    didHydrateCaseListViewDefaults,
    setDidHydrateCaseListViewDefaults,
    confirmation,
    setConfirmation,
    casesLoadState,
    setCasesLoadState,
    casesLoadMessage,
    setCasesLoadMessage,
  } = state;

  const settingsStoreRefetchRef = useRef(settingsStore.refetch);
  settingsStoreRefetchRef.current = settingsStore.refetch;
  const toastForActions = useCallback(
    (message: string, options?: { variant?: string }): void => {
      const variant = normalizeToastVariant(options?.variant);
      toast(message, variant ? { variant } : undefined);
    },
    [toast]
  );

  const actions = useAdminCaseResolverCasesActions({
    workspace,
    setWorkspace,
    lastPersistedWorkspaceValueRef,
    lastPersistedWorkspaceRevisionRef,
    isCreatingCase,
    setIsCreatingCase,
    createCaseMutationIdRef,
    caseDraft,
    setCaseDraft,
    setIsCreateCaseModalOpen,
    editingCaseId,
    setEditingCaseId,
    editingCaseName,
    setEditingCaseName,
    editingCaseParentId,
    setEditingCaseParentId,
    editingCaseReferenceCaseIds,
    setEditingCaseReferenceCaseIds,
    editingCaseTagId,
    setEditingCaseTagId,
    editingCaseCaseIdentifierId,
    setEditingCaseCaseIdentifierId,
    editingCaseCategoryId,
    setEditingCaseCategoryId,
    collapsedCaseIds: Array.from(collapsedCaseIds),
    setCollapsedCaseIds: (ids: string[]) => setCollapsedCaseIds(new Set(ids)),
    setHeldCaseId,
    setCaseSearchQuery,
    setCaseSearchScope,
    setCaseFileTypeFilter,
    setCaseFilterTagIds,
    setCaseFilterCaseIdentifierIds,
    setCaseFilterCategoryIds,
    setCaseFilterFolder: (folder: string | null) => setCaseFilterFolder(folder ?? '__all__'),
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
    setDidHydrateCaseListViewDefaults,
    setConfirmation,
    setCasesLoadState,
    setCasesLoadMessage,
    toast: toastForActions,
    settingsStoreRefetchRef,
  });

  const caseIdentifierOptions = useMemo<Array<{ value: string; label: string }>>(
    () =>
      caseResolverIdentifiers.map((identifierRecord: CaseResolverIdentifier) => {
        const id = identifierRecord.id;
        const name = typeof identifierRecord['name'] === 'string' ? identifierRecord['name'].trim() : '';
        const label =
          typeof identifierRecord['label'] === 'string' ? identifierRecord['label'].trim() : '';
        const type =
          typeof identifierRecord['type'] === 'string' ? identifierRecord['type'].trim() : '';
        const value =
          typeof identifierRecord['value'] === 'string' ? identifierRecord['value'].trim() : '';
        const resolvedLabel =
          label || name || [type, value].filter((part) => part.length > 0).join(': ') || id;
        return { value: id, label: resolvedLabel };
      }),
    [caseResolverIdentifiers]
  );

  const caseReferenceOptions = useMemo<Array<{ value: string; label: string }>>(
    () =>
      workspace.files
        .filter((file) => file.fileType === 'case')
        .map((file) => ({
          value: file.id,
          label: file.folder ? `${file.name} (${file.folder})` : file.name,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [workspace.files]
  );

  const parentCaseOptions = useMemo<Array<{ value: string; label: string }>>(
    () => [{ value: '__none__', label: 'No parent (root case)' }, ...caseReferenceOptions],
    [caseReferenceOptions]
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

  const isRouteWorkspaceSyncing = false; 
  const isLoading =
    settingsStore.isLoading ||
    isRouteWorkspaceSyncing ||
    casesLoadState === 'loading' ||
    preferencesQuery.isLoading;

  const handleToggleCaseCollapse = useCallback(
    (caseId: string): void => {
      setCollapsedCaseIds((previous) => {
        const next = new Set(previous);
        if (next.has(caseId)) {
          next.delete(caseId);
        } else {
          next.add(caseId);
        }
        return next;
      });
    },
    [setCollapsedCaseIds]
  );

  const handleToggleHeldCase = useCallback(
    (caseId: string): void => {
      setHeldCaseId((previous) => (previous === caseId ? null : caseId));
    },
    [setHeldCaseId]
  );

  const handleClearHeldCase = useCallback((): void => {
    setHeldCaseId(null);
  }, [setHeldCaseId]);

  const handleRefreshWorkspace = useCallback(async (): Promise<void> => {
    setCasesLoadMessage(null);
    settingsStoreRefetchRef.current();
  }, [setCasesLoadMessage]);

  const handleSaveListViewDefaults = useCallback(async (): Promise<void> => {
    try {
      await updatePreferencesMutation.mutateAsync({
        caseResolverCaseListViewMode: caseViewMode === 'list' ? 'list' : 'hierarchy',
        caseResolverCaseListSortBy: caseSortBy,
        caseResolverCaseListSortOrder: caseSortOrder,
        caseResolverCaseListSearchScope: caseSearchScope,
        caseResolverCaseListFiltersCollapsedByDefault: !caseFilterPanelDefaultExpanded,
        caseResolverCaseListShowNestedContent: caseShowNestedContent,
      });
      setDidHydrateCaseListViewDefaults(true);
      toast('Case list defaults saved.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save case list defaults.', {
        variant: 'error',
      });
    }
  }, [
    caseFilterPanelDefaultExpanded,
    caseSearchScope,
    caseShowNestedContent,
    caseSortBy,
    caseSortOrder,
    caseViewMode,
    setDidHydrateCaseListViewDefaults,
    toast,
    updatePreferencesMutation,
  ]);

  const value = useMemo(
    (): AdminCaseResolverCasesContextValue => ({
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
      handleCreateCase: actions.handleCreateCase,
      handleUpdateCase: actions.handleUpdateCase,
      handleDeleteCase: actions.handleDeleteCase,
      handleToggleCaseCollapse,
      handleToggleHeldCase,
      handleClearHeldCase,
      handleMoveCase: actions.handleMoveCase,
      handleReorderCase: actions.handleReorderCase,
      handleRenameCase: actions.handleRenameCase,
      handleToggleCaseStatus: actions.handleToggleCaseStatus,
      handleSaveCaseDraft: actions.handleSaveCaseDraft,
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
      casesLoadState,
      casesLoadMessage,
    }),
    [
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
      actions.handleCreateCase,
      actions.handleUpdateCase,
      actions.handleDeleteCase,
      actions.handleMoveCase,
      actions.handleReorderCase,
      actions.handleRenameCase,
      actions.handleToggleCaseStatus,
      actions.handleSaveCaseDraft,
      handleToggleCaseCollapse,
      handleToggleHeldCase,
      handleClearHeldCase,
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
      casesLoadState,
      casesLoadMessage,
    ]
  );

  return (
    <AdminCaseResolverCasesContext.Provider value={value}>
      {children}
    </AdminCaseResolverCasesContext.Provider>
  );
}

export function useAdminCaseResolverCases(): AdminCaseResolverCasesContextValue {
  const context = useContext(AdminCaseResolverCasesContext);
  if (!context) {
    throw internalError(
      'useAdminCaseResolverCases must be used within AdminCaseResolverCasesProvider'
    );
  }
  return context;
}
