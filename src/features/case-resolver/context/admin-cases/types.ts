import type {
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
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
  CaseListViewDefaults,
} from '@/shared/contracts/case-resolver';

export type {
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
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
  CaseListViewDefaults,
};

export type CaseResolverCaseListConfirmationState = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  isDangerous?: boolean;
} | null;

export type CaseResolverCasesLoadState =
  | 'loading'
  | 'ready'
  | 'no_record'
  | 'unavailable';

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
  heldCaseId: string | null;
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
  caseShowNestedContent: boolean;
  caseFilterPanelDefaultExpanded: boolean;
  didHydrateCaseListViewDefaults: boolean;
  confirmation: CaseResolverCaseListConfirmationState;

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
  setHeldCaseId: React.Dispatch<React.SetStateAction<string | null>>;
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
  setCaseShowNestedContent: (showNested: boolean) => void;
  setCaseFilterPanelDefaultExpanded: (expanded: boolean) => void;
  setConfirmation: React.Dispatch<React.SetStateAction<CaseResolverCaseListConfirmationState>>;

  // High-level Actions
  handleCreateCase: () => Promise<void>;
  handleUpdateCase: () => Promise<void>;
  handleDeleteCase: (caseId: string) => void;
  handleToggleCaseCollapse: (caseId: string) => void;
  handleToggleHeldCase: (caseId: string) => void;
  handleClearHeldCase: () => void;
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
  casesLoadState: CaseResolverCasesLoadState;
  casesLoadMessage: string | null;
};
