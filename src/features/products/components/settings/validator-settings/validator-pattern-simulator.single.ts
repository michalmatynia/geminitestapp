import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import type { PatternFormData } from '@/shared/contracts/products/drafts';
import type { Producer } from '@/shared/contracts/products/producers';
import {
  allowsPatternExecutionWithoutRegexMatch,
  applyResolvedReplacement,
  resolvePatternReplacementValue,
  shouldLaunchPattern,
} from '@/features/products/validation-engine/core';
import {
  isPatternEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
} from '@/shared/lib/products/utils/validator-instance-behavior';

import { applySimulatorReplacement } from './validator-pattern-simulator.apply';
import { getFieldLabel, resolveSimulatorFieldName } from './validator-pattern-simulator.inputs';
import { buildInvalidSimulationResult } from './validator-pattern-simulator.result';
import {
  DEFAULT_VALIDATOR_PATTERN_SIMULATOR_SCOPE,
  type ValidatorPatternSimulationResult,
} from './validator-pattern-simulator.types';
import {
  buildValidatorPatternSimulationValues,
  type ValidatorPatternSimulationValues,
} from './validator-pattern-simulator.values';

type SimulateValidatorPatternPreviewArgs = {
  pattern: ProductValidationPattern;
  formData: PatternFormData;
  validationScope?: ProductValidationInstanceScope;
  simulatorValues: Record<string, string>;
  categoryFixturesText: string;
  producers?: ReadonlyArray<Producer>;
};

type RegexSimulationResult =
  | { error: string; regexMatched: false }
  | { error: null; regexMatched: boolean };

type SingleSimulationContext = {
  allowWithoutRegexMatch: boolean;
  currentFieldLabel: string;
  currentFieldName: string;
  patternEnabledForScope: boolean;
  regexResult: RegexSimulationResult;
  replacementEnabledForScope: boolean;
  simulationValues: ValidatorPatternSimulationValues;
  validationScope: ProductValidationInstanceScope;
};

type ReplacementPreviewValue = {
  appliedReplacementValue: string | null;
  replacementValue: string | null;
};

const runPatternRegex = (pattern: ProductValidationPattern, value: string): RegexSimulationResult => {
  try {
    return { error: null, regexMatched: new RegExp(pattern.regex, pattern.flags ?? undefined).test(value) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Invalid regular expression.',
      regexMatched: false,
    };
  }
};

const buildSingleSimulationContext = ({
  categoryFixturesText,
  formData,
  pattern,
  producers,
  simulatorValues,
  validationScope,
}: Required<SimulateValidatorPatternPreviewArgs>): SingleSimulationContext => {
  const currentFieldName = resolveSimulatorFieldName(formData.target, formData.locale);
  const simulationValues = buildValidatorPatternSimulationValues({
    categoryFixturesText,
    currentFieldName,
    formData,
    producers,
    simulatorValues,
  });
  return {
    allowWithoutRegexMatch: allowsPatternExecutionWithoutRegexMatch(pattern),
    currentFieldLabel: getFieldLabel(currentFieldName),
    currentFieldName,
    patternEnabledForScope:
      pattern.enabled && isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope),
    regexResult: runPatternRegex(pattern, simulationValues.currentFieldValue),
    replacementEnabledForScope: isPatternReplacementEnabledForValidationScope(
      pattern.replacementAppliesToScopes,
      validationScope
    ),
    simulationValues,
    validationScope,
  };
};

const buildScopeNotes = (
  context: SingleSimulationContext
): string[] => {
  const notes: string[] = [];
  if (!context.patternEnabledForScope) {
    notes.push(`Pattern is disabled for ${context.validationScope}.`);
  }
  if (!context.replacementEnabledForScope) {
    notes.push(`Replacement is disabled for ${context.validationScope}.`);
  }
  return notes;
};

const buildMetadataNotes = (
  pattern: ProductValidationPattern,
  context: SingleSimulationContext,
  producers: ReadonlyArray<Producer>
): string[] => {
  const notes: string[] = [];
  if (pattern.runtimeEnabled && pattern.runtimeType !== 'none') {
    notes.push('Runtime replacement preview is not evaluated in the simulator.');
  }
  if (pattern.target === 'category' && context.simulationValues.categories.length === 0) {
    notes.push('Add category fixtures to preview label-to-category resolution.');
  }
  if (pattern.target === 'producer' && producers.length === 0) {
    notes.push('Producer replacement preview waits for producers metadata to load.');
  }
  return notes;
};

const buildMatchNotes = ({
  context,
  launchMatched,
}: {
  context: SingleSimulationContext;
  launchMatched: boolean;
}): string[] => {
  const notes: string[] = [];
  if (!launchMatched) notes.push('Launch conditions did not match.');
  if (!context.regexResult.regexMatched && !context.allowWithoutRegexMatch) {
    notes.push('Regex did not match the current field value.');
  }
  return notes;
};

