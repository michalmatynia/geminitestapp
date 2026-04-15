import type {
  PlaywrightAction,
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
  /** Step sets queued in the current action being constructed (in order). */
  actionStepSetIds: string[];
  /** Persona to use when running the action. */
  actionPersonaId: string | null;
  /** Draft name for saving the action. */
  actionDraftName: string;
  /** Draft description for saving the action. */
  actionDraftDescription: string | null;
}

// ---------------------------------------------------------------------------
// Full context type
// ---------------------------------------------------------------------------

export interface PlaywrightStepSequencerContextType
  extends PlaywrightStepSequencerFilters,
    PlaywrightStepSequencerModals,
    PlaywrightStepSequencerActionState {
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

  /** Step sets resolved from actionStepSetIds (in order, with stable identity). */
  actionStepSets: PlaywrightStepSet[];

  /** How many saved actions reference each step set ID. */
  stepSetUsageCounts: Record<string, number>;
  /** Step IDs that are referenced by step sets but no longer exist. */
  orphanedStepIds: Set<string>;
  /** Step Set IDs that are referenced by actions but no longer exist. */
  orphanedStepSetIds: Set<string>;

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
  handleDeleteWebsite: (id: string) => Promise<void>;

  // --- Flow CRUD ---
  handleCreateFlow: (draft: Omit<PlaywrightFlow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
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
  handleLoadActionIntoConstructor: (id: string) => void;

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
  handleAddStepSetToAction: (stepSetId: string) => void;
  handleRemoveFromAction: (index: number) => void;
  handleMoveActionItem: (from: number, to: number) => void;
  handleClearAction: () => void;
  setActionPersonaId: (id: string | null) => void;
  setActionDraftName: (name: string) => void;
  setActionDraftDescription: (description: string | null) => void;
  handleSaveAction: () => Promise<void>;

  // --- Modal toggles ---
  setIsCreateStepOpen: (v: boolean) => void;
  setEditingStep: (step: PlaywrightStep | null) => void;
  setIsCreateSetOpen: (v: boolean) => void;
  setEditingSet: (set: PlaywrightStepSet | null) => void;
  setIsSaveActionOpen: (v: boolean) => void;
}
