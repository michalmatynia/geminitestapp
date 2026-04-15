'use client';

import { useCallback, useMemo, useState } from 'react';

import type {
  PlaywrightAction,
  PlaywrightStep,
  PlaywrightStepSet,
  PlaywrightStepType,
} from '@/shared/contracts/playwright-steps';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { PlaywrightStepSequencerContextType } from '../context/PlaywrightStepSequencerContext.types';

function createId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function usePlaywrightStepSequencerState(): PlaywrightStepSequencerContextType {
  const { toast } = useToast();

  // --- Data (in-memory; replace with API calls when backend is ready) ---
  const [steps, setSteps] = useState<PlaywrightStep[]>([]);
  const [stepSets, setStepSets] = useState<PlaywrightStepSet[]>([]);
  const [actions, setActions] = useState<PlaywrightAction[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWebsiteId, setFilterWebsiteId] = useState<string | null>(null);
  const [filterFlowId, setFilterFlowId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<PlaywrightStepType | null>(null);
  const [filterSharedOnly, setFilterSharedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'steps' | 'step_sets'>('steps');

  // --- Modals ---
  const [isCreateStepOpen, setIsCreateStepOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<PlaywrightStep | null>(null);
  const [isCreateSetOpen, setIsCreateSetOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<PlaywrightStepSet | null>(null);
  const [isSaveActionOpen, setIsSaveActionOpen] = useState(false);

  // --- Action constructor ---
  const [actionStepSetIds, setActionStepSetIds] = useState<string[]>([]);
  const [actionPersonaId, setActionPersonaId] = useState<string | null>(null);
  const [actionDraftName, setActionDraftName] = useState('');

  // ---------------------------------------------------------------------------
  // Derived / filtered data
  // ---------------------------------------------------------------------------

  const filteredSteps = useMemo(() => {
    let result = steps;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterWebsiteId !== null) {
      result = result.filter((s) => s.websiteId === filterWebsiteId);
    }
    if (filterFlowId !== null) {
      result = result.filter((s) => s.flowId === filterFlowId);
    }
    if (filterType !== null) {
      result = result.filter((s) => s.type === filterType);
    }
    if (filterSharedOnly) {
      result = result.filter((s) => s.websiteId === null);
    }
    return result;
  }, [steps, searchQuery, filterWebsiteId, filterFlowId, filterType, filterSharedOnly]);

  const filteredStepSets = useMemo(() => {
    let result = stepSets;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterWebsiteId !== null) {
      result = result.filter((s) => s.websiteId === filterWebsiteId);
    }
    if (filterFlowId !== null) {
      result = result.filter((s) => s.flowId === filterFlowId);
    }
    if (filterSharedOnly) {
      result = result.filter((s) => s.shared || s.websiteId === null);
    }
    return result;
  }, [stepSets, searchQuery, filterWebsiteId, filterFlowId, filterSharedOnly]);

  const actionStepSets = useMemo(
    () =>
      actionStepSetIds
        .map((id) => stepSets.find((s) => s.id === id))
        .filter((s): s is PlaywrightStepSet => s !== undefined),
    [actionStepSetIds, stepSets]
  );

  // ---------------------------------------------------------------------------
  // Step CRUD
  // ---------------------------------------------------------------------------

  const handleCreateStep = useCallback(
    async (draft: Omit<PlaywrightStep, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
      setIsSaving(true);
      try {
        const ts = now();
        const next: PlaywrightStep = { ...draft, id: createId(), createdAt: ts, updatedAt: ts };
        setSteps((prev) => [...prev, next]);
        setIsCreateStepOpen(false);
        toast('Step created.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'createStep' });
        toast('Failed to create step.', { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [toast]
  );

  const handleUpdateStep = useCallback(
    async (id: string, updates: Partial<PlaywrightStep>): Promise<void> => {
      setIsSaving(true);
      try {
        setSteps((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: now() } : s))
        );
        setEditingStep(null);
        toast('Step updated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'updateStep' });
        toast('Failed to update step.', { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [toast]
  );

  const handleDeleteStep = useCallback(
    async (id: string): Promise<void> => {
      setIsSaving(true);
      try {
        setSteps((prev) => prev.filter((s) => s.id !== id));
        toast('Step deleted.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'deleteStep' });
        toast('Failed to delete step.', { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [toast]
  );

  // ---------------------------------------------------------------------------
  // Step Set CRUD
  // ---------------------------------------------------------------------------

  const handleCreateStepSet = useCallback(
    async (draft: Omit<PlaywrightStepSet, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
      setIsSaving(true);
      try {
        const ts = now();
        const next: PlaywrightStepSet = { ...draft, id: createId(), createdAt: ts, updatedAt: ts };
        setStepSets((prev) => [...prev, next]);
        setIsCreateSetOpen(false);
        toast('Step set created.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'createStepSet' });
        toast('Failed to create step set.', { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [toast]
  );

  const handleUpdateStepSet = useCallback(
    async (id: string, updates: Partial<PlaywrightStepSet>): Promise<void> => {
      setIsSaving(true);
      try {
        setStepSets((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: now() } : s))
        );
        setEditingSet(null);
        toast('Step set updated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'updateStepSet' });
        toast('Failed to update step set.', { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [toast]
  );

  const handleDeleteStepSet = useCallback(
    async (id: string): Promise<void> => {
      setIsSaving(true);
      try {
        setStepSets((prev) => prev.filter((s) => s.id !== id));
        // Remove from any active action too
        setActionStepSetIds((prev) => prev.filter((sid) => sid !== id));
        toast('Step set deleted.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'deleteStepSet' });
        toast('Failed to delete step set.', { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [toast]
  );

  // ---------------------------------------------------------------------------
  // Action constructor
  // ---------------------------------------------------------------------------

  const handleAddStepSetToAction = useCallback((stepSetId: string): void => {
    setActionStepSetIds((prev) => [...prev, stepSetId]);
  }, []);

  const handleRemoveFromAction = useCallback((index: number): void => {
    setActionStepSetIds((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMoveActionItem = useCallback((from: number, to: number): void => {
    setActionStepSetIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved !== undefined) next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleClearAction = useCallback((): void => {
    setActionStepSetIds([]);
    setActionDraftName('');
    setActionPersonaId(null);
  }, []);

  const handleSaveAction = useCallback(async (): Promise<void> => {
    const name = actionDraftName.trim();
    if (!name) {
      toast('Action name is required.', { variant: 'error' });
      return;
    }
    if (actionStepSetIds.length === 0) {
      toast('Add at least one step set before saving.', { variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const ts = now();
      const next: PlaywrightAction = {
        id: createId(),
        name,
        description: null,
        stepSetIds: [...actionStepSetIds],
        personaId: actionPersonaId,
        createdAt: ts,
        updatedAt: ts,
      };
      setActions((prev) => [...prev, next]);
      setIsSaveActionOpen(false);
      handleClearAction();
      toast('Action saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'saveAction' });
      toast('Failed to save action.', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [actionDraftName, actionStepSetIds, actionPersonaId, handleClearAction, toast]);

  // ---------------------------------------------------------------------------
  // Assemble context value
  // ---------------------------------------------------------------------------

  return {
    // Data
    steps,
    stepSets,
    actions,
    isLoading: false,
    isSaving,

    // Derived
    filteredSteps,
    filteredStepSets,
    actionStepSets,

    // Filters
    searchQuery,
    filterWebsiteId,
    filterFlowId,
    filterType,
    filterSharedOnly,
    activeTab,
    setSearchQuery,
    setFilterWebsiteId,
    setFilterFlowId,
    setFilterType,
    setFilterSharedOnly,
    setActiveTab,

    // Modals
    isCreateStepOpen,
    editingStep,
    isCreateSetOpen,
    editingSet,
    isSaveActionOpen,
    setIsCreateStepOpen,
    setEditingStep,
    setIsCreateSetOpen,
    setEditingSet,
    setIsSaveActionOpen,

    // Action constructor
    actionStepSetIds,
    actionPersonaId,
    actionDraftName,
    handleAddStepSetToAction,
    handleRemoveFromAction,
    handleMoveActionItem,
    handleClearAction,
    setActionPersonaId,
    setActionDraftName,
    handleSaveAction,

    // Step CRUD
    handleCreateStep,
    handleUpdateStep,
    handleDeleteStep,

    // Step Set CRUD
    handleCreateStepSet,
    handleUpdateStepSet,
    handleDeleteStepSet,
  };
}
