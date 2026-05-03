import {
  isPatternInSequenceGroup,
  resolveFieldTargetAndLocale,
} from '@/features/products/validation-engine/core';
import { coerceProductValidationTargetValue } from '@/features/products/lib/validatorTargetAdapters';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

import {
  executeReplacementPattern,
  shouldStopPatternChain,
} from './ProductFormGeneralFormatter.execution';
import {
  coerceFormatterRawValue,
  patternNeedsLatestProductSource,
  resolveReplacementPatterns,
  shouldProcessReplacementPatterns,
} from './ProductFormGeneralFormatter.patterns';
import type {
  FormatterFieldUpdate,
  FormatterRuntime,
  ReplacementPatternExecutionResult,
} from './ProductFormGeneralFormatter.types';

type SequenceCandidateState = {
  candidateValue: string;
  inSequenceGroup: boolean;
  shouldSkip: boolean;
};

type PatternProcessingState = {
  nextValue: string;
  fieldProcessedGroups: Set<string>;
};

type SequenceCandidateInput = {
  runtime: FormatterRuntime;
  pattern: ProductValidationPattern;
  fieldName: string;
  rawValue: string;
  state: PatternProcessingState;
};

type PatternResultApplicationInput = {
  pattern: ProductValidationPattern;
  rawValue: string;
  state: PatternProcessingState;
  sequenceState: SequenceCandidateState;
  result: ReplacementPatternExecutionResult;
};

type FormatterFieldUpdateInput = {
  runtime: FormatterRuntime;
  fieldName: keyof ProductFormData;
  rawUnknown: unknown;
  rawValue: string;
  nextValue: string;
  target: NonNullable<ReturnType<typeof resolveFieldTargetAndLocale>['target']>;
};

type PatternResultApplication = {
  state: PatternProcessingState;
  shouldStop: boolean;
};

const resolveSequenceGroupId = (pattern: ProductValidationPattern): string | null => {
  const groupId = pattern.sequenceGroupId.trim();
  return groupId !== '' ? groupId : null;
};

const shouldSkipForSequenceDebounce = (
  runtime: FormatterRuntime,
  pattern: ProductValidationPattern,
  groupId: string,
  fieldName: string
): boolean => {
  const debounceMs =
    pattern.launchEnabled && pattern.launchSourceMode !== 'current_field'
      ? 0
      : Math.max(0, Math.floor(pattern.sequenceGroupDebounceMs));
  if (debounceMs <= 0) return false;
  const key = `${groupId}:${fieldName}`;
  const now = Date.now();
  const previous = runtime.readSequenceGroupDebounce(key);
  if (now - previous < debounceMs) return true;
  runtime.setSequenceGroupDebounce(key, now);
  return false;
};

const resolveSequenceCandidateState = ({
  runtime,
  pattern,
  fieldName,
  rawValue,
  state,
}: SequenceCandidateInput): SequenceCandidateState => {
  const inSequenceGroup = isPatternInSequenceGroup(pattern, runtime.sequenceGroupCounts);
  if (inSequenceGroup === false) {
    return { candidateValue: rawValue, inSequenceGroup, shouldSkip: false };
  }
  const groupId = resolveSequenceGroupId(pattern);
  if (groupId === null || state.fieldProcessedGroups.has(groupId)) {
    return { candidateValue: state.nextValue, inSequenceGroup, shouldSkip: false };
  }
  if (shouldSkipForSequenceDebounce(runtime, pattern, groupId, fieldName)) {
    return { candidateValue: state.nextValue, inSequenceGroup, shouldSkip: true };
  }
  state.fieldProcessedGroups.add(groupId);
  return { candidateValue: state.nextValue, inSequenceGroup, shouldSkip: false };
};

const applyPatternResult = ({
  pattern,
  rawValue,
  state,
  sequenceState,
  result,
}: PatternResultApplicationInput): PatternResultApplication => {
  if (sequenceState.inSequenceGroup) {
    return {
      state: {
        ...state,
        nextValue: result.replaced ? result.candidateValue : state.nextValue,
      },
      shouldStop: shouldStopPatternChain(pattern, result),
    };
  }
  return {
    state: {
      ...state,
      nextValue: result.candidateValue !== rawValue ? result.candidateValue : state.nextValue,
    },
    shouldStop: false,
  };
};

const processReplacementPatterns = (
  runtime: FormatterRuntime,
  fieldName: string,
  rawValue: string,
  replacementPatterns: ProductValidationPattern[]
): string => {
  let state: PatternProcessingState = {
    nextValue: rawValue,
    fieldProcessedGroups: new Set<string>(),
  };
  for (const pattern of replacementPatterns) {
    if (patternNeedsLatestProductSource(pattern) && runtime.latestProductValues === null) continue;
    const sequenceState = resolveSequenceCandidateState({
      runtime,
      pattern,
      fieldName,
      rawValue,
      state,
    });
    if (sequenceState.shouldSkip) continue;
    const result = executeReplacementPattern(runtime, pattern, sequenceState.candidateValue);
    const application = applyPatternResult({ pattern, rawValue, state, sequenceState, result });
    state = application.state;
    if (application.shouldStop) break;
  }
  return state.nextValue;
};

const buildNumericFormatterFieldUpdate = (
  fieldName: keyof ProductFormData,
  rawUnknown: unknown,
  coercedValue: number
): FormatterFieldUpdate | null => {
  const currentNumeric =
    typeof rawUnknown === 'number' && Number.isFinite(rawUnknown) ? rawUnknown : Number.NaN;
  if (Number.isFinite(currentNumeric) && currentNumeric === coercedValue) return null;
  return { fieldName, fieldValue: coercedValue as ProductFormData[typeof fieldName] };
};

const buildStringFormatterFieldUpdate = ({
  runtime,
  fieldName,
  rawValue,
  nextValue,
}: FormatterFieldUpdateInput): FormatterFieldUpdate | null => {
  if (nextValue === rawValue) return null;
  if (runtime.focusedFieldName === String(fieldName)) return null;
  return { fieldName, fieldValue: nextValue as ProductFormData[typeof fieldName] };
};

const buildFormatterFieldUpdate = (
  input: FormatterFieldUpdateInput
): FormatterFieldUpdate | null => {
  const coercedValue = coerceProductValidationTargetValue({
    target: input.target,
    value: input.nextValue,
  });
  if (typeof coercedValue === 'number') {
    return buildNumericFormatterFieldUpdate(input.fieldName, input.rawUnknown, coercedValue);
  }
  if (coercedValue === null) return null;
  return buildStringFormatterFieldUpdate(input);
};

export const processFormatterField = (
  runtime: FormatterRuntime,
  fieldNameRaw: string,
  rawUnknown: unknown
): FormatterFieldUpdate | null => {
  const rawValue = coerceFormatterRawValue(rawUnknown);
  const { target } = resolveFieldTargetAndLocale(fieldNameRaw);
  if (target === null) return null;
  const replacementPatterns = resolveReplacementPatterns(runtime, fieldNameRaw);
  if (shouldProcessReplacementPatterns(rawValue, replacementPatterns) === false) return null;
  const nextValue = processReplacementPatterns(
    runtime,
    fieldNameRaw,
    rawValue,
    replacementPatterns
  );
  if (nextValue === rawValue) return null;
  return buildFormatterFieldUpdate({
    runtime,
    fieldName: fieldNameRaw as keyof ProductFormData,
    rawUnknown,
    rawValue,
    nextValue,
    target,
  });
};
