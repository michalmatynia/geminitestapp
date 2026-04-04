import { validateAndNormalizeRuntimeConfig } from '@/features/products/server';
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

type ValidatorPatternRuntimeType = 'none' | 'database_query' | 'ai_prompt';
type ValidatorPatternScope = 'draft_template' | 'product_create' | 'product_edit';
type ValidatorPatternLaunchScopeBehavior = 'gate' | 'condition_only';
type ValidatorPatternLaunchSourceMode =
  | 'current_field'
  | 'form_field'
  | 'latest_product_field';

type ValidatorPatternCurrentLike = {
  regex: string;
  flags: string | null;
  replacementEnabled: boolean;
  replacementValue: string | null;
  replacementFields: string[];
  replacementAppliesToScopes?: ValidatorPatternScope[] | null;
  runtimeEnabled: boolean;
  runtimeType: ValidatorPatternRuntimeType;
  runtimeConfig: string | null;
  launchEnabled: boolean;
  launchAppliesToScopes?: ValidatorPatternScope[] | null;
  launchScopeBehavior?: ValidatorPatternLaunchScopeBehavior | null;
  launchSourceMode: ValidatorPatternLaunchSourceMode;
  launchSourceField: string | null;
  launchOperator: ValidatorPatternLaunchOperator;
  launchValue: string | null;
  launchFlags: string | null;
  appliesToScopes?: ValidatorPatternScope[] | null;
};

type ValidatorPatternUpdateBodyLike = {
  label?: string;
  target?: string;
  locale?: string | null;
  regex?: string;
  flags?: string | null;
  message?: string;
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
  expectedUpdatedAt?: string | null;
};

type ResolvedValidatorPatternUpdateState = {
  nextRegex: string;
  nextFlags: string | null;
  nextReplacementEnabled: boolean;
  nextReplacementValue: string | null;
  nextReplacementFields: string[];
  nextReplacementAppliesToScopes: ValidatorPatternScope[];
  nextRuntimeEnabled: boolean;
  nextRuntimeType: ValidatorPatternRuntimeType;
  nextRuntimeConfig: string | null;
  shouldPersistRuntimeConfig: boolean;
  nextLaunchEnabled: boolean;
  nextLaunchAppliesToScopes: ValidatorPatternScope[];
  nextLaunchScopeBehavior: ValidatorPatternLaunchScopeBehavior;
  nextLaunchSourceMode: ValidatorPatternLaunchSourceMode;
  nextLaunchSourceField: string | null;
  nextLaunchOperator: ValidatorPatternLaunchOperator;
  nextLaunchValue: string | null;
  nextLaunchFlags: string | null;
  nextAppliesToScopes: ValidatorPatternScope[];
};

export const assertValidValidatorPatternRegex = (
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

export const normalizeValidatorPatternReplacementFields = (
  fields: string[] | undefined
): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  return [...new Set(fields)];
};

