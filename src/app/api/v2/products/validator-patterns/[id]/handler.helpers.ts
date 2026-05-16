import { z } from 'zod';

import { validateAndNormalizeRuntimeConfig } from '@/features/products/server';
import {
  productValidationInstanceScopeSchema,
  productValidationSemanticStateSchema,
  productValidationTargetSchema,
  type ProductValidationInstanceScope,
  type ProductValidationLaunchOperator,
  type ProductValidationLaunchScopeBehavior,
  type ProductValidationLaunchSourceMode,
  type ProductValidationPattern,
  type ProductValidationRuntimeType,
  type UpdateProductValidationPatternInput,
} from '@/shared/contracts/products/validation';
import { badRequestError } from '@/shared/errors/app-error';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/shared/lib/products/constants';
import {
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { normalizeProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';

import {
  assertValidValidatorPatternLaunchConfig,
  assertValidValidatorPatternRegex,
  assertValidValidatorPatternReplacementRecipe,
  canResolveValidatorPatternReplacementAtRuntime,
  normalizeValidatorPatternReplacementFields,
} from '../handler.helpers';

const replacementFieldSchema = z.enum(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

export const updatePatternSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    target: productValidationTargetSchema.optional(),
    locale: z.string().trim().nullable().optional(),
    regex: z.string().min(1).optional(),
    flags: z.string().trim().nullable().optional(),
    message: z.string().trim().min(1).optional(),
    severity: z.enum(['error', 'warning']).optional(),
    enabled: z.boolean().optional(),
    replacementEnabled: z.boolean().optional(),
    replacementAutoApply: z.boolean().optional(),
    skipNoopReplacementProposal: z.boolean().optional(),
    replacementValue: z.string().trim().nullable().optional(),
    replacementFields: z.array(replacementFieldSchema).optional(),
    replacementAppliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
    runtimeEnabled: z.boolean().optional(),
    runtimeType: z.enum(['none', 'database_query', 'ai_prompt']).optional(),
    runtimeConfig: z.string().trim().nullable().optional(),
    postAcceptBehavior: z.enum(['revalidate', 'stop_after_accept']).optional(),
    denyBehaviorOverride: z.enum(['ask_again', 'mute_session']).nullable().optional(),
    validationDebounceMs: z.number().int().min(0).max(30000).optional(),
    sequenceGroupId: z.string().trim().nullable().optional(),
    sequenceGroupLabel: z.string().trim().nullable().optional(),
    sequenceGroupDebounceMs: z.number().int().min(0).max(30000).optional(),
    sequence: z.number().int().min(0).nullable().optional(),
    chainMode: z.enum(['continue', 'stop_on_match', 'stop_on_replace']).optional(),
    maxExecutions: z.number().int().min(1).max(20).optional(),
    passOutputToNext: z.boolean().optional(),
    launchEnabled: z.boolean().optional(),
    launchAppliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
    launchScopeBehavior: z.enum(['gate', 'condition_only']).optional(),
    launchSourceMode: z.enum(['current_field', 'form_field', 'latest_product_field']).optional(),
    launchSourceField: z.string().trim().nullable().optional(),
    launchOperator: z
      .enum([
        'equals',
        'not_equals',
        'contains',
        'starts_with',
        'ends_with',
        'regex',
        'gt',
        'gte',
        'lt',
        'lte',
        'is_empty',
        'is_not_empty',
      ])
      .optional(),
    launchValue: z.string().nullable().optional(),
    launchFlags: z.string().trim().nullable().optional(),
    appliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
    semanticState: productValidationSemanticStateSchema.nullable().optional(),
    expectedUpdatedAt: z.string().trim().nullable().optional(),
  })
  .refine(
    (value: Record<string, unknown>) =>
      Object.keys(value).some((key: string) => key !== 'expectedUpdatedAt'),
    'At least one field is required'
  );

type UpdatePatternBody = z.infer<typeof updatePatternSchema>;

type ReplacementConfiguration = {
  nextReplacementEnabled: boolean;
  nextReplacementValue: string | null;
  nextReplacementFields: string[];
  nextReplacementAppliesToScopes: ProductValidationInstanceScope[];
};

type LaunchConfiguration = {
  nextLaunchEnabled: boolean;
  nextLaunchSourceMode: ProductValidationLaunchSourceMode;
  nextLaunchScopeBehavior: ProductValidationLaunchScopeBehavior;
  nextLaunchSourceField: string | null;
  nextLaunchAppliesToScopes: ProductValidationInstanceScope[];
};

type RuntimeConfiguration = {
  nextRuntimeEnabled: boolean;
  nextRuntimeType: ProductValidationRuntimeType;
  nextRuntimeConfig: string | null;
};

export type ValidatorPatternState = ReplacementConfiguration &
  LaunchConfiguration &
  RuntimeConfiguration & {
    nextRegex: string;
    nextFlags: string | null;
    nextAppliesToScopes: ProductValidationInstanceScope[];
    shouldPersistRuntimeConfig: boolean;
  };

const normalizeNullableTrimmed = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveRuntimeState = (
  body: UpdatePatternBody,
  current: ProductValidationPattern
): RuntimeConfiguration => {
  const nextRuntimeEnabled = Boolean(body.runtimeEnabled ?? current.runtimeEnabled);
  const nextRuntimeType = body.runtimeType ?? current.runtimeType ?? 'none';
  const runtimeConfig =
    body.runtimeConfig !== undefined
      ? normalizeNullableTrimmed(body.runtimeConfig)
      : current.runtimeConfig;
  const nextRuntimeConfig = validateAndNormalizeRuntimeConfig({
    runtimeEnabled: nextRuntimeEnabled,
    runtimeType: nextRuntimeType,
    runtimeConfig,
  });

  return { nextRuntimeEnabled, nextRuntimeType, nextRuntimeConfig };
};

const resolveReplacementState = (
  body: UpdatePatternBody,
  current: ProductValidationPattern
): ReplacementConfiguration => ({
  nextReplacementEnabled: body.replacementEnabled ?? current.replacementEnabled,
  nextReplacementValue:
    body.replacementValue !== undefined
      ? normalizeNullableTrimmed(body.replacementValue)
      : current.replacementValue,
  nextReplacementFields:
    body.replacementFields !== undefined
      ? normalizeValidatorPatternReplacementFields(body.replacementFields)
      : current.replacementFields,
  nextReplacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
    body.replacementAppliesToScopes ?? current.replacementAppliesToScopes
  ),
});

