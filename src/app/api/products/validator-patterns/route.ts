export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import { getValidationPatternRepository } from '@/features/products/server';
import {
  invalidateValidationPatternRuntimeCache,
  listValidationPatternsCached,
} from '@/features/products/services/validation-pattern-runtime-cache';
import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationSkipNoopReplacementProposal,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
} from '@/features/products/utils/validator-instance-behavior';
import { validateRegexSafety } from '@/features/products/utils/validator-regex-safety';
import { parseDynamicReplacementRecipe } from '@/features/products/utils/validator-replacement-recipe';
import { validateAndNormalizeRuntimeConfig } from '@/features/products/validations/validator-runtime-config';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const replacementFieldSchema = z.enum(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const createPatternSchema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  target: z.enum([
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
  ]),
  locale: z.string().trim().nullable().optional(),
  regex: z.string().min(1, 'Regex is required'),
  flags: z.string().trim().nullable().optional(),
  message: z.string().trim().min(1, 'Message is required'),
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
});

const assertValidRegex = (regexSource: string, flags: string | null | undefined): void => {
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
    // Compile once on write to avoid persisting invalid rules.
    void new RegExp(regexSource, normalizedFlags);
  } catch (error) {
    throw badRequestError('Invalid regex or flags', {
      regex: regexSource,
      flags: flags ?? null,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};

const assertValidReplacementRecipe = (
  replacementEnabled: boolean,
  replacementValue: string | null,
): void => {
  if (!replacementEnabled || !replacementValue) return;
  const recipe = parseDynamicReplacementRecipe(replacementValue);
  if (!recipe) return;

  if (recipe.sourceRegex) {
    assertValidRegex(recipe.sourceRegex, recipe.sourceFlags ?? null);
  }
  if (recipe.logicOperator === 'regex') {
    if (!recipe.logicOperand) {
      throw badRequestError('Dynamic replacement regex condition requires an operand.');
    }
    assertValidRegex(recipe.logicOperand, recipe.logicFlags ?? null);
  }
};

const assertValidLaunchConfig = ({
  launchEnabled,
  launchOperator,
  launchValue,
  launchFlags,
}: {
  launchEnabled: boolean;
  launchOperator: z.infer<typeof createPatternSchema>['launchOperator'] | undefined;
  launchValue: string | null;
  launchFlags: string | null;
}): void => {
  if (!launchEnabled || launchOperator !== 'regex') return;
  if (!launchValue) {
    throw badRequestError('launchValue is required when launchOperator is regex.');
  }
  assertValidRegex(launchValue, launchFlags);
};

const normalizeReplacementFields = (fields: string[] | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  return [...new Set(fields)];
};

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const patterns = await listValidationPatternsCached();
  return NextResponse.json(patterns);
}

async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof createPatternSchema>;
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
  const replacementFields = normalizeReplacementFields(body.replacementFields);
  const replacementAppliesToScopes = normalizeProductValidationPatternReplacementScopes(
    body.replacementAppliesToScopes,
    body.appliesToScopes
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
  );
  const validationDebounceMs = body.validationDebounceMs ?? 0;
  const sequenceGroupId = body.sequenceGroupId?.trim() || null;
  const sequenceGroupLabel = body.sequenceGroupLabel?.trim() || null;
  const sequenceGroupDebounceMs = body.sequenceGroupDebounceMs ?? 0;
  const launchEnabled = body.launchEnabled ?? false;
  const launchAppliesToScopes = normalizeProductValidationPatternLaunchScopes(
    body.launchAppliesToScopes,
    body.appliesToScopes
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
  if (replacementEnabled && !replacementValue) {
    throw badRequestError('replacementValue is required when replacementEnabled is true');
  }
  if (launchEnabled && launchSourceMode !== 'current_field' && !launchSourceField) {
    throw badRequestError('launchSourceField is required when launchSourceMode is not current_field');
  }

  assertValidRegex(regex, flags);
  assertValidReplacementRecipe(replacementEnabled, replacementValue);
  assertValidLaunchConfig({
    launchEnabled,
    launchOperator,
    launchValue,
    launchFlags,
  });
  const repository = await getValidationPatternRepository();
  const pattern = await repository.createPattern({
    label,
    target: body.target,
    locale,
    regex,
    flags,
    message,
    severity: body.severity ?? 'error',
    enabled: body.enabled ?? true,
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
    sequence: body.sequence ?? null,
    chainMode: body.chainMode ?? 'continue',
    maxExecutions: body.maxExecutions ?? 1,
    passOutputToNext: body.passOutputToNext ?? true,
    launchEnabled,
    launchAppliesToScopes,
    launchScopeBehavior,
    launchSourceMode,
    launchSourceField,
    launchOperator,
    launchValue,
    launchFlags,
    appliesToScopes,
  });

  invalidateValidationPatternRuntimeCache();

  return NextResponse.json(pattern, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: 'products.validator-patterns.GET',
    cacheControl: 'no-store',
  },
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  {
    source: 'products.validator-patterns.POST',
    parseJsonBody: true,
    bodySchema: createPatternSchema,
  },
);
