'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import type { UserPreferencesUpdate } from '@/shared/contracts/auth';
import { useUpdateUserPreferences, useUserPreferences } from '@/shared/hooks/useUserPreferences';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import type {
  AdminCaseResolverCasesActionsValue,
  AdminCaseResolverCasesStateValue,
} from './AdminCaseResolverCasesContext.types';
import { useAdminCaseResolverCasesActions } from './admin-cases/useAdminCaseResolverCasesActions';
import { useAdminCaseResolverCasesState } from './admin-cases/useAdminCaseResolverCasesState';
import {
  normalizeCaseListViewDefaults,
  shouldAdoptIncomingCaseResolverCasesWorkspace,
  shouldBootstrapCaseResolverCasesFromRecord,
} from './admin-cases/utils';
import { buildCaseTree, buildPathLabelMap, flattenCaseTreeOptions } from '../pages/AdminCaseResolverCasesUtils';
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
  fetchCaseResolverWorkspaceRecordDetailed,
  getCaseResolverWorkspaceRevision,
} from '../workspace-persistence';

const CASES_PAGE_WORKSPACE_FETCH_OPTIONS = {
  attemptProfile: 'context_fast' as const,
  maxTotalMs: 15_000,
  attemptTimeoutMs: 5_000,
  requiredFileId: null,
  includeDetachedHistory: true,
  includeDetachedDocuments: true,
};

const buildTagOptions = (tags: CaseResolverTag[]): Array<LabeledOptionDto<string>> => {
  const labels = buildPathLabelMap(
    tags.map((tag) => ({
      ...tag,
      name: tag.label || tag.id,
      parentId: tag.parentId ?? null,
    }))
  );
  return tags.map((tag) => ({
    value: tag.id,
    label: labels.get(tag.id) || tag.label || tag.id,
  }));
};

const buildIdentifierOptions = (
  identifiers: CaseResolverIdentifier[]
): Array<LabeledOptionDto<string>> => {
  const labels = buildPathLabelMap(
    identifiers.map((identifier) => ({
      ...identifier,
      name: identifier.name || identifier.label || identifier.id,
      parentId: identifier.parentId ?? null,
    }))
  );
  return identifiers.map((identifier) => ({
    value: identifier.id,
    label: labels.get(identifier.id) || identifier.name || identifier.label || identifier.id,
  }));
};

const buildCategoryOptions = (
  categories: CaseResolverCategory[]
): Array<LabeledOptionDto<string>> => {
  const labels = buildPathLabelMap(
    categories.map((category) => ({
      ...category,
      name: category.name || category.id,
      parentId: category.parentId ?? null,
    }))
  );
  return categories.map((category) => ({
    value: category.id,
    label: labels.get(category.id) || category.name || category.id,
  }));
};

const buildFolderOptions = (caseFiles: CaseResolverFile[]): Array<LabeledOptionDto<string>> =>
  Array.from(
    new Set(
      caseFiles
        .map((file) => file.folder.trim())
        .filter((folder): folder is string => folder.length > 0)
    )
  )
    .sort((left, right) => left.localeCompare(right))
    .map((folder) => ({
      value: folder,
      label: folder,
    }));