const resolveLaunchState = (
  body: UpdatePatternBody,
  current: ProductValidationPattern
): LaunchConfiguration => ({
  nextLaunchEnabled: body.launchEnabled ?? current.launchEnabled,
  nextLaunchSourceMode: body.launchSourceMode ?? current.launchSourceMode,
  nextLaunchScopeBehavior: normalizeProductValidationLaunchScopeBehavior(
    body.launchScopeBehavior ?? current.launchScopeBehavior
  ),
  nextLaunchSourceField:
    body.launchSourceField !== undefined
      ? normalizeNullableTrimmed(body.launchSourceField)
      : current.launchSourceField,
  nextLaunchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
    body.launchAppliesToScopes ?? current.launchAppliesToScopes
  ),
});

const validateReplacement = (
  replacement: ReplacementConfiguration,
  runtime: RuntimeConfiguration
): void => {
  if (
    replacement.nextReplacementEnabled &&
    replacement.nextReplacementValue === null &&
    !canResolveValidatorPatternReplacementAtRuntime({
      replacementEnabled: replacement.nextReplacementEnabled,
      replacementValue: replacement.nextReplacementValue,
      runtimeEnabled: runtime.nextRuntimeEnabled,
      runtimeType: runtime.nextRuntimeType,
    })
  ) {
    throw badRequestError(
      'replacementValue is required when replacementEnabled is true unless runtime replacement is enabled'
    );
  }
};

const validateLaunchConfiguration = ({
  launch,
  launchOperator,
  launchValue,
  launchFlags,
}: {
  launch: LaunchConfiguration;
  launchOperator: ProductValidationLaunchOperator;
  launchValue: string | null;
  launchFlags: string | null;
}): void => {
  if (
    launch.nextLaunchEnabled &&
    launch.nextLaunchSourceMode !== 'current_field' &&
    launch.nextLaunchSourceField === null
  ) {
    throw badRequestError('launchSourceField is required when launchSourceMode is not current_field');
  }

  assertValidValidatorPatternLaunchConfig({
    launchEnabled: launch.nextLaunchEnabled,
    launchOperator,
    launchValue,
    launchFlags,
  });
};

