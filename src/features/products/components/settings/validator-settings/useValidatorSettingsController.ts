'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import {
  useCreateValidationPatternMutation,
  useDeleteValidationPatternMutation,
  useReorderValidationPatternsMutation,
  useUpdateValidatorSettingsMutation,
  useUpdateValidationPatternMutation,
  useValidationPatterns,
  useValidatorSettings,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductValidationDenyBehavior, ProductValidationInstanceDenyBehaviorMap, ProductValidationPattern, ProductValidationSemanticState, ProductValidationTarget, ProductValidationInstanceScope, SequenceGroupDraft } from '@/shared/contracts/products/validation';
import type { PatternFormData } from '@/shared/contracts/products/drafts';
import {
  type CreateProductValidationPatternInput as CreateValidationPatternPayload,
  type ReorderProductValidationPatternUpdate as ReorderValidationPatternUpdatePayload,
} from '@/shared/contracts/products/validation';
import { normalizeProductValidationInstanceDenyBehaviorMap } from '@/shared/lib/products/utils/validator-instance-behavior';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import {
  getProductValidationSemanticState,
  getProductValidationSemanticTransition,
} from '@/shared/lib/products/utils/validator-semantic-state';
import { useToast } from '@/shared/ui/toast';

import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import {
  buildPatternPayloadDiff,
  buildValidationPayload,
  parseStrictInt,
} from './controller-diff-utils';
import { buildFormDataFromPattern } from './controller-form-utils';
import { createSequenceActions } from './controller-sequence-actions';
import {
  buildDynamicRecipeFromForm,
  buildDuplicateLabel,
  buildSequenceGroups,
  canCompileRegex,
  EMPTY_FORM,
  sortPatternsBySequence,
  REPLACEMENT_FIELD_OPTIONS,
  getSourceFieldOptionsForTarget,
  isLocaleTarget,
  normalizeReplacementFields,
  formatReplacementFields,
  getReplacementFieldsForTarget,
} from './helpers';
import { buildAndSimulateValidatorPatternPreview } from './validator-pattern-simulator';

/**
 * Coordinates validator settings queries, pattern-editing state, and modal actions for the validator settings UI.
 */
