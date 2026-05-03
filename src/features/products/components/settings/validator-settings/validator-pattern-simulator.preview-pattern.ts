import type {
  ProductValidationPattern,
  ProductValidationSemanticState,
} from '@/shared/contracts/products/validation';
import type { PatternFormData, SequenceGroupView } from '@/shared/contracts/products/drafts';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

import { buildValidationPayload, parseStrictInt } from './controller-diff-utils';
import { buildDynamicRecipeFromForm, canCompileRegex } from './helpers';

type PreviewPatternResult =
  | { error: string; pattern: null }
  | { error: null; pattern: ProductValidationPattern };

type PreviewParsedSettings = {
  parsedMaxExecutions: number;
  parsedSequence: number | null;
  parsedValidationDebounceMs: number;
};

type BuildPreviewPatternArgs = {
  formData: PatternFormData;
  sequenceGroups: Map<string, SequenceGroupView>;
  editingPattern: ProductValidationPattern | null;
  modalSemanticState: ProductValidationSemanticState | null;
};

type ValidationPayload = ReturnType<typeof buildValidationPayload>;

const PREVIEW_SCOPES = ['draft_template', 'product_create', 'product_edit'] as const;

const withFallback = <TValue,>(value: TValue | null | undefined, fallback: TValue): TValue =>
  value ?? fallback;

const validatePreviewRegex = (formData: PatternFormData): string | null => {
  if (formData.regex.trim().length === 0) return 'Enter a regex to preview the pattern.';
  if (!canCompileRegex(formData.regex, formData.flags)) return 'Regex is invalid.';
  return null;
};

const parsePreviewSequence = (value: string): { error: string | null; value: number | null } => {
  if (value.trim().length === 0) return { error: null, value: null };
  const parsed = parseStrictInt(value);
  if (parsed === null || parsed < 0) {
    return { error: 'Sequence must be a whole number greater than or equal to 0.', value: null };
  }
  return { error: null, value: parsed };
};

const parsePreviewBoundedInt = ({
  error,
  max,
  min,
  value,
}: {
  error: string;
  max: number;
  min: number;
  value: string;
}): { error: string | null; value: number | null } => {
  const parsed = parseStrictInt(value);
  if (parsed === null || parsed < min || parsed > max) return { error, value: null };
  return { error: null, value: parsed };
};

const parsePreviewSettings = (formData: PatternFormData): {
  error: string | null;
  settings: PreviewParsedSettings | null;
} => {
  const parsedSequence = parsePreviewSequence(formData.sequence);
  if (parsedSequence.error !== null) return { error: parsedSequence.error, settings: null };
  const parsedMaxExecutions = parsePreviewBoundedInt({
    error: 'Max executions must be a whole number between 1 and 20.',
    max: 20,
    min: 1,
    value: formData.maxExecutions,
  });
  if (parsedMaxExecutions.error !== null) return { error: parsedMaxExecutions.error, settings: null };
  const parsedDebounce = parsePreviewBoundedInt({
    error: 'Debounce must be a whole number between 0 and 30000.',
    max: 30_000,
    min: 0,
    value: formData.validationDebounceMs,
  });
  if (parsedDebounce.error !== null) return { error: parsedDebounce.error, settings: null };
  return {
    error: null,
    settings: {
      parsedMaxExecutions: parsedMaxExecutions.value,
      parsedSequence: parsedSequence.value,
      parsedValidationDebounceMs: parsedDebounce.value,
    },
  };
};

const resolvePreviewReplacementValue = (formData: PatternFormData): {
  error: string | null;
  replacementValue: string | null;
} => {
  if (formData.replacementMode !== 'dynamic') {
    return {
      error: null,
      replacementValue: formData.replacementValue.length > 0 ? formData.replacementValue : null,
    };
  }
  const recipe = buildDynamicRecipeFromForm(formData);
  if (recipe === null) {
    return { error: 'Dynamic replacer config is incomplete.', replacementValue: null };
  }
  return { error: null, replacementValue: encodeDynamicReplacementRecipe(recipe) };
};