export const resolveValidatorPatternUpdateState = (
  body: UpdatePatternBody,
  current: ProductValidationPattern
): ValidatorPatternState => {
  const nextRegex = (body.regex ?? current.regex).trim();
  const nextFlags = body.flags !== undefined ? normalizeNullableTrimmed(body.flags) : current.flags;

  if (nextRegex.length === 0) {
    throw badRequestError('Regex pattern cannot be empty');
  }

  const runtime = resolveRuntimeState(body, current);
  const replacement = resolveReplacementState(body, current);
  const launch = resolveLaunchState(body, current);
  const launchOperator = body.launchOperator ?? current.launchOperator;
  const launchValue =
    body.launchValue !== undefined
      ? typeof body.launchValue === 'string'
        ? body.launchValue
        : null
      : current.launchValue;
  const launchFlags =
    body.launchFlags !== undefined ? normalizeNullableTrimmed(body.launchFlags) : current.launchFlags;

  validateReplacement(replacement, runtime);
  validateLaunchConfiguration({
    launch,
    launchOperator,
    launchValue,
    launchFlags,
  });

  assertValidValidatorPatternRegex(nextRegex, nextFlags);
  assertValidValidatorPatternReplacementRecipe(
    replacement.nextReplacementEnabled,
    replacement.nextReplacementValue
  );

  return {
    nextRegex,
    nextFlags,
    ...replacement,
    ...launch,
    ...runtime,
    nextAppliesToScopes: normalizeProductValidationPatternScopes(
      body.appliesToScopes ?? current.appliesToScopes
    ),
    shouldPersistRuntimeConfig:
      body.runtimeConfig !== undefined ||
      body.runtimeEnabled !== undefined ||
      body.runtimeType !== undefined,
  };
};

const buildBasicMetadataInput = (
  body: UpdatePatternBody
): Pick<
  UpdateProductValidationPatternInput,
  'label' | 'target' | 'locale' | 'message' | 'severity' | 'enabled'
> => ({
  ...(body.label !== undefined && { label: body.label.trim() }),
  ...(body.target !== undefined && { target: body.target }),
  ...(body.locale !== undefined && {
    locale: normalizeNullableTrimmed(body.locale)?.toLowerCase() ?? null,
  }),
  ...(body.message !== undefined && { message: body.message.trim() }),
  ...(body.severity !== undefined && { severity: body.severity }),
  ...(body.enabled !== undefined && { enabled: body.enabled }),
});

const buildRegexInput = (
  body: UpdatePatternBody,
  state: ValidatorPatternState
): Pick<UpdateProductValidationPatternInput, 'regex' | 'flags'> => ({
  ...(body.regex !== undefined && { regex: state.nextRegex }),
  ...(body.flags !== undefined && { flags: state.nextFlags }),
});

const buildReplacementInput = (
  body: UpdatePatternBody,
  state: ValidatorPatternState
): Pick<
  UpdateProductValidationPatternInput,
  | 'replacementEnabled'
  | 'replacementAutoApply'
  | 'skipNoopReplacementProposal'
  | 'replacementValue'
  | 'replacementFields'
  | 'replacementAppliesToScopes'
> => ({
  ...(body.replacementEnabled !== undefined && {
    replacementEnabled: state.nextReplacementEnabled,
  }),
  ...(body.replacementAutoApply !== undefined && {
    replacementAutoApply: body.replacementAutoApply,
  }),
  ...(body.skipNoopReplacementProposal !== undefined && {
    skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
      body.skipNoopReplacementProposal
    ),
  }),
  ...(body.replacementValue !== undefined && { replacementValue: state.nextReplacementValue }),
  ...(body.replacementFields !== undefined && { replacementFields: state.nextReplacementFields }),
  ...(body.replacementAppliesToScopes !== undefined && {
    replacementAppliesToScopes: state.nextReplacementAppliesToScopes,
  }),
});

const buildRuntimeAndLaunchInput = (
  body: UpdatePatternBody,
  state: ValidatorPatternState
): Pick<
  UpdateProductValidationPatternInput,
  | 'runtimeEnabled'
  | 'runtimeType'
  | 'runtimeConfig'
  | 'launchEnabled'
  | 'launchAppliesToScopes'
  | 'launchScopeBehavior'
  | 'launchSourceMode'
  | 'launchSourceField'
  | 'launchOperator'
  | 'launchValue'
  | 'launchFlags'
