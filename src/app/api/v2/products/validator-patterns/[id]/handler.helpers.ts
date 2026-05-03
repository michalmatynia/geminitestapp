import { z } from 'zod';
import { validateAndNormalizeRuntimeConfig } from '@/features/products/server';
import { productValidationSemanticStateSchema, type ProductValidationPattern, type UpdateProductValidationPatternInput } from '@/shared/contracts/products/validation';
import { badRequestError } from '@/shared/errors/app-error';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/shared/lib/products/constants';
import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationSkipNoopReplacementProposal,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { normalizeProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';
import {
  assertValidValidatorPatternRegex,
  assertValidValidatorPatternReplacementRecipe,
  assertValidValidatorPatternLaunchConfig,
  canResolveValidatorPatternReplacementAtRuntime,
  normalizeValidatorPatternReplacementFields,
  type ValidatorPatternRuntimeType,
} from '../handler.helpers';

const replacementFieldSchema = z.enum(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

export const updatePatternSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    target: z
      .enum([
        'name',
        'description',
        'sku',
        'price',
        'stock',
        'category',
        'size_length',
        'size_width',
        'length',
        'weight',
      ])
      .optional(),
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
    replacementAppliesToScopes: z
      .array(z.enum(['draft_template', 'product_create', 'product_edit']))
      .optional(),
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
    launchAppliesToScopes: z
      .array(z.enum(['draft_template', 'product_create', 'product_edit']))
      .optional(),
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
    appliesToScopes: z
      .array(z.enum(['draft_template', 'product_create', 'product_edit']))
      .optional(),
    semanticState: productValidationSemanticStateSchema.nullable().optional(),
    expectedUpdatedAt: z.string().trim().nullable().optional(),
  })
  .refine(
    (value: Record<string, unknown>) =>
      Object.keys(value).some((key: string) => key !== 'expectedUpdatedAt'),
    'At least one field is required'
  );

type UpdatePatternBody = z.infer<typeof updatePatternSchema>;

