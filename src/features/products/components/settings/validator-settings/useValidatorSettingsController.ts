import { useQueryClient } from '@tanstack/react-query';
import {
  type Dispatch,
  type DragEvent,
  type SetStateAction,
  useMemo,
  useState,
} from 'react';

import { logClientError } from '@/features/observability';
import type { ReorderValidationPatternUpdatePayload } from '@/features/products/api/settings';
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
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationInstanceDenyBehaviorMap,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/features/products/utils/validator-instance-behavior';
import { encodeDynamicReplacementRecipe } from '@/features/products/utils/validator-replacement-recipe';
import { invalidateValidatorConfig } from '@/shared/lib/query-invalidation';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
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
  getSequenceGroupId,
  getSourceFieldOptionsForTarget,
  isLocaleTarget,
  normalizeReplacementFields,
  normalizeSequenceGroupDebounceMs,
  reorderPatterns,
  REPLACEMENT_FIELD_OPTIONS,
  sortPatternsBySequence,
} from './helpers';

import type {
  PatternFormData,
  SequenceGroupDraft,
} from './types';

export type ValidatorSettingsController = {
  enabledByDefault: boolean;
  instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
  settingsBusy: boolean;
  loading: boolean;
  summary: { total: number; enabled: number };
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  patternActionsPending: boolean;
  reorderPending: boolean;
  createPatternPending: boolean;
  updatePatternPending: boolean;
  draggedPatternId: string | null;
  dragOverPatternId: string | null;
  setDraggedPatternId: Dispatch<SetStateAction<string | null>>;
  setDragOverPatternId: Dispatch<SetStateAction<string | null>>;
  sequenceGroups: Map<
    string,
    { id: string; label: string; debounceMs: number; patternIds: string[] }
  >;
  firstPatternIdByGroup: Map<string, string>;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  setGroupDrafts: Dispatch<SetStateAction<Record<string, SequenceGroupDraft>>>;
  getSequenceGroupId: (pattern: ProductValidationPattern) => string | null;
  formatReplacementFields: (fields: string[] | null | undefined) => string;
  showModal: boolean;
  editingPattern: ProductValidationPattern | null;
  formData: PatternFormData;
  setFormData: Dispatch<SetStateAction<PatternFormData>>;
  patternToDelete: ProductValidationPattern | null;
  setPatternToDelete: Dispatch<SetStateAction<ProductValidationPattern | null>>;
  replacementFieldOptions: Array<{ value: string; label: string }>;
  sourceFieldOptions: Array<{ value: string; label: string }>;
  openCreate: () => void;
  openEdit: (pattern: ProductValidationPattern) => void;
  closeModal: () => void;
  handleSave: () => Promise<void>;
  handleTogglePattern: (pattern: ProductValidationPattern) => Promise<void>;
  handleToggleDefault: () => Promise<void>;
  handleInstanceBehaviorChange: (
    scope: ProductValidationInstanceScope,
    behavior: ProductValidationDenyBehavior,
  ) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleDuplicatePattern: (pattern: ProductValidationPattern) => Promise<void>;
  handlePatternDrop: (
    targetPattern: ProductValidationPattern,
    event: DragEvent<HTMLDivElement>,
  ) => Promise<void>;
  handleCreateSkuAutoIncrementSequence: () => Promise<void>;
  handleCreateLatestPriceStockSequence: () => Promise<void>;
  handleCreateNameLengthMirrorPattern: () => Promise<void>;
  handleCreateNameCategoryMirrorPattern: () => Promise<void>;
  handleCreateNameMirrorPolishSequence: () => Promise<void>;
  handleSaveSequenceGroup: (groupId: string) => Promise<void>;
  handleUngroup: (groupId: string) => Promise<void>;
  isLocaleTarget: (target: PatternFormData['target']) => boolean;
  getReplacementFieldsForTarget: (target: PatternFormData['target']) => string[];
  getSourceFieldOptionsForTarget: (
    target: PatternFormData['target'],
  ) => Array<{ value: string; label: string }>;
  normalizeReplacementFields: (fields: string[] | null | undefined) => string[];
};

