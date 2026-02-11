'use client';

import { Copy, GripVertical, Plus, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import {
  useCreateValidationPatternMutation,
  useDeleteValidationPatternMutation,
  useUpdateValidatorSettingsMutation,
  useUpdateValidationPatternMutation,
  useValidationPatterns,
  useValidatorSettings,
} from '@/features/products/hooks/useProductSettingsQueries';
import {
  describeDynamicReplacementRecipe,
  encodeDynamicReplacementRecipe,
  getStaticReplacementValue,
  parseDynamicReplacementRecipe,
  type DynamicReplacementLogicAction,
  type DynamicReplacementLogicOperator,
  type DynamicReplacementMathOperation,
  type DynamicReplacementRecipe,
  type DynamicReplacementRoundMode,
  type DynamicReplacementSourceMode,
} from '@/features/products/utils/validator-replacement-recipe';
import type {
  ProductValidationLaunchOperator,
  ProductValidationPattern,
} from '@/shared/types/domain/products';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  MultiSelect,
  SectionPanel,
  SharedModal,
  Textarea,
  UnifiedSelect,
  useToast,
} from '@/shared/ui';

type ReplacementMode = 'static' | 'dynamic';

type SequenceGroupDraft = {
  label: string;
  debounceMs: string;
};

type SequenceGroupView = {
  id: string;
  label: string;
  debounceMs: number;
  patternIds: string[];
};

type PatternFormData = {
  label: string;
  target: 'name' | 'description' | 'sku' | 'price' | 'stock';
  locale: string;
  regex: string;
  flags: string;
  message: string;
  severity: 'error' | 'warning';
  enabled: boolean;
  replacementEnabled: boolean;
  replacementAutoApply: boolean;
  replacementValue: string;
  replacementFields: string[];
  replacementMode: ReplacementMode;
  sourceMode: DynamicReplacementSourceMode;
  sourceField: string;
  sourceRegex: string;
  sourceFlags: string;
  sourceMatchGroup: string;
  launchEnabled: boolean;
  launchSourceMode: DynamicReplacementSourceMode;
  launchSourceField: string;
  launchOperator: ProductValidationLaunchOperator;
  launchValue: string;
  launchFlags: string;
  mathOperation: DynamicReplacementMathOperation;
  mathOperand: string;
  roundMode: DynamicReplacementRoundMode;
  padLength: string;
  padChar: string;
  logicOperator: DynamicReplacementLogicOperator;
  logicOperand: string;
  logicFlags: string;
  logicWhenTrueAction: DynamicReplacementLogicAction;
  logicWhenTrueValue: string;
  logicWhenFalseAction: DynamicReplacementLogicAction;
  logicWhenFalseValue: string;
  resultAssembly: 'segment_only' | 'source_replace_match';
  targetApply: 'replace_whole_field' | 'replace_matched_segment';
  sequence: string;
  chainMode: 'continue' | 'stop_on_match' | 'stop_on_replace';
  maxExecutions: string;
  passOutputToNext: boolean;
};

const EMPTY_FORM: PatternFormData = {
  label: '',
  target: 'name',
  locale: '',
  regex: '',
  flags: '',
  message: '',
  severity: 'error',
  enabled: true,
  replacementEnabled: false,
  replacementAutoApply: false,
  replacementValue: '',
  replacementFields: [],
  replacementMode: 'static',
  sourceMode: 'current_field',
  sourceField: '',
  sourceRegex: '',
  sourceFlags: '',
  sourceMatchGroup: '',
  launchEnabled: false,
  launchSourceMode: 'current_field',
  launchSourceField: '',
  launchOperator: 'equals',
  launchValue: '',
  launchFlags: '',
  mathOperation: 'none',
  mathOperand: '1',
  roundMode: 'none',
  padLength: '',
  padChar: '0',
  logicOperator: 'none',
  logicOperand: '',
  logicFlags: '',
  logicWhenTrueAction: 'keep',
  logicWhenTrueValue: '',
  logicWhenFalseAction: 'keep',
  logicWhenFalseValue: '',
  resultAssembly: 'segment_only',
  targetApply: 'replace_matched_segment',
  sequence: '',
  chainMode: 'continue',
  maxExecutions: '1',
  passOutputToNext: true,
};

const REPLACEMENT_FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  ean: 'EAN',
  gtin: 'GTIN',
  asin: 'ASIN',
  price: 'Price',
  stock: 'Stock',
  name_en: 'Name (EN)',
  name_pl: 'Name (PL)',
  name_de: 'Name (DE)',
  description_en: 'Description (EN)',
  description_pl: 'Description (PL)',
  description_de: 'Description (DE)',
};

const REPLACEMENT_FIELD_OPTIONS = PRODUCT_VALIDATION_REPLACEMENT_FIELDS.map((field) => ({
  value: field,
  label: REPLACEMENT_FIELD_LABELS[field] ?? field,
}));

