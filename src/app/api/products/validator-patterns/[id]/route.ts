export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import { getValidationPatternRepository } from '@/features/products/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const replacementFieldSchema = z.enum(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const updatePatternSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    target: z.enum(['name', 'description']).optional(),
    locale: z.string().trim().nullable().optional(),
    regex: z.string().min(1).optional(),
    flags: z.string().trim().nullable().optional(),
    message: z.string().trim().min(1).optional(),
    severity: z.enum(['error', 'warning']).optional(),
    enabled: z.boolean().optional(),
    replacementEnabled: z.boolean().optional(),
    replacementValue: z.string().trim().nullable().optional(),
    replacementFields: z.array(replacementFieldSchema).optional(),
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
  if (nextReplacementEnabled && !nextReplacementValue) {
    throw badRequestError('replacementValue is required when replacementEnabled is true');
  }
  assertValidRegex(nextRegex, nextFlags);

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
