import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import {
  allowsPatternExecutionWithoutRegexMatch,
  applyResolvedReplacement,
  normalizePatternChainMode,
  normalizePatternMaxExecutions,
  resolvePatternReplacementValue,
  shouldLaunchPattern,
} from '@/features/products/validation-engine/core';
import {
  isPatternEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
} from '@/shared/lib/products/utils/validator-instance-behavior';

import type { ValidatorPatternSequenceTraceStep } from './validator-pattern-simulator.types';

type TraceExecutionState = {
  applied: boolean;
  executions: number;
  launchMatched: boolean;
  matched: boolean;
  outputValue: string;
  regexMatched: boolean;
  replaced: boolean;
  replacementValue: string | null;
  skipReason: ValidatorPatternSequenceTraceStep['skipReason'];
};

type TraceExecutionResult = {
  candidateValue: string;
  state: TraceExecutionState;
  stopLoop: boolean;
};

export type TracePatternResult = {
  candidateValue: string;
  step: ValidatorPatternSequenceTraceStep;
};

const createInitialTraceExecutionState = (inputValue: string): TraceExecutionState => ({
  applied: false,
  executions: 0,
  launchMatched: false,
  matched: false,
  outputValue: inputValue,
  regexMatched: false,
  replaced: false,
  replacementValue: null,
  skipReason: null,
});

const resolvePatternScopeSkipReason = ({
  pattern,
  patternEnabledForScope,
}: {
  pattern: ProductValidationPattern;
  patternEnabledForScope: boolean;
}): ValidatorPatternSequenceTraceStep['skipReason'] => {
  if (!pattern.enabled) return 'disabled';
  if (!patternEnabledForScope) return 'out_of_scope';
  return null;
};

const testPatternRegex = (pattern: ProductValidationPattern, value: string): boolean => {
  try {
    return new RegExp(pattern.regex, pattern.flags ?? undefined).test(value);
  } catch {
    return false;
  }
};

const buildStoppedExecution = (
  state: TraceExecutionState,
  candidateValue: string,
  skipReason: ValidatorPatternSequenceTraceStep['skipReason']
): TraceExecutionResult => ({
  candidateValue,
  state: { ...state, skipReason },
  stopLoop: true,
});

const resolveFirstExecutionSkipReason = (
  executions: number,
  skipReason: ValidatorPatternSequenceTraceStep['skipReason']
): ValidatorPatternSequenceTraceStep['skipReason'] => (executions === 0 ? skipReason : null);

const runTraceExecution = ({
  allowWithoutRegexMatch,
  candidateValue,
  latestProductValues,
  pattern,
  replacementEnabledForScope,
  state,
  validationScope,
  values,
}: {
  allowWithoutRegexMatch: boolean;
  candidateValue: string;
  latestProductValues: Record<string, unknown> | null;
  pattern: ProductValidationPattern;
  replacementEnabledForScope: boolean;
  state: TraceExecutionState;
  validationScope: ProductValidationInstanceScope;
  values: Record<string, unknown>;
}): TraceExecutionResult => {
  const launchMatched = shouldLaunchPattern({ pattern, validationScope, fieldValue: candidateValue, values, latestProductValues });
  if (!launchMatched) {
    return buildStoppedExecution(
      { ...state, launchMatched },
      candidateValue,
      resolveFirstExecutionSkipReason(state.executions, 'launch_blocked')
    );
  }
  const regexMatched = testPatternRegex(pattern, candidateValue);
  if (!regexMatched && !allowWithoutRegexMatch) {
    return buildStoppedExecution(
      { ...state, launchMatched, regexMatched },
      candidateValue,
      resolveFirstExecutionSkipReason(state.executions, 'regex_no_match')
    );
  }
  return runReplacementTraceExecution({
    candidateValue,
    latestProductValues,
    pattern,
    regexMatched,
    replacementEnabledForScope,
    state: { ...state, launchMatched, matched: true, regexMatched },
    values,
  });
};

const runReplacementTraceExecution = ({
  candidateValue,
  latestProductValues,
  pattern,
  regexMatched,
  replacementEnabledForScope,
  state,
  values,
}: {
  candidateValue: string;
  latestProductValues: Record<string, unknown> | null;
  pattern: ProductValidationPattern;
  regexMatched: boolean;
  replacementEnabledForScope: boolean;
  state: TraceExecutionState;
  values: Record<string, unknown>;
}): TraceExecutionResult => {
  const nextState = { ...state, executions: state.executions + 1, regexMatched };
  if (!replacementEnabledForScope) {
    return buildStoppedExecution(nextState, candidateValue, 'replacement_disabled');
  }
  const replacement = resolvePatternReplacementValue({ pattern, fieldValue: candidateValue, values, latestProductValues });
  if (replacement === null) {
    return buildStoppedExecution(nextState, candidateValue, 'replacement_unresolved');
  }
  const replacedValue = applyResolvedReplacement({ value: candidateValue, pattern, replacement });
  const changed = replacedValue !== candidateValue;
  return {
    candidateValue: changed ? replacedValue : candidateValue,
    state: {
      ...nextState,
      applied: nextState.applied || changed,
      outputValue: replacedValue,
      replaced: nextState.replaced || changed,
      replacementValue: replacement.value,
    },
    stopLoop: !changed,
  };
};

