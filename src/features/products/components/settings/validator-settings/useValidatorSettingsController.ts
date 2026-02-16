import { useQueryClient } from '@tanstack/react-query';
import {
  type Dispatch,
  type DragEvent,
  type SetStateAction,
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
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationInstanceDenyBehaviorMap,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/features/products/utils/validator-instance-behavior';
import {
  encodeDynamicReplacementRecipe,
  getStaticReplacementValue,
  parseDynamicReplacementRecipe,
} from '@/features/products/utils/validator-replacement-recipe';
import { api } from '@/shared/lib/api-client';
import { invalidateValidatorConfig } from '@/shared/lib/query-invalidation';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/types/domain/products';
import { useToast } from '@/shared/ui';

import { INSTANCE_SCOPE_LABELS } from './constants';
import {
  buildDynamicRecipeFromForm,
  buildDuplicateLabel,
  buildLatestFieldRecipe,
  buildSequenceGroups,
  buildUniqueLabel,
  canCompileRegex,
  createSequenceGroupId,
  EMPTY_FORM,
  formatReplacementFields,
  getPatternSequence,
  getReplacementFieldsForTarget,
  getSequenceGroupId,
  getSourceFieldOptionsForTarget,
  isLatestFieldMirrorPattern,
  isLocaleTarget,
  isNameSecondSegmentDimensionPattern,
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
    const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
    setEditingPattern(pattern);
    setFormData({
      label: pattern.label,
      target: pattern.target,
      locale: pattern.locale ?? '',
      regex: pattern.regex,
      flags: pattern.flags ?? '',
      message: pattern.message,
      severity: pattern.severity,
      enabled: pattern.enabled,
      replacementEnabled: pattern.replacementEnabled,
      replacementAutoApply: pattern.replacementAutoApply ?? false,
      skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
        pattern.skipNoopReplacementProposal
      ),
      replacementValue: getStaticReplacementValue(pattern.replacementValue) ?? '',
      replacementFields: normalizeReplacementFields(pattern.replacementFields),
      replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
        pattern.replacementAppliesToScopes,
        pattern.appliesToScopes
      ),
      postAcceptBehavior: pattern.postAcceptBehavior ?? 'revalidate',
      denyBehaviorOverride:
        normalizeProductValidationPatternDenyBehaviorOverride(
          pattern.denyBehaviorOverride
        ) ?? 'inherit',
      validationDebounceMs: String(pattern.validationDebounceMs ?? 0),
      replacementMode: recipe ? 'dynamic' : 'static',
      sourceMode: recipe?.sourceMode ?? 'current_field',
      sourceField: recipe?.sourceField ?? '',
      sourceRegex: recipe?.sourceRegex ?? '',
      sourceFlags: recipe?.sourceFlags ?? '',
      sourceMatchGroup:
        recipe?.sourceMatchGroup !== undefined && recipe?.sourceMatchGroup !== null
          ? String(recipe.sourceMatchGroup)
          : '',
      launchEnabled: pattern.launchEnabled ?? false,
      launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
        pattern.launchAppliesToScopes,
        pattern.appliesToScopes
      ),
      launchScopeBehavior: pattern.launchScopeBehavior ?? 'gate',
      launchSourceMode: pattern.launchSourceMode ?? 'current_field',
      launchSourceField: pattern.launchSourceField ?? '',
      launchOperator: pattern.launchOperator ?? 'equals',
      launchValue: pattern.launchValue ?? '',
      launchFlags: pattern.launchFlags ?? '',
      mathOperation: recipe?.mathOperation ?? 'none',
      mathOperand:
        recipe?.mathOperand !== undefined && recipe?.mathOperand !== null
          ? String(recipe.mathOperand)
          : '1',
      roundMode: recipe?.roundMode ?? 'none',
      padLength:
        recipe?.padLength !== undefined && recipe?.padLength !== null
          ? String(recipe.padLength)
          : '',
      padChar: recipe?.padChar ?? '0',
      logicOperator: recipe?.logicOperator ?? 'none',
      logicOperand: recipe?.logicOperand ?? '',
      logicFlags: recipe?.logicFlags ?? '',
      logicWhenTrueAction: recipe?.logicWhenTrueAction ?? 'keep',
      logicWhenTrueValue: recipe?.logicWhenTrueValue ?? '',
      logicWhenFalseAction: recipe?.logicWhenFalseAction ?? 'keep',
      logicWhenFalseValue: recipe?.logicWhenFalseValue ?? '',
      resultAssembly: recipe?.resultAssembly ?? 'segment_only',
      targetApply: recipe?.targetApply ?? 'replace_matched_segment',
      sequence:
        pattern.sequence !== null && pattern.sequence !== undefined
          ? String(pattern.sequence)
          : '',
      chainMode: pattern.chainMode ?? 'continue',
      maxExecutions: String(pattern.maxExecutions ?? 1),
      passOutputToNext: pattern.passOutputToNext ?? true,
      runtimeEnabled: pattern.runtimeEnabled ?? false,
      runtimeType:
        (pattern.runtimeEnabled ?? false) && (pattern.runtimeType ?? 'none') === 'none'
          ? 'database_query'
          : pattern.runtimeType ?? 'none',
      runtimeConfig: pattern.runtimeConfig ?? '',
      appliesToScopes: normalizeProductValidationPatternScopes(pattern.appliesToScopes),
    });
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

  const handleCreateSkuAutoIncrementSequence = async (): Promise<void> => {
    const existingLabels = new Set(
      patterns
        .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
        .filter((value: string) => value.length > 0)
    );
    const sequenceGroupId = createSequenceGroupId();
    const sequenceGroupLabel = 'SKU Auto Increment';
    const maxSequence = orderedPatterns.reduce(
      (max: number, pattern: ProductValidationPattern, index: number) =>
        Math.max(max, getPatternSequence(pattern, index)),
      0
    );
    const firstSequence = maxSequence + 10;
    const secondSequence = maxSequence + 20;

    const autoLabel = buildUniqueLabel('SKU Auto Increment (Latest Product)', existingLabels);
    existingLabels.add(autoLabel.toLowerCase());
    const guardLabel = buildUniqueLabel('SKU Auto Increment Guard', existingLabels);

    const replacementRecipe = encodeDynamicReplacementRecipe({
      version: 1,
      sourceMode: 'latest_product_field',
      sourceField: 'sku',
      sourceRegex: '(\\d+)$',
      sourceFlags: null,
      sourceMatchGroup: 1,
      mathOperation: 'add',
      mathOperand: 1,
      roundMode: 'none',
      padLength: 3,
      padChar: '0',
      logicOperator: 'none',
      logicOperand: null,
      logicFlags: null,
      logicWhenTrueAction: 'keep',
      logicWhenTrueValue: null,
      logicWhenFalseAction: 'keep',
      logicWhenFalseValue: null,
      resultAssembly: 'source_replace_match',
      targetApply: 'replace_whole_field',
    });

    try {
      await createPattern.mutateAsync({
        label: autoLabel,
        target: 'sku',
        locale: null,
        regex: '^KEYCHA000$',
        flags: null,
        message: 'Auto-generated SKU proposal from the latest product SKU sequence.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: true,
        replacementValue: replacementRecipe,
        replacementFields: ['sku'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId,
        sequenceGroupLabel,
        sequenceGroupDebounceMs: 300,
        sequence: firstSequence,
        chainMode: 'stop_on_replace',
        maxExecutions: 1,
        passOutputToNext: true,
        launchEnabled: true,
        launchAppliesToScopes: ['draft_template', 'product_create'],
        launchSourceMode: 'current_field',
        launchSourceField: null,
        launchOperator: 'equals',
        launchValue: 'KEYCHA000',
        launchFlags: null,
      });

      await createPattern.mutateAsync({
        label: guardLabel,
        target: 'sku',
        locale: null,
        regex: '^KEYCHA000$',
        flags: null,
        message: 'SKU is still KEYCHA000. Check latest product SKU format or set SKU manually.',
        severity: 'error',
        enabled: true,
        replacementEnabled: false,
        replacementAutoApply: false,
        replacementValue: null,
        replacementFields: ['sku'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId,
        sequenceGroupLabel,
        sequenceGroupDebounceMs: 300,
        sequence: secondSequence,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: false,
        launchEnabled: true,
        launchAppliesToScopes: ['draft_template', 'product_create'],
        launchSourceMode: 'current_field',
        launchSourceField: null,
        launchOperator: 'equals',
        launchValue: 'KEYCHA000',
        launchFlags: null,
      });

      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => ({
        ...prev,
        [sequenceGroupId]: {
          label: sequenceGroupLabel,
          debounceMs: '300',
        },
      }));
      toast('SKU auto-increment sequence created.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'createSkuAutoIncrementSequence' } });
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to create SKU auto-increment sequence.',
        { variant: 'error' }
      );
    }
  };

  const handleCreateLatestPriceStockSequence = async (): Promise<void> => {
    const existingLabels = new Set(
      patterns
        .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
        .filter((value: string) => value.length > 0)
    );
    const maxSequence = orderedPatterns.reduce(
      (max: number, pattern: ProductValidationPattern, index: number) =>
        Math.max(max, getPatternSequence(pattern, index)),
      0
    );
    const firstSequence = maxSequence + 10;
    const secondSequence = maxSequence + 20;

    const priceLabel = buildUniqueLabel('Price from latest product', existingLabels);
    existingLabels.add(priceLabel.toLowerCase());
    const stockLabel = buildUniqueLabel('Stock from latest product', existingLabels);

    try {
      const pricePatternData: CreateValidationPatternPayload = {
        label: priceLabel,
        target: 'price',
        locale: null,
        regex: '^.*$',
        flags: null,
        message:
          'Auto-propose price from the latest created product when current price is empty or 0.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: false,
        skipNoopReplacementProposal: true,
        replacementValue: buildLatestFieldRecipe('price'),
        replacementFields: ['price'],
        replacementAppliesToScopes: ['draft_template', 'product_create'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId: null,
        sequenceGroupLabel: null,
        sequenceGroupDebounceMs: 0,
        sequence: firstSequence,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: false,
        launchEnabled: true,
        launchAppliesToScopes: ['product_create'],
        launchScopeBehavior: 'condition_only',
        launchSourceMode: 'current_field',
        launchSourceField: null,
        launchOperator: 'regex',
        launchValue: '^\\s*(?:0+)?\\s*$',
        launchFlags: null,
        appliesToScopes: ['draft_template', 'product_create'],
      };

      const stockPatternData: CreateValidationPatternPayload = {
        label: stockLabel,
        target: 'stock',
        locale: null,
        regex: '^.*$',
        flags: null,
        message:
          'Auto-propose stock from the latest created product when current stock is empty or 0.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: false,
        skipNoopReplacementProposal: true,
        replacementValue: buildLatestFieldRecipe('stock'),
        replacementFields: ['stock'],
        replacementAppliesToScopes: ['draft_template', 'product_create'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId: null,
        sequenceGroupLabel: null,
        sequenceGroupDebounceMs: 0,
        sequence: secondSequence,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: false,
        launchEnabled: true,
        launchAppliesToScopes: ['product_create'],
        launchScopeBehavior: 'condition_only',
        launchSourceMode: 'current_field',
        launchSourceField: null,
        launchOperator: 'regex',
        launchValue: '^\\s*(?:0+)?\\s*$',
        launchFlags: null,
        appliesToScopes: ['draft_template', 'product_create'],
      };

      const existingPricePattern = patterns.find((pattern: ProductValidationPattern) =>
        isLatestFieldMirrorPattern(pattern, 'price')
      );
      if (existingPricePattern) {
        const priceUpdateData: UpdateValidationPatternPayload = {
          ...pricePatternData,
          label: existingPricePattern.label,
        };
        await updatePattern.mutateAsync({
          id: existingPricePattern.id,
          data: priceUpdateData,
        });
      } else {
        await createPattern.mutateAsync(pricePatternData);
      }

      const existingStockPattern = patterns.find((pattern: ProductValidationPattern) =>
        isLatestFieldMirrorPattern(pattern, 'stock')
      );
      if (existingStockPattern) {
        const stockUpdateData: UpdateValidationPatternPayload = {
          ...stockPatternData,
          label: existingStockPattern.label,
        };
        await updatePattern.mutateAsync({
          id: existingStockPattern.id,
          data: stockUpdateData,
        });
      } else {
        await createPattern.mutateAsync(stockPatternData);
      }

      toast('Latest price & stock sequence created or updated.', {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'createLatestPriceStockSequence' } });
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to create latest price & stock sequence.',
        { variant: 'error' }
      );
    }
  };

  const createNameSecondSegmentDimensionPattern = async ({
    target,
    labelBase,
    message,
    replacementField,
  }: {
    target: 'size_length' | 'length';
    labelBase: string;
    message: string;
    replacementField: 'sizeLength' | 'length';
  }): Promise<void> => {
    const existingLabels = new Set(
      patterns
        .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
        .filter((value: string) => value.length > 0)
    );
    const label = buildUniqueLabel(labelBase, existingLabels);
    const maxSequence = orderedPatterns.reduce(
      (max: number, pattern: ProductValidationPattern, index: number) =>
        Math.max(max, getPatternSequence(pattern, index)),
      0
    );

    const replacementRecipe = encodeDynamicReplacementRecipe({
      version: 1,
      sourceMode: 'form_field',
      sourceField: 'name_en',
      sourceRegex: '^\\s*[^|]+\\|\\s*([0-9]+(?:[.,][0-9]+)?)',
      sourceFlags: 'i',
      sourceMatchGroup: 1,
      mathOperation: 'none',
      mathOperand: null,
      roundMode: 'none',
      padLength: null,
      padChar: null,
      logicOperator: 'regex',
      logicOperand: '^[0-9]+(?:[.,][0-9]+)?$',
      logicFlags: null,
      logicWhenTrueAction: 'keep',
      logicWhenTrueValue: null,
      logicWhenFalseAction: 'abort',
      logicWhenFalseValue: null,
      resultAssembly: 'segment_only',
      targetApply: 'replace_whole_field',
    });

    const payload: CreateValidationPatternPayload = {
      label,
      target,
      locale: null,
      regex: '^.*$',
      flags: null,
      message,
      severity: 'warning',
      enabled: true,
      replacementEnabled: true,
      replacementAutoApply: false,
      skipNoopReplacementProposal: true,
      replacementValue: replacementRecipe,
      replacementFields: [replacementField],
      replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      postAcceptBehavior: 'revalidate',
      validationDebounceMs: 250,
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence: maxSequence + 10,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: false,
      launchEnabled: true,
      launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      launchScopeBehavior: 'gate',
      launchSourceMode: 'form_field',
      launchSourceField: 'name_en',
      launchOperator: 'regex',
      launchValue:
        '^\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*$',
      launchFlags: null,
      appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    };

    const existing = patterns.find((pattern: ProductValidationPattern) =>
      isNameSecondSegmentDimensionPattern(pattern, target)
    );
    if (existing) {
      await updatePattern.mutateAsync({
        id: existing.id,
        data: {
          ...payload,
          label: existing.label,
        },
      });
    } else {
      await createPattern.mutateAsync(payload);
    }
  };

  const handleCreateNameLengthMirrorPattern = async (): Promise<void> => {
    try {
      const templateResult = await api.post<{
        outcomes?: Array<{
          action?: string;
          target?: string;
        }>;
      }>(
        '/api/products/validator-patterns/templates/name-segment-dimensions',
        {},
        { logError: false }
      );
      await invalidateValidatorConfig(queryClient);
      const createdCount = (templateResult.outcomes ?? []).filter(
        (item) => item.action === 'created'
      ).length;
      toast('Name segment -> Length & Height patterns created or updated.', {
        variant: 'success',
      });
      if (createdCount > 0) {
        toast(
          createdCount === 1
            ? '1 new pattern was created from the template.'
            : `${createdCount} new patterns were created from the template.`,
          { variant: 'info' }
        );
      }
    } catch (error) {
      try {
        await createNameSecondSegmentDimensionPattern({
          target: 'size_length',
          labelBase: 'Name Segment #2 -> Length',
          message:
            'Propose Length (sizeLength) from Name segment #2 (between first and second "|").',
          replacementField: 'sizeLength',
        });
        await createNameSecondSegmentDimensionPattern({
          target: 'length',
          labelBase: 'Name Segment #2 -> Height',
          message:
            'Propose Height (length) from Name segment #2 (between first and second "|").',
          replacementField: 'length',
        });
        toast('Name segment -> Length & Height patterns created or updated.', {
          variant: 'success',
        });
      } catch (fallbackError) {
        logClientError(fallbackError, { context: { source: 'useValidatorSettingsController', action: 'createNameLengthMirrorPattern' } });
        toast(
          fallbackError instanceof Error
            ? fallbackError.message
            : error instanceof Error
              ? error.message
              : 'Failed to create name segment dimension patterns.',
          { variant: 'error' }
        );
      }
    }
  };

  const handleCreateNameCategoryMirrorPattern = async (): Promise<void> => {
    try {
      const templateResult = await api.post<{
        outcomes?: Array<{
          action?: string;
          target?: string;
        }>;
      }>(
        '/api/products/validator-patterns/templates/name-segment-category',
        {},
        { logError: false }
      );
      await invalidateValidatorConfig(queryClient);
      const createdCount = (templateResult.outcomes ?? []).filter(
        (item) => item.action === 'created'
      ).length;
      toast('Name segment -> Category pattern created or updated.', {
        variant: 'success',
      });
      if (createdCount > 0) {
        toast(
          createdCount === 1
            ? '1 new pattern was created from the template.'
            : `${createdCount} new patterns were created from the template.`,
          { variant: 'info' }
        );
      }
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'createNameCategoryMirrorPattern' } });
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to create name segment category pattern.',
        { variant: 'error' }
      );
    }
  };

  const handleCreateNameMirrorPolishSequence = async (): Promise<void> => {
    const existingLabels = new Set(
      patterns
        .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
        .filter((value: string) => value.length > 0)
    );
    const sequenceGroupId = createSequenceGroupId();
    const sequenceGroupLabel = 'Name EN -> PL Mirror';
    const maxSequence = orderedPatterns.reduce(
      (max: number, pattern: ProductValidationPattern, index: number) =>
        Math.max(max, getPatternSequence(pattern, index)),
      0
    );
    const firstSequence = maxSequence + 10;
    const secondSequence = maxSequence + 20;
    const thirdSequence = maxSequence + 30;

    const mirrorLabel = buildUniqueLabel('Mirror Name EN to Name PL', existingLabels);
    existingLabels.add(mirrorLabel.toLowerCase());
    const keychainLabel = buildUniqueLabel('Name PL: Keychain -> Brelok', existingLabels);
    existingLabels.add(keychainLabel.toLowerCase());
    const pinLabel = buildUniqueLabel('Name PL: Pin -> Przypinka', existingLabels);

    const mirrorRecipe = encodeDynamicReplacementRecipe({
      version: 1,
      sourceMode: 'form_field',
      sourceField: 'name_en',
      sourceRegex: null,
      sourceFlags: null,
      sourceMatchGroup: null,
      mathOperation: 'none',
      mathOperand: null,
      roundMode: 'none',
      padLength: null,
      padChar: null,
      logicOperator: 'none',
      logicOperand: null,
      logicFlags: null,
      logicWhenTrueAction: 'keep',
      logicWhenTrueValue: null,
      logicWhenFalseAction: 'keep',
      logicWhenFalseValue: null,
      resultAssembly: 'segment_only',
      targetApply: 'replace_whole_field',
    });

    try {
      await createPattern.mutateAsync({
        label: mirrorLabel,
        target: 'name',
        locale: 'pl',
        regex: '^.*$',
        flags: null,
        message:
          'Mirror English name into Polish name before running Polish replacement rules.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: true,
        replacementValue: mirrorRecipe,
        replacementFields: ['name_pl'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId,
        sequenceGroupLabel,
        sequenceGroupDebounceMs: 300,
        sequence: firstSequence,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: true,
        launchEnabled: true,
        launchSourceMode: 'form_field',
        launchSourceField: 'name_en',
        launchOperator: 'is_not_empty',
        launchValue: null,
        launchFlags: null,
      });

      await createPattern.mutateAsync({
        label: keychainLabel,
        target: 'name',
        locale: 'pl',
        regex: 'Keychain',
        flags: 'gi',
        message: 'Replace "Keychain" with "Brelok" in Polish name.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: true,
        replacementValue: 'Brelok',
        replacementFields: ['name_pl'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId,
        sequenceGroupLabel,
        sequenceGroupDebounceMs: 0,
        sequence: secondSequence,
        chainMode: 'continue',
        maxExecutions: 3,
        passOutputToNext: true,
        launchEnabled: false,
        launchSourceMode: 'current_field',
        launchSourceField: null,
        launchOperator: 'equals',
        launchValue: null,
        launchFlags: null,
      });

      await createPattern.mutateAsync({
        label: pinLabel,
        target: 'name',
        locale: 'pl',
        regex: '\\bPin\\b',
        flags: 'gi',
        message: 'Replace "Pin" with "Przypinka" in Polish name.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: true,
        replacementValue: 'Przypinka',
        replacementFields: ['name_pl'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId,
        sequenceGroupLabel,
        sequenceGroupDebounceMs: 0,
        sequence: thirdSequence,
        chainMode: 'continue',
        maxExecutions: 3,
        passOutputToNext: false,
        launchEnabled: false,
        launchSourceMode: 'current_field',
        launchSourceField: null,
        launchOperator: 'equals',
        launchValue: null,
        launchFlags: null,
      });

      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => ({
        ...prev,
        [sequenceGroupId]: {
          label: sequenceGroupLabel,
          debounceMs: '0',
        },
      }));
      toast('Name EN -> PL mirror sequence created.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'createNameMirrorPolishSequence' } });
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to create Name EN -> PL mirror sequence.',
        { variant: 'error' }
      );
    }
  };

  const handleSaveSequenceGroup = async (groupId: string): Promise<void> => {
    const group = sequenceGroups.get(groupId);
    if (!group || group.patternIds.length === 0) return;
    const draft = getGroupDraft(groupId);
    const label = draft.label.trim() || 'Sequence / Group';
    const parsedDebounce = Number(draft.debounceMs);
    const debounceMs = Number.isFinite(parsedDebounce)
      ? Math.min(30_000, Math.max(0, Math.floor(parsedDebounce)))
      : 0;
    try {
      for (const patternId of group.patternIds) {
        await updatePattern.mutateAsync({
          id: patternId,
          data: {
            sequenceGroupId: groupId,
            sequenceGroupLabel: label,
            sequenceGroupDebounceMs: debounceMs,
          },
        });
      }
      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => ({
        ...prev,
        [groupId]: { label, debounceMs: String(debounceMs) },
      }));
      toast('Sequence group settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'saveSequenceGroup', groupId } });
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save sequence group.',
        { variant: 'error' }
      );
    }
  };

  const handleUngroup = async (groupId: string): Promise<void> => {
    const group = sequenceGroups.get(groupId);
    if (!group || group.patternIds.length === 0) return;
    try {
      for (const patternId of group.patternIds) {
        await updatePattern.mutateAsync({
          id: patternId,
          data: {
            sequenceGroupId: null,
            sequenceGroupLabel: null,
            sequenceGroupDebounceMs: 0,
          },
        });
      }
      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      toast('Sequence group removed.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useValidatorSettingsController', action: 'ungroupSequence', groupId } });
      toast(error instanceof Error ? error.message : 'Failed to ungroup sequence.', {
        variant: 'error',
      });
    }
  };

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
