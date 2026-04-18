import type {
  PlaywrightAction,
  PlaywrightActionBlock,
  PlaywrightActionBlockConfig,
  PlaywrightActionExecutionSettings,
  PlaywrightFlow,
  PlaywrightStep,
  PlaywrightStepSet,
  PlaywrightStepType,
  PlaywrightWebsite,
} from '@/shared/contracts/playwright-steps';

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

export type PlaywrightStepSortField = 'name' | 'type' | 'createdAt';
export type PlaywrightStepSetSortField = 'name' | 'stepCount' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface PlaywrightStepSequencerFilters {
  searchQuery: string;
  filterWebsiteId: string | null;
  filterFlowId: string | null;
  filterType: PlaywrightStepType | null;
  filterTag: string | null;
  filterSharedOnly: boolean;
  /** 'steps' | 'step_sets' — which list is active in the bottom panel */
  activeTab: 'steps' | 'step_sets';
  sortField: PlaywrightStepSortField | PlaywrightStepSetSortField;
  sortDirection: SortDirection;
}

// ---------------------------------------------------------------------------
// Modal / edit state
// ---------------------------------------------------------------------------

export interface PlaywrightStepSequencerModals {
  isCreateStepOpen: boolean;
  editingStep: PlaywrightStep | null;
  isCreateSetOpen: boolean;
  editingSet: PlaywrightStepSet | null;
  isSaveActionOpen: boolean;
}

// ---------------------------------------------------------------------------
// Action constructor state
// ---------------------------------------------------------------------------

export interface PlaywrightStepSequencerActionState {
  /** Ordered blocks queued in the current action being constructed. */
  actionBlocks: PlaywrightActionBlock[];
  /** Persona to use when running the action. */
  actionPersonaId: string | null;
  /** Action-owned Playwright execution settings. */
  actionExecutionSettings: PlaywrightActionExecutionSettings;
  /** Draft name for saving the action. */
  actionDraftName: string;
  /** Draft description for saving the action. */
  actionDraftDescription: string | null;
  /**
   * When non-null, the constructor is editing this saved action (loaded via
   * handleLoadActionIntoConstructor). "Update Action" overwrites it in place.
   */
  editingActionId: string | null;
  /** Runtime key for the action being edited, when applicable. */
  editingActionRuntimeKey: string | null;
  /** Validation errors that currently block updating a runtime action. */
  actionValidationErrors: string[];
  /** Action block ID highlighted from a deep-linked step ref, when available. */
  highlightedActionBlockId: string | null;
}

export interface PlaywrightResolvedActionBlock {
  block: PlaywrightActionBlock;
  runtimeStepId: string | null;
  runtimeStepLabel: string | null;
  step: PlaywrightStep | null;
  stepSet: PlaywrightStepSet | null;
}

export interface PlaywrightStepSequencerDraftStepSetState {
  draftStepSetName: string;
  draftStepSetSteps: PlaywrightStep[];
}

// ---------------------------------------------------------------------------
// Full context type
// ---------------------------------------------------------------------------