export function useAdminCaseResolverCasesRuntime(): {
  stateValue: AdminCaseResolverCasesStateValue;
  actionsValue: AdminCaseResolverCasesActionsValue;
} {
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const userPreferencesQuery = useUserPreferences();
  const updateUserPreferences = useUpdateUserPreferences();

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY) ?? null;
  const rawTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY) ?? null;
  const rawIdentifiers = settingsStore.get(CASE_RESOLVER_IDENTIFIERS_KEY) ?? null;
  const rawCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY) ?? null;

  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => safeParseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const caseResolverTags = useMemo(
    (): CaseResolverTag[] => parseCaseResolverTags(rawTags),
    [rawTags]
  );
  const caseResolverIdentifiers = useMemo(
    (): CaseResolverIdentifier[] => parseCaseResolverIdentifiers(rawIdentifiers),
    [rawIdentifiers]
  );
  const caseResolverCategories = useMemo(
    (): CaseResolverCategory[] => parseCaseResolverCategories(rawCategories),
    [rawCategories]
  );

  const state = useAdminCaseResolverCasesState(parsedWorkspace);
  const settingsStoreRefetchRef = useRef(settingsStore.refetch);
  const bootstrappedWorkspaceRef = useRef(false);

  useEffect(() => {
    settingsStoreRefetchRef.current = settingsStore.refetch;
  }, [settingsStore.refetch]);

  const adoptWorkspace = useCallback(
    (nextWorkspace: CaseResolverWorkspace): void => {
      state.lastPersistedWorkspaceValueRef.current = JSON.stringify(nextWorkspace);
      state.lastPersistedWorkspaceRevisionRef.current = getCaseResolverWorkspaceRevision(nextWorkspace);
      state.setWorkspace(nextWorkspace);
      state.setCasesLoadState('ready');
      state.setCasesLoadMessage(null);
    },
    [state]
  );

  useEffect(() => {
    if (settingsStore.isLoading) return;
    if (
      shouldAdoptIncomingCaseResolverCasesWorkspace({
        current: state.workspace,
        incoming: parsedWorkspace,
      })
    ) {
      adoptWorkspace(parsedWorkspace);
      return;
    }

    const parsedCaseCount = parsedWorkspace.files.filter(
      (file: CaseResolverFile): boolean => file.fileType === 'case'
    ).length;
    if (parsedCaseCount > 0 && state.casesLoadState === 'loading') {
      state.setCasesLoadState('ready');
      state.setCasesLoadMessage(null);
    }
  }, [adoptWorkspace, parsedWorkspace, settingsStore.isLoading, state]);

  const refreshWorkspaceFromRecord = useCallback(
    async (source: 'cases_page_bootstrap' | 'cases_page_manual_refresh'): Promise<void> => {
      const result = await fetchCaseResolverWorkspaceRecordDetailed(
        source,
        CASES_PAGE_WORKSPACE_FETCH_OPTIONS
      );

      if (result.status === 'resolved') {
        adoptWorkspace(result.workspace);
        return;
      }

      if (result.status === 'no_record') {
        state.setCasesLoadState('no_record');
        state.setCasesLoadMessage(result.message);
        return;
      }

      state.setCasesLoadState('unavailable');
      state.setCasesLoadMessage(result.message);
    },
    [adoptWorkspace, state]
  );

  useEffect(() => {
    if (settingsStore.isLoading) return;
    if (bootstrappedWorkspaceRef.current) return;
    bootstrappedWorkspaceRef.current = true;

    if (shouldBootstrapCaseResolverCasesFromRecord(parsedWorkspace)) {
      void refreshWorkspaceFromRecord('cases_page_bootstrap');
      return;
    }

    state.setCasesLoadState('ready');
    state.setCasesLoadMessage(null);
  }, [parsedWorkspace, refreshWorkspaceFromRecord, settingsStore.isLoading, state]);

  const hydratedDefaults = useMemo(
    () => normalizeCaseListViewDefaults(userPreferencesQuery.data),
    [userPreferencesQuery.data]
  );

  useEffect(() => {
    if (userPreferencesQuery.isLoading || state.didHydrateCaseListViewDefaults) return;

    state.setCaseViewMode(hydratedDefaults.viewMode);
    state.setCaseSortBy(hydratedDefaults.sortBy);
    state.setCaseSortOrder(hydratedDefaults.sortOrder);
    state.setCaseSearchScope(hydratedDefaults.searchScope);
    state.setCaseShowNestedContent(hydratedDefaults.showNestedContent);
    state.setCaseFilterPanelDefaultExpanded(!hydratedDefaults.filtersCollapsedByDefault);
    state.setDidHydrateCaseListViewDefaults(true);
  }, [hydratedDefaults, state, userPreferencesQuery.isLoading]);

  useEffect(() => {
    const requestedCaseIdentifierId = state.requestedCaseIdentifierFilterFromQuery;
    if (!requestedCaseIdentifierId) return;
    if (state.appliedCaseIdentifierFilterFromQueryRef.current === requestedCaseIdentifierId) return;

    state.setCaseFilterCaseIdentifierIds([requestedCaseIdentifierId]);
    state.appliedCaseIdentifierFilterFromQueryRef.current = requestedCaseIdentifierId;
  }, [state]);

  const caseResolverTagOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => buildTagOptions(caseResolverTags),
    [caseResolverTags]
  );
  const caseIdentifierOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => buildIdentifierOptions(caseResolverIdentifiers),
    [caseResolverIdentifiers]
  );
  const caseResolverCategoryOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => buildCategoryOptions(caseResolverCategories),
    [caseResolverCategories]
  );

  const caseFiles = useMemo(
    (): CaseResolverFile[] =>
      state.workspace.files.filter((file: CaseResolverFile): boolean => file.fileType === 'case'),
    [state.workspace.files]
  );

  const parentCaseOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => flattenCaseTreeOptions(buildCaseTree(caseFiles)),
    [caseFiles]
  );
  const caseReferenceOptions = useMemo(
    (): Array<LabeledOptionDto<string>> =>
      [...parentCaseOptions].sort((left, right) => left.label.localeCompare(right.label)),
    [parentCaseOptions]
  );
  const folderOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => buildFolderOptions(caseFiles),
    [caseFiles]
  );

  const handleToggleCaseCollapse = useCallback(
    (caseId: string): void => {
      state.setCollapsedCaseIds((previous: Set<string>) => {
        const next = new Set(previous);
        if (next.has(caseId)) {
          next.delete(caseId);
        } else {
          next.add(caseId);
        }
        return next;
      });
    },
    [state]
  );

  const handleToggleHeldCase = useCallback(
    (caseId: string): void => {
      state.setHeldCaseId((previous: string | null) => (previous === caseId ? null : caseId));
    },
    [state]
  );

  const handleClearHeldCase = useCallback((): void => {
    state.setHeldCaseId(null);
  }, [state]);

  const handleRefreshWorkspace = useCallback(async (): Promise<void> => {
    settingsStoreRefetchRef.current();
    state.setCasesLoadState('loading');
    state.setCasesLoadMessage(null);
    await refreshWorkspaceFromRecord('cases_page_manual_refresh');
  }, [refreshWorkspaceFromRecord, state]);

  const handleSaveListViewDefaults = useCallback(async (): Promise<void> => {
    const payload: UserPreferencesUpdate = {
      caseResolverCaseListViewMode: state.caseViewMode,
      caseResolverCaseListSortBy: state.caseSortBy,
      caseResolverCaseListSortOrder: state.caseSortOrder,
      caseResolverCaseListSearchScope: state.caseSearchScope,
      caseResolverCaseListFiltersCollapsedByDefault: !state.caseFilterPanelDefaultExpanded,
      caseResolverCaseListShowNestedContent: state.caseShowNestedContent,
    };

    await updateUserPreferences.mutateAsync(payload);
    toast('Case list view defaults saved.', { variant: 'success' });
  }, [state, toast, updateUserPreferences]);

  const liftedActions = useAdminCaseResolverCasesActions({
    workspace: state.workspace,
    setWorkspace: state.setWorkspace,
    lastPersistedWorkspaceValueRef: state.lastPersistedWorkspaceValueRef,
    lastPersistedWorkspaceRevisionRef: state.lastPersistedWorkspaceRevisionRef,
    isCreatingCase: state.isCreatingCase,
    setIsCreatingCase: state.setIsCreatingCase,
    createCaseMutationIdRef: state.createCaseMutationIdRef,
    caseDraft: state.caseDraft,
    setCaseDraft: state.setCaseDraft,
    setIsCreateCaseModalOpen: (open: boolean) => {
      state.setIsCreateCaseModalOpen(open);
    },
    editingCaseId: state.editingCaseId,
    setEditingCaseId: (id: string | null) => {
      state.setEditingCaseId(id);
    },
    editingCaseName: state.editingCaseName,
    setEditingCaseName: (name: string) => {
      state.setEditingCaseName(name);
    },
    editingCaseParentId: state.editingCaseParentId,
    setEditingCaseParentId: (id: string | null) => {
      state.setEditingCaseParentId(id);
    },
    editingCaseReferenceCaseIds: state.editingCaseReferenceCaseIds,
    setEditingCaseReferenceCaseIds: (ids: string[]) => {
      state.setEditingCaseReferenceCaseIds(ids);
    },
    editingCaseTagId: state.editingCaseTagId,
    setEditingCaseTagId: (id: string | null) => {
      state.setEditingCaseTagId(id);
    },
    editingCaseCaseIdentifierId: state.editingCaseCaseIdentifierId,
    setEditingCaseCaseIdentifierId: (id: string | null) => {
      state.setEditingCaseCaseIdentifierId(id);
    },
    editingCaseCategoryId: state.editingCaseCategoryId,
    setEditingCaseCategoryId: (id: string | null) => {
      state.setEditingCaseCategoryId(id);
    },
    collapsedCaseIds: [...state.collapsedCaseIds],
    setCollapsedCaseIds: (ids: string[]) => {
      state.setCollapsedCaseIds(new Set(ids));
    },
    setHeldCaseId: (id: string | null) => {
      state.setHeldCaseId(id);
    },
    setCaseSearchQuery: (query: string) => {
      state.setCaseSearchQuery(query);
    },
    setCaseSearchScope: (scope) => {
      state.setCaseSearchScope(scope);
    },
    setCaseFileTypeFilter: (filter) => {
      state.setCaseFileTypeFilter(filter);
    },
    setCaseFilterTagIds: (ids: string[]) => {
      state.setCaseFilterTagIds(ids);
    },
    setCaseFilterCaseIdentifierIds: (ids: string[]) => {
      state.setCaseFilterCaseIdentifierIds(ids);
    },
    setCaseFilterCategoryIds: (ids: string[]) => {
      state.setCaseFilterCategoryIds(ids);
    },
    setCaseFilterFolder: (folder: string | null) => {
      state.setCaseFilterFolder(folder ?? '__all__');
    },
    setCaseFilterStatus: (status) => {
      state.setCaseFilterStatus(status);
    },
    setCaseFilterLocked: (locked) => {
      state.setCaseFilterLocked(locked);
    },
    setCaseFilterSent: (sent) => {
      state.setCaseFilterSent(sent);
    },
    setCaseFilterHierarchy: (hierarchy) => {
      state.setCaseFilterHierarchy(hierarchy);
    },
    setCaseFilterReferences: (references) => {
      state.setCaseFilterReferences(references);
    },
    setCaseSortBy: (key) => {
      state.setCaseSortBy(key);
    },
    setCaseSortOrder: (order) => {
      state.setCaseSortOrder(order);
    },
    setCaseViewMode: (mode) => {
      state.setCaseViewMode(mode);
    },
    setCaseShowNestedContent: (show: boolean) => {
      state.setCaseShowNestedContent(show);
    },
    setCaseFilterPanelDefaultExpanded: (expanded: boolean) => {
      state.setCaseFilterPanelDefaultExpanded(expanded);
    },
    setDidHydrateCaseListViewDefaults: (hydrated: boolean) => {
      state.setDidHydrateCaseListViewDefaults(hydrated);
    },
    setConfirmation: state.setConfirmation,
    setCasesLoadState: (nextState) => {
      state.setCasesLoadState(nextState);
    },
    setCasesLoadMessage: (message: string | null) => {
      state.setCasesLoadMessage(message);
    },
    toast,
    settingsStoreRefetchRef,
  });

  const stateValue = useMemo<AdminCaseResolverCasesStateValue>(
    () => ({
      workspace: state.workspace,
      caseDraft: state.caseDraft,
      isCreatingCase: state.isCreatingCase,
      isCreateCaseModalOpen: state.isCreateCaseModalOpen,
      editingCaseId: state.editingCaseId,
      editingCaseName: state.editingCaseName,
      editingCaseParentId: state.editingCaseParentId,
      editingCaseReferenceCaseIds: state.editingCaseReferenceCaseIds,
      editingCaseTagId: state.editingCaseTagId,
      editingCaseCaseIdentifierId: state.editingCaseCaseIdentifierId,
      editingCaseCategoryId: state.editingCaseCategoryId,
      pendingCaseIdentifierIds: state.pendingCaseIdentifierIds,
      collapsedCaseIds: state.collapsedCaseIds,
      heldCaseId: state.heldCaseId,
      caseSearchQuery: state.caseSearchQuery,
      caseSearchScope: state.caseSearchScope,
      caseFileTypeFilter: state.caseFileTypeFilter,
      caseFilterTagIds: state.caseFilterTagIds,
      caseFilterCaseIdentifierIds: state.caseFilterCaseIdentifierIds,
      caseFilterCategoryIds: state.caseFilterCategoryIds,
      caseFilterFolder: state.caseFilterFolder,
      caseFilterStatus: state.caseFilterStatus,
      caseFilterLocked: state.caseFilterLocked,
      caseFilterSent: state.caseFilterSent,
      caseFilterHierarchy: state.caseFilterHierarchy,
      caseFilterReferences: state.caseFilterReferences,
      caseSortBy: state.caseSortBy,
      caseSortOrder: state.caseSortOrder,
      caseViewMode: state.caseViewMode,
      caseShowNestedContent: state.caseShowNestedContent,
      caseFilterPanelDefaultExpanded: state.caseFilterPanelDefaultExpanded,
      didHydrateCaseListViewDefaults: state.didHydrateCaseListViewDefaults,
      confirmation: state.confirmation,
      caseResolverTags,
      caseResolverIdentifiers,
      caseResolverCategories,
      caseResolverTagOptions,
      caseResolverCategoryOptions,
      parentCaseOptions,
      caseReferenceOptions,
      caseIdentifierOptions,
      folderOptions,
      isLoading: settingsStore.isLoading || userPreferencesQuery.isLoading,
      casesLoadState: state.casesLoadState,
      casesLoadMessage: state.casesLoadMessage,
    }),
    [
      caseIdentifierOptions,
      caseReferenceOptions,
      caseResolverCategories,
      caseResolverCategoryOptions,
      caseResolverIdentifiers,
      caseResolverTags,
      caseResolverTagOptions,
      folderOptions,
      parentCaseOptions,
      settingsStore.isLoading,
      state,
      userPreferencesQuery.isLoading,
    ]
  );

  const actionsValue = useMemo<AdminCaseResolverCasesActionsValue>(
    () => ({
      setWorkspace: state.setWorkspace,
      setCaseDraft: state.setCaseDraft,
      setIsCreateCaseModalOpen: state.setIsCreateCaseModalOpen,
      setEditingCaseId: state.setEditingCaseId,
      setEditingCaseName: state.setEditingCaseName,
      setEditingCaseParentId: state.setEditingCaseParentId,
      setEditingCaseReferenceCaseIds: state.setEditingCaseReferenceCaseIds,
      setEditingCaseTagId: state.setEditingCaseTagId,
      setEditingCaseCaseIdentifierId: state.setEditingCaseCaseIdentifierId,
      setEditingCaseCategoryId: state.setEditingCaseCategoryId,
      setPendingCaseIdentifierIds: state.setPendingCaseIdentifierIds,
      setCollapsedCaseIds: state.setCollapsedCaseIds,
      setHeldCaseId: state.setHeldCaseId,
      setCaseSearchQuery: state.setCaseSearchQuery,
      setCaseSearchScope: state.setCaseSearchScope,
      setCaseFileTypeFilter: state.setCaseFileTypeFilter,
      setCaseFilterTagIds: state.setCaseFilterTagIds,
      setCaseFilterCaseIdentifierIds: state.setCaseFilterCaseIdentifierIds,
      setCaseFilterCategoryIds: state.setCaseFilterCategoryIds,
      setCaseFilterFolder: state.setCaseFilterFolder,
      setCaseFilterStatus: state.setCaseFilterStatus,
      setCaseFilterLocked: state.setCaseFilterLocked,
      setCaseFilterSent: state.setCaseFilterSent,
      setCaseFilterHierarchy: state.setCaseFilterHierarchy,
      setCaseFilterReferences: state.setCaseFilterReferences,
      setCaseSortBy: state.setCaseSortBy,
      setCaseSortOrder: state.setCaseSortOrder,
      setCaseViewMode: state.setCaseViewMode,
      setCaseShowNestedContent: state.setCaseShowNestedContent,
      setCaseFilterPanelDefaultExpanded: state.setCaseFilterPanelDefaultExpanded,
      setConfirmation: state.setConfirmation,
      handleCreateCase: liftedActions.handleCreateCase,
      handleUpdateCase: liftedActions.handleUpdateCase,
      handleDeleteCase: liftedActions.handleDeleteCase,
      handleToggleCaseCollapse,
      handleToggleHeldCase,
      handleClearHeldCase,
      handleMoveCase: liftedActions.handleMoveCase,
      handleReorderCase: liftedActions.handleReorderCase,
      handleRenameCase: liftedActions.handleRenameCase,
      handleToggleCaseStatus: liftedActions.handleToggleCaseStatus,
      handleSaveCaseDraft: liftedActions.handleSaveCaseDraft,
      handleRefreshWorkspace,
      handleSaveListViewDefaults,
    }),
    [
      handleClearHeldCase,
      handleRefreshWorkspace,
      handleSaveListViewDefaults,
      handleToggleCaseCollapse,
      handleToggleHeldCase,
      liftedActions,
      state,
    ]
  );

  return {
    stateValue,
    actionsValue,
  };
}