const buildPreviewValidationPayload = ({
  args,
  replacementValue,
  settings,
}: {
  args: BuildPreviewPatternArgs;
  replacementValue: string | null;
  settings: PreviewParsedSettings;
}): ValidationPayload =>
  buildValidationPayload({
    editingPattern: args.editingPattern,
    formData: args.formData,
    parsedMaxExecutions: settings.parsedMaxExecutions,
    parsedSequence: settings.parsedSequence,
    parsedValidationDebounceMs: settings.parsedValidationDebounceMs,
    replacementValue,
    semanticState: args.modalSemanticState,
    sequenceGroups: args.sequenceGroups,
  });

const buildPreviewProductValidationPattern = ({
  editingPattern,
  payload,
}: {
  editingPattern: ProductValidationPattern | null;
  payload: ValidationPayload;
}): ProductValidationPattern => ({
  appliesToScopes: withFallback(payload.appliesToScopes, [...PREVIEW_SCOPES]),
  chainMode: withFallback(payload.chainMode, 'continue'),
  createdAt: withFallback(editingPattern?.createdAt, ''),
  denyBehaviorOverride: withFallback(payload.denyBehaviorOverride, null),
  enabled: withFallback(payload.enabled, true),
  flags: withFallback(payload.flags, null),
  id: withFallback(editingPattern?.id, '__preview__'),
  label: withFallback(payload.label, ''),
  launchAppliesToScopes: withFallback(payload.launchAppliesToScopes, [...PREVIEW_SCOPES]),
  launchEnabled: withFallback(payload.launchEnabled, false),
  launchFlags: withFallback(payload.launchFlags, null),
  launchOperator: withFallback(payload.launchOperator, 'equals'),
  launchScopeBehavior: withFallback(payload.launchScopeBehavior, 'gate'),
  launchSourceField: withFallback(payload.launchSourceField, null),
  launchSourceMode: withFallback(payload.launchSourceMode, 'current_field'),
  launchValue: withFallback(payload.launchValue, null),
  locale: withFallback(payload.locale, null),
  maxExecutions: withFallback(payload.maxExecutions, 1),
  message: withFallback(payload.message, ''),
  passOutputToNext: withFallback(payload.passOutputToNext, true),
  postAcceptBehavior: withFallback(payload.postAcceptBehavior, 'revalidate'),
  regex: withFallback(payload.regex, ''),
  replacementAppliesToScopes: withFallback(payload.replacementAppliesToScopes, [...PREVIEW_SCOPES]),
  replacementAutoApply: withFallback(payload.replacementAutoApply, false),
  replacementEnabled: withFallback(payload.replacementEnabled, false),
  replacementFields: withFallback(payload.replacementFields, []),
  replacementValue: withFallback(payload.replacementValue, null),
  runtimeConfig: withFallback(payload.runtimeConfig, null),
  runtimeEnabled: withFallback(payload.runtimeEnabled, false),
  runtimeType: withFallback(payload.runtimeType, 'none'),
  semanticState: withFallback(payload.semanticState, null),
  sequence: withFallback(payload.sequence, null),
  sequenceGroupDebounceMs: withFallback(payload.sequenceGroupDebounceMs, 0),
  sequenceGroupId: withFallback(payload.sequenceGroupId, null),
  sequenceGroupLabel: withFallback(payload.sequenceGroupLabel, null),
  severity: withFallback(payload.severity, 'warning'),
  skipNoopReplacementProposal: withFallback(payload.skipNoopReplacementProposal, true),
  target: withFallback(payload.target, 'name'),
  updatedAt: withFallback(editingPattern?.updatedAt, ''),
  validationDebounceMs: withFallback(payload.validationDebounceMs, 0),
});

export const buildPreviewPatternFromFormData = (
  args: BuildPreviewPatternArgs
): PreviewPatternResult => {
  const regexError = validatePreviewRegex(args.formData);
  if (regexError !== null) return { error: regexError, pattern: null };
  const parsedSettings = parsePreviewSettings(args.formData);
  if (parsedSettings.error !== null || parsedSettings.settings === null) {
    return { error: parsedSettings.error ?? 'Preview settings are invalid.', pattern: null };
  }
  const replacement = resolvePreviewReplacementValue(args.formData);
  if (replacement.error !== null) return { error: replacement.error, pattern: null };
  const payload = buildPreviewValidationPayload({
    args,
    replacementValue: replacement.replacementValue,
    settings: parsedSettings.settings,
  });
  return {
    error: null,
    pattern: buildPreviewProductValidationPattern({ editingPattern: args.editingPattern, payload }),
  };
};
