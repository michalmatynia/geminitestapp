import type {
  PatternFormData,
  ProductValidationLaunchOperator,
  ProductValidationPattern,
  ProductValidationSemanticState,
  SequenceGroupView,
} from '@/shared/contracts/products';
import type { UpdateProductValidationPatternInput as UpdateValidationPatternPayload } from '@/shared/contracts/products/validation';
import {
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { reconcileProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-operations';
import { serializeProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';

export function parseStrictInt(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) return null;
  return parsed;
}

export type BuildValidationPayloadArgs = {
  formData: PatternFormData;
  sequenceGroups: Map<string, SequenceGroupView>;
  editingPattern: ProductValidationPattern | null;
  semanticState: ProductValidationSemanticState | null;
  replacementValue: string | null;
  parsedSequence: number | null;
  parsedMaxExecutions: number;
  parsedValidationDebounceMs: number;
};

export function buildValidationPayload({
  formData,
  sequenceGroups,
  editingPattern,
  semanticState,
  replacementValue,
  parsedSequence,
  parsedMaxExecutions,
  parsedValidationDebounceMs,
}: BuildValidationPayloadArgs): UpdateValidationPatternPayload {
  const runtimeEnabled = formData.runtimeEnabled;
  const runtimeConfig = formData.runtimeConfig;
  const selectedSequenceGroupId = formData.sequenceGroupId.trim() || null;
  const selectedSequenceGroup = selectedSequenceGroupId
    ? (sequenceGroups.get(selectedSequenceGroupId) ?? null)
    : null;
  const sequenceGroupLabel = selectedSequenceGroupId
    ? (selectedSequenceGroup?.label ?? editingPattern?.sequenceGroupLabel?.trim() ?? null)
    : null;
  const sequenceGroupDebounceMs = selectedSequenceGroupId
    ? (selectedSequenceGroup?.debounceMs ?? editingPattern?.sequenceGroupDebounceMs ?? 0)
    : 0;

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
      formData.replacementAppliesToScopes
    ),
    postAcceptBehavior: formData.postAcceptBehavior,
    denyBehaviorOverride:
      formData.denyBehaviorOverride === 'inherit' ? null : formData.denyBehaviorOverride,
    sequenceGroupId: selectedSequenceGroupId,
    sequenceGroupLabel,
    sequenceGroupDebounceMs,
    sequence: parsedSequence,
    chainMode: formData.chainMode,
    maxExecutions: parsedMaxExecutions,
    passOutputToNext: formData.passOutputToNext,
    launchEnabled: formData.launchEnabled,
    launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
      formData.launchAppliesToScopes
    ),
    launchScopeBehavior: formData.launchScopeBehavior,
    launchSourceMode: formData.launchSourceMode,
    launchSourceField: formData.launchSourceField.trim() || null,
    launchOperator: formData.launchOperator as ProductValidationLaunchOperator,
    launchValue: formData.launchValue || null,
    launchFlags: formData.launchFlags.trim() || null,
    runtimeEnabled,
    runtimeType: runtimeEnabled ? formData.runtimeType : 'none',
    runtimeConfig: runtimeEnabled ? runtimeConfig : null,
    appliesToScopes: normalizeProductValidationPatternScopes(formData.appliesToScopes),
    validationDebounceMs: parsedValidationDebounceMs,
  };

  payload.semanticState = reconcileProductValidationSemanticState({
    currentSemanticState: semanticState,
    pattern: payload,
  });

  return payload;
}