export interface PlaywrightStepSequencerContextType
  extends PlaywrightStepSequencerFilters,
    PlaywrightStepSequencerModals,
    PlaywrightStepSequencerActionState,
    PlaywrightStepSequencerDraftStepSetState {
  // --- Data ---
  steps: PlaywrightStep[];
  stepSets: PlaywrightStepSet[];
  actions: PlaywrightAction[];
  websites: PlaywrightWebsite[];
  flows: PlaywrightFlow[];
  isLoading: boolean;
  isSaving: boolean;

  // --- Derived ---
  filteredSteps: PlaywrightStep[];
  filteredStepSets: PlaywrightStepSet[];
  allTags: string[];

  /** Action blocks resolved against the current step and step-set catalogues. */
  resolvedActionBlocks: PlaywrightResolvedActionBlock[];

  /** How many saved actions reference each step set ID. */
  stepSetUsageCounts: Record<string, number>;
  /** Step IDs that are referenced by step sets but no longer exist. */
  orphanedStepIds: Set<string>;
  /** Step IDs that are referenced directly by actions but no longer exist. */
  orphanedActionStepIds: Set<string>;
  /** Step Set IDs that are referenced by actions but no longer exist. */
  orphanedStepSetIds: Set<string>;
  /** Runtime-action load errors keyed by saved action id. */
  runtimeActionLoadErrorsById: Record<string, string>;

  // --- Filter actions ---
  setSearchQuery: (q: string) => void;
  setFilterWebsiteId: (id: string | null) => void;
  setFilterFlowId: (id: string | null) => void;
  setFilterType: (t: PlaywrightStepType | null) => void;
  setFilterTag: (tag: string | null) => void;
  setFilterSharedOnly: (v: boolean) => void;
  setActiveTab: (tab: 'steps' | 'step_sets') => void;
  setSortField: (field: PlaywrightStepSortField | PlaywrightStepSetSortField) => void;
  setSortDirection: (dir: SortDirection) => void;

  // --- Website CRUD ---
  handleCreateWebsite: (draft: Omit<PlaywrightWebsite, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  handleUpdateWebsite: (id: string, updates: Partial<Pick<PlaywrightWebsite, 'name' | 'baseUrl'>>) => Promise<void>;
  handleDeleteWebsite: (id: string) => Promise<void>;

  // --- Flow CRUD ---
  handleCreateFlow: (draft: Omit<PlaywrightFlow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  handleUpdateFlow: (id: string, updates: Partial<Pick<PlaywrightFlow, 'name' | 'description'>>) => Promise<void>;
  handleDeleteFlow: (id: string) => Promise<void>;

  // --- Step CRUD ---
  handleCreateStep: (draft: Omit<PlaywrightStep, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  handleUpdateStep: (id: string, updates: Partial<PlaywrightStep>) => Promise<void>;
  handleDeleteStep: (id: string) => Promise<void>;
  handleDuplicateStep: (id: string) => Promise<void>;

  // --- Step Set CRUD ---
  handleCreateStepSet: (draft: Omit<PlaywrightStepSet, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  handleUpdateStepSet: (id: string, updates: Partial<PlaywrightStepSet>) => Promise<void>;
  handleDeleteStepSet: (id: string) => Promise<void>;
  handleDuplicateStepSet: (id: string) => Promise<void>;

  // --- Action management ---
  handleDeleteAction: (id: string) => Promise<void>;
  handleDuplicateAction: (id: string) => Promise<void>;
  handleLoadActionIntoConstructor: (id: string) => void;
  handleResetRuntimeActionToSeed: (id: string) => Promise<void>;
  handleCloneRuntimeActionAsDraft: (id: string) => Promise<void>;
  handleResetAllRuntimeActionsToSeed: (runtimeKeys?: string[]) => Promise<void>;
  handleCloneAllRuntimeActionsAsDrafts: (runtimeKeys?: string[]) => Promise<void>;

  // --- Cleanup ---
  handleCleanOrphanedSteps: () => Promise<void>;
  handleCleanOrphanedStepSets: () => Promise<void>;

  // --- Bulk import (preserves original IDs) ---
  handleBatchImport: (payload: {
    steps: PlaywrightStep[];
    stepSets: PlaywrightStepSet[];
    actions: PlaywrightAction[];
    websites: PlaywrightWebsite[];
    flows: PlaywrightFlow[];
  }) => Promise<{ imported: number }>;

  // --- Action constructor ---
  handleAddStepToAction: (stepId: string) => void;
  handleAddRuntimeStepToAction: (stepId: string) => void;
  handleAddStepSetToAction: (stepSetId: string) => void;
  handleRemoveFromAction: (index: number) => void;
  handleMoveActionItem: (from: number, to: number) => void;
  handleToggleActionBlockEnabled: (index: number) => void;
  handleUpdateActionBlockConfig: (
    index: number,
    updates: Partial<PlaywrightActionBlockConfig>
  ) => void;
  handleClearAction: () => void;
  setActionPersonaId: (id: string | null) => void;
  setActionExecutionSettings: (settings: PlaywrightActionExecutionSettings) => void;
  setActionDraftName: (name: string) => void;
  setActionDraftDescription: (description: string | null) => void;
  handleSaveAction: () => Promise<void>;
  /** Overwrite the currently-loaded action in place (requires editingActionId). */
  handleUpdateAction: () => Promise<void>;

  // --- Live-scripter draft step set ---
  setDraftStepSetName: (name: string) => void;
  appendDraftStep: (draft: Omit<PlaywrightStep, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeDraftStep: (index: number) => void;
  moveDraftStep: (from: number, to: number) => void;
  clearDraftStepSet: () => void;
  commitDraftStepSet: () => Promise<void>;

  // --- Modal toggles ---
  setIsCreateStepOpen: (v: boolean) => void;
  setEditingStep: (step: PlaywrightStep | null) => void;
  setIsCreateSetOpen: (v: boolean) => void;
  setEditingSet: (set: PlaywrightStepSet | null) => void;
  setIsSaveActionOpen: (v: boolean) => void;
}
