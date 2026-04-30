import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationSemanticState,
} from '@/shared/contracts/products/validation';
import type { PatternFormData, SequenceGroupView } from '@/shared/contracts/products/drafts';
import type { Producer } from '@/shared/contracts/products/producers';

import { applySimulatorReplacement } from './validator-pattern-simulator.apply';
import { getFieldLabel, resolveSimulatorFieldName } from './validator-pattern-simulator.inputs';
import { buildPreviewPatternFromFormData } from './validator-pattern-simulator.preview-pattern';
import { buildInvalidSimulationResult } from './validator-pattern-simulator.result';
import {
  buildSequenceTrace,
  buildSequenceTracePatterns,
} from './validator-pattern-simulator.sequence';
import { simulateValidatorPatternPreview } from './validator-pattern-simulator.single';
import {
  DEFAULT_VALIDATOR_PATTERN_SIMULATOR_SCOPE,
  type ValidatorPatternSimulationResult,
} from './validator-pattern-simulator.types';
import { buildValidatorPatternSimulationValues } from './validator-pattern-simulator.values';

type BuildAndSimulateValidatorPatternPreviewArgs = {
  formData: PatternFormData;
  sequenceGroups: Map<string, SequenceGroupView>;
  orderedPatterns: ProductValidationPattern[];
  editingPattern: ProductValidationPattern | null;
  modalSemanticState: ProductValidationSemanticState | null;
  validationScope?: ProductValidationInstanceScope;
  simulatorValues: Record<string, string>;
  categoryFixturesText: string;
  producers?: ReadonlyArray<Producer>;
};

type SequencePreviewArgs = {
  baseResult: ValidatorPatternSimulationResult;
  categoryFixturesText: string;
  editingPattern: ProductValidationPattern | null;
  formData: PatternFormData;
  orderedPatterns: ProductValidationPattern[];
  previewPattern: ProductValidationPattern;
  producers?: ReadonlyArray<Producer>;
  simulatorValues: Record<string, string>;
  validationScope: ProductValidationInstanceScope;
};

const simulateSequencePreview = ({
  baseResult,
  categoryFixturesText,
  editingPattern,
  formData,
  orderedPatterns,
  previewPattern,
  producers,
  simulatorValues,
  validationScope,
}: SequencePreviewArgs): ValidatorPatternSimulationResult => {
  const simulationValues = buildValidatorPatternSimulationValues({
    categoryFixturesText,
    currentFieldName: baseResult.fieldName,
    formData,
    producers,
    simulatorValues,
  });
  const trace = buildSequenceTrace({
    fieldValue: simulationValues.currentFieldValue,
    latestProductValues: simulationValues.latestProductValues,
    previewPattern,
    tracePatterns: buildSequenceTracePatterns({
      editingPattern,
      fieldName: baseResult.fieldName,
      orderedPatterns,
      previewPattern,
    }),
    validationScope,
    values: simulationValues.values,
  });
  const traceOutput = applySimulatorReplacement({
    ...simulationValues,
    fieldName: baseResult.fieldName,
    producers,
    replacementValue: trace.finalValue,
  });
  return {
    ...baseResult,
    applied: traceOutput.applied,
    outputDisplayValue: traceOutput.outputDisplayValue,
    outputValue: traceOutput.outputValue,
    sequenceGroupLabel: previewPattern.sequenceGroupLabel ?? null,
    sequenceTrace: trace.steps,
  };
};

export const buildAndSimulateValidatorPatternPreview = ({
  formData,
  sequenceGroups,
  orderedPatterns,
  editingPattern,
  modalSemanticState,
  validationScope = DEFAULT_VALIDATOR_PATTERN_SIMULATOR_SCOPE,
  simulatorValues,
  categoryFixturesText,
  producers,
}: BuildAndSimulateValidatorPatternPreviewArgs): ValidatorPatternSimulationResult => {
  const currentFieldName = resolveSimulatorFieldName(formData.target, formData.locale);
  const previewPatternResult = buildPreviewPatternFromFormData({
    editingPattern,
    formData,
    modalSemanticState,
    sequenceGroups,
  });
  if (previewPatternResult.error !== null) {
    return buildInvalidSimulationResult({
      error: previewPatternResult.error,
      fieldLabel: getFieldLabel(currentFieldName),
      fieldName: currentFieldName,
      validationScope,
    });
  }
  const baseResult = simulateValidatorPatternPreview({
    categoryFixturesText,
    formData,
    pattern: previewPatternResult.pattern,
    producers,
    simulatorValues,
    validationScope,
  });
  if (baseResult.status !== 'ready') return baseResult;
  return simulateSequencePreview({
    baseResult,
    categoryFixturesText,
    editingPattern,
    formData,
    orderedPatterns,
    previewPattern: previewPatternResult.pattern,
    producers,
    simulatorValues,
    validationScope,
  });
};
