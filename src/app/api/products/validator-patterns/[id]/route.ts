export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import { getValidationPatternRepository } from '@/features/products/server';
import { parseDynamicReplacementRecipe } from '@/features/products/utils/validator-replacement-recipe';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const replacementFieldSchema = z.enum(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const updatePatternSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    target: z.enum(['name', 'description', 'sku', 'price', 'stock']).optional(),
    locale: z.string().trim().nullable().optional(),
    regex: z.string().min(1).optional(),
    flags: z.string().trim().nullable().optional(),
    message: z.string().trim().min(1).optional(),
    severity: z.enum(['error', 'warning']).optional(),
    enabled: z.boolean().optional(),
    replacementEnabled: z.boolean().optional(),
    replacementValue: z.string().trim().nullable().optional(),
    replacementFields: z.array(replacementFieldSchema).optional(),
    sequenceGroupId: z.string().trim().nullable().optional(),
    sequenceGroupLabel: z.string().trim().nullable().optional(),
    sequenceGroupDebounceMs: z.number().int().min(0).max(30000).optional(),
    sequence: z.number().int().min(0).nullable().optional(),
    chainMode: z.enum(['continue', 'stop_on_match', 'stop_on_replace']).optional(),
    maxExecutions: z.number().int().min(1).max(20).optional(),
    passOutputToNext: z.boolean().optional(),
    launchEnabled: z.boolean().optional(),
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
  })
  .refine(
    (value: Record<string, unknown>) => Object.keys(value).length > 0,
    'At least one field is required'
  );

const assertValidRegex = (regexSource: string, flags: string | null | undefined): void => {
  try {
    const normalizedFlags = flags?.trim() || undefined;
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
  launchOperator: z.infer<typeof updatePatternSchema>['launchOperator'] | undefined;
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

async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getValidationPatternRepository();
  const current = await repository.getPatternById(params.id);
  if (!current) {
    throw notFoundError('Validation pattern not found', { patternId: params.id });
  }

  const body = ctx.body as z.infer<typeof updatePatternSchema>;
  const nextRegex = (body.regex ?? current.regex).trim();
  const nextFlags = body.flags !== undefined ? body.flags?.trim() || null : current.flags;
  const nextReplacementEnabled =
    body.replacementEnabled !== undefined ? body.replacementEnabled : current.replacementEnabled;
  const nextReplacementValue =
    body.replacementValue !== undefined ? body.replacementValue?.trim() || null : current.replacementValue;
  const nextReplacementFields =
    body.replacementFields !== undefined
      ? normalizeReplacementFields(body.replacementFields)
      : current.replacementFields;
  const nextLaunchEnabled =
    body.launchEnabled !== undefined ? body.launchEnabled : current.launchEnabled;
  const nextLaunchSourceMode =
    body.launchSourceMode !== undefined ? body.launchSourceMode : current.launchSourceMode;
  const nextLaunchSourceField =
    body.launchSourceField !== undefined ? body.launchSourceField?.trim() || null : current.launchSourceField;
  if (nextReplacementEnabled && !nextReplacementValue) {
    throw badRequestError('replacementValue is required when replacementEnabled is true');
  }
  if (nextLaunchEnabled && nextLaunchSourceMode !== 'current_field' && !nextLaunchSourceField) {
    throw badRequestError('launchSourceField is required when launchSourceMode is not current_field');
  }
  assertValidRegex(nextRegex, nextFlags);
  assertValidReplacementRecipe(nextReplacementEnabled, nextReplacementValue);
  assertValidLaunchConfig({
    launchEnabled: nextLaunchEnabled,
    launchOperator: body.launchOperator ?? current.launchOperator,
    launchValue:
      body.launchValue !== undefined
        ? typeof body.launchValue === 'string'
          ? body.launchValue
          : null
        : current.launchValue,
    launchFlags: body.launchFlags !== undefined ? body.launchFlags?.trim() || null : current.launchFlags,
  });

  const updated = await repository.updatePattern(params.id, {
    ...(body.label !== undefined && { label: body.label.trim() }),
    ...(body.target !== undefined && { target: body.target }),
    ...(body.locale !== undefined && { locale: body.locale?.trim().toLowerCase() || null }),
    ...(body.regex !== undefined && { regex: nextRegex }),
    ...(body.flags !== undefined && { flags: nextFlags }),
    ...(body.message !== undefined && { message: body.message.trim() }),
    ...(body.severity !== undefined && { severity: body.severity }),
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.replacementEnabled !== undefined && { replacementEnabled: body.replacementEnabled }),
    ...(body.replacementValue !== undefined && { replacementValue: body.replacementValue?.trim() || null }),
    ...(body.replacementFields !== undefined && { replacementFields: nextReplacementFields }),
    ...(body.sequenceGroupId !== undefined && { sequenceGroupId: body.sequenceGroupId?.trim() || null }),
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
    ...(body.launchSourceMode !== undefined && { launchSourceMode: body.launchSourceMode }),
    ...(body.launchSourceField !== undefined && { launchSourceField: body.launchSourceField?.trim() || null }),
    ...(body.launchOperator !== undefined && { launchOperator: body.launchOperator }),
    ...(body.launchValue !== undefined && {
      launchValue: typeof body.launchValue === 'string' ? body.launchValue : null,
    }),
    ...(body.launchFlags !== undefined && { launchFlags: body.launchFlags?.trim() || null }),
  });

  return NextResponse.json(updated);
}

async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getValidationPatternRepository();
  await repository.deletePattern(params.id);
  return new Response(null, { status: 204 });
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.validator-patterns.[id].PUT',
  parseJsonBody: true,
  bodySchema: updatePatternSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'products.validator-patterns.[id].DELETE',
});
