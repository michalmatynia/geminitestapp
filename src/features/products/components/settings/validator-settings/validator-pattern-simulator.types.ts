import type {
  ProductValidationInstanceScope,
} from '@/shared/contracts/products/validation';

export type ValidatorPatternSimulationResult = {
  status: 'invalid' | 'ready';
  error: string | null;
  fieldName: string;
  fieldLabel: string;
  validationScope: ProductValidationInstanceScope;
  patternEnabledForScope: boolean;
  replacementEnabledForScope: boolean;
  launchMatched: boolean;
  regexMatched: boolean;
  allowWithoutRegexMatch: boolean;
  replacementValue: string | null;
  applied: boolean;
  outputValue: string | number | null;
  outputDisplayValue: string | null;
  notes: string[];
  sequenceTrace: ValidatorPatternSequenceTraceStep[];
  sequenceGroupLabel: string | null;
};

export type ValidatorPatternSequenceTraceStep = {
  patternId: string;
  label: string;
  sequence: number | null;
  isPreviewPattern: boolean;
  inputValue: string;
  outputValue: string;
  launchMatched: boolean;
  regexMatched: boolean;
  allowWithoutRegexMatch: boolean;
  replacementEnabledForScope: boolean;
  replacementValue: string | null;
  executions: number;
  applied: boolean;
  skipReason:
    | 'disabled'
    | 'out_of_scope'
    | 'launch_blocked'
    | 'regex_no_match'
    | 'replacement_disabled'
    | 'replacement_unresolved'
    | null;
  stopReason:
    | 'chain_stop_on_match'
    | 'chain_stop_on_replace'
    | 'pass_output_disabled'
    | null;
};

export const DEFAULT_VALIDATOR_PATTERN_SIMULATOR_SCOPE: ProductValidationInstanceScope =
  'product_edit';