> => ({
  ...(body.runtimeEnabled !== undefined && { runtimeEnabled: state.nextRuntimeEnabled }),
  ...(body.runtimeType !== undefined && { runtimeType: state.nextRuntimeType }),
  ...(state.shouldPersistRuntimeConfig && { runtimeConfig: state.nextRuntimeConfig }),
  ...(body.launchEnabled !== undefined && { launchEnabled: state.nextLaunchEnabled }),
  ...(body.launchAppliesToScopes !== undefined && {
    launchAppliesToScopes: state.nextLaunchAppliesToScopes,
  }),
  ...(body.launchScopeBehavior !== undefined && {
    launchScopeBehavior: state.nextLaunchScopeBehavior,
  }),
  ...(body.launchSourceMode !== undefined && { launchSourceMode: state.nextLaunchSourceMode }),
  ...(body.launchSourceField !== undefined && { launchSourceField: state.nextLaunchSourceField }),
  ...(body.launchOperator !== undefined && { launchOperator: body.launchOperator }),
  ...(body.launchValue !== undefined && {
    launchValue: typeof body.launchValue === 'string' ? body.launchValue : null,
  }),
  ...(body.launchFlags !== undefined && {
    launchFlags: normalizeNullableTrimmed(body.launchFlags),
  }),
});

const buildBehavioralInput = (
  body: UpdatePatternBody
): Pick<UpdateProductValidationPatternInput, 'postAcceptBehavior' | 'denyBehaviorOverride'> => ({
  ...(body.postAcceptBehavior !== undefined && { postAcceptBehavior: body.postAcceptBehavior }),
  ...(body.denyBehaviorOverride !== undefined && {
    denyBehaviorOverride: normalizeProductValidationPatternDenyBehaviorOverride(
      body.denyBehaviorOverride
    ),
  }),
});

const buildSequenceInput = (
  body: UpdatePatternBody
): Pick<
  UpdateProductValidationPatternInput,
  | 'validationDebounceMs'
  | 'sequenceGroupId'
  | 'sequenceGroupLabel'
  | 'sequenceGroupDebounceMs'
  | 'sequence'
  | 'chainMode'
  | 'maxExecutions'
  | 'passOutputToNext'
> => ({
  ...(body.validationDebounceMs !== undefined && {
    validationDebounceMs: body.validationDebounceMs,
  }),
  ...(body.sequenceGroupId !== undefined && {
    sequenceGroupId: normalizeNullableTrimmed(body.sequenceGroupId),
  }),
  ...(body.sequenceGroupLabel !== undefined && {
    sequenceGroupLabel: normalizeNullableTrimmed(body.sequenceGroupLabel),
  }),
  ...(body.sequenceGroupDebounceMs !== undefined && {
    sequenceGroupDebounceMs: body.sequenceGroupDebounceMs,
  }),
  ...(body.sequence !== undefined && { sequence: body.sequence }),
  ...(body.chainMode !== undefined && { chainMode: body.chainMode }),
  ...(body.maxExecutions !== undefined && { maxExecutions: body.maxExecutions }),
  ...(body.passOutputToNext !== undefined && { passOutputToNext: body.passOutputToNext }),
});

const buildSequenceAndAuditInput = (
  body: UpdatePatternBody,
  state: ValidatorPatternState
): Pick<
  UpdateProductValidationPatternInput,
  | 'postAcceptBehavior'
  | 'denyBehaviorOverride'
  | 'validationDebounceMs'
  | 'sequenceGroupId'
  | 'sequenceGroupLabel'
  | 'sequenceGroupDebounceMs'
  | 'sequence'
  | 'chainMode'
  | 'maxExecutions'
  | 'passOutputToNext'
  | 'appliesToScopes'
  | 'semanticState'
  | 'expectedUpdatedAt'
> => ({
  ...buildBehavioralInput(body),
  ...buildSequenceInput(body),
  ...(body.appliesToScopes !== undefined && { appliesToScopes: state.nextAppliesToScopes }),
  ...(body.semanticState !== undefined && {
    semanticState: normalizeProductValidationSemanticState(body.semanticState),
  }),
  ...(body.expectedUpdatedAt !== undefined && {
    expectedUpdatedAt: normalizeNullableTrimmed(body.expectedUpdatedAt),
  }),
});

export const buildValidatorPatternUpdateInput = (
  body: UpdatePatternBody,
  state: ValidatorPatternState
): UpdateProductValidationPatternInput => ({
  ...buildBasicMetadataInput(body),
  ...buildRegexInput(body, state),
  ...buildReplacementInput(body, state),
  ...buildRuntimeAndLaunchInput(body, state),
  ...buildSequenceAndAuditInput(body, state),
});