const buildSimulationNotes = ({
  context,
  launchMatched,
  pattern,
  producers,
}: {
  context: SingleSimulationContext;
  launchMatched: boolean;
  pattern: ProductValidationPattern;
  producers: ReadonlyArray<Producer>;
}): string[] => [
  ...buildScopeNotes(context),
  ...buildMetadataNotes(pattern, context, producers),
  ...buildMatchNotes({ context, launchMatched }),
];

const appendUnresolvedReplacementNotes = ({
  applied,
  launchMatched,
  notes,
  pattern,
  replacementEnabledForScope,
}: {
  applied: boolean;
  launchMatched: boolean;
  notes: string[];
  pattern: ProductValidationPattern;
  replacementEnabledForScope: boolean;
}): string[] => {
  if (!launchMatched || !replacementEnabledForScope || applied) return notes;
  if (pattern.target === 'category') return [...notes, 'Replacement could not be resolved to a category ID.'];
  if (pattern.target === 'producer') return [...notes, 'Replacement could not be resolved to producer metadata.'];
  return notes;
};

const resolveReplacementPreviewValue = ({
  context,
  launchMatched,
  pattern,
}: {
  context: SingleSimulationContext;
  launchMatched: boolean;
  pattern: ProductValidationPattern;
}): ReplacementPreviewValue => {
  const currentValue = context.simulationValues.currentFieldValue;
  if (!launchMatched) return { appliedReplacementValue: currentValue, replacementValue: null };
  const replacement = resolvePatternReplacementValue({
    fieldValue: currentValue,
    latestProductValues: context.simulationValues.latestProductValues,
    pattern,
    values: context.simulationValues.values,
  });
  const appliedReplacementValue = context.replacementEnabledForScope
    ? applyResolvedReplacement({ value: currentValue, pattern, replacement })
    : currentValue;
  return { appliedReplacementValue, replacementValue: replacement?.value ?? null };
};

const canApplySimulationReplacement = (
  context: SingleSimulationContext,
  launchMatched: boolean
): boolean =>
  launchMatched &&
  context.replacementEnabledForScope &&
  (context.regexResult.regexMatched || context.allowWithoutRegexMatch);

const buildReadySimulationResult = ({
  applied,
  context,
  launchMatched,
  notes,
  outputDisplayValue,
  outputValue,
  pattern,
  replacementPreview,
}: {
  applied: boolean;
  context: SingleSimulationContext;
  launchMatched: boolean;
  notes: string[];
  outputDisplayValue: string | null;
  outputValue: string | number | null;
  pattern: ProductValidationPattern;
  replacementPreview: ReplacementPreviewValue;
}): ValidatorPatternSimulationResult => ({
  allowWithoutRegexMatch: context.allowWithoutRegexMatch,
  applied,
  error: null,
  fieldLabel: context.currentFieldLabel,
  fieldName: context.currentFieldName,
  launchMatched,
  notes,
  outputDisplayValue,
  outputValue,
  patternEnabledForScope: context.patternEnabledForScope,
  regexMatched: context.regexResult.regexMatched,
  replacementEnabledForScope: context.replacementEnabledForScope,
  replacementValue: replacementPreview.replacementValue,
  sequenceGroupLabel: pattern.sequenceGroupLabel ?? null,
  sequenceTrace: [],
  status: 'ready',
  validationScope: context.validationScope,
});

export const simulateValidatorPatternPreview = ({
  pattern,
  formData,
  validationScope = DEFAULT_VALIDATOR_PATTERN_SIMULATOR_SCOPE,
  simulatorValues,
  categoryFixturesText,
  producers = [],
}: SimulateValidatorPatternPreviewArgs): ValidatorPatternSimulationResult => {
  const context = buildSingleSimulationContext({
    categoryFixturesText,
    formData,
    pattern,
    producers,
    simulatorValues,
    validationScope,
  });
  if (context.regexResult.error !== null) {
    return buildInvalidSimulationResult({
      error: context.regexResult.error,
      fieldLabel: context.currentFieldLabel,
      fieldName: context.currentFieldName,
      validationScope: context.validationScope,
    });
  }
  const launchMatched = shouldLaunchPattern({
    fieldValue: context.simulationValues.currentFieldValue,
    latestProductValues: context.simulationValues.latestProductValues,
    pattern,
    validationScope: context.validationScope,
    values: context.simulationValues.values,
  });
  const replacementPreview = resolveReplacementPreviewValue({ context, launchMatched, pattern });
  const canApply = canApplySimulationReplacement(context, launchMatched);
  const output = applySimulatorReplacement({
    ...context.simulationValues,
    fieldName: context.currentFieldName,
    producers,
    replacementValue: canApply ? replacementPreview.appliedReplacementValue : null,
  });
  const applied = canApply && output.applied;
  const notes = appendUnresolvedReplacementNotes({
    applied,
    launchMatched,
    notes: buildSimulationNotes({ context, launchMatched, pattern, producers }),
    pattern,
    replacementEnabledForScope: context.replacementEnabledForScope,
  });
  return buildReadySimulationResult({
    applied,
    context,
    launchMatched,
    notes,
    outputDisplayValue: output.outputDisplayValue,
    outputValue: output.outputValue,
    pattern,
    replacementPreview,
  });
};
