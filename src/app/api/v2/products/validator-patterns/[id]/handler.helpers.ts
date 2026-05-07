import { z } from 'zod';
import { validateAndNormalizeRuntimeConfig } from '@/features/products/server';
import { productValidationSemanticStateSchema, type ProductValidationPattern, type UpdateProductValidationPatternInput } from '@/shared/contracts/products/validation';
import { badRequestError } from '@/shared/errors/app-error';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/shared/lib/products/constants';
import {
  assertValidValidatorPatternRegex,
  assertValidValidatorPatternReplacementRecipe,
  assertValidValidatorPatternLaunchConfig,
  canResolveValidatorPatternReplacementAtRuntime,
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

// Validators and state resolution utilities for product patterns.

const normalizeRuntimeConfig = (
  body: UpdatePatternBody,
  current: ProductValidationPattern,
  enabled: boolean,
  type: ValidatorPatternRuntimeType
): string | null => {
  const normalized = validateAndNormalizeRuntimeConfig({
    runtimeEnabled: enabled,
    runtimeType: type,
    runtimeConfig: (body.runtimeConfig ?? current.runtimeConfig) ?? null,
  });
  return normalized;
};

const resolveRuntimeState = (
  body: UpdatePatternBody,
  current: ProductValidationPattern
): {
  nextRuntimeEnabled: boolean;
  nextRuntimeType: ValidatorPatternRuntimeType;
  nextRuntimeConfig: string | null;
} => {
  const nextRuntimeEnabled = Boolean(body.runtimeEnabled ?? current.runtimeEnabled);
  const nextRuntimeType = (body.runtimeType ?? current.runtimeType ?? 'none') as ValidatorPatternRuntimeType;
  const normalized = normalizeRuntimeConfig(body, current, nextRuntimeEnabled, nextRuntimeType);
  return { nextRuntimeEnabled, nextRuntimeType, nextRuntimeConfig: normalized };
};


const validateLaunchSource = (launch: { nextLaunchEnabled: boolean, nextLaunchSourceMode: string, nextLaunchSourceField: string | null }): void => {
  if (
    launch.nextLaunchEnabled === true &&
    launch.nextLaunchSourceMode !== 'current_field' &&
    launch.nextLaunchSourceField === null
  ) {
    throw badRequestError('launchSourceField is required when launchSourceMode is not current_field');
  }
};

// Helper validation function for launch source

export interface LaunchConfiguration {
  nextLaunchEnabled: boolean;
  nextLaunchSourceMode: string;
  nextLaunchScopeBehavior: string;
  nextLaunchSourceField: string | null;
  nextLaunchAppliesToScopes: string[];
}

const validateLaunchConfiguration = (config: {
  launch: LaunchConfiguration;
  launchOperator: string | undefined;
  launchValue: string | null | undefined;
  launchFlags: string | null | undefined;
  current: ProductValidationPattern;
}): void => {
  validateLaunchSource(config.launch);

  assertValidValidatorPatternLaunchConfig({
    launchEnabled: config.launch.nextLaunchEnabled,
    launchOperator: config.launchOperator ?? config.current.launchOperator,
    launchValue: typeof config.launchValue === 'string' ? config.launchValue : (config.launchValue === null ? null : config.current.launchValue),
    launchFlags: config.flags ?? config.current.launchFlags ?? null,
  });
};



export interface ValidatorPatternState {
  nextRegex: string;
  nextFlags: string | null;
  nextReplacementEnabled: boolean;
  nextReplacementValue: string | null;
  nextReplacementFields: string[];
  nextReplacementAppliesToScopes: string[];
  nextLaunchEnabled: boolean;
  nextLaunchSourceMode: string;
  nextLaunchScopeBehavior: string;
  nextLaunchSourceField: string | null;
  nextLaunchAppliesToScopes: string[];
  nextRuntimeEnabled: boolean;
  nextRuntimeType: ValidatorPatternRuntimeType;
  nextRuntimeConfig: string | null;
  shouldPersistRuntimeConfig: boolean;
  nextAppliesToScopes: string[];
}





export const resolveValidatorPatternUpdateState = (
  body: UpdatePatternBody,
  current: ProductValidationPattern
): ValidatorPatternState => {
  const nextRegex = (body.regex ?? current.regex).trim();
  const nextFlags = body.flags ?? current.flags ?? null;

  if (nextRegex.length === 0) {
    throw badRequestError('Regex pattern cannot be empty');
  }

  const runtime = resolveRuntimeState(body, current);

  validateReplacement(replacement, runtime);
  validateLaunchConfiguration({
    launch,
    launchOperator: body.launchOperator,
    launchValue: typeof body.launchValue === 'string' ? body.launchValue : (body.launchValue === null ? null : current.launchValue),
    launchFlags: body.launchFlags,
    current,
  });

  assertValidValidatorPatternRegex(nextRegex, nextFlags);
  assertValidValidatorPatternReplacementRecipe(replacement.nextReplacementEnabled, replacement.nextReplacementValue);

  return {
    nextRegex,
    nextFlags,
    ...replacement,
    ...launch,
    ...runtime,
    nextAppliesToScopes: body.appliesToScopes ?? current.appliesToScopes,
    shouldPersistRuntimeConfig: Boolean(
      body.runtimeConfig !== undefined ||
        body.runtimeEnabled !== undefined ||
        body.runtimeType !== undefined
    ),
  };
};


interface ReplacementConfiguration {
  nextReplacementEnabled: boolean;
  nextReplacementValue: string | null;
  nextReplacementFields: string[];
  nextReplacementAppliesToScopes: string[];
}

const validateReplacement = (
  replacement: ReplacementConfiguration,
  runtime: { nextRuntimeEnabled: boolean; nextRuntimeType: ValidatorPatternRuntimeType }
): void => {
  if (
    replacement.nextReplacementEnabled === true &&
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

const buildReplacementInput = (
  body: UpdatePatternBody,
  state: ReturnType<typeof resolveValidatorPatternUpdateState>
): Pick<
  UpdateProductValidationPatternInput,
  'replacementEnabled' | 'replacementAutoApply' | 'skipNoopReplacementProposal' | 'replacementValue' | 'replacementFields' | 'replacementAppliesToScopes'
> => ({
  ...(body.replacementEnabled !== undefined && { replacementEnabled: state.nextReplacementEnabled }),
  ...(body.replacementAutoApply !== undefined && { replacementAutoApply: body.replacementAutoApply }),
  ...(body.skipNoopReplacementProposal !== undefined && {
    skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(body.skipNoopReplacementProposal),
  }),
  ...(body.replacementValue !== undefined && { replacementValue: state.nextReplacementValue }),
  ...(body.replacementFields !== undefined && { replacementFields: state.nextReplacementFields }),
  ...(body.replacementAppliesToScopes !== undefined && { replacementAppliesToScopes: state.nextReplacementAppliesToScopes }),
});

const buildRuntimeAndLaunchInput = (
  body: UpdatePatternBody,
  state: ReturnType<typeof resolveValidatorPatternUpdateState>
): Pick<
  UpdateProductValidationPatternInput,
  'runtimeEnabled' | 'runtimeType' | 'runtimeConfig' | 'launchEnabled' | 'launchAppliesToScopes' | 'launchScopeBehavior' | 'launchSourceMode' | 'launchSourceField' | 'launchOperator' | 'launchValue' | 'launchFlags'
> => ({
  ...(body.runtimeEnabled !== undefined && { runtimeEnabled: state.nextRuntimeEnabled }),
  ...(body.runtimeType !== undefined && { runtimeType: state.nextRuntimeType }),
  ...(state.shouldPersistRuntimeConfig && { runtimeConfig: state.nextRuntimeConfig }),
  ...(body.launchEnabled !== undefined && { launchEnabled: state.nextLaunchEnabled }),
  ...(body.launchAppliesToScopes !== undefined && { launchAppliesToScopes: state.nextLaunchAppliesToScopes }),
  ...(body.launchScopeBehavior !== undefined && { launchScopeBehavior: state.nextLaunchScopeBehavior }),
  ...(body.launchSourceMode !== undefined && { launchSourceMode: state.nextLaunchSourceMode }),
  ...(body.launchSourceField !== undefined && { launchSourceField: state.nextLaunchSourceField }),
  ...(body.launchOperator !== undefined && { launchOperator: body.launchOperator }),
  ...(body.launchValue !== undefined && {
    launchValue: typeof body.launchValue === 'string' ? body.launchValue : null,
  }),
  ...(body.launchFlags !== undefined && { launchFlags: body.launchFlags?.trim() ?? null }),
});

const buildBehavioralInput = (
  body: UpdatePatternBody
): Pick<UpdateProductValidationPatternInput, 'postAcceptBehavior' | 'denyBehaviorOverride'> => ({
  ...(body.postAcceptBehavior !== undefined && { postAcceptBehavior: body.postAcceptBehavior }),
  ...(body.denyBehaviorOverride !== undefined && {
    denyBehaviorOverride: normalizeProductValidationPatternDenyBehaviorOverride(body.denyBehaviorOverride),
  }),
});

const buildSequenceInput = (
  body: UpdatePatternBody
): Pick<
  UpdateProductValidationPatternInput,
  'validationDebounceMs' | 'sequenceGroupId' | 'sequenceGroupLabel' | 'sequenceGroupDebounceMs' | 'sequence' | 'chainMode' | 'maxExecutions' | 'passOutputToNext'
> => ({
  ...(body.validationDebounceMs !== undefined && { validationDebounceMs: body.validationDebounceMs }),
  ...(body.sequenceGroupId !== undefined && { sequenceGroupId: body.sequenceGroupId?.trim() ?? null }),
  ...(body.sequenceGroupLabel !== undefined && { sequenceGroupLabel: body.sequenceGroupLabel?.trim() ?? null }),
  ...(body.sequenceGroupDebounceMs !== undefined && { sequenceGroupDebounceMs: body.sequenceGroupDebounceMs }),
  ...(body.sequence !== undefined && { sequence: body.sequence }),
  ...(body.chainMode !== undefined && { chainMode: body.chainMode }),
  ...(body.maxExecutions !== undefined && { maxExecutions: body.maxExecutions }),
  ...(body.passOutputToNext !== undefined && { passOutputToNext: body.passOutputToNext }),
});

const buildSequenceAndAuditInput = (
  body: UpdatePatternBody,
  state: ReturnType<typeof resolveValidatorPatternUpdateState>
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
    expectedUpdatedAt: body.expectedUpdatedAt.trim().length > 0 ? body.expectedUpdatedAt.trim() : null,
  }),
});

const buildRegexInput = (body: UpdatePatternBody, state: ReturnType<typeof resolveValidatorPatternUpdateState>): Pick<UpdateProductValidationPatternInput, 'regex' | 'flags'> => ({
  ...(body.regex !== undefined && { regex: state.nextRegex }),
  ...(body.flags !== undefined && { flags: state.nextFlags }),
});

export const buildValidatorPatternUpdateInput = (
  body: UpdatePatternBody,
  state: ReturnType<typeof resolveValidatorPatternUpdateState>
): UpdateProductValidationPatternInput => {
  const metadata = buildBasicMetadataInput(body);
  const regexData = buildRegexInput(body, state);
  const replacementData = buildReplacementInput(body, state);
  const runtimeData = buildRuntimeAndLaunchInput(body, state);
  const sequenceData = buildSequenceAndAuditInput(body, state);

  return {
    ...metadata,
    ...regexData,
    ...replacementData,
    ...runtimeData,
    ...sequenceData,
  };
};
