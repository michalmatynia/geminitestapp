import type {
  PlaywrightAction,
  PlaywrightStep,
  PlaywrightStepSet,
  PlaywrightStepType,
} from '@/shared/contracts/playwright-steps';

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

export interface PlaywrightStepSequencerFilters {
  searchQuery: string;
  filterWebsiteId: string | null;
  filterFlowId: string | null;
  filterType: PlaywrightStepType | null;
  filterSharedOnly: boolean;
  /** 'steps' | 'step_sets' — which list is active in the bottom panel */
  activeTab: 'steps' | 'step_sets';
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
  isLoading: boolean;
  isSaving: boolean;

  // --- Derived ---
  filteredSteps: PlaywrightStep[];
  filteredStepSets: PlaywrightStepSet[];

  /** Step sets resolved from actionStepSetIds (in order, with stable identity). */
  actionStepSets: PlaywrightStepSet[];

  // --- Filter actions ---
  setSearchQuery: (q: string) => void;
  setFilterWebsiteId: (id: string | null) => void;
  setFilterFlowId: (id: string | null) => void;
  setFilterType: (t: PlaywrightStepType | null) => void;
  setFilterSharedOnly: (v: boolean) => void;
  setActiveTab: (tab: 'steps' | 'step_sets') => void;

  // --- Step CRUD ---
  handleCreateStep: (draft: Omit<PlaywrightStep, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  handleUpdateStep: (id: string, updates: Partial<PlaywrightStep>) => Promise<void>;
  handleDeleteStep: (id: string) => Promise<void>;

  // --- Step Set CRUD ---
  handleCreateStepSet: (draft: Omit<PlaywrightStepSet, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  handleUpdateStepSet: (id: string, updates: Partial<PlaywrightStepSet>) => Promise<void>;
  handleDeleteStepSet: (id: string) => Promise<void>;

  // --- Action constructor ---
  handleAddStepSetToAction: (stepSetId: string) => void;
  handleRemoveFromAction: (index: number) => void;
  handleMoveActionItem: (from: number, to: number) => void;
  handleClearAction: () => void;
  setActionPersonaId: (id: string | null) => void;
  setActionDraftName: (name: string) => void;
  handleSaveAction: () => Promise<void>;

  // --- Modal toggles ---
  setIsCreateStepOpen: (v: boolean) => void;
  setEditingStep: (step: PlaywrightStep | null) => void;
  setIsCreateSetOpen: (v: boolean) => void;
  setEditingSet: (set: PlaywrightStepSet | null) => void;
  setIsSaveActionOpen: (v: boolean) => void;
}
