'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type {
  PlaywrightAction,
  PlaywrightFlow,
  PlaywrightStep,
  PlaywrightStepSet,
  PlaywrightStepType,
  PlaywrightWebsite,
} from '@/shared/contracts/playwright-steps';
import {
  usePlaywrightActions,
  usePlaywrightFlows,
  usePlaywrightStepSets,
  usePlaywrightSteps,
  usePlaywrightWebsites,
  useSavePlaywrightActionsMutation,
  useSavePlaywrightFlowsMutation,
  useSavePlaywrightStepSetsMutation,
  useSavePlaywrightStepsMutation,
  useSavePlaywrightWebsitesMutation,
} from '@/shared/hooks/usePlaywrightStepSequencer';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type {
  PlaywrightStepSequencerContextType,
  PlaywrightStepSetSortField,
  PlaywrightStepSortField,
  SortDirection,
} from '../context/PlaywrightStepSequencerContext.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlaywrightStepSequencerState(): PlaywrightStepSequencerContextType {
  const { toast } = useToast();

  // --- Server data via TanStack Query ---
  const { data: steps = [], isLoading: stepsLoading } = usePlaywrightSteps();
  const { data: stepSets = [], isLoading: setsLoading } = usePlaywrightStepSets();
  const { data: actions = [], isLoading: actionsLoading } = usePlaywrightActions();
  const { data: websites = [], isLoading: websitesLoading } = usePlaywrightWebsites();
  const { data: flows = [], isLoading: flowsLoading } = usePlaywrightFlows();

  const isLoading = stepsLoading || setsLoading || actionsLoading || websitesLoading || flowsLoading;

  // Stable refs so mutation callbacks don't need server data in their deps
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const stepSetsRef = useRef(stepSets);
  stepSetsRef.current = stepSets;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const websitesRef = useRef(websites);
  websitesRef.current = websites;
  const flowsRef = useRef(flows);
  flowsRef.current = flows;

  // --- Mutations ---
  const { mutateAsync: saveSteps, isPending: savingSteps } = useSavePlaywrightStepsMutation();
  const { mutateAsync: saveStepSets, isPending: savingSets } = useSavePlaywrightStepSetsMutation();
  const { mutateAsync: saveActions, isPending: savingActions } = useSavePlaywrightActionsMutation();
  const { mutateAsync: saveWebsites, isPending: savingWebsites } = useSavePlaywrightWebsitesMutation();
  const { mutateAsync: saveFlows, isPending: savingFlows } = useSavePlaywrightFlowsMutation();
  const isSaving = savingSteps || savingSets || savingActions || savingWebsites || savingFlows;

  // --- UI filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWebsiteId, setFilterWebsiteId] = useState<string | null>(null);
  const [filterFlowId, setFilterFlowId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<PlaywrightStepType | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterSharedOnly, setFilterSharedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'steps' | 'step_sets'>('steps');
  const [sortField, setSortField] = useState<PlaywrightStepSortField | PlaywrightStepSetSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // --- Modal state ---
  const [isCreateStepOpen, setIsCreateStepOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<PlaywrightStep | null>(null);
  const [isCreateSetOpen, setIsCreateSetOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<PlaywrightStepSet | null>(null);
  const [isSaveActionOpen, setIsSaveActionOpen] = useState(false);

  // --- Action constructor state ---
  const [actionStepSetIds, setActionStepSetIds] = useState<string[]>([]);
  const [actionPersonaId, setActionPersonaId] = useState<string | null>(null);
  const [actionDraftName, setActionDraftName] = useState('');
  const [actionDraftDescription, setActionDraftDescription] = useState<string | null>(null);

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
    if (filterWebsiteId !== null) result = result.filter((s) => s.websiteId === filterWebsiteId);
    if (filterFlowId !== null) result = result.filter((s) => s.flowId === filterFlowId);
    if (filterType !== null) result = result.filter((s) => s.type === filterType);
    if (filterTag !== null) result = result.filter((s) => s.tags.includes(filterTag));
    if (filterSharedOnly) result = result.filter((s) => s.websiteId === null);
    // Sort
    const dir = sortDirection === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (sortField === 'type') return dir * a.type.localeCompare(b.type);
      if (sortField === 'createdAt') return dir * a.createdAt.localeCompare(b.createdAt);
      return dir * a.name.localeCompare(b.name);
    });
    return result;
  }, [steps, searchQuery, filterWebsiteId, filterFlowId, filterType, filterTag, filterSharedOnly, sortField, sortDirection]);

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
    if (filterWebsiteId !== null) result = result.filter((s) => s.websiteId === filterWebsiteId);
    if (filterFlowId !== null) result = result.filter((s) => s.flowId === filterFlowId);
    if (filterTag !== null) result = result.filter((s) => s.tags.includes(filterTag));
    if (filterSharedOnly) result = result.filter((s) => s.shared || s.websiteId === null);
    // Sort
    const dir = sortDirection === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (sortField === 'stepCount') return dir * (a.stepIds.length - b.stepIds.length);
      if (sortField === 'createdAt') return dir * a.createdAt.localeCompare(b.createdAt);
      return dir * a.name.localeCompare(b.name);
    });
    return result;
  }, [stepSets, searchQuery, filterWebsiteId, filterFlowId, filterTag, filterSharedOnly, sortField, sortDirection]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    steps.forEach((s) => s.tags.forEach((t) => tagSet.add(t)));
    stepSets.forEach((s) => s.tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [steps, stepSets]);

  const actionStepSets = useMemo(
    () =>
      actionStepSetIds
        .map((id) => stepSets.find((s) => s.id === id))
        .filter((s): s is PlaywrightStepSet => s !== undefined),
    [actionStepSetIds, stepSets]
  );

  const stepSetUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const action of actions) {
      for (const setId of action.stepSetIds) {
        counts[setId] = (counts[setId] ?? 0) + 1;
      }
    }
    return counts;
  }, [actions]);

  const orphanedStepIds = useMemo(() => {
    const existingIds = new Set(steps.map((s) => s.id));
    const orphaned = new Set<string>();
    for (const set of stepSets) {
      for (const stepId of set.stepIds) {
        if (!existingIds.has(stepId)) orphaned.add(stepId);
      }
    }
    return orphaned;
  }, [steps, stepSets]);

  const orphanedStepSetIds = useMemo(() => {
    const existingIds = new Set(stepSets.map((s) => s.id));
    const orphaned = new Set<string>();
    for (const action of actions) {
      for (const setId of action.stepSetIds) {
        if (!existingIds.has(setId)) orphaned.add(setId);
      }
    }
    return orphaned;
  }, [stepSets, actions]);

  // ---------------------------------------------------------------------------
  // Step CRUD
  // ---------------------------------------------------------------------------

  const handleCreateStep = useCallback(
    async (draft: Omit<PlaywrightStep, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
      try {
        const ts = now();
        const next: PlaywrightStep = { ...draft, id: createId(), createdAt: ts, updatedAt: ts };
        await saveSteps({ steps: [...stepsRef.current, next] });
        setIsCreateStepOpen(false);
        toast('Step created.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'createStep' });
        toast('Failed to create step.', { variant: 'error' });
      }
    },
    [saveSteps, toast]
  );

  const handleUpdateStep = useCallback(
    async (id: string, updates: Partial<PlaywrightStep>): Promise<void> => {
      try {
        const next = stepsRef.current.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: now() } : s
        );
        await saveSteps({ steps: next });
        setEditingStep(null);
        toast('Step updated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'updateStep' });
        toast('Failed to update step.', { variant: 'error' });
      }
    },
    [saveSteps, toast]
  );

  const handleDeleteStep = useCallback(
    async (id: string): Promise<void> => {
      try {
        await saveSteps({ steps: stepsRef.current.filter((s) => s.id !== id) });
        toast('Step deleted.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'deleteStep' });
        toast('Failed to delete step.', { variant: 'error' });
      }
    },
    [saveSteps, toast]
  );

  const handleDuplicateStep = useCallback(
    async (id: string): Promise<void> => {
      const original = stepsRef.current.find((s) => s.id === id);
      if (!original) return;
      try {
        const ts = now();
        const copy: PlaywrightStep = {
          ...original,
          id: createId(),
          name: `${original.name} (copy)`,
          createdAt: ts,
          updatedAt: ts,
        };
        await saveSteps({ steps: [...stepsRef.current, copy] });
        toast('Step duplicated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'duplicateStep' });
        toast('Failed to duplicate step.', { variant: 'error' });
      }
    },
    [saveSteps, toast]
  );

  // ---------------------------------------------------------------------------
  // Step Set CRUD
  // ---------------------------------------------------------------------------

  const handleCreateStepSet = useCallback(
    async (draft: Omit<PlaywrightStepSet, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
      try {
        const ts = now();
        const next: PlaywrightStepSet = { ...draft, id: createId(), createdAt: ts, updatedAt: ts };
        await saveStepSets({ stepSets: [...stepSetsRef.current, next] });
        setIsCreateSetOpen(false);
        toast('Step set created.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'createStepSet' });
        toast('Failed to create step set.', { variant: 'error' });
      }
    },
    [saveStepSets, toast]
  );

  const handleUpdateStepSet = useCallback(
    async (id: string, updates: Partial<PlaywrightStepSet>): Promise<void> => {
      try {
        const next = stepSetsRef.current.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: now() } : s
        );
        await saveStepSets({ stepSets: next });
        setEditingSet(null);
        toast('Step set updated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'updateStepSet' });
        toast('Failed to update step set.', { variant: 'error' });
      }
    },
    [saveStepSets, toast]
  );

  const handleDeleteStepSet = useCallback(
    async (id: string): Promise<void> => {
      try {
        await saveStepSets({ stepSets: stepSetsRef.current.filter((s) => s.id !== id) });
        setActionStepSetIds((prev) => prev.filter((sid) => sid !== id));
        toast('Step set deleted.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'deleteStepSet' });
        toast('Failed to delete step set.', { variant: 'error' });
      }
    },
    [saveStepSets, toast]
  );

  const handleDuplicateStepSet = useCallback(
    async (id: string): Promise<void> => {
      const original = stepSetsRef.current.find((s) => s.id === id);
      if (!original) return;
      try {
        const ts = now();
        const copy: PlaywrightStepSet = {
          ...original,
          id: createId(),
          name: `${original.name} (copy)`,
          createdAt: ts,
          updatedAt: ts,
        };
        await saveStepSets({ stepSets: [...stepSetsRef.current, copy] });
        toast('Step set duplicated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'duplicateStepSet' });
        toast('Failed to duplicate step set.', { variant: 'error' });
      }
    },
    [saveStepSets, toast]
  );

  // ---------------------------------------------------------------------------
  // Website CRUD
  // ---------------------------------------------------------------------------

  const handleCreateWebsite = useCallback(
    async (draft: Omit<PlaywrightWebsite, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
      try {
        const ts = now();
        const next: PlaywrightWebsite = { ...draft, id: createId(), createdAt: ts, updatedAt: ts };
        await saveWebsites({ websites: [...websitesRef.current, next] });
        toast('Website added.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'createWebsite' });
        toast('Failed to add website.', { variant: 'error' });
      }
    },
    [saveWebsites, toast]
  );

  const handleDeleteWebsite = useCallback(
    async (id: string): Promise<void> => {
      try {
        await saveWebsites({ websites: websitesRef.current.filter((w) => w.id !== id) });
        // Clean up orphaned flows
        await saveFlows({ flows: flowsRef.current.filter((f) => f.websiteId !== id) });
        toast('Website removed.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'deleteWebsite' });
        toast('Failed to remove website.', { variant: 'error' });
      }
    },
    [saveWebsites, saveFlows, toast]
  );

  // ---------------------------------------------------------------------------
  // Flow CRUD
  // ---------------------------------------------------------------------------

  const handleCreateFlow = useCallback(
    async (draft: Omit<PlaywrightFlow, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
      try {
        const ts = now();
        const next: PlaywrightFlow = { ...draft, id: createId(), createdAt: ts, updatedAt: ts };
        await saveFlows({ flows: [...flowsRef.current, next] });
        toast('Flow added.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'createFlow' });
        toast('Failed to add flow.', { variant: 'error' });
      }
    },
    [saveFlows, toast]
  );

  const handleDeleteFlow = useCallback(
    async (id: string): Promise<void> => {
      try {
        await saveFlows({ flows: flowsRef.current.filter((f) => f.id !== id) });
        toast('Flow removed.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'deleteFlow' });
        toast('Failed to remove flow.', { variant: 'error' });
      }
    },
    [saveFlows, toast]
  );

  // ---------------------------------------------------------------------------
  // Action management
  // ---------------------------------------------------------------------------

  const handleDeleteAction = useCallback(
    async (id: string): Promise<void> => {
      try {
        await saveActions({ actions: actionsRef.current.filter((a) => a.id !== id) });
        toast('Action deleted.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'deleteAction' });
        toast('Failed to delete action.', { variant: 'error' });
      }
    },
    [saveActions, toast]
  );

  const handleCleanOrphanedSteps = useCallback(async (): Promise<void> => {
    const existingIds = new Set(stepsRef.current.map((s) => s.id));
    const cleaned = stepSetsRef.current.map((ss) => ({
      ...ss,
      stepIds: ss.stepIds.filter((id) => existingIds.has(id)),
      updatedAt: now(),
    }));
    try {
      await saveStepSets({ stepSets: cleaned });
      toast('Orphaned step references removed.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'cleanOrphanedSteps' });
      toast('Cleanup failed.', { variant: 'error' });
    }
  }, [saveStepSets, toast]);

  const handleCleanOrphanedStepSets = useCallback(async (): Promise<void> => {
    const existingIds = new Set(stepSetsRef.current.map((s) => s.id));
    const cleaned = actionsRef.current.map((a) => ({
      ...a,
      stepSetIds: a.stepSetIds.filter((id) => existingIds.has(id)),
      updatedAt: now(),
    }));
    try {
      await saveActions({ actions: cleaned });
      toast('Orphaned step set references removed.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'cleanOrphanedStepSets' });
      toast('Cleanup failed.', { variant: 'error' });
    }
  }, [saveActions, toast]);

  const handleBatchImport = useCallback(
    async (payload: {
      steps: PlaywrightStep[];
      stepSets: PlaywrightStepSet[];
      actions: PlaywrightAction[];
      websites: PlaywrightWebsite[];
      flows: PlaywrightFlow[];
    }): Promise<{ imported: number }> => {
      let imported = 0;
      try {
        const existingStepIds = new Set(stepsRef.current.map((s) => s.id));
        const existingSetIds = new Set(stepSetsRef.current.map((s) => s.id));
        const existingActionIds = new Set(actionsRef.current.map((a) => a.id));
        const existingWebsiteIds = new Set(websitesRef.current.map((w) => w.id));
        const existingFlowIds = new Set(flowsRef.current.map((f) => f.id));

        const newWebsites = payload.websites.filter((w) => !existingWebsiteIds.has(w.id));
        const newFlows = payload.flows.filter((f) => !existingFlowIds.has(f.id));
        const newSteps = payload.steps.filter((s) => !existingStepIds.has(s.id));
        const newSets = payload.stepSets.filter((s) => !existingSetIds.has(s.id));
        const newActions = payload.actions.filter((a) => !existingActionIds.has(a.id));

        if (newWebsites.length > 0) {
          await saveWebsites({ websites: [...websitesRef.current, ...newWebsites] });
          imported += newWebsites.length;
        }
        if (newFlows.length > 0) {
          await saveFlows({ flows: [...flowsRef.current, ...newFlows] });
          imported += newFlows.length;
        }
        if (newSteps.length > 0) {
          await saveSteps({ steps: [...stepsRef.current, ...newSteps] });
          imported += newSteps.length;
        }
        if (newSets.length > 0) {
          await saveStepSets({ stepSets: [...stepSetsRef.current, ...newSets] });
          imported += newSets.length;
        }
        if (newActions.length > 0) {
          await saveActions({ actions: [...actionsRef.current, ...newActions] });
          imported += newActions.length;
        }
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'batchImport' });
        toast('Import failed.', { variant: 'error' });
      }
      return { imported };
    },
    [saveWebsites, saveFlows, saveSteps, saveStepSets, saveActions, toast]
  );

  const handleLoadActionIntoConstructor = useCallback((id: string): void => {
    const action = actionsRef.current.find((a) => a.id === id);
    if (!action) return;
    setActionStepSetIds([...action.stepSetIds]);
    setActionDraftName(action.name);
    setActionDraftDescription(action.description);
    setActionPersonaId(action.personaId);
    toast('Action loaded into constructor.', { variant: 'success' });
  }, [toast]);

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
    setActionDraftDescription(null);
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
    try {
      const ts = now();
      const next: PlaywrightAction = {
        id: createId(),
        name,
        description: actionDraftDescription?.trim() || null,
        stepSetIds: [...actionStepSetIds],
        personaId: actionPersonaId,
        createdAt: ts,
        updatedAt: ts,
      };
      await saveActions({ actions: [...actionsRef.current, next] });
      setIsSaveActionOpen(false);
      handleClearAction();
      toast('Action saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'saveAction' });
      toast('Failed to save action.', { variant: 'error' });
    }
  }, [actionDraftName, actionDraftDescription, actionStepSetIds, actionPersonaId, handleClearAction, saveActions, toast]);

  // ---------------------------------------------------------------------------
  // Assemble context value
  // ---------------------------------------------------------------------------

  return {
    // Server data
    steps,
    stepSets,
    actions,
    websites,
    flows,
    isLoading,
    isSaving,

    // Derived
    filteredSteps,
    filteredStepSets,
    allTags,
    actionStepSets,
    stepSetUsageCounts,
    orphanedStepIds,
    orphanedStepSetIds,

    // Filters
    searchQuery,
    filterWebsiteId,
    filterFlowId,
    filterType,
    filterTag,
    filterSharedOnly,
    activeTab,
    sortField,
    sortDirection,
    setSearchQuery,
    setFilterWebsiteId,
    setFilterFlowId,
    setFilterType,
    setFilterTag,
    setFilterSharedOnly,
    setActiveTab,
    setSortField,
    setSortDirection,

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
    actionDraftDescription,
    handleAddStepSetToAction,
    handleRemoveFromAction,
    handleMoveActionItem,
    handleClearAction,
    setActionPersonaId,
    setActionDraftName,
    setActionDraftDescription,
    handleSaveAction,

    // Step CRUD
    handleCreateStep,
    handleUpdateStep,
    handleDeleteStep,
    handleDuplicateStep,

    // Step Set CRUD
    handleCreateStepSet,
    handleUpdateStepSet,
    handleDeleteStepSet,
    handleDuplicateStepSet,

    // Website CRUD
    handleCreateWebsite,
    handleDeleteWebsite,

    // Flow CRUD
    handleCreateFlow,
    handleDeleteFlow,

    // Action management
    handleDeleteAction,
    handleLoadActionIntoConstructor,

    // Cleanup
    handleCleanOrphanedSteps,
    handleCleanOrphanedStepSets,

    // Batch import
    handleBatchImport,
  };
}
