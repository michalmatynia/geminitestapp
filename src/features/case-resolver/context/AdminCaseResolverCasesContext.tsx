'use client';

import React, { createContext, useContext, useMemo, useRef } from 'react';
import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import type {
  CaseResolverCategory,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
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
  type CaseResolverCasesLoadState,
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

export function AdminCaseResolverCasesProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const preferencesQuery = useUserPreferences();
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
    setEditingCaseId,
    setEditingCaseName,
    setEditingCaseParentId,
    setEditingCaseReferenceCaseIds,
    setEditingCaseTagId,
    setEditingCaseCaseIdentifierId,
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
    setCaseFilterFolder: (folder: string | null) => setCaseFilterFolder(folder || ''),
    setCaseFilterStatus,
    setCaseFilterLocked,
    setCaseFilterSent,
    setCaseFilterHierarchy,
    setCaseFilterReferences,
    setCaseSortBy,
    setCaseSortOrder,
    setCaseViewMode,
    setCaseShowNestedContent,
    setDidHydrateCaseListViewDefaults,
    setConfirmation,
    setCasesLoadState,
    setCasesLoadMessage: (msg: string | null) => setCasesLoadMessage(msg || ''),
    toast: toast as any, 
    settingsStoreRefetchRef,
  } as any);

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

  const value = useMemo(
    (): AdminCaseResolverCasesContextValue => ({
      workspace,
      setWorkspace,
      casesLoadState: casesLoadState as CaseResolverCasesLoadState,
      casesLoadMessage,
      caseDraft,
      setCaseDraft,
      isCreatingCase,
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
      setPendingCaseIdentifierIds: state.setPendingCaseIdentifierIds,
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
      ...actions,
      caseIdentifierOptions,
      folderOptions,
      caseResolverTags,
      caseResolverIdentifiers,
      caseResolverCategories,
      caseResolverTagOptions,
      caseResolverCategoryOptions,
      isLoading,
    } as any),
    [
      workspace,
      setWorkspace,
      casesLoadState,
      casesLoadMessage,
      caseDraft,
      setCaseDraft,
      isCreatingCase,
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
      state.setPendingCaseIdentifierIds,
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
      actions,
      caseIdentifierOptions,
      folderOptions,
      caseResolverTags,
      caseResolverIdentifiers,
      caseResolverCategories,
      caseResolverTagOptions,
      caseResolverCategoryOptions,
      isLoading,
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
