'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUserPreferences } from '@/features/auth/hooks/useUserPreferences';
import type {
  CaseResolverCategory,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
  CaseResolverWorkspaceRecordFetchResult,
} from '@/shared/contracts/case-resolver';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { internalError } from '@/shared/errors/app-error';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  getCaseResolverWorkspaceLegacySanitizationDiagnostics,
  getCaseResolverWorkspaceSafeParseDiagnostics,
  getCaseResolverWorkspaceSafeParseStatus,
  hasCaseResolverWorkspaceFilesArray,
  parseCaseResolverCategories,
  parseCaseResolverIdentifiers,
  parseCaseResolverTags,
  safeParseCaseResolverWorkspace,
} from '../settings';
import {
  fetchCaseResolverWorkspaceIfStale,
  fetchCaseResolverWorkspaceMetadata,
  fetchCaseResolverWorkspaceRecordDetailed,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
  primeCaseResolverNavigationWorkspace,
  readCaseResolverNavigationWorkspace,
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
  type CaseResolverCasesLoadState,
  type AdminCaseResolverCasesContextValue,
} from './admin-cases/types';

import {
  normalizeCaseListViewDefaults,
  shouldBootstrapCaseResolverCasesFromRecord,
  shouldAdoptIncomingCaseResolverCasesWorkspace,
} from './admin-cases/utils';
import { useAdminCaseResolverCasesState } from './admin-cases/useAdminCaseResolverCasesState';
import {
  useAdminCaseResolverCasesActions,
  type ToastFn,
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
  const pathname = usePathname();
  const isCasesRoute =
    pathname === '/admin/case-resolver/cases' || pathname.startsWith('/admin/case-resolver/cases/');
  const preferencesQuery = useUserPreferences();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSettingsBulk();
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
    (): CaseResolverWorkspace => safeParseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const workspaceSafeParseDiagnostics = useMemo(
    () => getCaseResolverWorkspaceSafeParseDiagnostics(parsedWorkspace),
    [parsedWorkspace]
  );
  const workspaceSafeParseStatus = useMemo(
    () => getCaseResolverWorkspaceSafeParseStatus(parsedWorkspace),
    [parsedWorkspace]
  );
  const workspaceLegacySanitizationDiagnostics = useMemo(
    () => getCaseResolverWorkspaceLegacySanitizationDiagnostics(parsedWorkspace),
    [parsedWorkspace]
  );
  const canHydrateWorkspaceFromStore = useMemo(
    (): boolean => hasCaseResolverWorkspaceFilesArray(rawWorkspace),
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

  const settingsStoreRefetchRef = useRef(settingsStore.refetch);
  settingsStoreRefetchRef.current = settingsStore.refetch;
  const lastWorkspaceParseFallbackSignatureRef = useRef<string>('');
  const lastWorkspaceRecoveryPersistSignatureRef = useRef<string>('');
  const [isRouteWorkspaceSyncing, setIsRouteWorkspaceSyncing] = React.useState(false);
  const [casesLoadState, setCasesLoadState] = React.useState<CaseResolverCasesLoadState>(
    isCasesRoute ? 'loading' : 'ready'
  );
  const [casesLoadMessage, setCasesLoadMessage] = React.useState<string | null>(null);

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
    casesLoadState: stateCasesLoadState,
    setCasesLoadState: stateSetCasesLoadState,
    casesLoadMessage: stateCasesLoadMessage,
    setCasesLoadMessage: stateSetCasesLoadMessage,
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
    toast: toast as unknown as ToastFn,
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

  const handleToggleCaseCollapse = useCallback(
    (caseId: string): void => {
      setCollapsedCaseIds((prev) => {
        const next = new Set(prev);
        if (next.has(caseId)) next.delete(caseId);
        else next.add(caseId);
        return next;
      });
    },
    [setCollapsedCaseIds]
  );

  const handleToggleHeldCase = useCallback(
    (caseId: string): void => {
      const normalizedCaseId = caseId.trim();
      if (!normalizedCaseId) return;
      setHeldCaseId((current: string | null): string | null =>
        current === normalizedCaseId ? null : normalizedCaseId
      );
    },
    [setHeldCaseId]
  );

  const handleClearHeldCase = useCallback((): void => {
    setHeldCaseId(null);
  }, [setHeldCaseId]);

  const adoptWorkspaceSnapshot = useCallback(
    (incoming: CaseResolverWorkspace, sourceAction: string): boolean => {
      let adopted = false;
      const nextRevision = getCaseResolverWorkspaceRevision(incoming);
      setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
        if (
          !shouldAdoptIncomingCaseResolverCasesWorkspace({
            current,
            incoming,
          })
        ) {
          return current;
        }
        adopted = true;
        lastPersistedWorkspaceValueRef.current = JSON.stringify(incoming);
        lastPersistedWorkspaceRevisionRef.current = nextRevision;
        logCaseResolverWorkspaceEvent({
          source: 'cases_page',
          action: sourceAction,
          workspaceRevision: nextRevision,
        });
        return incoming;
      });
      if (adopted) {
        primeCaseResolverNavigationWorkspace(incoming);
      }
      return adopted;
    },
    [setWorkspace, lastPersistedWorkspaceValueRef, lastPersistedWorkspaceRevisionRef]
  );

  const applyWorkspaceRecordResult = useCallback(
    (
      result: CaseResolverWorkspaceRecordFetchResult,
      sourceAction: string
    ): { adopted: boolean; state: CaseResolverCasesLoadState } => {
      if (result.status === 'resolved') {
        const adopted = adoptWorkspaceSnapshot(result.workspace, sourceAction);
        const nextState =
          result.source === 'resolved_legacy_migrated' ? 'recovered_from_legacy' : 'ready';
        setCasesLoadState(nextState);
        setCasesLoadMessage(
          result.source === 'resolved_legacy_migrated'
            ? 'Recovered from legacy workspace key and migrated to v2.'
            : null
        );
        return { adopted, state: nextState };
      }
      if (result.status === 'missing_required_file') {
        setCasesLoadState('ready');
        setCasesLoadMessage(null);
        return { adopted: false, state: 'ready' };
      }
      if (result.status === 'no_record') {
        setCasesLoadState('no_record');
        setCasesLoadMessage(result.message);
        return { adopted: false, state: 'no_record' };
      }
      setCasesLoadState('unavailable');
      setCasesLoadMessage(result.message);
      return { adopted: false, state: 'unavailable' };
    },
    [adoptWorkspaceSnapshot]
  );

  const handleRefreshWorkspace = useCallback(async (): Promise<void> => {
    setCasesLoadState('loading');
    setCasesLoadMessage(null);
    const currentRevision = getCaseResolverWorkspaceRevision(workspace);
    const shouldForceRecordFetch = shouldBootstrapCaseResolverCasesFromRecord(workspace);
    const metadata = shouldForceRecordFetch
      ? null
      : await fetchCaseResolverWorkspaceMetadata('cases_page_manual_refresh');
    const shouldFetchWorkspace =
      shouldForceRecordFetch ||
      metadata === null ||
      metadata.exists === false ||
      metadata.revision >= currentRevision;
    if (!shouldFetchWorkspace) {
      setCasesLoadState('ready');
      setCasesLoadMessage(null);
      toast('Workspace already up to date.', { variant: 'success' });
      return;
    }
    const snapshot = await fetchCaseResolverWorkspaceRecordDetailed('cases_page_manual_refresh', {
      attemptProfile: shouldForceRecordFetch ? 'context_fast' : 'default',
      maxTotalMs: shouldForceRecordFetch ? 6_500 : undefined,
      attemptTimeoutMs: shouldForceRecordFetch ? 2_200 : undefined,
    });
    const applied = applyWorkspaceRecordResult(snapshot, 'manual_refresh_workspace');
    if (applied.state === 'ready' || applied.state === 'recovered_from_legacy') {
      toast('Workspace refreshed.', { variant: 'success' });
      return;
    }
    if (applied.state === 'no_record') {
      toast('No Case Resolver workspace data found.', { variant: 'warning' });
      return;
    }
    toast('Failed to refresh workspace.', { variant: 'error' });
  }, [applyWorkspaceRecordResult, toast, workspace]);

  useEffect(() => {
    const fallbackApplied = workspaceSafeParseDiagnostics.parseFallbackApplied;
    const strippedCount = workspaceLegacySanitizationDiagnostics.inlineNodeFileSnapshotStrippedCount;
    const convertedCount = workspaceLegacySanitizationDiagnostics.legacyEdgeConvertedCount;
    const droppedCount = workspaceLegacySanitizationDiagnostics.legacyEdgeDroppedCount;
    const droppedInvalidFilesCount = workspaceLegacySanitizationDiagnostics.fileGraphFallbackDropCount;
    const orphanParentLinksClearedCount =
      workspaceLegacySanitizationDiagnostics.orphanParentLinksClearedCount;
    if (
      !fallbackApplied &&
      strippedCount === 0 &&
      convertedCount === 0 &&
      droppedCount === 0 &&
      droppedInvalidFilesCount === 0 &&
      orphanParentLinksClearedCount === 0
    ) {
      return;
    }
    const signature = [
      rawWorkspace ?? '<null>',
      fallbackApplied ? 'fallback:1' : 'fallback:0',
      `fallback_class:${workspaceSafeParseStatus}`,
      strippedCount,
      convertedCount,
      droppedCount,
      droppedInvalidFilesCount,
      orphanParentLinksClearedCount,
    ].join('|');
    if (lastWorkspaceParseFallbackSignatureRef.current === signature) return;
    lastWorkspaceParseFallbackSignatureRef.current = signature;
    logCaseResolverWorkspaceEvent({
      source: 'cases_page',
      action: 'workspace_parse_fallback_applied',
      workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspace),
      message: [
        `fallback=${fallbackApplied ? 'true' : 'false'}`,
        `legacy_edges_converted=${convertedCount}`,
        `legacy_edges_dropped=${droppedCount}`,
        `inline_node_snapshots_stripped=${strippedCount}`,
        `fallback_class=${workspaceSafeParseStatus}`,
        `reason=${workspaceSafeParseDiagnostics.parseFallbackReason ?? 'none'}`,
      ].join(' '),
    });
    if (droppedInvalidFilesCount > 0) {
      logCaseResolverWorkspaceEvent({
        source: 'cases_page',
        action: 'cases_workspace_file_or_case_dropped_invalid_fragment',
        workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspace),
        message: `count=${droppedInvalidFilesCount}`,
      });
    }
    if (orphanParentLinksClearedCount > 0) {
      logCaseResolverWorkspaceEvent({
        source: 'cases_page',
        action: 'cases_workspace_orphan_parent_links_cleared',
        workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspace),
        message: `count=${orphanParentLinksClearedCount}`,
      });
    }
  }, [
    parsedWorkspace,
    rawWorkspace,
    workspaceLegacySanitizationDiagnostics.fileGraphFallbackDropCount,
    workspaceLegacySanitizationDiagnostics.inlineNodeFileSnapshotStrippedCount,
    workspaceLegacySanitizationDiagnostics.legacyEdgeConvertedCount,
    workspaceLegacySanitizationDiagnostics.legacyEdgeDroppedCount,
    workspaceLegacySanitizationDiagnostics.orphanParentLinksClearedCount,
    workspaceSafeParseDiagnostics.parseFallbackApplied,
    workspaceSafeParseDiagnostics.parseFallbackReason,
    workspaceSafeParseStatus,
  ]);

  useEffect(() => {
    const strippedCount = workspaceLegacySanitizationDiagnostics.inlineNodeFileSnapshotStrippedCount;
    const convertedCount = workspaceLegacySanitizationDiagnostics.legacyEdgeConvertedCount;
    const droppedCount = workspaceLegacySanitizationDiagnostics.legacyEdgeDroppedCount;
    const fallbackDroppedGraph = workspaceLegacySanitizationDiagnostics.relationGraphFallbackDropped;
    const fileGraphFallbackCount = workspaceLegacySanitizationDiagnostics.fileGraphFallbackDropCount;
    const shouldPersistRecovery =
      strippedCount > 0 ||
      convertedCount > 0 ||
      droppedCount > 0 ||
      fallbackDroppedGraph ||
      fileGraphFallbackCount > 0;
    if (!shouldPersistRecovery) return;
    const signature = [
      getCaseResolverWorkspaceRevision(parsedWorkspace),
      strippedCount,
      convertedCount,
      droppedCount,
      fallbackDroppedGraph ? 'relation_fallback:1' : 'relation_fallback:0',
      fileGraphFallbackCount,
    ].join('|');
    if (lastWorkspaceRecoveryPersistSignatureRef.current === signature) return;
    lastWorkspaceRecoveryPersistSignatureRef.current = signature;
    void (async (): Promise<void> => {
      try {
        await updateSetting.mutateAsync([
          {
            key: CASE_RESOLVER_WORKSPACE_KEY,
            value: JSON.stringify(parsedWorkspace),
          },
        ]);
        logCaseResolverWorkspaceEvent({
          source: 'cases_page',
          action: 'workspace_recovery_persist_applied',
          workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspace),
          message: `signature=${signature}`,
        });
      } catch (error: unknown) {
        logCaseResolverWorkspaceEvent({
          source: 'cases_page',
          action: 'workspace_recovery_persist_failed',
          workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspace),
          message: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    })();
  }, [
    parsedWorkspace,
    updateSetting,
    workspaceLegacySanitizationDiagnostics.fileGraphFallbackDropCount,
    workspaceLegacySanitizationDiagnostics.inlineNodeFileSnapshotStrippedCount,
    workspaceLegacySanitizationDiagnostics.legacyEdgeConvertedCount,
    workspaceLegacySanitizationDiagnostics.legacyEdgeDroppedCount,
    workspaceLegacySanitizationDiagnostics.relationGraphFallbackDropped,
  ]);

  useEffect(() => {
    if (!isCasesRoute) return;
    let isCancelled = false;
    setIsRouteWorkspaceSyncing(true);
    setCasesLoadState('loading');
    setCasesLoadMessage(null);
    void (async (): Promise<void> => {
      try {
        const inMemoryRevision = Math.max(
          getCaseResolverWorkspaceRevision(parsedWorkspace),
          lastPersistedWorkspaceRevisionRef.current
        );

        // Fast path: use navigation cache if it was recently primed with a newer revision
        // (e.g. user just came back from editing a case — workspace is known fresh, skip network)
        const cachedWorkspace = readCaseResolverNavigationWorkspace();
        if (cachedWorkspace) {
          const cachedRevision = getCaseResolverWorkspaceRevision(cachedWorkspace);
          if (cachedRevision > inMemoryRevision) {
            if (isCancelled) return;
            adoptWorkspaceSnapshot(cachedWorkspace, 'route_sync_workspace_nav_cache');
            setCasesLoadState('ready');
            setCasesLoadMessage(null);
            return;
          }
        }

        const shouldForceRecordFetch = shouldBootstrapCaseResolverCasesFromRecord(workspace);
        if (!shouldForceRecordFetch) {
          const result = await fetchCaseResolverWorkspaceIfStale('cases_page_route_sync', inMemoryRevision);
          if (isCancelled) return;
          if (result.updated) {
            adoptWorkspaceSnapshot(result.workspace, 'route_sync_workspace');
            setCasesLoadState('ready');
            setCasesLoadMessage(null);
            return;
          }
          if (canHydrateWorkspaceFromStore) {
            setCasesLoadState('ready');
            setCasesLoadMessage(null);
            return;
          }
        }

        const snapshotResult = await fetchCaseResolverWorkspaceRecordDetailed('cases_page_route_sync', {
          attemptProfile: shouldForceRecordFetch ? 'context_fast' : 'default',
          maxTotalMs: shouldForceRecordFetch ? 6_500 : undefined,
          attemptTimeoutMs: shouldForceRecordFetch ? 2_200 : undefined,
        });
        if (isCancelled) return;
        const applied = applyWorkspaceRecordResult(snapshotResult, 'route_sync_workspace');
        if (applied.state === 'no_record' && canHydrateWorkspaceFromStore) {
          setCasesLoadState('ready');
          setCasesLoadMessage(null);
        }
      } finally {
        if (!isCancelled) {
          setIsRouteWorkspaceSyncing(false);
        }
      }
    })();
    return (): void => {
      isCancelled = true;
      setIsRouteWorkspaceSyncing(false);
    };
  }, [
    adoptWorkspaceSnapshot,
    applyWorkspaceRecordResult,
    canHydrateWorkspaceFromStore,
    isCasesRoute,
    lastPersistedWorkspaceRevisionRef,
    parsedWorkspace,
    workspace,
  ]);

  useEffect(() => {
    if (!isCasesRoute) return;
    if (!canHydrateWorkspaceFromStore) return;
    const incomingRevision = getCaseResolverWorkspaceRevision(parsedWorkspace);
    const adopted = adoptWorkspaceSnapshot(parsedWorkspace, 'hydrate_workspace');
    if (adopted) {
      setCasesLoadState('ready');
      setCasesLoadMessage(null);
      return;
    }
    if (incomingRevision > 0 || parsedWorkspace.files.length > 0) {
      setCasesLoadState('ready');
      setCasesLoadMessage(null);
    }
  }, [adoptWorkspaceSnapshot, canHydrateWorkspaceFromStore, isCasesRoute, parsedWorkspace]);

  useEffect(() => {
    if (didHydrateCaseListViewDefaults || !preferencesQuery.isFetched) return;
    setCaseSortBy(caseListViewDefaults.sortBy);
    setCaseSortOrder(caseListViewDefaults.sortOrder);
    setCaseViewMode(caseListViewDefaults.viewMode);
    setCaseShowNestedContent(caseListViewDefaults.showNestedContent);
    setCaseSearchScope(caseListViewDefaults.searchScope);
    setCaseFilterPanelDefaultExpanded(!caseListViewDefaults.filtersCollapsedByDefault);
    setDidHydrateCaseListViewDefaults(true);
  }, [
    caseListViewDefaults,
    didHydrateCaseListViewDefaults,
    preferencesQuery.isFetched,
    setCaseFilterPanelDefaultExpanded,
    setCaseSearchScope,
    setCaseShowNestedContent,
    setCaseSortBy,
    setCaseSortOrder,
    setCaseViewMode,
    setDidHydrateCaseListViewDefaults,
  ]);

  useEffect(() => {
    if (appliedCaseIdentifierFilterFromQueryRef.current === requestedCaseIdentifierFilterFromQuery)
      return;
    appliedCaseIdentifierFilterFromQueryRef.current = requestedCaseIdentifierFilterFromQuery;
    if (!requestedCaseIdentifierFilterFromQuery) return;
    setCaseFilterCaseIdentifierIds([requestedCaseIdentifierFilterFromQuery]);
    setCaseFilterPanelDefaultExpanded(true);
  }, [
    requestedCaseIdentifierFilterFromQuery,
    setCaseFilterCaseIdentifierIds,
    setCaseFilterPanelDefaultExpanded,
  ]);

  const handleSaveListViewDefaults = useCallback(async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync([
        { key: 'caseResolverCaseListViewMode', value: caseViewMode },
        { key: 'caseResolverCaseListSortBy', value: caseSortBy },
        { key: 'caseResolverCaseListSortOrder', value: caseSortOrder },
        { key: 'caseResolverCaseListSearchScope', value: caseSearchScope },
        {
          key: 'caseResolverCaseListFiltersCollapsedByDefault',
          value: (!caseFilterPanelDefaultExpanded).toString(),
        },
        { key: 'caseResolverCaseListShowNestedContent', value: caseShowNestedContent.toString() },
      ]);
      toast('Default view settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminCaseResolverCasesPage', action: 'saveDefaults' },
      });
      toast('Failed to save default settings.', { variant: 'error' });
    }
  }, [
    caseViewMode,
    caseSortBy,
    caseSortOrder,
    caseSearchScope,
    caseFilterPanelDefaultExpanded,
    caseShowNestedContent,
    updateSetting,
    toast,
  ]);

  // Options
  const parentCaseOptions = useMemo(
    () =>
      workspace.files
        .filter((f) => f.fileType === 'case')
        .map((f) => ({ value: f.id, label: f.name })),
    [workspace.files]
  );

  const caseReferenceOptions = useMemo(
    () =>
      workspace.files
        .filter((f) => f.fileType === 'case')
        .map((f) => ({ value: f.id, label: f.name })),
    [workspace.files]
  );

  const caseIdentifierOptions = useMemo(
    () =>
      caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => {
        const identifierRecord = identifier as unknown as Record<string, unknown>;
        const id = typeof identifier.id === 'string' ? identifier.id.trim() : '';
        const name =
          typeof identifierRecord['name'] === 'string' ? identifierRecord['name'].trim() : '';
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

  const isLoading = settingsStore.isLoading || isRouteWorkspaceSyncing;
  const value = useMemo(
    (): AdminCaseResolverCasesContextValue => ({
      workspace,
      casesLoadState: stateCasesLoadState,
      casesLoadMessage: stateCasesLoadMessage,
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
