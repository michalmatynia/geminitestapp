'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  normalizePlaywrightActionBlockConfig,
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
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import { analyzeLoadedPlaywrightActions } from '@/shared/lib/browser-execution/playwright-actions-settings-validation';
import {
  analyzePlaywrightRuntimeActionRepairPreview,
  repairPlaywrightRuntimeAction,
  repairPlaywrightRuntimeActionsBulk,
  selectPlaywrightRuntimeActionRepairPreview,
} from '@/shared/lib/browser-execution/playwright-runtime-action-repair';
import { toActionSequenceKey } from '@/shared/lib/browser-execution/runtime-action-keys';
import { validateRuntimeActionEditorBlocks } from '@/shared/lib/browser-execution/runtime-action-editor-validation';
import { extractMutationErrorMessage } from '@/shared/lib/mutation-error-handler';
import { STEP_REGISTRY } from '@/shared/lib/browser-execution/step-registry';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type {
  PlaywrightResolvedActionBlock,
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

function createActionBlock(
  kind: PlaywrightActionBlock['kind'],
  refId: string
): PlaywrightActionBlock {
  return {
    id: createId(),
    kind,
    refId,
    enabled: true,
    label: null,
    config: normalizePlaywrightActionBlockConfig(null),
  };
}

function loadActionIntoConstructorState(input: {
  action: PlaywrightAction;
  setActionBlocks: (value: PlaywrightActionBlock[]) => void;
  setActionExecutionSettings: (value: PlaywrightActionExecutionSettings) => void;
  setActionDraftName: (value: string) => void;
  setActionDraftDescription: (value: string | null) => void;
  setActionPersonaId: (value: string | null) => void;
  setEditingActionId: (value: string | null) => void;
}): void {
  const {
    action,
    setActionBlocks,
    setActionExecutionSettings,
    setActionDraftName,
    setActionDraftDescription,
    setActionPersonaId,
    setEditingActionId,
  } = input;

  setActionBlocks(action.blocks.map((block) => ({ ...block })));
  setActionExecutionSettings(action.executionSettings);
  setActionDraftName(action.name);
  setActionDraftDescription(action.description);
  setActionPersonaId(action.personaId);
  setEditingActionId(action.id);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlaywrightStepSequencerState(options?: {
  initialActionId?: string | null;
}): PlaywrightStepSequencerContextType {
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
  const [actionBlocks, setActionBlocks] = useState<PlaywrightActionBlock[]>([]);
  const [actionPersonaId, setActionPersonaId] = useState<string | null>(null);
  const [actionExecutionSettings, setActionExecutionSettings] = useState<PlaywrightActionExecutionSettings>(
    defaultPlaywrightActionExecutionSettings
  );
  const [actionDraftName, setActionDraftName] = useState('');
  const [actionDraftDescription, setActionDraftDescription] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const appliedInitialActionIdRef = useRef<string | null>(null);
  const [draftStepSetName, setDraftStepSetName] = useState('');
  const [draftStepSetSteps, setDraftStepSetSteps] = useState<PlaywrightStep[]>([]);

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

  const resolvedActionBlocks = useMemo<PlaywrightResolvedActionBlock[]>(
    () =>
      actionBlocks.map((block) => ({
        block,
        runtimeStepId:
          block.kind === 'runtime_step' && block.refId in STEP_REGISTRY ? block.refId : null,
        runtimeStepLabel:
          block.kind === 'runtime_step' && block.refId in STEP_REGISTRY
            ? STEP_REGISTRY[block.refId as keyof typeof STEP_REGISTRY].label
            : null,
        step: block.kind === 'step'
          ? (steps.find((step) => step.id === block.refId) ?? null)
          : null,
        stepSet: block.kind === 'step_set'
          ? (stepSets.find((stepSet) => stepSet.id === block.refId) ?? null)
          : null,
      })),
    [actionBlocks, steps, stepSets]
  );

  const editingActionRuntimeKey = useMemo(() => {
    const runtimeKey = actions.find((action) => action.id === editingActionId)?.runtimeKey ?? null;
    return toActionSequenceKey(runtimeKey);
  }, [actions, editingActionId]);

  const actionValidationErrors = useMemo(() => {
    if (editingActionRuntimeKey === null) {
      return [];
    }

    return validateRuntimeActionEditorBlocks({
      runtimeKey: editingActionRuntimeKey,
      blocks: actionBlocks,
    });
  }, [actionBlocks, editingActionRuntimeKey]);

  const runtimeActionLoadErrorsById = useMemo(
    () => analyzeLoadedPlaywrightActions(actions).runtimeActionErrorsById,
    [actions]
  );
  const runtimeActionRepairPreview = useMemo(
    () =>
      analyzePlaywrightRuntimeActionRepairPreview({
        actions,
        runtimeActionLoadErrorsById,
      }),
    [actions, runtimeActionLoadErrorsById]
  );

  const stepSetUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const action of actions) {
      for (const block of action.blocks) {
        if (block.kind !== 'step_set') continue;
        counts[block.refId] = (counts[block.refId] ?? 0) + 1;
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
      for (const block of action.blocks) {
        if (block.kind === 'step_set' && !existingIds.has(block.refId)) {
          orphaned.add(block.refId);
        }
      }
    }
    return orphaned;
  }, [stepSets, actions]);

  const orphanedActionStepIds = useMemo(() => {
    const existingIds = new Set(steps.map((s) => s.id));
    const orphaned = new Set<string>();
    for (const action of actions) {
      for (const block of action.blocks) {
        if (block.kind === 'step' && !existingIds.has(block.refId)) {
          orphaned.add(block.refId);
        }
      }
    }
    return orphaned;
  }, [steps, actions]);

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
        setActionBlocks((prev) =>
          prev.filter((block) => !(block.kind === 'step' && block.refId === id))
        );
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
        setActionBlocks((prev) =>
          prev.filter((block) => !(block.kind === 'step_set' && block.refId === id))
        );
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

  const handleUpdateWebsite = useCallback(
    async (id: string, updates: Partial<Pick<PlaywrightWebsite, 'name' | 'baseUrl'>>): Promise<void> => {
      try {
        const next = websitesRef.current.map((w) =>
          w.id === id ? { ...w, ...updates, updatedAt: now() } : w
        );
        await saveWebsites({ websites: next });
        toast('Website updated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'updateWebsite' });
        toast('Failed to update website.', { variant: 'error' });
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

  const handleUpdateFlow = useCallback(
    async (id: string, updates: Partial<Pick<PlaywrightFlow, 'name' | 'description'>>): Promise<void> => {
      try {
        const next = flowsRef.current.map((f) =>
          f.id === id ? { ...f, ...updates, updatedAt: now() } : f
        );
        await saveFlows({ flows: next });
        toast('Flow updated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'updateFlow' });
        toast('Failed to update flow.', { variant: 'error' });
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
    const existingStepIds = new Set(stepsRef.current.map((s) => s.id));
    const existingStepSetIds = new Set(stepSetsRef.current.map((s) => s.id));
    const cleaned = actionsRef.current.map((action) =>
      normalizePlaywrightAction({
        ...action,
        blocks: action.blocks.filter((block) => {
          if (block.kind === 'step') return existingStepIds.has(block.refId);
          return existingStepSetIds.has(block.refId);
        }),
        updatedAt: now(),
      })
    );
    try {
      await saveActions({ actions: cleaned });
      toast('Orphaned action block references removed.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'cleanOrphanedStepSets' });
        toast(extractMutationErrorMessage(error, 'Cleanup failed.'), { variant: 'error' });
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
        const newActions = payload.actions
          .map((action) => normalizePlaywrightAction(action))
          .filter((action) => !existingActionIds.has(action.id));

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
        toast(extractMutationErrorMessage(error, 'Import failed.'), { variant: 'error' });
      }
      return { imported };
    },
    [saveWebsites, saveFlows, saveSteps, saveStepSets, saveActions, toast]
  );

  const handleDuplicateAction = useCallback(
    async (id: string): Promise<void> => {
      const original = actionsRef.current.find((a) => a.id === id);
      if (!original) return;
      try {
        const ts = now();
        const copy = normalizePlaywrightAction({
          ...original,
          id: createId(),
          name: `${original.name} (copy)`,
          runtimeKey: null,
          blocks: original.blocks.map((block) => ({
            ...block,
            id: createId(),
          })),
          createdAt: ts,
          updatedAt: ts,
        });
        await saveActions({ actions: [...actionsRef.current, copy] });
        toast('Action duplicated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'duplicateAction' });
        toast(extractMutationErrorMessage(error, 'Failed to duplicate action.'), { variant: 'error' });
      }
    },
    [saveActions, toast]
  );

  const handleLoadActionIntoConstructor = useCallback((id: string): void => {
    const action = actionsRef.current.find((a) => a.id === id);
    if (!action) return;
    loadActionIntoConstructorState({
      action,
      setActionBlocks,
      setActionExecutionSettings,
      setActionDraftName,
      setActionDraftDescription,
      setActionPersonaId,
      setEditingActionId,
    });
    toast('Action loaded into constructor.', { variant: 'success' });
  }, [toast]);

  useEffect(() => {
    const requestedActionId = options?.initialActionId?.trim() ?? '';
    if (requestedActionId.length === 0) {
      appliedInitialActionIdRef.current = null;
      return;
    }
    if (appliedInitialActionIdRef.current === requestedActionId) {
      return;
    }

    const action = actions.find((entry) => entry.id === requestedActionId) ?? null;
    if (action === null) {
      return;
    }

    loadActionIntoConstructorState({
      action,
      setActionBlocks,
      setActionExecutionSettings,
      setActionDraftName,
      setActionDraftDescription,
      setActionPersonaId,
      setEditingActionId,
    });
    appliedInitialActionIdRef.current = requestedActionId;
  }, [actions, options?.initialActionId]);

  const handleClearAction = useCallback((): void => {
    setActionBlocks([]);
    setActionDraftName('');
    setActionDraftDescription(null);
    setActionPersonaId(null);
    setActionExecutionSettings(defaultPlaywrightActionExecutionSettings);
    setEditingActionId(null);
  }, []);

  const clearDraftStepSet = useCallback((): void => {
    setDraftStepSetName('');
    setDraftStepSetSteps([]);
  }, []);

  const appendDraftStep = useCallback(
    (draft: Omit<PlaywrightStep, 'id' | 'createdAt' | 'updatedAt'>): void => {
      const timestamp = now();
      setDraftStepSetSteps((prev) => [
        ...prev,
        {
          ...draft,
          id: createId(),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]);
    },
    []
  );

  const removeDraftStep = useCallback((index: number): void => {
    setDraftStepSetSteps((prev) => prev.filter((_, stepIndex) => stepIndex !== index));
  }, []);

  const moveDraftStep = useCallback((from: number, to: number): void => {
    setDraftStepSetSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved === undefined) {
        return prev;
      }
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const commitDraftStepSet = useCallback(async (): Promise<void> => {
    const name = draftStepSetName.trim();
    if (name.length === 0) {
      toast('Draft step set name is required.', { variant: 'error' });
      return;
    }
    if (draftStepSetSteps.length === 0) {
      toast('Add at least one draft step before saving the step set.', { variant: 'error' });
      return;
    }

    try {
      const timestamp = now();
      const nextSteps = [
        ...stepsRef.current,
        ...draftStepSetSteps.map((step, index) => ({
          ...step,
          sortOrder: stepsRef.current.length + index,
          updatedAt: timestamp,
        })),
      ];
      await saveSteps({ steps: nextSteps });
      await saveStepSets({
        stepSets: [
          ...stepSetsRef.current,
          {
            id: createId(),
            name,
            description: null,
            stepIds: draftStepSetSteps.map((step) => step.id),
            websiteId: filterWebsiteId,
            flowId: filterFlowId,
            shared: filterWebsiteId === null,
            tags: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      });
      clearDraftStepSet();
      toast('Draft step set saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'usePlaywrightStepSequencerState',
        action: 'commitDraftStepSet',
      });
      toast(extractMutationErrorMessage(error, 'Failed to save draft step set.'), {
        variant: 'error',
      });
    }
  }, [
    clearDraftStepSet,
    draftStepSetName,
    draftStepSetSteps,
    filterFlowId,
    filterWebsiteId,
    saveStepSets,
    saveSteps,
    toast,
  ]);

  const handleResetRuntimeActionToSeed = useCallback(
    async (id: string): Promise<void> => {
      const repairResult = repairPlaywrightRuntimeAction({
        actions: actionsRef.current,
        targetActionId: id,
        mode: 'reset_to_seed',
        nowIso: now(),
        createId,
      });
      if (!repairResult.ok) {
        toast(repairResult.error, { variant: 'error' });
        return;
      }

      try {
        await saveActions({ actions: repairResult.result.actions });
        if (editingActionId !== null && repairResult.result.replacedActionIds.includes(editingActionId)) {
          handleClearAction();
        }
        toast(`Runtime action reset to seeded "${repairResult.result.runtimeKey}" flow.`, {
          variant: 'success',
        });
      } catch (error) {
        logClientCatch(error, {
          source: 'usePlaywrightStepSequencerState',
          action: 'resetRuntimeActionToSeed',
          actionId: id,
        });
        toast(extractMutationErrorMessage(error, 'Failed to reset runtime action.'), {
          variant: 'error',
        });
      }
    },
    [editingActionId, handleClearAction, saveActions, toast]
  );

  const handleCloneRuntimeActionAsDraft = useCallback(
    async (id: string): Promise<void> => {
      const repairResult = repairPlaywrightRuntimeAction({
        actions: actionsRef.current,
        targetActionId: id,
        mode: 'clone_to_draft_and_restore',
        nowIso: now(),
        createId,
      });
      if (!repairResult.ok) {
        toast(repairResult.error, { variant: 'error' });
        return;
      }

      try {
        await saveActions({ actions: repairResult.result.actions });
        const draftAction = repairResult.result.clonedDraftAction;
        if (draftAction !== null) {
          loadActionIntoConstructorState({
            action: draftAction,
            setActionBlocks,
            setActionExecutionSettings,
            setActionDraftName,
            setActionDraftDescription,
            setActionPersonaId,
            setEditingActionId,
          });
        } else if (
          editingActionId !== null &&
          repairResult.result.replacedActionIds.includes(editingActionId)
        ) {
          handleClearAction();
        }
        toast(
          `Runtime action restored to seed and cloned into a draft for "${repairResult.result.runtimeKey}".`,
          { variant: 'success' }
        );
      } catch (error) {
        logClientCatch(error, {
          source: 'usePlaywrightStepSequencerState',
          action: 'cloneRuntimeActionAsDraft',
          actionId: id,
        });
        toast(extractMutationErrorMessage(error, 'Failed to repair runtime action.'), {
          variant: 'error',
        });
      }
    },
    [
      editingActionId,
      handleClearAction,
      saveActions,
      setActionBlocks,
      setActionDraftDescription,
      setActionDraftName,
      setActionPersonaId,
      toast,
    ]
  );

  const handleResetAllRuntimeActionsToSeed = useCallback(
    async (runtimeKeys?: string[]): Promise<void> => {
      const targetedPreview =
        runtimeKeys === undefined
          ? runtimeActionRepairPreview
          : selectPlaywrightRuntimeActionRepairPreview({
              actions: actionsRef.current,
              preview: runtimeActionRepairPreview,
              runtimeKeys: runtimeKeys
                .map((key) => toActionSequenceKey(key))
                .filter((key): key is ActionSequenceKey => key !== null),
            });
      const repairResult = repairPlaywrightRuntimeActionsBulk({
        actions: actionsRef.current,
        targetActionIds: targetedPreview.repairableActionIds,
        mode: 'reset_to_seed',
        nowIso: now(),
        createId,
      });
      if (!repairResult.ok) {
        toast(repairResult.error, { variant: 'error' });
        return;
      }

      try {
        await saveActions({ actions: repairResult.result.actions });
        if (editingActionId !== null && repairResult.result.replacedActionIds.includes(editingActionId)) {
          handleClearAction();
        }
        const repairedCount = repairResult.result.repairedRuntimeKeys.length;
        toast(
          `Reset ${repairedCount} quarantined runtime action${repairedCount === 1 ? '' : 's'} to seeded flows.`,
          { variant: 'success' }
        );
      } catch (error) {
        logClientCatch(error, {
          source: 'usePlaywrightStepSequencerState',
          action: 'resetAllRuntimeActionsToSeed',
        });
        toast(extractMutationErrorMessage(error, 'Failed to reset runtime actions.'), {
          variant: 'error',
        });
      }
    },
    [editingActionId, handleClearAction, runtimeActionRepairPreview, saveActions, toast]
  );

  const handleCloneAllRuntimeActionsAsDrafts = useCallback(
    async (runtimeKeys?: string[]): Promise<void> => {
      const targetedPreview =
        runtimeKeys === undefined
          ? runtimeActionRepairPreview
          : selectPlaywrightRuntimeActionRepairPreview({
              actions: actionsRef.current,
              preview: runtimeActionRepairPreview,
              runtimeKeys: runtimeKeys
                .map((key) => toActionSequenceKey(key))
                .filter((key): key is ActionSequenceKey => key !== null),
            });
      const repairResult = repairPlaywrightRuntimeActionsBulk({
        actions: actionsRef.current,
        targetActionIds: targetedPreview.repairableActionIds,
        mode: 'clone_to_draft_and_restore',
        nowIso: now(),
        createId,
      });
      if (!repairResult.ok) {
        toast(repairResult.error, { variant: 'error' });
        return;
      }

      try {
        await saveActions({ actions: repairResult.result.actions });
        const draftAction =
          editingActionId === null
            ? null
            : (repairResult.result.clonedDraftActions.find(
                (entry) => entry.sourceActionId === editingActionId
              )?.action ?? null);
        if (draftAction !== null) {
          loadActionIntoConstructorState({
            action: draftAction,
            setActionBlocks,
            setActionExecutionSettings,
            setActionDraftName,
            setActionDraftDescription,
            setActionPersonaId,
            setEditingActionId,
          });
        } else if (
          editingActionId !== null &&
          repairResult.result.replacedActionIds.includes(editingActionId)
        ) {
          handleClearAction();
        }
        const repairedCount = repairResult.result.repairedRuntimeKeys.length;
        const draftCount = repairResult.result.clonedDraftActions.length;
        toast(
          `Restored ${repairedCount} runtime action${repairedCount === 1 ? '' : 's'} and preserved ${draftCount} draft${draftCount === 1 ? '' : 's'}.`,
          { variant: 'success' }
        );
      } catch (error) {
        logClientCatch(error, {
          source: 'usePlaywrightStepSequencerState',
          action: 'cloneAllRuntimeActionsAsDrafts',
        });
        toast(extractMutationErrorMessage(error, 'Failed to repair runtime actions.'), {
          variant: 'error',
        });
      }
    },
    [
      editingActionId,
      handleClearAction,
      runtimeActionRepairPreview,
      saveActions,
      setActionBlocks,
      setActionDraftDescription,
      setActionDraftName,
      setActionPersonaId,
      toast,
    ]
  );

  // ---------------------------------------------------------------------------
  // Action constructor
  // ---------------------------------------------------------------------------

  const handleAddStepToAction = useCallback((stepId: string): void => {
    setActionBlocks((prev) => [...prev, createActionBlock('step', stepId)]);
  }, []);

  const handleAddRuntimeStepToAction = useCallback((stepId: string): void => {
    setActionBlocks((prev) => [...prev, createActionBlock('runtime_step', stepId)]);
  }, []);

  const handleAddStepSetToAction = useCallback((stepSetId: string): void => {
    setActionBlocks((prev) => [...prev, createActionBlock('step_set', stepSetId)]);
  }, []);

  const handleRemoveFromAction = useCallback((index: number): void => {
    setActionBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMoveActionItem = useCallback((from: number, to: number): void => {
    setActionBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved !== undefined) next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleToggleActionBlockEnabled = useCallback((index: number): void => {
    setActionBlocks((prev) =>
      prev.map((block, blockIndex) =>
        blockIndex === index ? { ...block, enabled: !block.enabled } : block
      )
    );
  }, []);

  const handleUpdateActionBlockConfig = useCallback((
    index: number,
    updates: Partial<PlaywrightActionBlockConfig>
  ): void => {
    setActionBlocks((prev) =>
      prev.map((block, blockIndex) =>
        blockIndex === index
          ? {
              ...block,
              config: normalizePlaywrightActionBlockConfig({
                ...block.config,
                ...updates,
              }),
            }
          : block
      )
    );
  }, []);

  const handleSaveAction = useCallback(async (): Promise<void> => {
    const name = actionDraftName.trim();
    if (name.length === 0) {
      toast('Action name is required.', { variant: 'error' });
      return;
    }
    if (actionBlocks.length === 0) {
      toast('Add at least one action block before saving.', { variant: 'error' });
      return;
    }
    try {
      const ts = now();
      const description = actionDraftDescription?.trim() ?? null;
      const next = normalizePlaywrightAction({
        id: createId(),
        name,
        description: description !== null && description.length > 0 ? description : null,
        runtimeKey: null,
        blocks: actionBlocks.map((block) => ({ ...block })),
        stepSetIds: [],
        personaId: actionPersonaId,
        executionSettings: actionExecutionSettings,
        createdAt: ts,
        updatedAt: ts,
      });
      await saveActions({ actions: [...actionsRef.current, next] });
      setIsSaveActionOpen(false);
      handleClearAction();
      toast('Action saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'saveAction' });
      toast(extractMutationErrorMessage(error, 'Failed to save action.'), { variant: 'error' });
    }
  }, [actionDraftName, actionDraftDescription, actionBlocks, actionPersonaId, actionExecutionSettings, handleClearAction, saveActions, toast]);

  const handleUpdateAction = useCallback(async (): Promise<void> => {
    if (editingActionId === null) return;
    const name = actionDraftName.trim();
    if (name.length === 0) {
      toast('Action name is required.', { variant: 'error' });
      return;
    }
    if (actionBlocks.length === 0) {
      toast('Add at least one action block before saving.', { variant: 'error' });
      return;
    }
    if (actionValidationErrors.length > 0) {
      toast(actionValidationErrors[0] ?? 'Runtime action validation failed.', { variant: 'error' });
      return;
    }
    try {
      const next = actionsRef.current.map((a) =>
        a.id === editingActionId
          ? normalizePlaywrightAction({
              ...a,
              name,
              description: actionDraftDescription?.trim() ?? null,
              blocks: actionBlocks.map((block) => ({ ...block })),
              stepSetIds: [],
              personaId: actionPersonaId,
              executionSettings: actionExecutionSettings,
              updatedAt: now(),
            })
          : a
      );
      await saveActions({ actions: next });
      handleClearAction();
      toast('Action updated.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'usePlaywrightStepSequencerState', action: 'updateAction' });
      toast(extractMutationErrorMessage(error, 'Failed to update action.'), { variant: 'error' });
    }
  }, [editingActionId, actionDraftName, actionDraftDescription, actionBlocks, actionPersonaId, actionExecutionSettings, actionValidationErrors, handleClearAction, saveActions, toast]);

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
    resolvedActionBlocks,
    stepSetUsageCounts,
    orphanedStepIds,
    orphanedActionStepIds,
    orphanedStepSetIds,
    runtimeActionLoadErrorsById,

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
    actionBlocks,
    actionPersonaId,
    actionExecutionSettings,
    actionDraftName,
    actionDraftDescription,
    editingActionId,
    editingActionRuntimeKey,
    actionValidationErrors,
    handleAddStepToAction,
    handleAddRuntimeStepToAction,
    handleAddStepSetToAction,
    handleRemoveFromAction,
    handleMoveActionItem,
    handleToggleActionBlockEnabled,
    handleUpdateActionBlockConfig,
    handleClearAction,
    setActionPersonaId,
    setActionExecutionSettings,
    setActionDraftName,
    setActionDraftDescription,
    handleSaveAction,
    handleUpdateAction,

    // Live-scripter draft step set
    draftStepSetName,
    draftStepSetSteps,
    setDraftStepSetName,
    appendDraftStep,
    removeDraftStep,
    moveDraftStep,
    clearDraftStepSet,
    commitDraftStepSet,

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
    handleUpdateWebsite,
    handleDeleteWebsite,

    // Flow CRUD
    handleCreateFlow,
    handleUpdateFlow,
    handleDeleteFlow,

    // Action management
    handleDeleteAction,
    handleDuplicateAction,
    handleLoadActionIntoConstructor,
    handleResetRuntimeActionToSeed,
    handleCloneRuntimeActionAsDraft,
    handleResetAllRuntimeActionsToSeed,
    handleCloneAllRuntimeActionsAsDrafts,

    // Cleanup
    handleCleanOrphanedSteps,
    handleCleanOrphanedStepSets,

    // Batch import
    handleBatchImport,
  };
}
