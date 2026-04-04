import { validateAndNormalizeRuntimeConfig } from '@/features/products/server';
import type { CreateProductValidationPatternInput } from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';
import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationSkipNoopReplacementProposal,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { normalizeProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { validateRegexSafety } from '@/shared/utils/regex-safety';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type ValidatorPatternRuntimeType = 'none' | 'database_query' | 'ai_prompt';
type ValidatorPatternScope = 'draft_template' | 'product_create' | 'product_edit';
type ValidatorPatternLaunchSourceMode =
  | 'current_field'
  | 'form_field'
  | 'latest_product_field';
type ValidatorPatternLaunchScopeBehavior = 'gate' | 'condition_only';
type ValidatorPatternLaunchOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty';

type ValidatorPatternCreateBodyLike = {
  label: string;
  target: CreateProductValidationPatternInput['target'];
  locale?: string | null;
  regex: string;
  flags?: string | null;
  message: string;
  severity?: 'error' | 'warning';
  enabled?: boolean;
  replacementEnabled?: boolean;
  replacementAutoApply?: boolean;
  skipNoopReplacementProposal?: boolean;
  replacementValue?: string | null;
  replacementFields?: string[];
  replacementAppliesToScopes?: ValidatorPatternScope[];
  runtimeEnabled?: boolean;
  runtimeType?: ValidatorPatternRuntimeType;
  runtimeConfig?: string | null;
  postAcceptBehavior?: 'revalidate' | 'stop_after_accept';
  denyBehaviorOverride?: 'ask_again' | 'mute_session' | null;
  validationDebounceMs?: number;
  sequenceGroupId?: string | null;
  sequenceGroupLabel?: string | null;
  sequenceGroupDebounceMs?: number;
  sequence?: number | null;
  chainMode?: 'continue' | 'stop_on_match' | 'stop_on_replace';
  maxExecutions?: number;
  passOutputToNext?: boolean;
  launchEnabled?: boolean;
  launchAppliesToScopes?: ValidatorPatternScope[];
  launchScopeBehavior?: ValidatorPatternLaunchScopeBehavior;
  launchSourceMode?: ValidatorPatternLaunchSourceMode;
  launchSourceField?: string | null;
  launchOperator?: ValidatorPatternLaunchOperator;
  launchValue?: string | null;
  launchFlags?: string | null;
  appliesToScopes?: ValidatorPatternScope[];
  semanticState?: unknown;
};

type ResolvedValidatorPatternCreateState = {
  label: string;
  locale: string | null;
  regex: string;
  flags: string | null;
  message: string;
  replacementEnabled: boolean;
  replacementAutoApply: boolean;
  skipNoopReplacementProposal: boolean;
  replacementValue: string | null;
  replacementFields: string[];
  replacementAppliesToScopes: ValidatorPatternScope[];
  runtimeEnabled: boolean;
  runtimeType: ValidatorPatternRuntimeType;
  runtimeConfig: string | null;
  postAcceptBehavior: 'revalidate' | 'stop_after_accept';
  denyBehaviorOverride: 'ask_again' | 'mute_session' | null;
  validationDebounceMs: number;
  sequenceGroupId: string | null;
  sequenceGroupLabel: string | null;
  sequenceGroupDebounceMs: number;
  launchEnabled: boolean;
  launchAppliesToScopes: ValidatorPatternScope[];
  launchScopeBehavior: ValidatorPatternLaunchScopeBehavior;
  launchSourceMode: ValidatorPatternLaunchSourceMode;
  launchSourceField: string | null;
  launchOperator: ValidatorPatternLaunchOperator;
  launchValue: string | null;
  launchFlags: string | null;
  appliesToScopes: ValidatorPatternScope[];
  semanticState: CreateProductValidationPatternInput['semanticState'];
};

export const assertValidValidatorPatternCreateRegex = (
  regexSource: string,
  flags: string | null | undefined
): void => {
  const safety = validateRegexSafety(regexSource, flags);
  if (!safety.ok) {
    throw badRequestError(safety.message, {
      code: safety.code,
      detail: safety.detail ?? null,
      regex: regexSource,
      flags: flags ?? null,
    });
  }

  try {
    const normalizedFlags = flags?.trim() || undefined;
    void new RegExp(regexSource, normalizedFlags);
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Invalid regex or flags', {
      regex: regexSource,
      flags: flags ?? null,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};

export const normalizeValidatorPatternCreateReplacementFields = (
  fields: string[] | undefined
): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  return [...new Set(fields)];
};

export const canResolveValidatorPatternCreateReplacementAtRuntime = ({
  replacementEnabled,
  replacementValue,
  runtimeEnabled,
  runtimeType,
}: {
  replacementEnabled: boolean;
  replacementValue: string | null;
  runtimeEnabled: boolean;
  runtimeType: ValidatorPatternRuntimeType;
}): boolean => replacementEnabled && !replacementValue && runtimeEnabled && runtimeType !== 'none';

export const assertValidValidatorPatternCreateReplacementRecipe = (
  replacementEnabled: boolean,
  replacementValue: string | null
): void => {
  if (!replacementEnabled || !replacementValue) return;

  const recipe = parseDynamicReplacementRecipe(replacementValue);
  if (!recipe) return;

  if (recipe.sourceRegex) {
    assertValidValidatorPatternCreateRegex(recipe.sourceRegex, recipe.sourceFlags ?? null);
  }

  if (recipe.logicOperator === 'regex') {
    if (!recipe.logicOperand) {
      throw badRequestError('Dynamic replacement regex condition requires an operand.');
    }

    assertValidValidatorPatternCreateRegex(recipe.logicOperand, recipe.logicFlags ?? null);
  }
};

export const assertValidValidatorPatternCreateLaunchConfig = ({
  launchEnabled,
  launchOperator,
  launchValue,
  launchFlags,
}: {
  launchEnabled: boolean;
  launchOperator: ValidatorPatternLaunchOperator;
  launchValue: string | null;
  launchFlags: string | null;
}): void => {
  if (!launchEnabled || launchOperator !== 'regex') return;
  if (!launchValue) {
    throw badRequestError('launchValue is required when launchOperator is regex.');
  }

  assertValidValidatorPatternCreateRegex(launchValue, launchFlags);
};

export const resolveValidatorPatternCreateState = (
  body: ValidatorPatternCreateBodyLike
): ResolvedValidatorPatternCreateState => {
  const label = body.label.trim();
  const locale = body.locale?.trim().toLowerCase() || null;
  const regex = body.regex.trim();
  const flags = body.flags?.trim() || null;
  const message = body.message.trim();
  const replacementEnabled = body.replacementEnabled ?? false;
  const replacementAutoApply = body.replacementAutoApply ?? false;
  const skipNoopReplacementProposal = normalizeProductValidationSkipNoopReplacementProposal(
    body.skipNoopReplacementProposal
  );
  const replacementValue = body.replacementValue?.trim() || null;
  const replacementFields = normalizeValidatorPatternCreateReplacementFields(
    body.replacementFields
  );
  const replacementAppliesToScopes = normalizeProductValidationPatternReplacementScopes(
    body.replacementAppliesToScopes
  );
  const runtimeEnabled = body.runtimeEnabled ?? false;
  const runtimeType = body.runtimeType ?? 'none';
  const runtimeConfig = validateAndNormalizeRuntimeConfig({
    runtimeEnabled,
    runtimeType,
    runtimeConfig: body.runtimeConfig?.trim() || null,
  });
  const postAcceptBehavior = body.postAcceptBehavior ?? 'revalidate';
  const denyBehaviorOverride = normalizeProductValidationPatternDenyBehaviorOverride(
    body.denyBehaviorOverride
  ) as 'ask_again' | 'mute_session' | null;
  const validationDebounceMs = body.validationDebounceMs ?? 0;
  const sequenceGroupId = body.sequenceGroupId?.trim() || null;
  const sequenceGroupLabel = body.sequenceGroupLabel?.trim() || null;
  const sequenceGroupDebounceMs = body.sequenceGroupDebounceMs ?? 0;
  const launchEnabled = body.launchEnabled ?? false;
  const launchAppliesToScopes = normalizeProductValidationPatternLaunchScopes(
    body.launchAppliesToScopes
  );
  const launchSourceMode = body.launchSourceMode ?? 'current_field';
  const launchScopeBehavior = normalizeProductValidationLaunchScopeBehavior(
    body.launchScopeBehavior
  );
  const launchSourceField = body.launchSourceField?.trim() || null;
  const launchOperator = body.launchOperator ?? 'equals';
  const launchValue = typeof body.launchValue === 'string' ? body.launchValue : null;
  const launchFlags = body.launchFlags?.trim() || null;
  const appliesToScopes = normalizeProductValidationPatternScopes(body.appliesToScopes);
  const semanticState = normalizeProductValidationSemanticState(body.semanticState);

  if (
    replacementEnabled &&
    !replacementValue &&
    !canResolveValidatorPatternCreateReplacementAtRuntime({
      replacementEnabled,
      replacementValue,
      runtimeEnabled,
      runtimeType,
    })
  ) {
    throw badRequestError(
      'replacementValue is required when replacementEnabled is true unless runtime replacement is enabled'
    );
  }

  if (launchEnabled && launchSourceMode !== 'current_field' && !launchSourceField) {
    throw badRequestError(
      'launchSourceField is required when launchSourceMode is not current_field'
    );
  }

  assertValidValidatorPatternCreateRegex(regex, flags);
  assertValidValidatorPatternCreateReplacementRecipe(replacementEnabled, replacementValue);
  assertValidValidatorPatternCreateLaunchConfig({
    launchEnabled,
    launchOperator,
    launchValue,
    launchFlags,
  });

  return {
    label,
    locale,
    regex,
    flags,
    message,
    replacementEnabled,
    replacementAutoApply,
    skipNoopReplacementProposal,
    replacementValue,
    replacementFields,
    replacementAppliesToScopes,
    runtimeEnabled,
    runtimeType,
    runtimeConfig,
    postAcceptBehavior,
    denyBehaviorOverride,
    validationDebounceMs,
    sequenceGroupId,
    sequenceGroupLabel,
    sequenceGroupDebounceMs,
    launchEnabled,
    launchAppliesToScopes,
    launchScopeBehavior,
    launchSourceMode,
    launchSourceField,
    launchOperator,
    launchValue,
    launchFlags,
    appliesToScopes,
    semanticState,
  };
};

export const buildValidatorPatternCreateInput = ({
  body,
  state,
}: {
  body: ValidatorPatternCreateBodyLike;
  state: ResolvedValidatorPatternCreateState;
}): CreateProductValidationPatternInput => ({
  label: state.label,
  target: body.target,
  locale: state.locale,
  regex: state.regex,
  flags: state.flags,
  message: state.message,
  severity: body.severity ?? 'error',
  enabled: body.enabled ?? true,
  replacementEnabled: state.replacementEnabled,
  replacementAutoApply: state.replacementAutoApply,
  skipNoopReplacementProposal: state.skipNoopReplacementProposal,
  replacementValue: state.replacementValue,
  replacementFields: state.replacementFields,
  replacementAppliesToScopes: state.replacementAppliesToScopes,
  runtimeEnabled: state.runtimeEnabled,
  runtimeType: state.runtimeType,
  runtimeConfig: state.runtimeConfig,
  postAcceptBehavior: state.postAcceptBehavior,
  denyBehaviorOverride: state.denyBehaviorOverride,
  validationDebounceMs: state.validationDebounceMs,
  sequenceGroupId: state.sequenceGroupId,
  sequenceGroupLabel: state.sequenceGroupLabel,
  sequenceGroupDebounceMs: state.sequenceGroupDebounceMs,
  sequence: body.sequence ?? null,
  chainMode: body.chainMode ?? 'continue',
  maxExecutions: body.maxExecutions ?? 1,
  passOutputToNext: body.passOutputToNext ?? true,
  launchEnabled: state.launchEnabled,
  launchAppliesToScopes: state.launchAppliesToScopes,
  launchScopeBehavior: state.launchScopeBehavior,
  launchSourceMode: state.launchSourceMode,
  launchSourceField: state.launchSourceField,
  launchOperator: state.launchOperator,
  launchValue: state.launchValue,
  launchFlags: state.launchFlags,
  appliesToScopes: state.appliesToScopes,
  semanticState: state.semanticState,
});
