import type { PatternFormData, SequenceGroupView } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationPattern,
  ProductValidationSemanticState,
  UpdateProductValidationPatternInput as UpdateValidationPatternPayload,
} from '@/shared/contracts/products/validation';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

import { buildValidationPayload, parseStrictInt } from './controller-diff-utils';
import { buildDynamicRecipeFromForm, canCompileRegex } from './helpers';

type PayloadBuildArgs = {
  formData: PatternFormData;
  sequenceGroups: Map<string, SequenceGroupView>;
  editingPattern: ProductValidationPattern | null;
  semanticState: ProductValidationSemanticState | null;
};

type PayloadBuildResult =
  | {
      status: 'ready';
      payload: UpdateValidationPatternPayload;
    }
  | {
      status: 'error';
      message: string;
    };

type ParsedValueResult<TValue> =
  | {
      status: 'ready';
      value: TValue;
    }
  | {
      status: 'error';
      message: string;
    };

const ready = <TValue,>(value: TValue): ParsedValueResult<TValue> => ({
  status: 'ready',
  value,
});

const error = (message: string): { status: 'error'; message: string } => ({
  status: 'error',
  message,
});

const getRequiredFieldError = (formData: PatternFormData): string | null => {
  if (
    formData.label.trim().length === 0 ||
    formData.regex.trim().length === 0 ||
    formData.message.trim().length === 0
  ) {
    return 'Please fill in all required fields.';
  }
  return null;
};

const parseSequence = (value: string): ParsedValueResult<number | null> => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return ready(null);

  const parsed = parseStrictInt(value);
  if (parsed === null || parsed < 0) {
    return error('Sequence must be a whole number greater than or equal to 0.');
  }
  return ready(parsed);
};

const parseBoundedInteger = (
  value: string,
  min: number,
  max: number,
  message: string
): ParsedValueResult<number> => {
  const parsed = parseStrictInt(value);
  if (parsed === null || parsed < min || parsed > max) return error(message);
  return ready(parsed);
};

const resolveReplacementValue = (formData: PatternFormData): ParsedValueResult<string | null> => {
  if (formData.replacementMode !== 'dynamic') {
    return ready(formData.replacementValue.length > 0 ? formData.replacementValue : null);
  }

  const recipe = buildDynamicRecipeFromForm(formData);
  if (recipe === null) return error('Dynamic replacer config is incomplete.');
  return ready(encodeDynamicReplacementRecipe(recipe));
};

export function buildValidatorPatternPayloadDraft(args: PayloadBuildArgs): PayloadBuildResult {
  const parsedSequence = parseSequence(args.formData.sequence);
  if (parsedSequence.status === 'error') return parsedSequence;

  const parsedMaxExecutions = parseBoundedInteger(
    args.formData.maxExecutions,
    1,
    20,
    'Max executions must be a whole number between 1 and 20.'
  );
  if (parsedMaxExecutions.status === 'error') return parsedMaxExecutions;

  const parsedValidationDebounceMs = parseBoundedInteger(
    args.formData.validationDebounceMs,
    0,
    30_000,
    'Debounce must be a whole number between 0 and 30000.'
  );
  if (parsedValidationDebounceMs.status === 'error') return parsedValidationDebounceMs;

  const replacementValue = resolveReplacementValue(args.formData);
  if (replacementValue.status === 'error') return replacementValue;

  return {
    status: 'ready',
    payload: buildValidationPayload({
      ...args,
      replacementValue: replacementValue.value,
      parsedSequence: parsedSequence.value,
      parsedMaxExecutions: parsedMaxExecutions.value,
      parsedValidationDebounceMs: parsedValidationDebounceMs.value,
    }),
  };
}

export function buildValidatorPatternSavePayload(args: PayloadBuildArgs): PayloadBuildResult {
  const requiredFieldError = getRequiredFieldError(args.formData);
  if (requiredFieldError !== null) return error(requiredFieldError);

  if (canCompileRegex(args.formData.regex, args.formData.flags) === false) {
    return error('Invalid regular expression.');
  }

  return buildValidatorPatternPayloadDraft(args);
}
