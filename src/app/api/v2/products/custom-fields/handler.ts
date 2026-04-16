import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService, getCustomFieldRepository } from '@/features/products/server';
import {
  createProductCustomFieldDefinitionSchema,
  productCustomFieldOptionInputSchema,
  productCustomFieldTypeSchema,
} from '@/shared/contracts/products/custom-fields';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { conflictError } from '@/shared/errors/app-error';

const withCheckboxOptionValidation = <TSchema extends z.ZodTypeAny>(schema: TSchema): TSchema =>
  schema.superRefine((value: unknown, ctx: z.RefinementCtx) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const record = value as { type?: unknown; options?: unknown };
    if (record.type !== 'checkbox_set') return;
    if (!Array.isArray(record.options) || record.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Checkbox sets require at least one checkbox option.',
      });
    }
  });

const freshQuerySchema = z.preprocess(
  (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
      return false;
    }
    return value;
  },
  z.boolean().optional()
);

export const querySchema = z.object({
  fresh: freshQuerySchema.optional(),
});

export const productCustomFieldCreateSchema = withCheckboxOptionValidation(
  createProductCustomFieldDefinitionSchema.extend({
    type: productCustomFieldTypeSchema.default('text'),
    options: z.array(productCustomFieldOptionInputSchema).default([]),
  })
);

/**
 * GET /api/v2/products/custom-fields
 * Fetches all custom product field definitions.
 */
export async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse({
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  });

  const fields = query.fresh
    ? await (async () => {
        const repository = await getCustomFieldRepository();
        return repository.listCustomFields({});
      })()
    : await CachedProductService.listCustomFields();

  return NextResponse.json(fields);
}

/**
 * POST /api/v2/products/custom-fields
 * Creates a new custom product field definition.
 */
export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof productCustomFieldCreateSchema>;

  const repository = await getCustomFieldRepository();
  const existing = await repository.findByName(data.name);

  if (existing) {
    throw conflictError('A custom field with this name already exists.', {
      name: data.name,
    });
  }

  const customField = await repository.createCustomField({
    name: data.name,
    type: data.type,
    options: data.options,
  });

  CachedProductService.invalidateAll();

  return NextResponse.json(customField, { status: 201 });
}
