/* eslint-disable */
// @ts-nocheck
'use client';

import { useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  type CaseResolverWorkspace, 
  type CaseResolverFile, 
  type CaseSearchScope,
  type CaseFileTypeFilter,
  type CaseStatusFilter,
  type CaseLockedFilter,
  type CaseSentFilter,
  type CaseHierarchyFilter,
  type CaseReferencesFilter,
  type CaseViewMode,
  type CaseSortKey,
  type CaseSortOrder
} from './types';
import { 
  DEFAULT_CASE_LIST_VIEW_DEFAULTS, 
  getCaseResolverWorkspaceRevision 
} from './utils';

export function useAdminCaseResolverCasesState(parsedWorkspace: CaseResolverWorkspace) {
  const searchParams = useSearchParams();
  
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
  const [heldCaseId, setHeldCaseId] = useState<string | null>(null);
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
  const [confirmation, setConfirmation] = useState<any>(null);

  const requestedCaseIdentifierFilterFromQuery = useMemo((): string | null => {
    const rawCaseIdentifierId = searchParams.get('caseIdentifierId');
    if (!rawCaseIdentifierId) return null;
    const normalized = rawCaseIdentifierId.trim();
    return normalized.length > 0 ? normalized : null;
  }, [searchParams]);
  const appliedCaseIdentifierFilterFromQueryRef = useRef<string | null>(null);

  return {
    workspace, setWorkspace,
    lastPersistedWorkspaceValueRef,
    lastPersistedWorkspaceRevisionRef,
    isCreatingCase, setIsCreatingCase,
    createCaseMutationIdRef,
    caseDraft, setCaseDraft,
    isCreateCaseModalOpen, setIsCreateCaseModalOpen,
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
    caseFilterPanelDefaultExpanded, setCaseFilterPanelDefaultExpanded,
    didHydrateCaseListViewDefaults, setDidHydrateCaseListViewDefaults,
    confirmation, setConfirmation,
    requestedCaseIdentifierFilterFromQuery,
    appliedCaseIdentifierFilterFromQueryRef,
  };
}