const resolveTraceStopReason = (
  pattern: ProductValidationPattern,
  state: TraceExecutionState
): ValidatorPatternSequenceTraceStep['stopReason'] => {
  const chainMode = normalizePatternChainMode(pattern);
  if (state.matched && chainMode === 'stop_on_match') return 'chain_stop_on_match';
  if (state.replaced && chainMode === 'stop_on_replace') return 'chain_stop_on_replace';
  if (state.replaced && pattern.passOutputToNext === false) return 'pass_output_disabled';
  return null;
};

const runTracePatternExecutions = ({
  allowWithoutRegexMatch,
  candidateValue,
  latestProductValues,
  pattern,
  replacementEnabledForScope,
  validationScope,
  values,
}: {
  allowWithoutRegexMatch: boolean;
  candidateValue: string;
  latestProductValues: Record<string, unknown> | null;
  pattern: ProductValidationPattern;
  replacementEnabledForScope: boolean;
  validationScope: ProductValidationInstanceScope;
  values: Record<string, unknown>;
}): TraceExecutionResult => {
  let state = createInitialTraceExecutionState(candidateValue);
  let nextCandidateValue = candidateValue;
  for (let execution = 0; execution < normalizePatternMaxExecutions(pattern); execution += 1) {
    const result = runTraceExecution({
      allowWithoutRegexMatch,
      candidateValue: nextCandidateValue,
      latestProductValues,
      pattern,
      replacementEnabledForScope,
      state,
      validationScope,
      values,
    });
    state = result.state;
    nextCandidateValue = result.candidateValue;
    if (result.stopLoop) return { candidateValue: nextCandidateValue, state, stopLoop: true };
  }
  return { candidateValue: nextCandidateValue, state, stopLoop: false };
};

const buildTraceStep = ({
  allowWithoutRegexMatch,
  inputValue,
  pattern,
  previewPattern,
  replacementEnabledForScope,
  result,
}: {
  allowWithoutRegexMatch: boolean;
  inputValue: string;
  pattern: ProductValidationPattern;
  previewPattern: ProductValidationPattern;
  replacementEnabledForScope: boolean;
  result: TraceExecutionResult;
}): ValidatorPatternSequenceTraceStep => ({
  allowWithoutRegexMatch,
  applied: result.state.applied,
  executions: result.state.executions,
  inputValue,
  isPreviewPattern: pattern.id === previewPattern.id,
  label: pattern.label,
  launchMatched: result.state.launchMatched,
  outputValue: result.state.outputValue,
  patternId: pattern.id,
  regexMatched: result.state.regexMatched,
  replacementEnabledForScope,
  replacementValue: result.state.replacementValue,
  sequence: pattern.sequence ?? null,
  skipReason: result.state.skipReason,
  stopReason: resolveTraceStopReason(pattern, result.state),
});

export const runTracePattern = ({
  candidateValue,
  latestProductValues,
  pattern,
  previewPattern,
  validationScope,
  values,
}: {
  candidateValue: string;
  latestProductValues: Record<string, unknown> | null;
  pattern: ProductValidationPattern;
  previewPattern: ProductValidationPattern;
  validationScope: ProductValidationInstanceScope;
  values: Record<string, unknown>;
}): TracePatternResult => {
  const patternEnabledForScope = pattern.enabled && isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope);
  const replacementEnabledForScope = isPatternReplacementEnabledForValidationScope(pattern.replacementAppliesToScopes, validationScope);
  const allowWithoutRegexMatch = allowsPatternExecutionWithoutRegexMatch(pattern);
  const skipReason = resolvePatternScopeSkipReason({ pattern, patternEnabledForScope });
  const result = skipReason === null
    ? runTracePatternExecutions({
        allowWithoutRegexMatch,
        candidateValue,
        latestProductValues,
        pattern,
        replacementEnabledForScope,
        validationScope,
        values,
      })
    : {
        candidateValue,
        state: { ...createInitialTraceExecutionState(candidateValue), skipReason },
        stopLoop: true,
      };
  return {
    candidateValue: result.candidateValue,
    step: buildTraceStep({
      allowWithoutRegexMatch,
      inputValue: candidateValue,
      pattern,
      previewPattern,
      replacementEnabledForScope,
      result,
    }),
  };
};