export const canResolveValidatorPatternReplacementAtRuntime = ({
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

export const assertValidValidatorPatternReplacementRecipe = (
  replacementEnabled: boolean,
  replacementValue: string | null
): void => {
  if (!replacementEnabled || !replacementValue) return;

  const recipe = parseDynamicReplacementRecipe(replacementValue);
  if (!recipe) return;

  if (recipe.sourceRegex) {
    assertValidValidatorPatternRegex(recipe.sourceRegex, recipe.sourceFlags ?? null);
  }

  if (recipe.logicOperator === 'regex') {
    if (!recipe.logicOperand) {
      throw badRequestError('Dynamic replacement regex condition requires an operand.');
    }

    assertValidValidatorPatternRegex(recipe.logicOperand, recipe.logicFlags ?? null);
  }
};

export const assertValidValidatorPatternLaunchConfig = ({
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

  assertValidValidatorPatternRegex(launchValue, launchFlags);
};

export const resolveValidatorPatternUpdateState = ({
  current,
  body,
}: {
  current: ValidatorPatternCurrentLike;
  body: ValidatorPatternUpdateBodyLike;
}): ResolvedValidatorPatternUpdateState => {
  const nextRegex = (body.regex ?? current.regex).trim();
  const nextFlags = body.flags !== undefined ? body.flags?.trim() || null : current.flags;
  const nextReplacementEnabled =
    body.replacementEnabled !== undefined ? body.replacementEnabled : current.replacementEnabled;
  const nextReplacementValue =
    body.replacementValue !== undefined
      ? body.replacementValue?.trim() || null
      : current.replacementValue;
  const nextReplacementFields =
    body.replacementFields !== undefined
      ? normalizeValidatorPatternReplacementFields(body.replacementFields)
      : current.replacementFields;
  const nextReplacementAppliesToScopes =
    body.replacementAppliesToScopes !== undefined
      ? normalizeProductValidationPatternReplacementScopes(body.replacementAppliesToScopes)
      : normalizeProductValidationPatternReplacementScopes(current.replacementAppliesToScopes);
  const nextRuntimeEnabled =
    body.runtimeEnabled !== undefined ? body.runtimeEnabled : current.runtimeEnabled;
  const nextRuntimeType = body.runtimeType !== undefined ? body.runtimeType : current.runtimeType;
  const nextRuntimeConfigRaw =
    body.runtimeConfig !== undefined ? body.runtimeConfig?.trim() || null : current.runtimeConfig;
  const nextRuntimeConfig = validateAndNormalizeRuntimeConfig({
    runtimeEnabled: nextRuntimeEnabled,
    runtimeType: nextRuntimeType,
    runtimeConfig: nextRuntimeConfigRaw,
  });
  const shouldPersistRuntimeConfig =
    body.runtimeConfig !== undefined ||
    body.runtimeEnabled !== undefined ||
    body.runtimeType !== undefined;
  const nextLaunchEnabled =
    body.launchEnabled !== undefined ? body.launchEnabled : current.launchEnabled;
  const nextLaunchAppliesToScopes =
    body.launchAppliesToScopes !== undefined
      ? normalizeProductValidationPatternLaunchScopes(body.launchAppliesToScopes)
      : normalizeProductValidationPatternLaunchScopes(current.launchAppliesToScopes);
  const nextLaunchScopeBehavior =
    body.launchScopeBehavior !== undefined
      ? normalizeProductValidationLaunchScopeBehavior(body.launchScopeBehavior)
      : normalizeProductValidationLaunchScopeBehavior(current.launchScopeBehavior);
  const nextLaunchSourceMode =
    body.launchSourceMode !== undefined ? body.launchSourceMode : current.launchSourceMode;
  const nextLaunchSourceField =
    body.launchSourceField !== undefined
      ? body.launchSourceField?.trim() || null
      : current.launchSourceField;
  const nextLaunchOperator =
    body.launchOperator !== undefined ? body.launchOperator : current.launchOperator;
  const nextLaunchValue =
    body.launchValue !== undefined
      ? typeof body.launchValue === 'string'
        ? body.launchValue
        : null
      : current.launchValue;
  const nextLaunchFlags =
    body.launchFlags !== undefined ? body.launchFlags?.trim() || null : current.launchFlags;
  const nextAppliesToScopes =
    body.appliesToScopes !== undefined
      ? normalizeProductValidationPatternScopes(body.appliesToScopes)
      : normalizeProductValidationPatternScopes(current.appliesToScopes);

  if (
    nextReplacementEnabled &&
    !nextReplacementValue &&
    !canResolveValidatorPatternReplacementAtRuntime({
      replacementEnabled: nextReplacementEnabled,
      replacementValue: nextReplacementValue,
      runtimeEnabled: nextRuntimeEnabled,
      runtimeType: nextRuntimeType,
    })
  ) {
    throw badRequestError(
      'replacementValue is required when replacementEnabled is true unless runtime replacement is enabled'
    );
  }

  if (
    nextLaunchEnabled &&
    nextLaunchSourceMode !== 'current_field' &&
    !nextLaunchSourceField
  ) {
    throw badRequestError(
      'launchSourceField is required when launchSourceMode is not current_field'
    );
  }

  assertValidValidatorPatternRegex(nextRegex, nextFlags);
  assertValidValidatorPatternReplacementRecipe(nextReplacementEnabled, nextReplacementValue);
  assertValidValidatorPatternLaunchConfig({
    launchEnabled: nextLaunchEnabled,
    launchOperator: nextLaunchOperator,
    launchValue: nextLaunchValue,
    launchFlags: nextLaunchFlags,
  });

  return {
    nextRegex,
    nextFlags,
    nextReplacementEnabled,
    nextReplacementValue,
    nextReplacementFields,
    nextReplacementAppliesToScopes,
    nextRuntimeEnabled,
    nextRuntimeType,
    nextRuntimeConfig,
    shouldPersistRuntimeConfig,
    nextLaunchEnabled,
    nextLaunchAppliesToScopes,
    nextLaunchScopeBehavior,
    nextLaunchSourceMode,
    nextLaunchSourceField,
    nextLaunchOperator,
    nextLaunchValue,
    nextLaunchFlags,
    nextAppliesToScopes,
  };
};

export const buildValidatorPatternUpdateInput = ({
  body,
  state,
}: {
  body: ValidatorPatternUpdateBodyLike;
  state: ResolvedValidatorPatternUpdateState;
}): Record<string, unknown> => ({
  ...(body.label !== undefined && { label: body.label.trim() }),
  ...(body.target !== undefined && { target: body.target }),
  ...(body.locale !== undefined && { locale: body.locale?.trim().toLowerCase() || null }),
  ...(body.regex !== undefined && { regex: state.nextRegex }),
  ...(body.flags !== undefined && { flags: state.nextFlags }),
  ...(body.message !== undefined && { message: body.message.trim() }),
  ...(body.severity !== undefined && { severity: body.severity }),
  ...(body.enabled !== undefined && { enabled: body.enabled }),
  ...(body.replacementEnabled !== undefined && { replacementEnabled: body.replacementEnabled }),
  ...(body.replacementAutoApply !== undefined && {
    replacementAutoApply: body.replacementAutoApply,
  }),
  ...(body.skipNoopReplacementProposal !== undefined && {
    skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
      body.skipNoopReplacementProposal
    ),
  }),
  ...(body.replacementValue !== undefined && {
    replacementValue: body.replacementValue?.trim() || null,
  }),
  ...(body.replacementFields !== undefined && {
    replacementFields: state.nextReplacementFields,
  }),
  ...(body.replacementAppliesToScopes !== undefined && {
    replacementAppliesToScopes: state.nextReplacementAppliesToScopes,
  }),
  ...(body.runtimeEnabled !== undefined && { runtimeEnabled: body.runtimeEnabled }),
  ...(body.runtimeType !== undefined && { runtimeType: body.runtimeType }),
  ...(state.shouldPersistRuntimeConfig && { runtimeConfig: state.nextRuntimeConfig }),
  ...(body.postAcceptBehavior !== undefined && { postAcceptBehavior: body.postAcceptBehavior }),
  ...(body.denyBehaviorOverride !== undefined && {
    denyBehaviorOverride: normalizeProductValidationPatternDenyBehaviorOverride(
      body.denyBehaviorOverride
    ),
  }),
  ...(body.validationDebounceMs !== undefined && {
    validationDebounceMs: body.validationDebounceMs,
  }),
  ...(body.sequenceGroupId !== undefined && {
    sequenceGroupId: body.sequenceGroupId?.trim() || null,
  }),
  ...(body.sequenceGroupLabel !== undefined && {
    sequenceGroupLabel: body.sequenceGroupLabel?.trim() || null,
  }),
  ...(body.sequenceGroupDebounceMs !== undefined && {
    sequenceGroupDebounceMs: body.sequenceGroupDebounceMs,
  }),
  ...(body.sequence !== undefined && { sequence: body.sequence }),
  ...(body.chainMode !== undefined && { chainMode: body.chainMode }),
  ...(body.maxExecutions !== undefined && { maxExecutions: body.maxExecutions }),
  ...(body.passOutputToNext !== undefined && { passOutputToNext: body.passOutputToNext }),
  ...(body.launchEnabled !== undefined && { launchEnabled: body.launchEnabled }),
  ...(body.launchAppliesToScopes !== undefined && {
    launchAppliesToScopes: state.nextLaunchAppliesToScopes,
  }),
  ...(body.launchScopeBehavior !== undefined && {
    launchScopeBehavior: state.nextLaunchScopeBehavior,
  }),
  ...(body.launchSourceMode !== undefined && { launchSourceMode: body.launchSourceMode }),
  ...(body.launchSourceField !== undefined && {
    launchSourceField: body.launchSourceField?.trim() || null,
  }),
  ...(body.launchOperator !== undefined && { launchOperator: body.launchOperator }),
  ...(body.launchValue !== undefined && {
    launchValue: typeof body.launchValue === 'string' ? body.launchValue : null,
  }),
  ...(body.launchFlags !== undefined && { launchFlags: body.launchFlags?.trim() || null }),
  ...(body.appliesToScopes !== undefined && { appliesToScopes: state.nextAppliesToScopes }),
  ...(body.semanticState !== undefined && {
    semanticState: normalizeProductValidationSemanticState(body.semanticState),
  }),
  ...(body.expectedUpdatedAt !== undefined && {
    expectedUpdatedAt: body.expectedUpdatedAt?.trim() || null,
  }),
});

export const buildDeleteValidatorPatternResponse = (): Response =>
  new Response(null, { status: 204 });
