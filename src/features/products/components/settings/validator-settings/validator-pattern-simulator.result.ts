import type { ProductValidationInstanceScope } from '@/shared/contracts/products/validation';

import type { ValidatorPatternSimulationResult } from './validator-pattern-simulator.types';

export const buildInvalidSimulationResult = ({
  error,
  fieldLabel,
  fieldName,
  validationScope,
}: {
  error: string;
  fieldLabel: string;
  fieldName: string;
  validationScope: ProductValidationInstanceScope;
}): ValidatorPatternSimulationResult => ({
  allowWithoutRegexMatch: false,
  applied: false,
  error,
  fieldLabel,
  fieldName,
  launchMatched: false,
  notes: [],
  outputDisplayValue: null,
  outputValue: null,
  patternEnabledForScope: true,
  regexMatched: false,
  replacementEnabledForScope: true,
  replacementValue: null,
  sequenceGroupLabel: null,
  sequenceTrace: [],
  status: 'invalid',
  validationScope,
});
