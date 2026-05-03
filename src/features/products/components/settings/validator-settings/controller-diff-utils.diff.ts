import type {
  ProductValidationPattern,
  UpdateProductValidationPatternInput as UpdateValidationPatternPayload,
} from '@/shared/contracts/products/validation';
import {
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { serializeProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';

function areStringArraysEqual(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined
): boolean {
  const leftSorted = [...(left ?? [])].sort();
  const rightSorted = [...(right ?? [])].sort();
  if (leftSorted.length !== rightSorted.length) return false;
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

const buildIdentityTextPayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  if (next.label !== existing.label) diff.label = next.label;
  if (next.target !== existing.target) diff.target = next.target;
  if (next.locale !== (existing.locale ?? null)) diff.locale = next.locale;
  if (next.regex !== existing.regex) diff.regex = next.regex;
  return diff;
};

const buildIdentityMessagePayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  if (next.flags !== (existing.flags ?? null)) diff.flags = next.flags;
  if (next.message !== existing.message) diff.message = next.message;
  if (next.severity !== existing.severity) diff.severity = next.severity;
  return diff;
};

const buildReplacementModePayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  if (next.enabled !== existing.enabled) diff.enabled = next.enabled;
  if (next.replacementEnabled !== existing.replacementEnabled) {
    diff.replacementEnabled = next.replacementEnabled;
  }
  if ((next.replacementAutoApply ?? false) !== existing.replacementAutoApply) {
    diff.replacementAutoApply = next.replacementAutoApply;
  }
  if ((next.skipNoopReplacementProposal ?? true) !== existing.skipNoopReplacementProposal) {
    diff.skipNoopReplacementProposal = next.skipNoopReplacementProposal;
  }
  return diff;
};

const buildReplacementValuePayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  const currentScopes = normalizeProductValidationPatternReplacementScopes(
    existing.replacementAppliesToScopes
  );
  if (next.replacementValue !== (existing.replacementValue ?? null)) {
    diff.replacementValue = next.replacementValue;
  }
  if (!areStringArraysEqual(next.replacementFields, existing.replacementFields)) {
    diff.replacementFields = next.replacementFields;
  }
  if (!areStringArraysEqual(next.replacementAppliesToScopes, currentScopes)) {
    diff.replacementAppliesToScopes = next.replacementAppliesToScopes;
  }
  return diff;
};

const hasSequenceGroupChanged = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): boolean =>
  next.sequenceGroupId !== (existing.sequenceGroupId ?? null) ||
  next.sequenceGroupLabel !== (existing.sequenceGroupLabel ?? null) ||
  next.sequenceGroupDebounceMs !== existing.sequenceGroupDebounceMs;

const buildBehaviorPayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  if (next.postAcceptBehavior !== existing.postAcceptBehavior) {
    diff.postAcceptBehavior = next.postAcceptBehavior;
  }
  if (next.denyBehaviorOverride !== (existing.denyBehaviorOverride ?? null)) {
    diff.denyBehaviorOverride = next.denyBehaviorOverride;
  }
  if (hasSequenceGroupChanged(existing, next)) {
    diff.sequenceGroupId = next.sequenceGroupId;
    diff.sequenceGroupLabel = next.sequenceGroupLabel;
    diff.sequenceGroupDebounceMs = next.sequenceGroupDebounceMs;
  }
  if (next.sequence !== (existing.sequence ?? null)) diff.sequence = next.sequence;
  if (next.chainMode !== existing.chainMode) diff.chainMode = next.chainMode;
  return diff;
};

const buildExecutionPayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  if ((next.maxExecutions ?? 1) !== existing.maxExecutions) {
    diff.maxExecutions = next.maxExecutions;
  }
  if ((next.passOutputToNext ?? true) !== existing.passOutputToNext) {
    diff.passOutputToNext = next.passOutputToNext;
  }
  if ((next.validationDebounceMs ?? 0) !== existing.validationDebounceMs) {
    diff.validationDebounceMs = next.validationDebounceMs;
  }
  return diff;
};

const buildLaunchEnabledPayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  const currentLaunchScopes = normalizeProductValidationPatternLaunchScopes(
    existing.launchAppliesToScopes
  );
  if ((next.launchEnabled ?? false) !== existing.launchEnabled) {
    diff.launchEnabled = next.launchEnabled;
  }
  if (!areStringArraysEqual(next.launchAppliesToScopes, currentLaunchScopes)) {
    diff.launchAppliesToScopes = next.launchAppliesToScopes;
  }
  return diff;
};

const buildLaunchModePayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  if ((next.launchScopeBehavior ?? 'gate') !== (existing.launchScopeBehavior ?? 'gate')) {
    diff.launchScopeBehavior = next.launchScopeBehavior;
  }
  if ((next.launchSourceMode ?? 'current_field') !== existing.launchSourceMode) {
    diff.launchSourceMode = next.launchSourceMode;
  }
  return diff;
};

const buildLaunchSourcePayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  if ((next.launchSourceField ?? null) !== (existing.launchSourceField ?? null)) {
    diff.launchSourceField = next.launchSourceField;
  }
  if (next.launchOperator !== existing.launchOperator) {
    diff.launchOperator = next.launchOperator;
  }
  return diff;
};

const buildLaunchValuePayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  if ((next.launchValue ?? null) !== (existing.launchValue ?? null)) {
    diff.launchValue = next.launchValue;
  }
  if ((next.launchFlags ?? null) !== (existing.launchFlags ?? null)) {
    diff.launchFlags = next.launchFlags;
  }
  return diff;
};

const buildRuntimeModePayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  if ((next.runtimeEnabled ?? false) !== existing.runtimeEnabled) {
    diff.runtimeEnabled = next.runtimeEnabled;
  }
  if ((next.runtimeType ?? 'none') !== existing.runtimeType) {
    diff.runtimeType = next.runtimeType;
  }
  if ((next.runtimeConfig ?? null) !== (existing.runtimeConfig ?? null)) {
    diff.runtimeConfig = next.runtimeConfig;
  }
  return diff;
};

const buildRuntimeScopePayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload => {
  const diff: UpdateValidationPatternPayload = {};
  const currentAppliesToScopes = normalizeProductValidationPatternScopes(existing.appliesToScopes);
  if (!areStringArraysEqual(next.appliesToScopes, currentAppliesToScopes)) {
    diff.appliesToScopes = next.appliesToScopes;
  }
  return diff;
};

const buildSemanticPayloadDiff = (
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload =>
  serializeProductValidationSemanticState(next.semanticState) !==
  serializeProductValidationSemanticState(existing.semanticState)
    ? { semanticState: next.semanticState }
    : {};

export function buildPatternPayloadDiff(
  existing: ProductValidationPattern,
  next: UpdateValidationPatternPayload
): UpdateValidationPatternPayload {
  return {
    ...buildIdentityTextPayloadDiff(existing, next),
    ...buildIdentityMessagePayloadDiff(existing, next),
    ...buildReplacementModePayloadDiff(existing, next),
    ...buildReplacementValuePayloadDiff(existing, next),
    ...buildBehaviorPayloadDiff(existing, next),
    ...buildExecutionPayloadDiff(existing, next),
    ...buildLaunchEnabledPayloadDiff(existing, next),
    ...buildLaunchModePayloadDiff(existing, next),
    ...buildLaunchSourcePayloadDiff(existing, next),
    ...buildLaunchValuePayloadDiff(existing, next),
    ...buildRuntimeModePayloadDiff(existing, next),
    ...buildRuntimeScopePayloadDiff(existing, next),
    ...buildSemanticPayloadDiff(existing, next),
  };
}
