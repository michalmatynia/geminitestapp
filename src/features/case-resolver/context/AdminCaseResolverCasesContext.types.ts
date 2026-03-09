import type { AdminCaseResolverCasesContextValue } from './admin-cases/types';

export type {
  AdminCaseResolverCasesContextValue,
  CaseFileTypeFilter,
  CaseHierarchyFilter,
  CaseLockedFilter,
  CaseReferencesFilter,
  CaseSearchScope,
  CaseSentFilter,
  CaseSortKey,
  CaseSortOrder,
  CaseStatusFilter,
  CaseViewMode,
} from './admin-cases/types';

export const ADMIN_CASE_RESOLVER_CASES_ACTION_KEYS = [
  'setWorkspace',
  'setCaseDraft',
  'setIsCreateCaseModalOpen',
  'setEditingCaseId',
  'setEditingCaseName',
  'setEditingCaseParentId',
  'setEditingCaseReferenceCaseIds',
  'setEditingCaseTagId',
  'setEditingCaseCaseIdentifierId',
  'setEditingCaseCategoryId',
  'setPendingCaseIdentifierIds',
  'setCollapsedCaseIds',
  'setHeldCaseId',
  'setCaseSearchQuery',
  'setCaseSearchScope',
  'setCaseFileTypeFilter',
  'setCaseFilterTagIds',
  'setCaseFilterCaseIdentifierIds',
  'setCaseFilterCategoryIds',
  'setCaseFilterFolder',
  'setCaseFilterStatus',
  'setCaseFilterLocked',
  'setCaseFilterSent',
  'setCaseFilterHierarchy',
  'setCaseFilterReferences',
  'setCaseSortBy',
  'setCaseSortOrder',
  'setCaseViewMode',
  'setCaseShowNestedContent',
  'setCaseFilterPanelDefaultExpanded',
  'setConfirmation',
  'handleCreateCase',
  'handleUpdateCase',
  'handleDeleteCase',
  'handleToggleCaseCollapse',
  'handleToggleHeldCase',
  'handleClearHeldCase',
  'handleMoveCase',
  'handleReorderCase',
  'handleRenameCase',
  'handleToggleCaseStatus',
  'handleSaveCaseDraft',
  'handleRefreshWorkspace',
  'handleSaveListViewDefaults',
] as const;

export type AdminCaseResolverCasesActionKey =
  (typeof ADMIN_CASE_RESOLVER_CASES_ACTION_KEYS)[number];

export type AdminCaseResolverCasesActionsValue = Pick<
  AdminCaseResolverCasesContextValue,
  AdminCaseResolverCasesActionKey
>;

export type AdminCaseResolverCasesStateValue = Omit<
  AdminCaseResolverCasesContextValue,
  AdminCaseResolverCasesActionKey
>;
