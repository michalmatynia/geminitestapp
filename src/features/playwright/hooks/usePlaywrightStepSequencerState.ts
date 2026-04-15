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

import type { PlaywrightStepSequencerContextType } from '../context/PlaywrightStepSequencerContext.types';

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
    return result;
  }, [steps, searchQuery, filterWebsiteId, filterFlowId, filterType, filterTag, filterSharedOnly]);

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
    return result;
  }, [stepSets, searchQuery, filterWebsiteId, filterFlowId, filterTag, filterSharedOnly]);

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
      await saveActions({ actions: [...actionsRef.current, next] });
      setIsSaveActionOpen(false);
      handleClearAction();
      toast('Action saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'saveAction' });
      toast('Failed to save action.', { variant: 'error' });
    }
  }, [actionDraftName, actionStepSetIds, actionPersonaId, handleClearAction, saveActions, toast]);

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

    // Filters
    searchQuery,
    filterWebsiteId,
    filterFlowId,
    filterType,
    filterTag,
    filterSharedOnly,
    activeTab,
    setSearchQuery,
    setFilterWebsiteId,
    setFilterFlowId,
    setFilterType,
    setFilterTag,
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
  };
}