const SOURCE_FIELD_OPTIONS = REPLACEMENT_FIELD_OPTIONS;

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const normalizeReplacementFields = (fields: string[] | null | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (!field || !ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

const formatReplacementFields = (fields: string[] | null | undefined): string => {
  const normalized = normalizeReplacementFields(fields);
  if (normalized.length === 0) return 'all matching fields';
  return normalized.map((field) => REPLACEMENT_FIELD_LABELS[field] ?? field).join(', ');
};

const getReplacementFieldsForTarget = (
  target: PatternFormData['target'],
): string[] => {
  if (target === 'name') {
    return PRODUCT_VALIDATION_REPLACEMENT_FIELDS.filter((field) => field.startsWith('name_'));
  }
  if (target === 'description') {
    return PRODUCT_VALIDATION_REPLACEMENT_FIELDS.filter((field) =>
      field.startsWith('description_')
    );
  }
  if (target === 'price') return ['price'];
  if (target === 'stock') return ['stock'];
  return ['sku'];
};

const isLocaleTarget = (target: PatternFormData['target']): boolean =>
  target === 'name' || target === 'description';

const getSourceFieldOptionsForTarget = (
  target: PatternFormData['target'],
): Array<{ value: string; label: string }> => {
  const fieldSet = new Set<string>([
    ...getReplacementFieldsForTarget(target),
    'sku',
  ]);
  return SOURCE_FIELD_OPTIONS.filter((option) => fieldSet.has(option.value));
};

const buildDynamicRecipeFromForm = (formData: PatternFormData): DynamicReplacementRecipe | null => {
  if (
    (formData.sourceMode === 'form_field' || formData.sourceMode === 'latest_product_field') &&
    !formData.sourceField.trim()
  ) {
    return null;
  }
  const parsedOperand = Number(formData.mathOperand);
  const parsedPadLength = Number(formData.padLength);

  return {
    version: 1,
    sourceMode: formData.sourceMode,
    sourceField: formData.sourceField.trim() || null,
    sourceRegex: formData.sourceRegex.trim() || null,
    sourceFlags: formData.sourceFlags.trim() || null,
    sourceMatchGroup:
      formData.sourceMatchGroup.trim().length > 0 &&
      Number.isFinite(Number(formData.sourceMatchGroup)) &&
      Number(formData.sourceMatchGroup) >= 0
        ? Math.floor(Number(formData.sourceMatchGroup))
        : null,
    mathOperation: formData.mathOperation,
    mathOperand: Number.isFinite(parsedOperand) ? parsedOperand : null,
    roundMode: formData.roundMode,
    padLength:
      Number.isFinite(parsedPadLength) && parsedPadLength > 0 ? Math.floor(parsedPadLength) : null,
    padChar: formData.padChar || null,
    logicOperator: formData.logicOperator,
    logicOperand: formData.logicOperand,
    logicFlags: formData.logicFlags,
    logicWhenTrueAction: formData.logicWhenTrueAction,
    logicWhenTrueValue: formData.logicWhenTrueValue,
    logicWhenFalseAction: formData.logicWhenFalseAction,
    logicWhenFalseValue: formData.logicWhenFalseValue,
    resultAssembly: formData.resultAssembly,
    targetApply: formData.targetApply,
  };
};

const buildDuplicateLabel = (label: string, existingLabels: Set<string>): string => {
  const trimmed = label.trim() || 'Pattern';
  const base = `${trimmed} (copy)`;
  let candidate = base;
  let counter = 2;
  while (existingLabels.has(candidate.toLowerCase())) {
    candidate = `${base} ${counter}`;
    counter += 1;
  }
  return candidate;
};

const buildUniqueLabel = (label: string, existingLabels: Set<string>): string => {
  const trimmed = label.trim() || 'Pattern';
  let candidate = trimmed;
  let counter = 2;
  while (existingLabels.has(candidate.toLowerCase())) {
    candidate = `${trimmed} ${counter}`;
    counter += 1;
  }
  return candidate;
};

const getPatternSequence = (pattern: ProductValidationPattern, fallbackIndex: number): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * 10;
};

const getSequenceGroupId = (pattern: ProductValidationPattern): string | null => {
  const value = pattern.sequenceGroupId?.trim();
  return value ? value : null;
};

const sortPatternsBySequence = (patterns: ProductValidationPattern[]): ProductValidationPattern[] =>
  patterns
    .map((pattern: ProductValidationPattern, index: number) => ({ pattern, index }))
    .sort((a, b) => {
      const aSeq = getPatternSequence(a.pattern, a.index);
      const bSeq = getPatternSequence(b.pattern, b.index);
      if (aSeq !== bSeq) return aSeq - bSeq;
      if (a.pattern.target !== b.pattern.target) {
        return a.pattern.target.localeCompare(b.pattern.target);
      }
      return a.pattern.label.localeCompare(b.pattern.label);
    })
    .map((entry) => entry.pattern);

const reorderPatterns = (
  patterns: ProductValidationPattern[],
  draggedId: string,
  targetId: string,
): ProductValidationPattern[] | null => {
  if (draggedId === targetId) return null;
  const fromIndex = patterns.findIndex((pattern) => pattern.id === draggedId);
  const targetIndex = patterns.findIndex((pattern) => pattern.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return null;

  let insertIndex = targetIndex + 1;
  if (fromIndex < insertIndex) {
    insertIndex -= 1;
  }
  if (insertIndex === fromIndex) return null;

  const next = [...patterns];
  const [dragged] = next.splice(fromIndex, 1);
  if (!dragged) return null;
  next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, dragged);
  return next;
};

const createSequenceGroupId = (): string => {
  const random = Math.random().toString(36).slice(2, 8);
  return `seq_${Date.now().toString(36)}_${random}`;
};

const normalizeSequenceGroupDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

const canCompileRegex = (pattern: string, flags: string): boolean => {
  try {
    void new RegExp(pattern, flags || undefined);
    return true;
  } catch {
    return false;
  }
};

const buildSequenceGroups = (patterns: ProductValidationPattern[]): Map<string, SequenceGroupView> => {
  const groups = new Map<string, SequenceGroupView>();
  for (const pattern of patterns) {
    const groupId = getSequenceGroupId(pattern);
    if (!groupId) continue;
    const current = groups.get(groupId);
    if (current) {
      current.patternIds.push(pattern.id);
      if (!current.label && pattern.sequenceGroupLabel?.trim()) {
        current.label = pattern.sequenceGroupLabel.trim();
      }
      continue;
    }
    groups.set(groupId, {
      id: groupId,
      label: pattern.sequenceGroupLabel?.trim() || 'Sequence / Group',
      debounceMs: normalizeSequenceGroupDebounceMs(pattern.sequenceGroupDebounceMs),
      patternIds: [pattern.id],
    });
  }
  return groups;
};

const ToggleButton = ({
  enabled,
  disabled,
  onClick,
}: {
  enabled: boolean;
  disabled?: boolean;
  onClick: () => void;
}): React.JSX.Element => (
  <Button
    type='button'
    disabled={disabled}
    onClick={onClick}
    className={`rounded border px-3 py-1 text-xs ${
      enabled
        ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
        : 'border-red-500/60 bg-red-500/15 text-red-200 hover:bg-red-500/25'
    }`}
  >
    {enabled ? 'ON' : 'OFF'}
  </Button>
);

export function ValidatorSettings(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useValidatorSettings();
  const patternsQuery = useValidationPatterns();

  const updateSettings = useUpdateValidatorSettingsMutation();
  const createPattern = useCreateValidationPatternMutation();
  const updatePattern = useUpdateValidationPatternMutation();
  const deletePattern = useDeleteValidationPatternMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ProductValidationPattern | null>(null);
  const [formData, setFormData] = useState<PatternFormData>(EMPTY_FORM);
  const [patternToDelete, setPatternToDelete] = useState<ProductValidationPattern | null>(null);
  const [draggedPatternId, setDraggedPatternId] = useState<string | null>(null);
  const [dragOverPatternId, setDragOverPatternId] = useState<string | null>(null);
  const [reorderPending, setReorderPending] = useState(false);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, SequenceGroupDraft>>({});

  const patterns = patternsQuery.data ?? [];
  const orderedPatterns = useMemo(() => sortPatternsBySequence(patterns), [patterns]);
  const sequenceGroups = useMemo(() => buildSequenceGroups(orderedPatterns), [orderedPatterns]);
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
    const enabled = patterns.filter((pattern: ProductValidationPattern) => pattern.enabled).length;
    return { total, enabled };
  }, [patterns]);

  const patternActionsPending = createPattern.isPending || updatePattern.isPending || deletePattern.isPending || reorderPending;

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
      replacementValue: getStaticReplacementValue(pattern.replacementValue) ?? '',
      replacementFields: normalizeReplacementFields(pattern.replacementFields),
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
      sequence: pattern.sequence !== null && pattern.sequence !== undefined ? String(pattern.sequence) : '',
      chainMode: pattern.chainMode ?? 'continue',
      maxExecutions: String(pattern.maxExecutions ?? 1),
      passOutputToNext: pattern.passOutputToNext ?? true,
    });
    setShowModal(true);
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
        toast('Replacement value is required when replacer is ON.', { variant: 'error' });
        return;
      }
      if (
        formData.replacementMode === 'dynamic' &&
        (formData.sourceMode === 'form_field' || formData.sourceMode === 'latest_product_field') &&
        !formData.sourceField.trim()
      ) {
        toast('Dynamic replacer requires a source field.', { variant: 'error' });
        return;
      }
      if (
        formData.replacementMode === 'dynamic' &&
        formData.sourceMatchGroup.trim().length > 0 &&
        (!Number.isFinite(Number(formData.sourceMatchGroup)) || Number(formData.sourceMatchGroup) < 0)
      ) {
        toast('Source capture group must be a non-negative integer.', { variant: 'error' });
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
          toast('Dynamic regex condition pattern or flags are invalid.', { variant: 'error' });
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
        label: formData.label.trim(),
        target: formData.target,
        locale: isLocaleTarget(formData.target) ? formData.locale.trim().toLowerCase() || null : null,
        regex: formData.regex.trim(),
        flags: formData.flags.trim() || null,
        message: formData.message.trim(),
        severity: formData.severity,
        enabled: formData.enabled,
        replacementEnabled: formData.replacementEnabled,
        replacementAutoApply: formData.replacementAutoApply,
        replacementValue,
        replacementFields: normalizeReplacementFields(formData.replacementFields),
        sequenceGroupId: editingPattern?.sequenceGroupId ?? null,
        sequenceGroupLabel: editingPattern?.sequenceGroupLabel ?? null,
        sequenceGroupDebounceMs: editingPattern?.sequenceGroupDebounceMs ?? 0,
        sequence:
          formData.sequence.trim().length > 0 && Number.isFinite(Number(formData.sequence))
            ? Math.max(0, Math.floor(Number(formData.sequence)))
            : null,
        chainMode: formData.chainMode,
        maxExecutions:
          formData.maxExecutions.trim().length > 0 && Number.isFinite(Number(formData.maxExecutions))
            ? Math.min(20, Math.max(1, Math.floor(Number(formData.maxExecutions))))
            : 1,
        passOutputToNext: formData.passOutputToNext,
        launchEnabled: formData.launchEnabled,
        launchSourceMode: formData.launchSourceMode,
        launchSourceField: formData.launchSourceField.trim() || null,
        launchOperator: formData.launchOperator,
        launchValue: formData.launchValue,
        launchFlags: formData.launchFlags.trim() || null,
      };

      if (editingPattern) {
        await updatePattern.mutateAsync({
          id: editingPattern.id,
          data: payload,
        });
        toast('Pattern updated.', { variant: 'success' });
      } else {
        await createPattern.mutateAsync(payload);
        toast('Pattern created.', { variant: 'success' });
      }
      setShowModal(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save pattern.', { variant: 'error' });
    }
  };

  const handleTogglePattern = async (pattern: ProductValidationPattern): Promise<void> => {
    try {
      await updatePattern.mutateAsync({
        id: pattern.id,
        data: { enabled: !pattern.enabled },
      });
      toast(`Pattern ${!pattern.enabled ? 'enabled' : 'disabled'}.`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update pattern.', { variant: 'error' });
    }
  };

  const handleToggleDefault = async (): Promise<void> => {
    try {
      await updateSettings.mutateAsync({ enabledByDefault: !enabledByDefault });
      toast(`Validator default set to ${!enabledByDefault ? 'ON' : 'OFF'}.`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update validator settings.', { variant: 'error' });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!patternToDelete) return;
    try {
      await deletePattern.mutateAsync(patternToDelete.id);
      toast('Pattern deleted.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete pattern.', { variant: 'error' });
    } finally {
      setPatternToDelete(null);
    }
  };

  const handleDuplicatePattern = async (pattern: ProductValidationPattern): Promise<void> => {
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
        replacementValue: pattern.replacementValue,
        replacementFields: normalizeReplacementFields(pattern.replacementFields),
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
        launchSourceMode: pattern.launchSourceMode ?? 'current_field',
        launchSourceField: pattern.launchSourceField ?? null,
        launchOperator: pattern.launchOperator ?? 'equals',
        launchValue: pattern.launchValue ?? '',
        launchFlags: pattern.launchFlags ?? null,
      });
      toast('Pattern duplicated.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to duplicate pattern.', { variant: 'error' });
    }
  };

  const handlePatternDrop = async (
    targetPattern: ProductValidationPattern,
    event: React.DragEvent<HTMLDivElement>
  ): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    const draggedId = draggedPatternId || event.dataTransfer.getData('text/plain');
    if (!draggedId) {
      setDragOverPatternId(null);
      return;
    }

    const draggedPattern = orderedPatterns.find((pattern: ProductValidationPattern) => pattern.id === draggedId);
    if (!draggedPattern || draggedPattern.id === targetPattern.id) {
      setDraggedPatternId(null);
      setDragOverPatternId(null);
      return;
    }

    const nextOrder = reorderPatterns(orderedPatterns, draggedId, targetPattern.id) ?? orderedPatterns;
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

    const updateMap = new Map<string, Partial<Omit<ProductValidationPattern, 'id' | 'createdAt' | 'updatedAt'>>>();

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

    if (
      draggedCurrentGroupId &&
      draggedCurrentGroupId !== nextGroupId
    ) {
      const remaining = orderedPatterns.filter(
        (pattern: ProductValidationPattern) =>
          getSequenceGroupId(pattern) === draggedCurrentGroupId && pattern.id !== draggedPattern.id
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

    const updates = Array.from(updateMap.entries()).map(([id, data]) => ({ id, data }));
    if (updates.length === 0) return;

    setReorderPending(true);
    try {
      for (const update of updates) {
        await updatePattern.mutateAsync({
          id: update.id,
          data: update.data,
        });
      }
      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => ({
        ...prev,
        [nextGroupId]: {
          label: nextGroupLabel,
          debounceMs: String(nextGroupDebounceMs),
        },
      }));
      toast('Sequence group updated.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update sequence group.', { variant: 'error' });
    } finally {
      setReorderPending(false);
    }
  };

  const handleCreateSkuAutoIncrementSequence = async (): Promise<void> => {
    const existingLabels = new Set(
      patterns
        .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
        .filter((value: string) => value.length > 0),
    );
    const sequenceGroupId = createSequenceGroupId();
    const sequenceGroupLabel = 'SKU Auto Increment';
    const maxSequence = orderedPatterns.reduce(
      (max: number, pattern: ProductValidationPattern, index: number) =>
        Math.max(max, getPatternSequence(pattern, index)),
      0,
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
        message:
          'Auto-generated SKU proposal from the latest product SKU sequence.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: true,
        replacementValue: replacementRecipe,
        replacementFields: ['sku'],
        sequenceGroupId,
        sequenceGroupLabel,
        sequenceGroupDebounceMs: 300,
        sequence: firstSequence,
        chainMode: 'stop_on_replace',
        maxExecutions: 1,
        passOutputToNext: true,
        launchEnabled: true,
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
        message:
          'SKU is still KEYCHA000. Check latest product SKU format or set SKU manually.',
        severity: 'error',
        enabled: true,
        replacementEnabled: false,
        replacementAutoApply: false,
        replacementValue: null,
        replacementFields: ['sku'],
        sequenceGroupId,
        sequenceGroupLabel,
        sequenceGroupDebounceMs: 300,
        sequence: secondSequence,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: false,
        launchEnabled: true,
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
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to create SKU auto-increment sequence.',
        { variant: 'error' },
      );
    }
  };

  const handleCreateLatestPriceStockSequence = async (): Promise<void> => {
    const existingLabels = new Set(
      patterns
        .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
        .filter((value: string) => value.length > 0),
    );
    const maxSequence = orderedPatterns.reduce(
      (max: number, pattern: ProductValidationPattern, index: number) =>
        Math.max(max, getPatternSequence(pattern, index)),
      0,
    );
    const firstSequence = maxSequence + 10;
    const secondSequence = maxSequence + 20;

    const priceLabel = buildUniqueLabel('Price from latest product', existingLabels);
    existingLabels.add(priceLabel.toLowerCase());
    const stockLabel = buildUniqueLabel('Stock from latest product', existingLabels);

    const buildLatestFieldRecipe = (field: 'price' | 'stock'): string =>
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'latest_product_field',
        sourceField: field,
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
        label: priceLabel,
        target: 'price',
        locale: null,
        regex: '^.*$',
        flags: null,
        message:
          'Propose price from the latest created product.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: false,
        replacementValue: buildLatestFieldRecipe('price'),
        replacementFields: ['price'],
        sequenceGroupId: null,
        sequenceGroupLabel: null,
        sequenceGroupDebounceMs: 0,
        sequence: firstSequence,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: false,
        launchEnabled: true,
        launchSourceMode: 'latest_product_field',
        launchSourceField: 'price',
        launchOperator: 'is_not_empty',
        launchValue: null,
        launchFlags: null,
      });

      await createPattern.mutateAsync({
        label: stockLabel,
        target: 'stock',
        locale: null,
        regex: '^.*$',
        flags: null,
        message:
          'Propose stock from the latest created product.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: false,
        replacementValue: buildLatestFieldRecipe('stock'),
        replacementFields: ['stock'],
        sequenceGroupId: null,
        sequenceGroupLabel: null,
        sequenceGroupDebounceMs: 0,
        sequence: secondSequence,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: false,
        launchEnabled: true,
        launchSourceMode: 'latest_product_field',
        launchSourceField: 'stock',
        launchOperator: 'is_not_empty',
        launchValue: null,
        launchFlags: null,
      });

      toast('Latest price & stock sequence created.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to create latest price & stock sequence.',
        { variant: 'error' },
      );
    }
  };

  const handleCreateNameMirrorPolishSequence = async (): Promise<void> => {
    const existingLabels = new Set(
      patterns
        .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
        .filter((value: string) => value.length > 0),
    );
    const sequenceGroupId = createSequenceGroupId();
    const sequenceGroupLabel = 'Name EN -> PL Mirror';
    const maxSequence = orderedPatterns.reduce(
      (max: number, pattern: ProductValidationPattern, index: number) =>
        Math.max(max, getPatternSequence(pattern, index)),
      0,
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
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to create Name EN -> PL mirror sequence.',
        { variant: 'error' },
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
      toast(error instanceof Error ? error.message : 'Failed to save sequence group.', { variant: 'error' });
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
      toast(error instanceof Error ? error.message : 'Failed to ungroup sequence.', { variant: 'error' });
    }
  };

  return (
    <div className='space-y-5'>
      <SectionPanel variant='subtle' className='p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='space-y-1'>
            <p className='text-sm font-semibold text-white'>Product Validator Default</p>
            <p className='text-xs text-gray-400'>
              Controls whether validator checks are ON by default in Product Create/Edit forms.
            </p>
          </div>
          <ToggleButton
            enabled={enabledByDefault}
            disabled={updateSettings.isPending || settingsQuery.isLoading}
            onClick={() => {
              void handleToggleDefault();
            }}
          />
        </div>
      </SectionPanel>

      <SectionPanel variant='subtle' className='p-4'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm font-semibold text-white'>Regex Pattern Table</p>
            <p className='text-xs text-gray-400'>
              Active patterns: {summary.enabled}/{summary.total}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              onClick={() => {
                void handleCreateSkuAutoIncrementSequence();
              }}
              disabled={patternActionsPending}
              className='border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20'
            >
              + SKU Auto Sequence
            </Button>
            <Button
              onClick={() => {
                void handleCreateLatestPriceStockSequence();
              }}
              disabled={patternActionsPending}
              className='border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20'
            >
              + Latest Price & Stock
            </Button>
            <Button
              onClick={() => {
                void handleCreateNameMirrorPolishSequence();
              }}
              disabled={patternActionsPending}
              className='border border-indigo-500/40 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20'
            >
              + Name EN to PL
            </Button>
            <Button
              onClick={openCreate}
              className='bg-white text-gray-900 hover:bg-gray-200'
            >
              <Plus className='mr-2 size-4' />
              Add Pattern
            </Button>
          </div>
        </div>

        {loading ? (
          <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            Loading validator patterns...
          </div>
        ) : patterns.length === 0 ? (
          <EmptyState
            title='No validator patterns'
            description='Create your first regex rule to validate product names, descriptions, and SKU.'
            action={
              <Button onClick={openCreate} variant='outline'>
                <Plus className='mr-2 size-4' />
                Create Pattern
              </Button>
            }
          />
        ) : (
          <div className='space-y-2'>
            {orderedPatterns.map((pattern: ProductValidationPattern) => {
              const dynamicRecipe = parseDynamicReplacementRecipe(pattern.replacementValue);
              const staticReplacement = getStaticReplacementValue(pattern.replacementValue);
              const groupId = getSequenceGroupId(pattern);
              const group = groupId ? sequenceGroups.get(groupId) : null;
              const isGroupFirst = Boolean(groupId && firstPatternIdByGroup.get(groupId) === pattern.id);
              const groupDraft = groupId ? getGroupDraft(groupId) : null;
              const isDragging = draggedPatternId === pattern.id;
              const isDragTarget = dragOverPatternId === pattern.id && draggedPatternId !== pattern.id;
              return (
                <div
                  key={pattern.id}
                  className='space-y-2'
                >
                  {isGroupFirst && group && (
                    <SectionPanel variant='subtle-compact' className='border border-cyan-500/35 bg-cyan-500/8 p-3'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='rounded border border-cyan-400/50 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase text-cyan-100'>
                          Sequence / Group
                        </span>
                        <span className='text-xs text-cyan-100/90'>
                          {group.patternIds.length} pattern{group.patternIds.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto_auto]'>
                        <div>
                          <Label className='text-[11px] text-cyan-100/80'>Group Label</Label>
                          <Input
                            className='mt-1 h-8'
                            value={groupDraft?.label ?? group.label}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                              setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => {
                                const current = prev[group.id] ?? {
                                  label: group.label,
                                  debounceMs: String(group.debounceMs),
                                };
                                return {
                                  ...prev,
                                  [group.id]: {
                                    ...current,
                                    label: event.target.value,
                                  },
                                };
                              });
                            }}
                            placeholder='Sequence / Group'
                          />
                        </div>
                        <div>
                          <Label className='text-[11px] text-cyan-100/80'>Debounce (ms)</Label>
                          <Input
                            type='number'
                            min={0}
                            max={30000}
                            className='mt-1 h-8'
                            value={groupDraft?.debounceMs ?? String(group.debounceMs)}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                              setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => {
                                const current = prev[group.id] ?? {
                                  label: group.label,
                                  debounceMs: String(group.debounceMs),
                                };
                                return {
                                  ...prev,
                                  [group.id]: {
                                    ...current,
                                    debounceMs: event.target.value,
                                  },
                                };
                              });
                            }}
                          />
                        </div>
                        <div className='flex items-end'>
                          <Button
                            type='button'
                            disabled={patternActionsPending}
                            className='h-8 rounded bg-slate-800 px-3 text-xs text-slate-100 hover:bg-slate-700'
                            onClick={() => {
                              void handleSaveSequenceGroup(group.id);
                            }}
                          >
                            Save Group
                          </Button>
                        </div>
                        <div className='flex items-end'>
                          <Button
                            type='button'
                            disabled={patternActionsPending}
                            className='h-8 rounded border border-amber-500/45 bg-amber-500/15 px-3 text-xs text-amber-100 hover:bg-amber-500/25'
                            onClick={() => {
                              void handleUngroup(group.id);
                            }}
                          >
                            Ungroup
                          </Button>
                        </div>
                      </div>
                    </SectionPanel>
                  )}

                  <div
                    className={`relative ${groupId ? 'ml-4' : ''}`}
                    onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
                      if (patternActionsPending) return;
                      event.preventDefault();
                      event.stopPropagation();
                      if (dragOverPatternId !== pattern.id) {
                        setDragOverPatternId(pattern.id);
                      }
                    }}
                    onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
                      if (dragOverPatternId !== pattern.id) return;
                      const nextTarget = event.relatedTarget as Node | null;
                      if (nextTarget && event.currentTarget.contains(nextTarget)) return;
                      setDragOverPatternId(null);
                    }}
                    onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
                      void handlePatternDrop(pattern, event);
                    }}
                  >
                    <SectionPanel
                      variant='subtle-compact'
                      className={`flex flex-col gap-3 bg-gray-900 transition-opacity ${
                        isDragging ? 'opacity-50' : 'opacity-100'
                      } ${
                        groupId ? 'border-l-2 border-cyan-400/35' : ''
                      } ${
                        isDragTarget ? 'ring-1 ring-cyan-300/55' : ''
                      }`}
                    >
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <button
                              type='button'
                              draggable={!patternActionsPending}
                              onDragStart={(event: React.DragEvent<HTMLButtonElement>): void => {
                                if (patternActionsPending) return;
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', pattern.id);
                                setDraggedPatternId(pattern.id);
                                setDragOverPatternId(null);
                              }}
                              onDragEnd={(): void => {
                                setDraggedPatternId(null);
                                setDragOverPatternId(null);
                              }}
                              className='cursor-grab rounded border border-slate-600/70 bg-slate-800/60 p-1 text-slate-300 hover:bg-slate-700/70 active:cursor-grabbing'
                              title='Drag and drop onto another pattern to build a sequence group'
                              aria-label='Drag and drop onto another pattern to build a sequence group'
                              disabled={patternActionsPending}
                            >
                              <GripVertical className='size-3.5' />
                            </button>
                            <span className='truncate text-sm font-medium text-white'>{pattern.label}</span>
                            <span className='rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase text-blue-200'>
                              {pattern.target}
                            </span>
                            <span className='rounded border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase text-indigo-200'>
                              {pattern.target === 'name' || pattern.target === 'description'
                                ? pattern.locale || 'any locale'
                                : 'n/a'}
                            </span>
                            <span
                              className={`rounded border px-2 py-0.5 text-[10px] uppercase ${
                                pattern.severity === 'warning'
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                                  : 'border-red-500/40 bg-red-500/10 text-red-200'
                              }`}
                            >
                              {pattern.severity}
                            </span>
                          </div>
                          <div className='mt-1 truncate font-mono text-xs text-gray-300'>
                          /{pattern.regex}/{pattern.flags ?? ''}
                          </div>
                          <p className='mt-1 text-xs text-gray-400'>{pattern.message}</p>
                          <p className='mt-1 text-[11px] text-violet-200/90'>
                          Sequence: {pattern.sequence ?? 'auto'} | Group: {groupId ?? 'none'} | Chain: {pattern.chainMode ?? 'continue'} | Max executions:{' '}
                            {pattern.maxExecutions ?? 1} | Pass output: {pattern.passOutputToNext ?? true ? 'ON' : 'OFF'}
                          </p>
                          <p className='mt-1 text-[11px] text-sky-200/90'>
                          Launch:{' '}
                            {pattern.launchEnabled
                              ? `${pattern.launchSourceMode} ${pattern.launchSourceField ?? ''} ${pattern.launchOperator} ${pattern.launchValue ?? ''}`.trim()
                              : 'always'}
                          </p>
                          {pattern.replacementEnabled && staticReplacement && (
                            <p className='mt-1 text-xs text-emerald-300'>
                            Replacer: <span className='font-mono'>{staticReplacement}</span>
                            </p>
                          )}
                          {pattern.replacementEnabled && dynamicRecipe && (
                            <p className='mt-1 text-xs text-cyan-200'>
                            Dynamic replacer: {describeDynamicReplacementRecipe(dynamicRecipe)}
                            </p>
                          )}
                          {pattern.replacementEnabled && (
                            <p className='mt-1 text-[11px] text-emerald-200/90'>
                            Fields: {formatReplacementFields(pattern.replacementFields)}
                            </p>
                          )}
                          {pattern.replacementEnabled && (
                            <p className='mt-1 text-[11px] text-cyan-200/90'>
                              Apply mode: {pattern.replacementAutoApply ? 'Auto-apply' : 'Proposal only'}
                            </p>
                          )}
                        </div>

                        <div className='flex items-center gap-2'>
                          <ToggleButton
                            enabled={pattern.enabled}
                            disabled={updatePattern.isPending || reorderPending}
                            onClick={() => {
                              void handleTogglePattern(pattern);
                            }}
                          />
                          <Button
                            type='button'
                            onClick={() => {
                              void handleDuplicatePattern(pattern);
                            }}
                            className='rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 hover:bg-slate-700'
                            title='Duplicate pattern'
                            disabled={createPattern.isPending || reorderPending}
                          >
                            <Copy className='size-3' />
                          </Button>
                          <Button
                            type='button'
                            onClick={() => openEdit(pattern)}
                            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700'
                            title='Edit pattern'
                            disabled={reorderPending}
                          >
                            <Pencil className='size-3' />
                          </Button>
                          <Button
                            type='button'
                            onClick={() => setPatternToDelete(pattern)}
                            className='rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600'
                            title='Delete pattern'
                            disabled={reorderPending}
                          >
                            <Trash2 className='size-3' />
                          </Button>
                        </div>
                      </div>
                    </SectionPanel>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionPanel>

      <ConfirmDialog
        open={!!patternToDelete}
        onOpenChange={(open: boolean) => !open && setPatternToDelete(null)}
        onConfirm={() => {
          void handleDelete();
        }}
        title='Delete Pattern'
        description={`Delete validator pattern "${patternToDelete?.label}"? This cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
      />

      {showModal && (
        <SharedModal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editingPattern ? 'Edit Validator Pattern' : 'Create Validator Pattern'}
          size='lg'
        >
          <div className='space-y-4'>
            <div>
              <Label className='text-xs text-gray-400'>Label</Label>
              <Input
                className='mt-2'
                value={formData.label}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: PatternFormData) => ({ ...prev, label: event.target.value }))
                }
                placeholder='Double spaces'
              />
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <Label className='text-xs text-gray-400'>Target</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.target}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => {
                        const nextTarget = value as PatternFormData['target'];
                        const allowed = new Set<string>(getReplacementFieldsForTarget(nextTarget));
                        const nextSourceOptions = getSourceFieldOptionsForTarget(nextTarget);
                        const hasSourceField = nextSourceOptions.some(
                          (option: { value: string }) => option.value === prev.sourceField
                        );
                        const hasLaunchSourceField = nextSourceOptions.some(
                          (option: { value: string }) => option.value === prev.launchSourceField
                        );
                        return {
                          ...prev,
                          target: nextTarget,
                          locale: isLocaleTarget(nextTarget) ? prev.locale : '',
                          replacementFields: prev.replacementFields.filter((field: string) => allowed.has(field)),
                          sourceField: hasSourceField ? prev.sourceField : '',
                          launchSourceField: hasLaunchSourceField ? prev.launchSourceField : '',
                        };
                      })
                    }
                    options={[
                      { value: 'name', label: 'Name' },
                      { value: 'description', label: 'Description' },
                      { value: 'sku', label: 'SKU' },
                      { value: 'price', label: 'Price' },
                      { value: 'stock', label: 'Stock' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <Label className='text-xs text-gray-400'>Locale Context</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={isLocaleTarget(formData.target) ? formData.locale || 'any' : 'any'}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        locale: isLocaleTarget(prev.target) ? (value === 'any' ? '' : value) : '',
                      }))
                    }
                    disabled={!isLocaleTarget(formData.target)}
                    options={[
                      { value: 'any', label: 'Any locale' },
                      { value: 'en', label: 'English (en)' },
                      { value: 'pl', label: 'Polish (pl)' },
                      { value: 'de', label: 'German (de)' },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div>
                <Label className='text-xs text-gray-400'>Severity</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.severity}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        severity: value as 'error' | 'warning',
                      }))
                    }
                    options={[
                      { value: 'error', label: 'Error' },
                      { value: 'warning', label: 'Warning' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Replacer Mode</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.replacementMode}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        replacementMode: value as ReplacementMode,
                      }))
                    }
                    options={[
                      { value: 'static', label: 'Static replacer' },
                      { value: 'dynamic', label: 'Dynamic replacer' },
                    ]}
                  />
                </div>
              </div>
              <div>
                {formData.replacementMode === 'static' ? (
                  <>
                    <Label className='text-xs text-gray-400'>Replacer Value</Label>
                    <Input
                      className='mt-2'
                      value={formData.replacementValue}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          replacementValue: event.target.value,
                        }))
                      }
                      placeholder='e.g. Przypinka'
                    />
                  </>
                ) : (
                  <>
                    <Label className='text-xs text-gray-400'>Source Mode</Label>
                    <div className='mt-2'>
                      <UnifiedSelect
                        value={formData.sourceMode}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            sourceMode: value as DynamicReplacementSourceMode,
                          }))
                        }
                        options={[
                          { value: 'current_field', label: 'Current field' },
                          { value: 'form_field', label: 'Other form field' },
                          { value: 'latest_product_field', label: 'Latest product field' },
                        ]}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
              <div>
                <Label className='text-xs text-gray-400'>Sequence</Label>
                <Input
                  className='mt-2'
                  value={formData.sequence}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      sequence: event.target.value,
                    }))
                  }
                  placeholder='10'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Chain Mode</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.chainMode}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        chainMode: value as PatternFormData['chainMode'],
                      }))
                    }
                    options={[
                      { value: 'continue', label: 'Continue' },
                      { value: 'stop_on_match', label: 'Stop on match' },
                      { value: 'stop_on_replace', label: 'Stop on replace' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Max Executions</Label>
                <Input
                  className='mt-2'
                  value={formData.maxExecutions}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      maxExecutions: event.target.value,
                    }))
                  }
                  placeholder='1'
                />
              </div>
              <div className='flex items-end'>
                <div className='flex w-full items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
                  <span className='text-xs text-gray-300'>Pass Output To Next</span>
                  <ToggleButton
                    enabled={formData.passOutputToNext}
                    onClick={() =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        passOutputToNext: !prev.passOutputToNext,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className='space-y-3 rounded-md border border-sky-500/25 bg-sky-500/5 p-3'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <Label className='text-xs text-sky-200'>Launch Condition</Label>
                  <p className='mt-1 text-[11px] text-sky-100/70'>
                    Run this pattern only when the condition is satisfied.
                  </p>
                </div>
                <ToggleButton
                  enabled={formData.launchEnabled}
                  onClick={() =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      launchEnabled: !prev.launchEnabled,
                    }))
                  }
                />
              </div>

              {formData.launchEnabled && (
                <>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                    <div>
                      <Label className='text-xs text-gray-300'>Launch Source Mode</Label>
                      <div className='mt-2'>
                        <UnifiedSelect
                          value={formData.launchSourceMode}
                          onValueChange={(value: string): void =>
                            setFormData((prev: PatternFormData) => ({
                              ...prev,
                              launchSourceMode: value as DynamicReplacementSourceMode,
                            }))
                          }
                          options={[
                            { value: 'current_field', label: 'Current field' },
                            { value: 'form_field', label: 'Other form field' },
                            { value: 'latest_product_field', label: 'Latest product field' },
                          ]}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className='text-xs text-gray-300'>Launch Operator</Label>
                      <div className='mt-2'>
                        <UnifiedSelect
                          value={formData.launchOperator}
                          onValueChange={(value: string): void =>
                            setFormData((prev: PatternFormData) => ({
                              ...prev,
                              launchOperator: value as ProductValidationLaunchOperator,
                            }))
                          }
                          options={[
                            { value: 'equals', label: 'Equals' },
                            { value: 'not_equals', label: 'Not equals' },
                            { value: 'contains', label: 'Contains' },
                            { value: 'starts_with', label: 'Starts with' },
                            { value: 'ends_with', label: 'Ends with' },
                            { value: 'regex', label: 'Regex test' },
                            { value: 'gt', label: 'Greater than' },
                            { value: 'gte', label: 'Greater than or equal' },
                            { value: 'lt', label: 'Less than' },
                            { value: 'lte', label: 'Less than or equal' },
                            { value: 'is_empty', label: 'Is empty' },
                            { value: 'is_not_empty', label: 'Is not empty' },
                          ]}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className='text-xs text-gray-300'>Launch Value</Label>
                      <Input
                        className='mt-2 font-mono'
                        value={formData.launchValue}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            launchValue: event.target.value,
                          }))
                        }
                        placeholder='KEYCHA000'
                      />
                    </div>
                  </div>

                  {(formData.launchSourceMode === 'form_field' ||
                    formData.launchSourceMode === 'latest_product_field') && (
                    <div>
                      <Label className='text-xs text-gray-300'>Launch Source Field</Label>
                      <div className='mt-2'>
                        <UnifiedSelect
                          value={formData.launchSourceField || '__none__'}
                          onValueChange={(value: string): void =>
                            setFormData((prev: PatternFormData) => ({
                              ...prev,
                              launchSourceField: value === '__none__' ? '' : value,
                            }))
                          }
                          options={[
                            { value: '__none__', label: 'Select source field' },
                            ...sourceFieldOptions,
                          ]}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className='text-xs text-gray-300'>Launch Flags (regex only)</Label>
                    <Input
                      className='mt-2 font-mono'
                      value={formData.launchFlags}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          launchFlags: event.target.value,
                        }))
                      }
                      placeholder='i'
                    />
                  </div>
                </>
              )}
            </div>

            {formData.replacementMode === 'dynamic' && (
              <div className='space-y-4 rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3'>
                {(formData.sourceMode === 'form_field' || formData.sourceMode === 'latest_product_field') && (
                  <div>
                    <Label className='text-xs text-gray-300'>Source Field</Label>
                    <div className='mt-2'>
                      <UnifiedSelect
                        value={formData.sourceField || '__none__'}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            sourceField: value === '__none__' ? '' : value,
                          }))
                        }
                        options={[
                          { value: '__none__', label: 'Select source field' },
                          ...sourceFieldOptions,
                        ]}
                      />
                    </div>
                  </div>
                )}

                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  <div>
                    <Label className='text-xs text-gray-300'>Source Extract Regex (optional)</Label>
                    <Input
                      className='mt-2 font-mono'
                      value={formData.sourceRegex}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          sourceRegex: event.target.value,
                        }))
                      }
                      placeholder='(\\d+)$'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-300'>Source Flags</Label>
                    <Input
                      className='mt-2 font-mono'
                      value={formData.sourceFlags}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          sourceFlags: event.target.value,
                        }))
                      }
                      placeholder='i'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-300'>Capture Group Index</Label>
                    <Input
                      className='mt-2'
                      value={formData.sourceMatchGroup}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          sourceMatchGroup: event.target.value,
                        }))
                      }
                      placeholder='1'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  <div>
                    <Label className='text-xs text-gray-300'>Math Operation</Label>
                    <div className='mt-2'>
                      <UnifiedSelect
                        value={formData.mathOperation}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            mathOperation: value as DynamicReplacementMathOperation,
                          }))
                        }
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'add', label: 'Add' },
                          { value: 'subtract', label: 'Subtract' },
                          { value: 'multiply', label: 'Multiply' },
                          { value: 'divide', label: 'Divide' },
                        ]}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className='text-xs text-gray-300'>Math Operand</Label>
                    <Input
                      className='mt-2'
                      value={formData.mathOperand}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          mathOperand: event.target.value,
                        }))
                      }
                      placeholder='1'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-300'>Round Mode</Label>
                    <div className='mt-2'>
                      <UnifiedSelect
                        value={formData.roundMode}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            roundMode: value as DynamicReplacementRoundMode,
                          }))
                        }
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'round', label: 'Round' },
                          { value: 'floor', label: 'Floor' },
                          { value: 'ceil', label: 'Ceil' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div>
                    <Label className='text-xs text-gray-300'>Logic Operator</Label>
                    <div className='mt-2'>
                      <UnifiedSelect
                        value={formData.logicOperator}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            logicOperator: value as DynamicReplacementLogicOperator,
                          }))
                        }
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'equals', label: 'Equals' },
                          { value: 'not_equals', label: 'Not equals' },
                          { value: 'contains', label: 'Contains' },
                          { value: 'starts_with', label: 'Starts with' },
                          { value: 'ends_with', label: 'Ends with' },
                          { value: 'regex', label: 'Regex test' },
                          { value: 'gt', label: 'Greater than' },
                          { value: 'gte', label: 'Greater than or equal' },
                          { value: 'lt', label: 'Less than' },
                          { value: 'lte', label: 'Less than or equal' },
                          { value: 'is_empty', label: 'Is empty' },
                          { value: 'is_not_empty', label: 'Is not empty' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {formData.logicOperator !== 'none' && (
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div>
                      <Label className='text-xs text-gray-300'>
                        Logic Operand
                      </Label>
                      <Input
                        className='mt-2 font-mono'
                        value={formData.logicOperand}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            logicOperand: event.target.value,
                          }))
                        }
                        placeholder='Value to compare against'
                      />
                    </div>
                    <div>
                      <Label className='text-xs text-gray-300'>Logic Flags (regex only)</Label>
                      <Input
                        className='mt-2 font-mono'
                        value={formData.logicFlags}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            logicFlags: event.target.value,
                          }))
                        }
                        placeholder='i'
                      />
                    </div>
                  </div>
                )}

                {formData.logicOperator !== 'none' && (
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='space-y-3 rounded-md border border-cyan-400/20 bg-cyan-500/5 p-3'>
                      <Label className='text-xs text-gray-200'>When condition is TRUE</Label>
                      <UnifiedSelect
                        value={formData.logicWhenTrueAction}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            logicWhenTrueAction: value as DynamicReplacementLogicAction,
                          }))
                        }
                        options={[
                          { value: 'keep', label: 'Keep current value' },
                          { value: 'set_value', label: 'Set custom value' },
                          { value: 'clear', label: 'Clear value' },
                          { value: 'abort', label: 'Abort replacement' },
                        ]}
                      />
                      {formData.logicWhenTrueAction === 'set_value' && (
                        <Input
                          className='font-mono'
                          value={formData.logicWhenTrueValue}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                            setFormData((prev: PatternFormData) => ({
                              ...prev,
                              logicWhenTrueValue: event.target.value,
                            }))
                          }
                          placeholder='Replacement value when TRUE'
                        />
                      )}
                    </div>

                    <div className='space-y-3 rounded-md border border-cyan-400/20 bg-cyan-500/5 p-3'>
                      <Label className='text-xs text-gray-200'>When condition is FALSE</Label>
                      <UnifiedSelect
                        value={formData.logicWhenFalseAction}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            logicWhenFalseAction: value as DynamicReplacementLogicAction,
                          }))
                        }
                        options={[
                          { value: 'keep', label: 'Keep current value' },
                          { value: 'set_value', label: 'Set custom value' },
                          { value: 'clear', label: 'Clear value' },
                          { value: 'abort', label: 'Abort replacement' },
                        ]}
                      />
                      {formData.logicWhenFalseAction === 'set_value' && (
                        <Input
                          className='font-mono'
                          value={formData.logicWhenFalseValue}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                            setFormData((prev: PatternFormData) => ({
                              ...prev,
                              logicWhenFalseValue: event.target.value,
                            }))
                          }
                          placeholder='Replacement value when FALSE'
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div>
                    <Label className='text-xs text-gray-300'>Result Assembly</Label>
                    <div className='mt-2'>
                      <UnifiedSelect
                        value={formData.resultAssembly}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            resultAssembly: value as PatternFormData['resultAssembly'],
                          }))
                        }
                        options={[
                          { value: 'segment_only', label: 'Use transformed segment' },
                          { value: 'source_replace_match', label: 'Inject into source value' },
                        ]}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className='text-xs text-gray-300'>Apply To Target</Label>
                    <div className='mt-2'>
                      <UnifiedSelect
                        value={formData.targetApply}
                        onValueChange={(value: string): void =>
                          setFormData((prev: PatternFormData) => ({
                            ...prev,
                            targetApply: value as PatternFormData['targetApply'],
                          }))
                        }
                        options={[
                          { value: 'replace_matched_segment', label: 'Replace matched segment' },
                          { value: 'replace_whole_field', label: 'Replace whole field' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div>
                    <Label className='text-xs text-gray-300'>Pad Length (optional)</Label>
                    <Input
                      className='mt-2'
                      value={formData.padLength}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          padLength: event.target.value,
                        }))
                      }
                      placeholder='3'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-300'>Pad Character</Label>
                    <Input
                      className='mt-2'
                      value={formData.padChar}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData((prev: PatternFormData) => ({
                          ...prev,
                          padChar: event.target.value,
                        }))
                      }
                      placeholder='0'
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className='text-xs text-gray-400'>Replacer Fields</Label>
              <p className='mt-1 text-[11px] text-gray-500'>
                Leave empty to apply replacement globally on all matching fields.
              </p>
              <div className='mt-2'>
                <MultiSelect
                  options={replacementFieldOptions}
                  selected={formData.replacementFields}
                  onChange={(values: string[]) =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      replacementFields: normalizeReplacementFields(values),
                    }))
                  }
                  placeholder='All matching fields (global)'
                  searchPlaceholder='Search fields...'
                  emptyMessage='No fields found.'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px]'>
              <div>
                <Label className='text-xs text-gray-400'>Regex</Label>
                <Input
                  className='mt-2 font-mono'
                  value={formData.regex}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({ ...prev, regex: event.target.value }))
                  }
                  placeholder='\\s{2,}|\\*{2,}'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Flags</Label>
                <Input
                  className='mt-2 font-mono'
                  value={formData.flags}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({ ...prev, flags: event.target.value }))
                  }
                  placeholder='gim'
                />
              </div>
            </div>

            <div>
              <Label className='text-xs text-gray-400'>Message</Label>
              <Textarea
                className='mt-2 min-h-[90px]'
                value={formData.message}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  setFormData((prev: PatternFormData) => ({ ...prev, message: event.target.value }))
                }
                placeholder='Remove duplicate spaces from product name.'
              />
            </div>

            <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
              <span className='text-xs text-gray-300'>Pattern enabled</span>
              <ToggleButton
                enabled={formData.enabled}
                onClick={() =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }))
                }
              />
            </div>

            <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
              <span className='text-xs text-gray-300'>Replacer enabled</span>
              <ToggleButton
                enabled={formData.replacementEnabled}
                onClick={() =>
                  setFormData((prev: PatternFormData) => {
                    const nextReplacementEnabled = !prev.replacementEnabled;
                    return {
                      ...prev,
                      replacementEnabled: nextReplacementEnabled,
                      replacementAutoApply: nextReplacementEnabled ? prev.replacementAutoApply : false,
                    };
                  })
                }
              />
            </div>

            <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
              <div>
                <span className='text-xs text-gray-300'>Auto-apply replacer</span>
                <p className='text-[11px] text-gray-500'>
                  OFF keeps it as a proposal only.
                </p>
              </div>
              <ToggleButton
                enabled={formData.replacementAutoApply}
                disabled={!formData.replacementEnabled}
                onClick={() =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    replacementAutoApply: !prev.replacementAutoApply,
                  }))
                }
              />
            </div>

            <div className='flex items-center justify-end gap-3 pt-2'>
              <Button
                type='button'
                className='rounded-md border border-border px-3 py-2 text-sm text-gray-300 hover:bg-muted/50'
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                type='button'
                className='rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200'
                onClick={() => {
                  void handleSave();
                }}
                disabled={createPattern.isPending || updatePattern.isPending}
              >
                {createPattern.isPending || updatePattern.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </SharedModal>
      )}
    </div>
  );
}
