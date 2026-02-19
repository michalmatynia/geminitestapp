import { useQueryClient } from '@tanstack/react-query';
import {
  type DragEvent,
  useMemo,
  useState,
} from 'react';

import { logClientError } from '@/features/observability';
import type { ReorderValidationPatternUpdatePayload, UpdateValidationPatternPayload } from '@/features/products/api/settings';
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
} from '@/features/products/utils/validator-instance-behavior';
import { invalidateValidatorConfig } from '@/shared/lib/query-invalidation';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationPattern,
} from '@/shared/types/domain/products';
import { useToast } from '@/shared/ui';

import { INSTANCE_SCOPE_LABELS } from './constants';
import { buildFormDataFromPattern } from './controller-form-utils';
import { createSequenceActions } from './controller-sequence-actions';
import {
  buildDynamicRecipeFromForm,
  buildDuplicateLabel,
  buildSequenceGroups,
  canCompileRegex,
  createSequenceGroupId,
  EMPTY_FORM,
  formatReplacementFields,
  getReplacementFieldsForTarget,
} from './helpers';
import type { PatternFormData, SequenceGroupView } from './types';

export function useValidatorSettingsController() {
  const queryClient = useQueryClient();
  const patternsQuery = useValidationPatterns();
  const settingsQuery = useValidatorSettings();
  const toast = useToast();

  const patterns = patternsQuery.data ?? [];
  const settings = settingsQuery.data;

  const [showModal, setShowModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ProductValidationPattern | null>(null);
  const [formData, setFormData] = useState<PatternFormData>(EMPTY_FORM);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const createPattern = useCreateValidationPatternMutation();
  const updatePattern = useUpdateValidationPatternMutation();
  const deletePattern = useDeleteValidationPatternMutation();
  const reorderPatterns = useReorderValidationPatternsMutation();
  const updateSettings = useUpdateValidatorSettingsMutation();

  const sequenceGroups = useMemo(
    () => buildSequenceGroups(patterns),
    [patterns]
  );

  const {
    handleMoveGroup,
    handleReorderInGroup,
    handleMoveToGroup,
    handleRemoveFromGroup,
    handleCreateGroup,
    handleRenameGroup,
    handleUpdateGroupDebounce,
  } = createSequenceActions({
    patterns,
    reorderPatterns,
    toast,
  });

  const handleAddPattern = (target?: string): void => {
    setEditingPattern(null);
    setFormData({
      ...EMPTY_FORM,
      target: (target as any) || 'name',
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
    duplicated.label = buildDuplicateLabel(pattern.label, patterns.map(p => p.label));
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
      const replacementValue = buildDynamicRecipeFromForm(formData);
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
        replacementValue,
        replacementFields: formData.replacementFields,
        replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
          formData.replacementAppliesToScopes,
          formData.appliesToScopes
        ),
        postAcceptBehavior: formData.postAcceptBehavior,
        denyBehaviorOverride:
          formData.denyBehaviorOverride === 'inherit'
            ? null
            : (formData.denyBehaviorOverride as ProductValidationDenyBehavior),
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
        launchOperator: formData.launchOperator,
        launchValue: formData.launchValue,
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
        await createPattern.mutateAsync(payload as any);
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

  const handleDragStart = (e: DragEvent, patternId: string): void => {
    e.dataTransfer.setData('patternId', patternId);
  };

  const handleDrop = (e: DragEvent, targetIndex: number): void => {
    const patternId = e.dataTransfer.getData('patternId');
    if (patternId) {
      void handleReorder(patternId, targetIndex);
    }
  };

  return {
    patterns,
    settings,
    loading: patternsQuery.isLoading || settingsQuery.isLoading,
    isUpdating:
      createPattern.isPending ||
      updatePattern.isPending ||
      deletePattern.isPending ||
      reorderPatterns.isPending ||
      updateSettings.isPending,
    showModal,
    setShowModal,
    editingPattern,
    formData,
    setFormData,
    isTestRunning,
    testResult,
    handleSavePattern,
    handleTogglePattern,
    handleDeletePattern,
    handleUpdateSettings,
    handleEditPattern,
    handleDuplicatePattern,
    handleAddPattern,
    handleDragStart,
    handleDrop,
    // Sequence group actions
    sequenceGroups,
    handleMoveGroup,
    handleReorderInGroup,
    handleMoveToGroup,
    handleRemoveFromGroup,
    handleCreateGroup,
    handleRenameGroup,
    handleUpdateGroupDebounce,
  };
}