function areStringArraysEqual(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined
): boolean {
  const leftSorted = [...(left ?? [])].sort();
  const rightSorted = [...(right ?? [])].sort();
  if (leftSorted.length !== rightSorted.length) return false;
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

export function buildPatternPayloadDiff(
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload {
  const currentReplacementScopes = normalizeProductValidationPatternReplacementScopes(
    existing.replacementAppliesToScopes
  );
  const currentLaunchScopes = normalizeProductValidationPatternLaunchScopes(
    existing.launchAppliesToScopes
  );
  const currentAppliesToScopes = normalizeProductValidationPatternScopes(existing.appliesToScopes);

  const diff: UpdateValidationPatternPayload = {};
  if (next.label !== existing.label) diff.label = next.label;
  if (next.target !== existing.target) diff.target = next.target;
  if (next.locale !== (existing.locale ?? null)) diff.locale = next.locale;
  if (next.regex !== existing.regex) diff.regex = next.regex;
  if (next.flags !== (existing.flags ?? null)) diff.flags = next.flags;
  if (next.message !== existing.message) diff.message = next.message;
  if (next.severity !== existing.severity) diff.severity = next.severity;
  if (next.enabled !== existing.enabled) diff.enabled = next.enabled;
  if (next.replacementEnabled !== existing.replacementEnabled) {
    diff.replacementEnabled = next.replacementEnabled;
  }
  if ((next.replacementAutoApply ?? false) !== (existing.replacementAutoApply ?? false)) {
    diff.replacementAutoApply = next.replacementAutoApply;
  }
  if (
    (next.skipNoopReplacementProposal ?? true) !== (existing.skipNoopReplacementProposal ?? true)
  ) {
    diff.skipNoopReplacementProposal = next.skipNoopReplacementProposal;
  }
  if (next.replacementValue !== (existing.replacementValue ?? null)) {
    diff.replacementValue = next.replacementValue;
  }
  if (!areStringArraysEqual(next.replacementFields, existing.replacementFields)) {
    diff.replacementFields = next.replacementFields;
  }
  if (!areStringArraysEqual(next.replacementAppliesToScopes, currentReplacementScopes)) {
    diff.replacementAppliesToScopes = next.replacementAppliesToScopes;
  }
  if (next.postAcceptBehavior !== existing.postAcceptBehavior) {
    diff.postAcceptBehavior = next.postAcceptBehavior;
  }
  if (next.denyBehaviorOverride !== (existing.denyBehaviorOverride ?? null)) {
    diff.denyBehaviorOverride = next.denyBehaviorOverride;
  }
  if (
    next.sequenceGroupId !== (existing.sequenceGroupId ?? null) ||
    next.sequenceGroupLabel !== (existing.sequenceGroupLabel ?? null) ||
    next.sequenceGroupDebounceMs !== (existing.sequenceGroupDebounceMs ?? 0)
  ) {
    diff.sequenceGroupId = next.sequenceGroupId;
    diff.sequenceGroupLabel = next.sequenceGroupLabel;
    diff.sequenceGroupDebounceMs = next.sequenceGroupDebounceMs;
  }
  if (next.sequence !== (existing.sequence ?? null)) diff.sequence = next.sequence;
  if (next.chainMode !== existing.chainMode) diff.chainMode = next.chainMode;
  if ((next.maxExecutions ?? 1) !== (existing.maxExecutions ?? 1)) {
    diff.maxExecutions = next.maxExecutions;
  }
  if ((next.passOutputToNext ?? true) !== (existing.passOutputToNext ?? true)) {
    diff.passOutputToNext = next.passOutputToNext;
  }
  if ((next.launchEnabled ?? false) !== (existing.launchEnabled ?? false)) {
    diff.launchEnabled = next.launchEnabled;
  }
  if (!areStringArraysEqual(next.launchAppliesToScopes, currentLaunchScopes)) {
    diff.launchAppliesToScopes = next.launchAppliesToScopes;
  }
  if ((next.launchScopeBehavior ?? 'gate') !== (existing.launchScopeBehavior ?? 'gate')) {
    diff.launchScopeBehavior = next.launchScopeBehavior;
  }
  if (
    (next.launchSourceMode ?? 'current_field') !== (existing.launchSourceMode ?? 'current_field')
  ) {
    diff.launchSourceMode = next.launchSourceMode;
  }
  if ((next.launchSourceField ?? null) !== (existing.launchSourceField ?? null)) {
    diff.launchSourceField = next.launchSourceField;
  }
  if (next.launchOperator !== existing.launchOperator) {
    diff.launchOperator = next.launchOperator;
  }
  if ((next.launchValue ?? null) !== (existing.launchValue ?? null)) {
    diff.launchValue = next.launchValue;
  }
  if ((next.launchFlags ?? null) !== (existing.launchFlags ?? null)) {
    diff.launchFlags = next.launchFlags;
  }
  if ((next.runtimeEnabled ?? false) !== (existing.runtimeEnabled ?? false)) {
    diff.runtimeEnabled = next.runtimeEnabled;
  }
  if ((next.runtimeType ?? 'none') !== (existing.runtimeType ?? 'none')) {
    diff.runtimeType = next.runtimeType;
  }
  if ((next.runtimeConfig ?? null) !== (existing.runtimeConfig ?? null)) {
    diff.runtimeConfig = next.runtimeConfig;
  }
  if (!areStringArraysEqual(next.appliesToScopes, currentAppliesToScopes)) {
    diff.appliesToScopes = next.appliesToScopes;
  }
  if ((next.validationDebounceMs ?? 0) !== (existing.validationDebounceMs ?? 0)) {
    diff.validationDebounceMs = next.validationDebounceMs;
  }
  if (
    serializeProductValidationSemanticState(next.semanticState) !==
    serializeProductValidationSemanticState(existing.semanticState)
  ) {
    diff.semanticState = next.semanticState;
  }
  return diff;
}