export function useValidatorSettingsController() {
  const queryClient = useQueryClient();
  const patternsQuery = useValidationPatterns();
  const settingsQuery = useValidatorSettings();
  const { toast } = useToast();

  const patterns = patternsQuery.data ?? [];
  const settings = settingsQuery.data;

  const orderedPatterns = useMemo(() => sortPatternsBySequence(patterns), [patterns]);

  const [showModal, setShowModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ProductValidationPattern | null>(null);
  const [modalSemanticStateSeed, setModalSemanticState] =
    useState<ProductValidationSemanticState | null>(null);
  const [formData, setFormData] = useState<PatternFormData>(EMPTY_FORM);
  const [simulatorScope, setSimulatorScope] = useState<ProductValidationInstanceScope>('product_edit');
  const [simulatorValues, setSimulatorValues] = useState<Record<string, string>>({});
  const [simulatorCategoryFixtures, setSimulatorCategoryFixtures] = useState<string>('');
  const [groupDrafts, setGroupDrafts] = useState<Record<string, SequenceGroupDraft>>({});
  const [draggedPatternId, setDraggedPatternId] = useState<string | null>(null);
  const [dragOverPatternId, setDragOverPatternId] = useState<string | null>(null);
  const [patternToDelete, setPatternToDelete] = useState<ProductValidationPattern | null>(null);

  const createPattern = useCreateValidationPatternMutation();
  const updatePattern = useUpdateValidationPatternMutation();
  const deletePattern = useDeleteValidationPatternMutation();
  const reorderPatterns = useReorderValidationPatternsMutation();
  const updateSettings = useUpdateValidatorSettingsMutation();

  const sequenceGroups = useMemo(() => buildSequenceGroups(orderedPatterns), [orderedPatterns]);

  const modalSemanticState = useMemo((): ProductValidationSemanticState | null => {
    const parsedSequence =
      formData.sequence.trim().length === 0 ? null : parseStrictInt(formData.sequence);
    if (formData.sequence.trim().length > 0 && (parsedSequence === null || parsedSequence < 0)) {
      return modalSemanticStateSeed;
    }

    const parsedMaxExecutions = parseStrictInt(formData.maxExecutions);
    if (parsedMaxExecutions === null || parsedMaxExecutions < 1 || parsedMaxExecutions > 20) {
      return modalSemanticStateSeed;
    }

    const parsedValidationDebounceMs = parseStrictInt(formData.validationDebounceMs);
    if (
      parsedValidationDebounceMs === null ||
      parsedValidationDebounceMs < 0 ||
      parsedValidationDebounceMs > 30_000
    ) {
      return modalSemanticStateSeed;
    }

    let replacementValue: string | null = null;
    if (formData.replacementMode === 'dynamic') {
      const recipe = buildDynamicRecipeFromForm(formData);
      if (!recipe) return modalSemanticStateSeed;
      replacementValue = encodeDynamicReplacementRecipe(recipe);
    } else {
      replacementValue = formData.replacementValue.length > 0 ? formData.replacementValue : null;
    }

    return (
      buildValidationPayload({
        formData,
        sequenceGroups,
        editingPattern,
        semanticState: modalSemanticStateSeed,
        replacementValue,
        parsedSequence,
        parsedMaxExecutions,
        parsedValidationDebounceMs,
      }).semanticState ?? null
    );
  }, [editingPattern, formData, modalSemanticStateSeed, sequenceGroups]);

  const modalSemanticTransition = useMemo(
    () =>
      getProductValidationSemanticTransition({
        previous: modalSemanticStateSeed,
        current: modalSemanticState,
      }),
    [modalSemanticState, modalSemanticStateSeed]
  );

  const sequenceScopedPatternIds = useMemo(() => {
    const ids = new Set<string>();
    sequenceGroups.forEach((group) => {
      group.patternIds.forEach((patternId) => ids.add(patternId));
    });
    return ids;
  }, [sequenceGroups]);

  const firstPatternIdByGroup = useMemo(() => {
    const map = new Map<string, string>();
    sequenceGroups.forEach((group, groupId) => {
      if (group.patternIds.length > 0) {
        map.set(groupId, group.patternIds[0]!);
      }
    });
    return map;
  }, [sequenceGroups]);

  const resetSimulator = useCallback((): void => {
    setSimulatorScope('product_edit');
    setSimulatorValues({});
    setSimulatorCategoryFixtures('');
  }, []);

  const testResult = useMemo(
    () =>
      buildAndSimulateValidatorPatternPreview({
        formData,
        sequenceGroups,
        orderedPatterns,
        editingPattern,
        modalSemanticState,
        validationScope: simulatorScope,
        simulatorValues,
        categoryFixturesText: simulatorCategoryFixtures,
      }),
    [
      editingPattern,
      formData,
      modalSemanticState,
      orderedPatterns,
      sequenceGroups,
      simulatorCategoryFixtures,
      simulatorScope,
      simulatorValues,
    ]
  );

  const setSimulatorValue = useCallback((key: string, value: string): void => {
    setSimulatorValues((prev) => {
      if (prev[key] === value) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
  }, []);

  const getGroupDraft = useCallback(
    (groupId: string): SequenceGroupDraft => {
      const existing = groupDrafts[groupId];
      if (existing) return existing;
      const group = sequenceGroups.get(groupId);
      return {
        label: group?.label ?? '',
        debounceMs: String(group?.debounceMs ?? 0),
      };
    },
    [groupDrafts, sequenceGroups]
  );

  const {
    handleMoveGroup,
    handleReorderInGroup: _ignoredHandleReorderInGroup,
    handleMoveToGroup,
    handleRemoveFromGroup,
    handleCreateGroup,
    handleRenameGroup,
    handleUpdateGroupDebounce,
    handleCreateSkuAutoIncrementSequence,
    handleCreateLatestPriceStockSequence,
    handleCreateNameLengthMirrorPattern,
    handleCreateNameCategoryMirrorPattern,
    handleCreateNameMirrorPolishSequence,
    handleSaveSequenceGroup,
    handleUngroup,
  } = createSequenceActions({
    patterns,
    orderedPatterns,
    sequenceGroups,
    getGroupDraft,
    setGroupDrafts,
    createPattern,
    updatePattern,
    queryClient,
    notifySuccess: (msg) => {
      toast(msg, { variant: 'success' });
    },
    notifyError: (msg) => {
      toast(msg, { variant: 'error' });
    },
    notifyInfo: (msg) => {
      toast(msg, { variant: 'info' });
    },
  });

  const handleAddPattern = useCallback((target?: string): void => {
    setEditingPattern(null);
    setModalSemanticState(null);
    setFormData({
      ...EMPTY_FORM,
      target: (target as ProductValidationTarget) || 'name',
    });
    resetSimulator();
    setShowModal(true);
  }, [resetSimulator]);

  const handleEditPattern = useCallback((pattern: ProductValidationPattern): void => {
    setEditingPattern(pattern);
    setModalSemanticState(getProductValidationSemanticState(pattern));
    setFormData(buildFormDataFromPattern(pattern));
    resetSimulator();
    setShowModal(true);
  }, [resetSimulator]);

  const handleDuplicatePattern = useCallback(
    (pattern: ProductValidationPattern): void => {
      setEditingPattern(null);
      setModalSemanticState(getProductValidationSemanticState(pattern));
      const duplicated = buildFormDataFromPattern(pattern);
      duplicated.label = buildDuplicateLabel(
        pattern.label,
        new Set(patterns.map((p) => p.label.toLowerCase()))
      );
      setFormData(duplicated);
      resetSimulator();
      setShowModal(true);
    },
    [patterns, resetSimulator]
  );

  const handleSavePattern = async (): Promise<void> => {
    if (!formData.label.trim() || !formData.regex.trim() || !formData.message.trim()) {
      toast('Please fill in all required fields.', { variant: 'error' });
      return;
    }

    if (!canCompileRegex(formData.regex, formData.flags)) {
      toast('Invalid regular expression.', { variant: 'error' });
      return;
    }

    try {
      const parsedSequence =
        formData.sequence.trim().length === 0 ? null : parseStrictInt(formData.sequence);
      if (formData.sequence.trim().length > 0 && (parsedSequence === null || parsedSequence < 0)) {
        toast('Sequence must be a whole number greater than or equal to 0.', { variant: 'error' });
        return;
      }

      const parsedMaxExecutions = parseStrictInt(formData.maxExecutions);
      if (parsedMaxExecutions === null || parsedMaxExecutions < 1 || parsedMaxExecutions > 20) {
        toast('Max executions must be a whole number between 1 and 20.', { variant: 'error' });
        return;
      }

      const parsedValidationDebounceMs = parseStrictInt(formData.validationDebounceMs);
      if (
        parsedValidationDebounceMs === null ||
        parsedValidationDebounceMs < 0 ||
        parsedValidationDebounceMs > 30_000
      ) {
        toast('Debounce must be a whole number between 0 and 30000.', { variant: 'error' });
        return;
      }

      let replacementValue: string | null = null;
      if (formData.replacementMode === 'dynamic') {
        const recipe = buildDynamicRecipeFromForm(formData);
        if (!recipe) {
          toast('Dynamic replacer config is incomplete.', { variant: 'error' });
          return;
        }
        replacementValue = encodeDynamicReplacementRecipe(recipe);
      } else {
        replacementValue = formData.replacementValue.length > 0 ? formData.replacementValue : null;
      }

      const payload = buildValidationPayload({
        formData,
        sequenceGroups,
        editingPattern,
        semanticState: modalSemanticState,
        replacementValue,
        parsedSequence,
        parsedMaxExecutions,
        parsedValidationDebounceMs,
      });

      if (editingPattern) {
        const changedPayload = buildPatternPayloadDiff(editingPattern, payload);
        if (Object.keys(changedPayload).length === 0) {
          toast('No changes to save.', { variant: 'info' });
          setShowModal(false);
          setModalSemanticState(null);
          return;
        }
        await updatePattern.mutateAsync({ id: editingPattern.id, data: changedPayload });
        toast('Pattern updated.', { variant: 'success' });
      } else {
        await createPattern.mutateAsync(payload as CreateValidationPatternPayload);
        toast('Pattern created.', { variant: 'success' });
      }
      setShowModal(false);
      setModalSemanticState(null);
    } catch (error) {
      logClientCatch(error, {
        source: 'useValidatorSettingsController',
        action: 'savePattern',
        editingId: editingPattern?.id,
      });
      toast(error instanceof Error ? error.message : 'Failed to save pattern.', {
        variant: 'error',
      });
    }
  };

  const handleTogglePattern = useCallback(
    async (pattern: ProductValidationPattern): Promise<void> => {
      try {
        await updatePattern.mutateAsync({
          id: pattern.id,
          data: { enabled: !pattern.enabled },
        });
        toast(`Pattern ${!pattern.enabled ? 'enabled' : 'disabled'}.`, {
          variant: 'success',
        });
      } catch (error) {
        logClientCatch(error, {
          source: 'useValidatorSettingsController',
          action: 'togglePattern',
          patternId: pattern.id,
        });
        toast(error instanceof Error ? error.message : 'Failed to update pattern.', {
          variant: 'error',
        });
      }
    },
    [updatePattern.mutateAsync, toast]
  );

  const handleDeletePattern = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deletePattern.mutateAsync(id);
        toast('Pattern deleted.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, {
          source: 'useValidatorSettingsController',
          action: 'deletePattern',
          patternId: id,
        });
        toast(error instanceof Error ? error.message : 'Failed to delete pattern.', {
          variant: 'error',
        });
      }
    },
    [deletePattern.mutateAsync, toast]
  );

  const handleUpdateSettings = async (
    updates: Partial<{
      enabledByDefault: boolean;
      formatterEnabledByDefault: boolean;
      instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
    }>
  ): Promise<void> => {
    try {
      await updateSettings.mutateAsync(updates);
      toast('Settings updated.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'useValidatorSettingsController',
        action: 'updateSettings',
      });
      toast(error instanceof Error ? error.message : 'Failed to update settings.', {
        variant: 'error',
      });
    }
  };

  const handleToggleDefault = async (enabled: boolean): Promise<void> => {
    await handleUpdateSettings({ enabledByDefault: enabled });
  };

  const handleToggleFormatterDefault = async (enabled: boolean): Promise<void> => {
    await handleUpdateSettings({ formatterEnabledByDefault: enabled });
  };

  const handleInstanceBehaviorChange = async (
    scope: ProductValidationInstanceScope,
    behavior: ProductValidationDenyBehavior
  ): Promise<void> => {
    const nextMap = normalizeProductValidationInstanceDenyBehaviorMap({
      ...(settings?.instanceDenyBehavior ?? {}),
      [scope]: behavior,
    });
    await handleUpdateSettings({ instanceDenyBehavior: nextMap });
  };

  const handleReorder = useCallback(
    async (patternId: string, targetIndex: number): Promise<void> => {
      const nextPatterns = [...patterns];
      const currentIndex = nextPatterns.findIndex((p) => p.id === patternId);
      if (currentIndex === -1) return;

      const [moved] = nextPatterns.splice(currentIndex, 1);
      if (!moved) return;
      nextPatterns.splice(targetIndex, 0, moved);

      const updates: ReorderValidationPatternUpdatePayload[] = nextPatterns.map((p, index) => ({
        id: p.id,
        sequence: (index + 1) * 10,
      }));

      try {
        await reorderPatterns.mutateAsync({ updates });
      } catch (error) {
        logClientCatch(error, {
          source: 'useValidatorSettingsController',
          action: 'reorder',
          patternId,
        });
        toast(error instanceof Error ? error.message : 'Failed to reorder patterns.', {
          variant: 'error',
        });
      }
    },
    [patterns, reorderPatterns.mutateAsync, toast]
  );

  const handleReorderGroupInGroup = useCallback(
    async (_groupId: string, patternId: string, targetIndex: number): Promise<void> => {
      // This is simplified but should satisfy the component's need for now
      await handleReorder(patternId, targetIndex);
    },
    [handleReorder]
  );

  const handleDragStart = useCallback((e: unknown, patternId: string): void => {
    const dragEvent = e as DragEvent;
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.setData('patternId', patternId);
    }
  }, []);

  const handleDrop = useCallback(
    (pattern: ProductValidationPattern, e: unknown): void => {
      const dragEvent = e as DragEvent;
      if (!dragEvent.dataTransfer) return;
      const draggedId =
        dragEvent.dataTransfer.getData('text/plain') || dragEvent.dataTransfer.getData('patternId');
      if (!draggedId || draggedId === pattern.id) return;

      const targetIndex = orderedPatterns.findIndex((p) => p.id === pattern.id);
      if (targetIndex === -1) return;

      const targetGroupId = sequenceScopedPatternIds.has(pattern.id)
        ? pattern.sequenceGroupId?.trim() || null
        : null;
      if (!targetGroupId) {
        void handleReorder(draggedId, targetIndex);
        return;
      }

      const targetGroup = sequenceGroups.get(targetGroupId);
      const targetGroupLabel =
        targetGroup?.label ?? pattern.sequenceGroupLabel ?? 'Sequence / Group';
      const targetGroupDebounceMs = targetGroup?.debounceMs ?? pattern.sequenceGroupDebounceMs ?? 0;

      const nextPatterns = [...patterns];
      const currentIndex = nextPatterns.findIndex((p) => p.id === draggedId);
      if (currentIndex === -1) return;

      const [moved] = nextPatterns.splice(currentIndex, 1);
      if (!moved) return;
      nextPatterns.splice(targetIndex, 0, moved);

      const updates: ReorderValidationPatternUpdatePayload[] = nextPatterns.map((p, index) => {
        const base: ReorderValidationPatternUpdatePayload = {
          id: p.id,
          sequence: (index + 1) * 10,
        };

        if (p.id !== draggedId) return base;

        return {
          ...base,
          sequenceGroupId: targetGroupId,
          sequenceGroupLabel: targetGroupLabel,
          sequenceGroupDebounceMs: targetGroupDebounceMs,
        };
      });

      void reorderPatterns
        .mutateAsync({ updates })
        .then(() => {
          toast('Pattern attached to sequence.', { variant: 'success' });
        })
        .catch((error: unknown) => {
          logClientError(error, {
            context: {
              source: 'useValidatorSettingsController',
              action: 'dropToSequence',
              draggedId,
              targetId: pattern.id,
              targetGroupId,
            },
          });
          toast(error instanceof Error ? error.message : 'Failed to attach pattern to sequence.', {
            variant: 'error',
          });
        });
    },
    [
      orderedPatterns,
      handleReorder,
      sequenceGroups,
      patterns,
      reorderPatterns.mutateAsync,
      sequenceScopedPatternIds,
      toast,
    ]
  );

  const summary = useMemo(
    () => ({
      total: patterns.length,
      enabled: patterns.filter((p) => p.enabled).length,
      replacementEnabled: patterns.filter((p) => p.replacementEnabled).length,
    }),
    [patterns]
  );

  return {
    patterns,
    settings,
    summary,
    orderedPatterns,
    enabledByDefault: settings?.enabledByDefault ?? true,
    formatterEnabledByDefault: settings?.formatterEnabledByDefault ?? false,
    instanceDenyBehavior: normalizeProductValidationInstanceDenyBehaviorMap(
      settings?.instanceDenyBehavior ?? {}
    ),
    loading: patternsQuery.isLoading || settingsQuery.isLoading,
    isUpdating:
      createPattern.isPending ||
      updatePattern.isPending ||
      deletePattern.isPending ||
      reorderPatterns.isPending ||
      updateSettings.isPending,
    settingsBusy: updateSettings.isPending,
    patternActionsPending:
      createPattern.isPending || updatePattern.isPending || deletePattern.isPending,
    reorderPending: reorderPatterns.isPending,
    showModal,
    setShowModal,
    closeModal: () => {
      setShowModal(false);
      setModalSemanticState(null);
    },
    editingPattern,
    modalSemanticState,
    modalSemanticTransition,
    formData,
    setFormData,
    testResult,
    simulatorScope,
    setSimulatorScope,
    simulatorValues,
    setSimulatorValue,
    simulatorCategoryFixtures,
    setSimulatorCategoryFixtures,
    handleSave: handleSavePattern,
    handleSavePattern,
    handleTogglePattern,
    handleDeletePattern,
    handleUpdateSettings,
    handleToggleDefault,
    handleToggleFormatterDefault,
    handleInstanceBehaviorChange,
    handleEditPattern,
    handleDuplicatePattern,
    handleAddPattern,
    handleDragStart,
    handleDrop,
    replacementFieldOptions: REPLACEMENT_FIELD_OPTIONS,
    sourceFieldOptions: getSourceFieldOptionsForTarget(formData.target),
    createPatternPending: createPattern.isPending,
    updatePatternPending: updatePattern.isPending,
    // Helpers
    isLocaleTarget,
    normalizeReplacementFields,
    getReplacementFieldsForTarget,
    getSourceFieldOptionsForTarget,
    formatReplacementFields,
    // Drag state
    draggedPatternId,
    setDraggedPatternId,
    dragOverPatternId,
    setDragOverPatternId,
    handlePatternDrop: handleDrop,
    // Sequence group actions
    sequenceGroups,
    firstPatternIdByGroup,
    getSequenceGroupId: (p: ProductValidationPattern) =>
      sequenceScopedPatternIds.has(p.id) ? p.sequenceGroupId : null,
    handleMoveGroup,
    handleReorderInGroup: handleReorderGroupInGroup,
    handleMoveToGroup,
    handleRemoveFromGroup,
    handleCreateGroup,
    handleRenameGroup,
    handleUpdateGroupDebounce,
    // Specialized creation
    onCreateSkuAutoIncrementSequence: handleCreateSkuAutoIncrementSequence,
    onCreateLatestPriceStockSequence: handleCreateLatestPriceStockSequence,
    handleCreateNameLengthMirrorPattern,
    handleCreateNameCategoryMirrorPattern,
    handleCreateNameMirrorPolishSequence,
    handleSaveSequenceGroup,
    handleUngroup,
    // Deletion
    patternToDelete,
    setPatternToDelete,
    // Drafts
    groupDrafts,
    setGroupDrafts,
    getGroupDraft,
    openCreate: handleAddPattern,
    openEdit: handleEditPattern,
  };
}