export function useValidatorSettingsController(): ValidatorSettingsController {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const settingsQuery = useValidatorSettings();
  const patternsQuery = useValidationPatterns();

  const updateSettings = useUpdateValidatorSettingsMutation();
  const createPattern = useCreateValidationPatternMutation();
  const updatePattern = useUpdateValidationPatternMutation();
  const deletePattern = useDeleteValidationPatternMutation();
  const reorderPatternsMutation = useReorderValidationPatternsMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingPattern, setEditingPattern] =
    useState<ProductValidationPattern | null>(null);
  const [formData, setFormData] = useState<PatternFormData>(EMPTY_FORM);
  const [patternToDelete, setPatternToDelete] =
    useState<ProductValidationPattern | null>(null);
  const [draggedPatternId, setDraggedPatternId] = useState<string | null>(null);
  const [dragOverPatternId, setDragOverPatternId] = useState<string | null>(null);
  const [reorderPending, setReorderPending] = useState(false);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, SequenceGroupDraft>>(
    {}
  );

  const patterns = patternsQuery.data ?? [];
  const orderedPatterns = useMemo(() => sortPatternsBySequence(patterns), [patterns]);
  const sequenceGroups = useMemo(
    () => buildSequenceGroups(orderedPatterns),
    [orderedPatterns]
  );
  const firstPatternIdByGroup = useMemo(() => {
    const map = new Map<string, string>();
    for (const pattern of orderedPatterns) {
      const groupId = getSequenceGroupId(pattern);
      if (!groupId || map.has(groupId)) continue;
      map.set(groupId, pattern.id);
    }
    return map;
  }, [orderedPatterns]);
  const enabledByDefault = settingsQuery.data?.enabledByDefault ?? true;
  const instanceDenyBehavior = useMemo(
    (): ProductValidationInstanceDenyBehaviorMap =>
      normalizeProductValidationInstanceDenyBehaviorMap(
        settingsQuery.data?.instanceDenyBehavior ?? null
      ),
    [settingsQuery.data?.instanceDenyBehavior]
  );
  const loading = settingsQuery.isLoading || patternsQuery.isLoading;

  const replacementFieldOptions = useMemo(
    () =>
      REPLACEMENT_FIELD_OPTIONS.filter((option) =>
        getReplacementFieldsForTarget(formData.target).includes(option.value)
      ),
    [formData.target]
  );
  const sourceFieldOptions = useMemo(
    () => getSourceFieldOptionsForTarget(formData.target),
    [formData.target]
  );

  const summary = useMemo((): { total: number; enabled: number } => {
    const total = patterns.length;
    const enabled = patterns.filter((pattern: ProductValidationPattern) => pattern.enabled)
      .length;
    return { total, enabled };
  }, [patterns]);

  const patternActionsPending =
    createPattern.isPending ||
    updatePattern.isPending ||
    deletePattern.isPending ||
    reorderPatternsMutation.isPending ||
    reorderPending;

  const getGroupDraft = (groupId: string): SequenceGroupDraft => {
    const existing = groupDrafts[groupId];
    if (existing) return existing;
    const group = sequenceGroups.get(groupId);
    return {
      label: group?.label ?? 'Sequence / Group',
      debounceMs: String(group?.debounceMs ?? 0),
    };
  };

  const openCreate = (): void => {
    setEditingPattern(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (pattern: ProductValidationPattern): void => {
    setEditingPattern(pattern);
    setFormData(buildFormDataFromPattern(pattern));
    setShowModal(true);
  };

  const closeModal = (): void => {
    setShowModal(false);
  };

  const handleSave = async (): Promise<void> => {
    if (!formData.label.trim()) {
      toast('Pattern label is required.', { variant: 'error' });
      return;
    }
    if (!formData.regex.trim()) {
      toast('Regex is required.', { variant: 'error' });
      return;
    }
    if (!formData.message.trim()) {
      toast('Issue message is required.', { variant: 'error' });
      return;
    }
    if (!canCompileRegex(formData.regex.trim(), formData.flags.trim())) {
      toast('Regex or regex flags are invalid.', { variant: 'error' });
      return;
    }
    if (formData.replacementEnabled) {
      if (formData.replacementMode === 'static' && !formData.replacementValue.trim()) {
        toast('Replacement value is required when replacer is ON.', {
          variant: 'error',
        });
        return;
      }
      if (
        formData.replacementMode === 'dynamic' &&
        (formData.sourceMode === 'form_field' ||
          formData.sourceMode === 'latest_product_field') &&
        !formData.sourceField.trim()
      ) {
        toast('Dynamic replacer requires a source field.', { variant: 'error' });
        return;
      }
      if (
        formData.replacementMode === 'dynamic' &&
        formData.sourceMatchGroup.trim().length > 0 &&
        (!Number.isFinite(Number(formData.sourceMatchGroup)) ||
          Number(formData.sourceMatchGroup) < 0)
      ) {
        toast('Source capture group must be a non-negative integer.', {
          variant: 'error',
        });
        return;
      }
      if (
        formData.replacementMode === 'dynamic' &&
        formData.sourceRegex.trim().length > 0 &&
        !canCompileRegex(formData.sourceRegex.trim(), formData.sourceFlags.trim())
      ) {
        toast('Dynamic source regex or flags are invalid.', { variant: 'error' });
        return;
      }
      if (formData.replacementMode === 'dynamic' && formData.logicOperator === 'regex') {
        if (!formData.logicOperand.trim()) {
          toast('Dynamic regex condition requires an operand.', { variant: 'error' });
          return;
        }
        if (!canCompileRegex(formData.logicOperand.trim(), formData.logicFlags.trim())) {
          toast('Dynamic regex condition pattern or flags are invalid.', {
            variant: 'error',
          });
          return;
        }
      }
    }
    if (
      formData.launchEnabled &&
      (formData.launchSourceMode === 'form_field' ||
        formData.launchSourceMode === 'latest_product_field') &&
      !formData.launchSourceField.trim()
    ) {
      toast('Launch condition requires a source field.', { variant: 'error' });
      return;
    }
    if (formData.launchEnabled && formData.launchOperator === 'regex') {
      if (!formData.launchValue.trim()) {
        toast('Launch regex condition requires a pattern.', { variant: 'error' });
        return;
      }
      if (!canCompileRegex(formData.launchValue.trim(), formData.launchFlags.trim())) {
        toast('Launch regex pattern or flags are invalid.', { variant: 'error' });
        return;
      }
    }
    let normalizedRuntimeConfig: string | null = null;
    const runtimeEnabled = formData.runtimeEnabled && formData.runtimeType !== 'none';
    if (runtimeEnabled && !formData.runtimeConfig.trim()) {
      toast('Runtime config JSON is required when runtime is enabled.', {
        variant: 'error',
      });
      return;
    }
    if (formData.runtimeConfig.trim()) {
      try {
        const parsed = JSON.parse(formData.runtimeConfig) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          toast('Runtime config must be a JSON object.', { variant: 'error' });
          return;
        }
        normalizedRuntimeConfig = JSON.stringify(parsed);
      } catch {
        toast('Runtime config must be valid JSON.', { variant: 'error' });
        return;
      }
    }

    try {
      let replacementValue: string | null = null;
      if (formData.replacementEnabled) {
        if (formData.replacementMode === 'static') {
          replacementValue = formData.replacementValue.trim() || null;
        } else {
          const recipe = buildDynamicRecipeFromForm(formData);
          if (!recipe) {
            toast('Invalid dynamic replacer configuration.', { variant: 'error' });
            return;
          }
          replacementValue = encodeDynamicReplacementRecipe(recipe);
        }
      }

      const payload = {
        validationDebounceMs:
          formData.validationDebounceMs.trim().length > 0 &&
          Number.isFinite(Number(formData.validationDebounceMs))
            ? Math.min(
              30_000,
              Math.max(0, Math.floor(Number(formData.validationDebounceMs)))
            )
            : 0,
        label: formData.label.trim(),
        target: formData.target,
        locale: isLocaleTarget(formData.target)
          ? formData.locale.trim().toLowerCase() || null
          : null,
        regex: formData.regex.trim(),
        flags: formData.flags.trim() || null,
        message: formData.message.trim(),
        severity: formData.severity,
        enabled: formData.enabled,
        replacementEnabled: formData.replacementEnabled,
        replacementAutoApply: formData.replacementAutoApply,
        skipNoopReplacementProposal: formData.skipNoopReplacementProposal,
        replacementValue,
        replacementFields: normalizeReplacementFields(formData.replacementFields),
        replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
          formData.replacementAppliesToScopes,
          formData.appliesToScopes
        ),
        postAcceptBehavior: formData.postAcceptBehavior,
        denyBehaviorOverride:
          formData.denyBehaviorOverride === 'inherit'
            ? null
            : formData.denyBehaviorOverride,
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
      };

      if (editingPattern) {
        await updatePattern.mutateAsync({ id: editingPattern.id, data: payload });
        toast('Pattern updated.', { variant: 'success' });
      } else {
        await createPattern.mutateAsync(payload);
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

  const handleToggleDefault = async (): Promise<void> => {
    try {
      await updateSettings.mutateAsync({ enabledByDefault: !enabledByDefault });
      toast(`Validator default set to ${!enabledByDefault ? 'ON' : 'OFF'}.`, {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'toggleDefaultEnabled' } });
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to update validator settings.',
        { variant: 'error' }
      );
    }
  };

  const handleInstanceBehaviorChange = async (
    scope: ProductValidationInstanceScope,
    behavior: ProductValidationDenyBehavior
  ): Promise<void> => {
    const nextSettings: ProductValidationInstanceDenyBehaviorMap = {
      ...instanceDenyBehavior,
      [scope]: behavior,
    };
    try {
      await updateSettings.mutateAsync({ instanceDenyBehavior: nextSettings });
      toast(`Updated deny behavior for ${INSTANCE_SCOPE_LABELS[scope]}.`, {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'updateInstanceBehavior', scope, behavior } });
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to update instance behavior.',
        { variant: 'error' }
      );
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!patternToDelete) return;
    try {
      await deletePattern.mutateAsync(patternToDelete.id);
      toast('Pattern deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'deletePattern', patternId: patternToDelete.id } });
      toast(error instanceof Error ? error.message : 'Failed to delete pattern.', {
        variant: 'error',
      });
    } finally {
      setPatternToDelete(null);
    }
  };

  const handleDuplicatePattern = async (
    pattern: ProductValidationPattern
  ): Promise<void> => {
    const existingLabels = new Set(
      patterns
        .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
        .filter((value: string) => value.length > 0)
    );
    const duplicatedLabel = buildDuplicateLabel(pattern.label, existingLabels);
    try {
      await createPattern.mutateAsync({
        label: duplicatedLabel,
        target: pattern.target,
        locale: pattern.locale,
        regex: pattern.regex,
        flags: pattern.flags,
        message: pattern.message,
        severity: pattern.severity,
        enabled: pattern.enabled,
        replacementEnabled: pattern.replacementEnabled,
        replacementAutoApply: pattern.replacementAutoApply ?? false,
        skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
          pattern.skipNoopReplacementProposal
        ),
        replacementValue: pattern.replacementValue,
        replacementFields: normalizeReplacementFields(pattern.replacementFields),
        replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
          pattern.replacementAppliesToScopes,
          pattern.appliesToScopes
        ),
        postAcceptBehavior: pattern.postAcceptBehavior ?? 'revalidate',
        denyBehaviorOverride: normalizeProductValidationPatternDenyBehaviorOverride(
          pattern.denyBehaviorOverride
        ),
        validationDebounceMs: pattern.validationDebounceMs ?? 0,
        sequenceGroupId: null,
        sequenceGroupLabel: null,
        sequenceGroupDebounceMs: 0,
        sequence:
          typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)
            ? pattern.sequence + 10
            : null,
        chainMode: pattern.chainMode ?? 'continue',
        maxExecutions: pattern.maxExecutions ?? 1,
        passOutputToNext: pattern.passOutputToNext ?? true,
        launchEnabled: pattern.launchEnabled ?? false,
        launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
          pattern.launchAppliesToScopes,
          pattern.appliesToScopes
        ),
        launchScopeBehavior: pattern.launchScopeBehavior ?? 'gate',
        launchSourceMode: pattern.launchSourceMode ?? 'current_field',
        launchSourceField: pattern.launchSourceField ?? null,
        launchOperator: pattern.launchOperator ?? 'equals',
        launchValue: pattern.launchValue ?? '',
        launchFlags: pattern.launchFlags ?? null,
        runtimeEnabled: pattern.runtimeEnabled ?? false,
        runtimeType: pattern.runtimeType ?? 'none',
        runtimeConfig: pattern.runtimeConfig ?? null,
        appliesToScopes: normalizeProductValidationPatternScopes(pattern.appliesToScopes),
      });
      toast('Pattern duplicated.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'duplicatePattern', originalId: pattern.id } });
      toast(
        error instanceof Error ? error.message : 'Failed to duplicate pattern.',
        { variant: 'error' }
      );
    }
  };

  const handlePatternDrop = async (
    targetPattern: ProductValidationPattern,
    event: DragEvent<HTMLDivElement>
  ): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    const draggedId = draggedPatternId || event.dataTransfer.getData('text/plain');
    if (!draggedId) {
      setDragOverPatternId(null);
      return;
    }

    const draggedPattern = orderedPatterns.find(
      (pattern: ProductValidationPattern) => pattern.id === draggedId
    );
    if (!draggedPattern || draggedPattern.id === targetPattern.id) {
      setDraggedPatternId(null);
      setDragOverPatternId(null);
      return;
    }

    const nextOrder =
      reorderPatterns(orderedPatterns, draggedId, targetPattern.id) ?? orderedPatterns;
    const targetCurrentGroupId = getSequenceGroupId(targetPattern);
    const draggedCurrentGroupId = getSequenceGroupId(draggedPattern);
    const nextGroupId = targetCurrentGroupId ?? createSequenceGroupId();
    const nextGroupLabel =
      targetPattern.sequenceGroupLabel?.trim() ||
      draggedPattern.sequenceGroupLabel?.trim() ||
      'Sequence / Group';
    const nextGroupDebounceMs = normalizeSequenceGroupDebounceMs(
      targetPattern.sequenceGroupDebounceMs ?? draggedPattern.sequenceGroupDebounceMs
    );

    setDraggedPatternId(null);
    setDragOverPatternId(null);

    const updateMap = new Map<
      string,
      Partial<Omit<ProductValidationPattern, 'id' | 'createdAt' | 'updatedAt'>>
    >();

    const appendUpdate = (
      id: string,
      patch: Partial<Omit<ProductValidationPattern, 'id' | 'createdAt' | 'updatedAt'>>
    ): void => {
      const current = updateMap.get(id) ?? {};
      updateMap.set(id, { ...current, ...patch });
    };

    for (const [index, pattern] of nextOrder.entries()) {
      const nextSequence = (index + 1) * 10;
      const currentSequence =
        typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)
          ? Math.floor(pattern.sequence)
          : null;
      if (currentSequence !== nextSequence) {
        appendUpdate(pattern.id, { sequence: nextSequence });
      }
    }

    appendUpdate(draggedPattern.id, {
      sequenceGroupId: nextGroupId,
      sequenceGroupLabel: nextGroupLabel,
      sequenceGroupDebounceMs: nextGroupDebounceMs,
    });
    if (!targetCurrentGroupId) {
      appendUpdate(targetPattern.id, {
        sequenceGroupId: nextGroupId,
        sequenceGroupLabel: nextGroupLabel,
        sequenceGroupDebounceMs: nextGroupDebounceMs,
      });
    }

    if (draggedCurrentGroupId && draggedCurrentGroupId !== nextGroupId) {
      const remaining = orderedPatterns.filter(
        (pattern: ProductValidationPattern) =>
          getSequenceGroupId(pattern) === draggedCurrentGroupId &&
          pattern.id !== draggedPattern.id
      );
      if (remaining.length === 1) {
        const lonePattern = remaining[0];
        if (lonePattern) {
          appendUpdate(lonePattern.id, {
            sequenceGroupId: null,
            sequenceGroupLabel: null,
            sequenceGroupDebounceMs: 0,
          });
        }
      }
    }

    const patternById = new Map<string, ProductValidationPattern>(
      orderedPatterns.map((pattern: ProductValidationPattern) => [pattern.id, pattern])
    );
    const updates: ReorderValidationPatternUpdatePayload[] = Array.from(updateMap.entries()).map(
      ([id, data]) => {
        const currentUpdatedAt = patternById.get(id)?.updatedAt;
        const nextUpdate: ReorderValidationPatternUpdatePayload = {
          id,
          expectedUpdatedAt:
            typeof currentUpdatedAt === 'string'
              ? currentUpdatedAt
              : currentUpdatedAt instanceof Date
                ? currentUpdatedAt.toISOString()
                : null,
        };
        if (typeof data.sequence === 'number' && Number.isFinite(data.sequence)) {
          nextUpdate.sequence = Math.max(0, Math.floor(data.sequence));
        }
        if (data.sequenceGroupId !== undefined) {
          nextUpdate.sequenceGroupId = data.sequenceGroupId ?? null;
        }
        if (data.sequenceGroupLabel !== undefined) {
          nextUpdate.sequenceGroupLabel = data.sequenceGroupLabel ?? null;
        }
        if (typeof data.sequenceGroupDebounceMs === 'number') {
          nextUpdate.sequenceGroupDebounceMs = normalizeSequenceGroupDebounceMs(
            data.sequenceGroupDebounceMs
          );
        }
        return nextUpdate;
      }
    );
    if (updates.length === 0) return;

    setReorderPending(true);
    try {
      await reorderPatternsMutation.mutateAsync({ updates });
      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => ({
        ...prev,
        [nextGroupId]: {
          label: nextGroupLabel,
          debounceMs: String(nextGroupDebounceMs),
        },
      }));
      toast('Sequence group updated.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'dropPattern', targetId: targetPattern.id } });
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to update sequence group.',
        { variant: 'error' }
      );
    } finally {
      setReorderPending(false);
    }
  };

  const {
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
    invalidateConfig: async () => {
      await invalidateValidatorConfig(queryClient);
    },
    notifySuccess: (message: string) => {
      toast(message, { variant: 'success' });
    },
    notifyError: (message: string) => {
      toast(message, { variant: 'error' });
    },
    notifyInfo: (message: string) => {
      toast(message, { variant: 'info' });
    },
  });

  return {
    enabledByDefault,
    instanceDenyBehavior,
    settingsBusy: updateSettings.isPending || settingsQuery.isLoading,
    loading,
    summary,
    patterns,
    orderedPatterns,
    patternActionsPending,
    reorderPending,
    createPatternPending: createPattern.isPending,
    updatePatternPending: updatePattern.isPending,
    draggedPatternId,
    dragOverPatternId,
    setDraggedPatternId,
    setDragOverPatternId,
    sequenceGroups,
    firstPatternIdByGroup,
    getGroupDraft,
    setGroupDrafts,
    getSequenceGroupId,
    formatReplacementFields,
    showModal,
    editingPattern,
    formData,
    setFormData,
    patternToDelete,
    setPatternToDelete,
    replacementFieldOptions,
    sourceFieldOptions,
    openCreate,
    openEdit,
    closeModal,
    handleSave,
    handleTogglePattern,
    handleToggleDefault,
    handleInstanceBehaviorChange,
    handleDelete,
    handleDuplicatePattern,
    handlePatternDrop,
    handleCreateSkuAutoIncrementSequence,
    handleCreateLatestPriceStockSequence,
    handleCreateNameLengthMirrorPattern,
    handleCreateNameCategoryMirrorPattern,
    handleCreateNameMirrorPolishSequence,
    handleSaveSequenceGroup,
    handleUngroup,
    isLocaleTarget,
    getReplacementFieldsForTarget,
    getSourceFieldOptionsForTarget,
    normalizeReplacementFields,
  };
}