export const resolveValidatorPatternUpdateState = (
  body: UpdatePatternBody,
  current: ProductValidationPattern
) => {
  const nextRegex = (body.regex ?? current.regex).trim();
  const nextFlags = body.flags !== undefined ? (body.flags?.trim() ?? null) : current.flags;
  const nextReplacementEnabled =
    body.replacementEnabled !== undefined ? body.replacementEnabled : current.replacementEnabled;
  const nextReplacementValue =
    body.replacementValue !== undefined
      ? (body.replacementValue?.trim() ?? null)
      : current.replacementValue;
  const nextReplacementFields =
    body.replacementFields !== undefined
      ? normalizeValidatorPatternReplacementFields(body.replacementFields)
      : current.replacementFields;
  const nextLaunchEnabled =
    body.launchEnabled !== undefined ? body.launchEnabled : current.launchEnabled;
  const nextLaunchSourceMode =
    body.launchSourceMode !== undefined ? body.launchSourceMode : current.launchSourceMode;
  const nextLaunchScopeBehavior =
    body.launchScopeBehavior !== undefined
      ? normalizeProductValidationLaunchScopeBehavior(body.launchScopeBehavior)
      : normalizeProductValidationLaunchScopeBehavior(current.launchScopeBehavior);
  const nextLaunchSourceField =
    body.launchSourceField !== undefined
      ? (body.launchSourceField?.trim() ?? null)
      : current.launchSourceField;
  const nextLaunchAppliesToScopes =
    body.launchAppliesToScopes !== undefined
      ? normalizeProductValidationPatternLaunchScopes(body.launchAppliesToScopes)
      : normalizeProductValidationPatternLaunchScopes(current.launchAppliesToScopes);
  const nextAppliesToScopes =
    body.appliesToScopes !== undefined
      ? normalizeProductValidationPatternScopes(body.appliesToScopes)
      : normalizeProductValidationPatternScopes(current.appliesToScopes);
  const nextReplacementAppliesToScopes =
    body.replacementAppliesToScopes !== undefined
      ? normalizeProductValidationPatternReplacementScopes(body.replacementAppliesToScopes)
      : normalizeProductValidationPatternReplacementScopes(current.replacementAppliesToScopes);
  const nextRuntimeEnabled =
    body.runtimeEnabled !== undefined ? body.runtimeEnabled : current.runtimeEnabled;
  const nextRuntimeType = (body.runtimeType !== undefined ? body.runtimeType : current.runtimeType) as ValidatorPatternRuntimeType;
  const nextRuntimeConfigRaw =
    body.runtimeConfig !== undefined ? (body.runtimeConfig?.trim() ?? null) : current.runtimeConfig;
  const nextRuntimeConfig = validateAndNormalizeRuntimeConfig({
    runtimeEnabled: nextRuntimeEnabled,
    runtimeType: nextRuntimeType,
    runtimeConfig: nextRuntimeConfigRaw,
  });
  const shouldPersistRuntimeConfig =
    body.runtimeConfig !== undefined ||
    body.runtimeEnabled !== undefined ||
    body.runtimeType !== undefined;

  if (
    nextReplacementEnabled &&
    nextReplacementValue === null &&
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

  if (nextLaunchEnabled && nextLaunchSourceMode !== 'current_field' && nextLaunchSourceField === null) {
    throw badRequestError(
      'launchSourceField is required when launchSourceMode is not current_field'
    );
  }

  assertValidValidatorPatternRegex(nextRegex, nextFlags);
  assertValidValidatorPatternReplacementRecipe(nextReplacementEnabled, nextReplacementValue);
  assertValidValidatorPatternLaunchConfig({
    launchEnabled: nextLaunchEnabled,
    launchOperator: body.launchOperator ?? current.launchOperator,
    launchValue:
      body.launchValue !== undefined
        ? typeof body.launchValue === 'string'
          ? body.launchValue
          : null
        : current.launchValue,
    launchFlags:
      body.launchFlags !== undefined ? (body.launchFlags?.trim() ?? null) : current.launchFlags,
  });

  return {
    nextRegex,
    nextFlags,
    nextReplacementEnabled,
    nextReplacementValue,
    nextReplacementFields,
    nextLaunchEnabled,
    nextLaunchSourceMode,
    nextLaunchScopeBehavior,
    nextLaunchSourceField,
    nextLaunchAppliesToScopes,
    nextAppliesToScopes,
    nextReplacementAppliesToScopes,
    nextRuntimeEnabled,
    nextRuntimeType,
    nextRuntimeConfig,
    shouldPersistRuntimeConfig,
  };
};

export const buildValidatorPatternUpdateInput = (
  body: UpdatePatternBody,
  state: ReturnType<typeof resolveValidatorPatternUpdateState>
): UpdateProductValidationPatternInput => ({
  ...(body.label !== undefined && { label: body.label.trim() }),
  ...(body.target !== undefined && { target: body.target }),
  ...(body.locale !== undefined && { locale: body.locale?.trim().toLowerCase() ?? null }),
  ...(body.regex !== undefined && { regex: state.nextRegex }),
  ...(body.flags !== undefined && { flags: state.nextFlags }),
  ...(body.message !== undefined && { message: body.message.trim() }),
  ...(body.severity !== undefined && { severity: body.severity }),
  ...(body.enabled !== undefined && { enabled: body.enabled }),
  ...(body.replacementEnabled !== undefined && { replacementEnabled: body.nextReplacementEnabled }),
  ...(body.replacementAutoApply !== undefined && {
    replacementAutoApply: body.replacementAutoApply,
  }),
  ...(body.skipNoopReplacementProposal !== undefined && {
    skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
      body.skipNoopReplacementProposal
    ),
  }),
  ...(body.replacementValue !== undefined && {
    replacementValue: state.nextReplacementValue,
  }),
  ...(body.replacementFields !== undefined && { replacementFields: state.nextReplacementFields }),
  ...(body.replacementAppliesToScopes !== undefined && {
    replacementAppliesToScopes: state.nextReplacementAppliesToScopes,
  }),
  ...(body.runtimeEnabled !== undefined && { runtimeEnabled: state.nextRuntimeEnabled }),
  ...(body.runtimeType !== undefined && { runtimeType: state.nextRuntimeType }),
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
    sequenceGroupId: body.sequenceGroupId?.trim() ?? null,
  }),
  ...(body.sequenceGroupLabel !== undefined && {
    sequenceGroupLabel: body.sequenceGroupLabel?.trim() ?? null,
  }),
  ...(body.sequenceGroupDebounceMs !== undefined && {
    sequenceGroupDebounceMs: body.sequenceGroupDebounceMs,
  }),
  ...(body.sequence !== undefined && { sequence: body.sequence }),
  ...(body.chainMode !== undefined && { chainMode: body.chainMode }),
  ...(body.maxExecutions !== undefined && { maxExecutions: body.maxExecutions }),
  ...(body.passOutputToNext !== undefined && { passOutputToNext: body.passOutputToNext }),
  ...(body.launchEnabled !== undefined && { launchEnabled: state.nextLaunchEnabled }),
  ...(body.launchAppliesToScopes !== undefined && {
    launchAppliesToScopes: state.nextLaunchAppliesToScopes,
  }),
  ...(body.launchScopeBehavior !== undefined && {
    launchScopeBehavior: state.nextLaunchScopeBehavior,
  }),
  ...(body.launchSourceMode !== undefined && { launchSourceMode: state.nextLaunchSourceMode }),
  ...(body.launchSourceField !== undefined && {
    launchSourceField: state.nextLaunchSourceField,
  }),
  ...(body.launchOperator !== undefined && { launchOperator: body.launchOperator }),
  ...(body.launchValue !== undefined && {
    launchValue: typeof body.launchValue === 'string' ? body.launchValue : null,
  }),
  ...(body.launchFlags !== undefined && { launchFlags: body.launchFlags?.trim() ?? null }),
  ...(body.appliesToScopes !== undefined && { appliesToScopes: state.nextAppliesToScopes }),
  ...(body.semanticState !== undefined && {
    semanticState: normalizeProductValidationSemanticState(body.semanticState),
  }),
  ...(body.expectedUpdatedAt !== undefined && {
    expectedUpdatedAt: body.expectedUpdatedAt?.trim() ?? null,
  }),
});
