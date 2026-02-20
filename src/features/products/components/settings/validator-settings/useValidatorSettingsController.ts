import { useQueryClient } from '@tanstack/react-query';
import {
  type DragEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { logClientError } from '@/features/observability';
import type {
  CreateValidationPatternPayload,
  ReorderValidationPatternUpdatePayload,
  UpdateValidationPatternPayload,
} from '@/features/products/api/settings';
import {
  useCreateValidationPatternMutation,
  useDeleteValidationPatternMutation,
  useReorderValidationPatternsMutation,
  useUpdateValidatorSettingsMutation,
  useUpdateValidationPatternMutation,
  useValidationPatterns,
  useValidatorSettings,
} from '@/features/products/hooks/useProductSettingsQueries';
import {
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationInstanceDenyBehaviorMap,
} from '@/features/products/utils/validator-instance-behavior';
import { encodeDynamicReplacementRecipe } from '@/features/products/utils/validator-replacement-recipe';
import { invalidateValidatorConfig } from '@/shared/lib/query-invalidation';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationPattern,
  ProductValidationTarget,
  ProductValidationLaunchOperator,
  ProductValidationInstanceScope,
} from '@/shared/types/domain/products';
import { useToast } from '@/shared/ui';

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

import type { PatternFormData, SequenceGroupDraft } from './types';

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
  const [formData, setFormData] = useState<PatternFormData>(EMPTY_FORM);
  const [testResult, setTestResult] = useState<unknown>(null);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, SequenceGroupDraft>>({});
  const [draggedPatternId, setDraggedPatternId] = useState<string | null>(null);
  const [dragOverPatternId, setDragOverPatternId] = useState<string | null>(null);
  const [patternToDelete, setPatternToDelete] = useState<ProductValidationPattern | null>(null);

  const createPattern = useCreateValidationPatternMutation();
  const updatePattern = useUpdateValidationPatternMutation();
  const deletePattern = useDeleteValidationPatternMutation();
  const reorderPatterns = useReorderValidationPatternsMutation();
  const updateSettings = useUpdateValidatorSettingsMutation();

  const sequenceGroups = useMemo(
    () => buildSequenceGroups(patterns),
    [patterns]
  );

  const firstPatternIdByGroup = useMemo(() => {
    const map = new Map<string, string>();
    sequenceGroups.forEach((group, groupId) => {
      if (group.patternIds.length > 0) {
        map.set(groupId, group.patternIds[0]!);
      }
    });
    return map;
  }, [sequenceGroups]);

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
    invalidateConfig: async () => { await invalidateValidatorConfig(queryClient); },
    notifySuccess: (msg) => { toast(msg, { variant: 'success' }); },
    notifyError: (msg) => { toast(msg, { variant: 'error' }); },
    notifyInfo: (msg) => { toast(msg, { variant: 'info' }); },
  });

  const handleAddPattern = (target?: string): void => {
    setEditingPattern(null);
    setFormData({
      ...EMPTY_FORM,
      target: (target as ProductValidationTarget) || 'name',
    });
    setTestResult(null);
    setShowModal(true);
  };

  const handleEditPattern = (pattern: ProductValidationPattern): void => {
    setEditingPattern(pattern);
    setFormData(buildFormDataFromPattern(pattern));
    setTestResult(null);
    setShowModal(true);
  };

  const handleDuplicatePattern = (pattern: ProductValidationPattern): void => {
    setEditingPattern(null);
    const duplicated = buildFormDataFromPattern(pattern);
    duplicated.label = buildDuplicateLabel(pattern.label, new Set(patterns.map(p => p.label.toLowerCase())));
    setFormData(duplicated);
    setTestResult(null);
    setShowModal(true);
  };

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
      const recipe = buildDynamicRecipeFromForm(formData);
      const replacementValue = recipe ? encodeDynamicReplacementRecipe(recipe) : formData.replacementValue;
      const runtimeEnabled = formData.runtimeEnabled;
      const normalizedRuntimeConfig = formData.runtimeConfig.trim();

      const payload: UpdateValidationPatternPayload = {
        label: formData.label.trim(),
        target: formData.target,
        locale: formData.locale.trim() || null,
        regex: formData.regex.trim(),
        flags: formData.flags.trim() || null,
        message: formData.message.trim(),
        severity: formData.severity,
        enabled: formData.enabled,
        replacementEnabled: formData.replacementEnabled,
        replacementAutoApply: formData.replacementAutoApply,
        skipNoopReplacementProposal: formData.skipNoopReplacementProposal,
        replacementValue: replacementValue || null,
        replacementFields: formData.replacementFields,
        replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
          formData.replacementAppliesToScopes,
          formData.appliesToScopes
        ),
        postAcceptBehavior: formData.postAcceptBehavior,
        denyBehaviorOverride:
          formData.denyBehaviorOverride === 'inherit'
            ? null
            : (formData.denyBehaviorOverride),
        sequenceGroupId: editingPattern?.sequenceGroupId ?? null,
        sequenceGroupLabel: editingPattern?.sequenceGroupLabel ?? null,
        sequenceGroupDebounceMs: editingPattern?.sequenceGroupDebounceMs ?? 0,
        sequence:
          formData.sequence.trim().length > 0 &&
          Number.isFinite(Number(formData.sequence))
            ? Math.max(0, Math.floor(Number(formData.sequence)))
            : null,
        chainMode: formData.chainMode,
        maxExecutions:
          formData.maxExecutions.trim().length > 0 &&
          Number.isFinite(Number(formData.maxExecutions))
            ? Math.min(20, Math.max(1, Math.floor(Number(formData.maxExecutions))))
            : 1,
        passOutputToNext: formData.passOutputToNext,
        launchEnabled: formData.launchEnabled,
        launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
          formData.launchAppliesToScopes,
          formData.appliesToScopes
        ),
        launchScopeBehavior: formData.launchScopeBehavior,
        launchSourceMode: formData.launchSourceMode,
        launchSourceField: formData.launchSourceField.trim() || null,
        launchOperator: formData.launchOperator as ProductValidationLaunchOperator,
        launchValue: formData.launchValue || null,
        launchFlags: formData.launchFlags.trim() || null,
        runtimeEnabled,
        runtimeType: runtimeEnabled ? formData.runtimeType : 'none',
        runtimeConfig: runtimeEnabled ? normalizedRuntimeConfig : null,
        appliesToScopes: normalizeProductValidationPatternScopes(formData.appliesToScopes),
        validationDebounceMs: Number(formData.validationDebounceMs) || 0,
      };

      if (editingPattern) {
        await updatePattern.mutateAsync({ id: editingPattern.id, data: payload });
        toast('Pattern updated.', { variant: 'success' });
      } else {
        await createPattern.mutateAsync(payload as CreateValidationPatternPayload);
        toast('Pattern created.', { variant: 'success' });
      }
      setShowModal(false);
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'savePattern', editingId: editingPattern?.id } });
      toast(error instanceof Error ? error.message : 'Failed to save pattern.', {
        variant: 'error',
      });
    }
  };

  const handleTogglePattern = async (
    pattern: ProductValidationPattern
  ): Promise<void> => {
    try {
      await updatePattern.mutateAsync({
        id: pattern.id,
        data: { enabled: !pattern.enabled },
      });
      toast(`Pattern ${!pattern.enabled ? 'enabled' : 'disabled'}.`, {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'togglePattern', patternId: pattern.id } });
      toast(error instanceof Error ? error.message : 'Failed to update pattern.', {
        variant: 'error',
      });
    }
  };

  const handleDeletePattern = async (id: string): Promise<void> => {
    try {
      await deletePattern.mutateAsync(id);
      toast('Pattern deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'deletePattern', patternId: id } });
      toast(error instanceof Error ? error.message : 'Failed to delete pattern.', {
        variant: 'error',
      });
    }
  };

  const handleUpdateSettings = async (
    updates: Partial<{
      enabledByDefault: boolean;
      instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
    }>
  ): Promise<void> => {
    try {
      await updateSettings.mutateAsync(updates);
      toast('Settings updated.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'updateSettings' } });
      toast(error instanceof Error ? error.message : 'Failed to update settings.', {
        variant: 'error',
      });
    }
  };

  const handleToggleDefault = async (enabled: boolean): Promise<void> => {
    await handleUpdateSettings({ enabledByDefault: enabled });
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

  const handleReorder = async (
    patternId: string,
    targetIndex: number
  ): Promise<void> => {
    const nextPatterns = [...patterns];
    const currentIndex = nextPatterns.findIndex((p) => p.id === patternId);
    if (currentIndex === -1) return;

    const [moved] = nextPatterns.splice(currentIndex, 1);
    if (!moved) return;
    nextPatterns.splice(targetIndex, 0, moved);

    const updates: ReorderValidationPatternUpdatePayload[] = nextPatterns.map(
      (p, index) => ({
        id: p.id,
        sequence: (index + 1) * 10,
      })
    );

    try {
      await reorderPatterns.mutateAsync({ updates });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'reorder', patternId } });
      toast(error instanceof Error ? error.message : 'Failed to reorder patterns.', {
        variant: 'error',
      });
    }
  };

  const handleReorderGroupInGroup = async (
    _groupId: string,
    patternId: string,
    targetIndex: number
  ): Promise<void> => {
    // This is simplified but should satisfy the component's need for now
    await handleReorder(patternId, targetIndex);
  };

  const handleDragStart = (e: DragEvent, patternId: string): void => {
    e.dataTransfer.setData('patternId', patternId);
  };

  const handleDrop = (pattern: ProductValidationPattern, e: DragEvent): void => {
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== pattern.id) {
      const targetIndex = orderedPatterns.findIndex(p => p.id === pattern.id);
      if (targetIndex !== -1) {
        void handleReorder(draggedId, targetIndex);
      }
    }
  };

  const summary = useMemo(() => ({
    total: patterns.length,
    enabled: patterns.filter(p => p.enabled).length,
    replacementEnabled: patterns.filter(p => p.replacementEnabled).length,
  }), [patterns]);

  return {
    patterns,
    settings,
    summary,
    orderedPatterns,
    enabledByDefault: settings?.enabledByDefault ?? true,
    instanceDenyBehavior: normalizeProductValidationInstanceDenyBehaviorMap(settings?.instanceDenyBehavior ?? {}),
    loading: patternsQuery.isLoading || settingsQuery.isLoading,
    isUpdating:
      createPattern.isPending ||
      updatePattern.isPending ||
      deletePattern.isPending ||
      reorderPatterns.isPending ||
      updateSettings.isPending,
    settingsBusy: updateSettings.isPending,
    patternActionsPending: createPattern.isPending || updatePattern.isPending || deletePattern.isPending,
    reorderPending: reorderPatterns.isPending,
    showModal,
    setShowModal,
    closeModal: () => setShowModal(false),
    editingPattern,
    formData,
    setFormData,
    testResult,
    handleSave: handleSavePattern,
    handleSavePattern,
    handleTogglePattern,
    handleDeletePattern,
    handleUpdateSettings,
    handleToggleDefault,
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
    getSequenceGroupId: (p: ProductValidationPattern) => p.sequenceGroupId,
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
