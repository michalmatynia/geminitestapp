import type { PatternFormData, SequenceGroupView } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationLaunchOperator,
  ProductValidationPattern,
  ProductValidationSemanticState,
  UpdateProductValidationPatternInput as UpdateValidationPatternPayload,
} from '@/shared/contracts/products/validation';
import {
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { reconcileProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-operations';

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

type SequenceGroupPayloadInput = Pick<
  BuildValidationPayloadArgs,
  'editingPattern' | 'formData' | 'parsedSequence' | 'sequenceGroups'
>;

const trimToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const nullableTrimToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : null;
};

const buildCorePayloadFields = (
  formData: PatternFormData
): Pick<
  UpdateValidationPatternPayload,
  'enabled' | 'flags' | 'label' | 'locale' | 'message' | 'regex' | 'severity' | 'target'
> => ({
  label: formData.label.trim(),
  target: formData.target,
  locale: trimToNull(formData.locale),
  regex: formData.regex.trim(),
  flags: trimToNull(formData.flags),
  message: formData.message.trim(),
  severity: formData.severity,
  enabled: formData.enabled,
});

const buildReplacementPayloadFields = ({
  formData,
  replacementValue,
}: Pick<
  BuildValidationPayloadArgs,
  'formData' | 'replacementValue'
>): Pick<
  UpdateValidationPatternPayload,
  | 'denyBehaviorOverride'
  | 'postAcceptBehavior'
  | 'replacementAppliesToScopes'
  | 'replacementAutoApply'
  | 'replacementEnabled'
  | 'replacementFields'
  | 'replacementValue'
  | 'skipNoopReplacementProposal'
> => ({
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
});

const getSequenceGroupLabel = (
  selectedSequenceGroup: SequenceGroupView | undefined,
  editingPattern: ProductValidationPattern | null
): string | null =>
  selectedSequenceGroup?.label ?? nullableTrimToNull(editingPattern?.sequenceGroupLabel);

const getSequenceGroupDebounceMs = (
  selectedSequenceGroup: SequenceGroupView | undefined,
  editingPattern: ProductValidationPattern | null
): number => selectedSequenceGroup?.debounceMs ?? editingPattern?.sequenceGroupDebounceMs ?? 0;

const buildSequenceGroupPayloadFields = ({
  editingPattern,
  formData,
  parsedSequence,
  sequenceGroups,
}: SequenceGroupPayloadInput): Pick<
  UpdateValidationPatternPayload,
  'sequence' | 'sequenceGroupDebounceMs' | 'sequenceGroupId' | 'sequenceGroupLabel'
> => {
  const sequenceGroupId = trimToNull(formData.sequenceGroupId);
  if (sequenceGroupId === null) {
    return {
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence: parsedSequence,
    };
  }
  const selectedSequenceGroup = sequenceGroups.get(sequenceGroupId);
  return {
    sequenceGroupId,
    sequenceGroupLabel: getSequenceGroupLabel(selectedSequenceGroup, editingPattern),
    sequenceGroupDebounceMs: getSequenceGroupDebounceMs(selectedSequenceGroup, editingPattern),
    sequence: parsedSequence,
  };
};

const buildExecutionPayloadFields = ({
  formData,
  parsedMaxExecutions,
  parsedValidationDebounceMs,
}: Pick<
  BuildValidationPayloadArgs,
  'formData' | 'parsedMaxExecutions' | 'parsedValidationDebounceMs'
>): Pick<
  UpdateValidationPatternPayload,
  'chainMode' | 'maxExecutions' | 'passOutputToNext' | 'validationDebounceMs'
> => ({
  chainMode: formData.chainMode,
  maxExecutions: parsedMaxExecutions,
  passOutputToNext: formData.passOutputToNext,
  validationDebounceMs: parsedValidationDebounceMs,
});

const buildLaunchPayloadFields = (
  formData: PatternFormData
): Pick<
  UpdateValidationPatternPayload,
  | 'launchAppliesToScopes'
  | 'launchEnabled'
  | 'launchFlags'
  | 'launchOperator'
  | 'launchScopeBehavior'
  | 'launchSourceField'
  | 'launchSourceMode'
  | 'launchValue'
> => ({
  launchEnabled: formData.launchEnabled,
  launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
    formData.launchAppliesToScopes
  ),
  launchScopeBehavior: formData.launchScopeBehavior,
  launchSourceMode: formData.launchSourceMode,
  launchSourceField: trimToNull(formData.launchSourceField),
  launchOperator: formData.launchOperator as ProductValidationLaunchOperator,
  launchValue: trimToNull(formData.launchValue),
  launchFlags: trimToNull(formData.launchFlags),
});

const buildRuntimePayloadFields = (
  formData: PatternFormData
): Pick<UpdateValidationPatternPayload, 'runtimeConfig' | 'runtimeEnabled' | 'runtimeType'> => ({
  runtimeEnabled: formData.runtimeEnabled,
  runtimeType: formData.runtimeEnabled ? formData.runtimeType : 'none',
  runtimeConfig: formData.runtimeEnabled ? formData.runtimeConfig : null,
});

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
  const payload: UpdateValidationPatternPayload = {
    ...buildCorePayloadFields(formData),
    ...buildReplacementPayloadFields({ formData, replacementValue }),
    ...buildSequenceGroupPayloadFields({
      editingPattern,
      formData,
      parsedSequence,
      sequenceGroups,
    }),
    ...buildExecutionPayloadFields({
      formData,
      parsedMaxExecutions,
      parsedValidationDebounceMs,
    }),
    ...buildLaunchPayloadFields(formData),
    ...buildRuntimePayloadFields(formData),
    appliesToScopes: normalizeProductValidationPatternScopes(formData.appliesToScopes),
  };

  return {
    ...payload,
    semanticState: reconcileProductValidationSemanticState({
      currentSemanticState: semanticState,
      pattern: payload,
    }),
  };
}
