import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService, getCustomFieldRepository } from '@/features/products/server';
import {
  productCustomFieldOptionInputSchema,
  productCustomFieldTypeSchema,
} from '@/shared/contracts/products/custom-fields';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { conflictError, notFoundError } from '@/shared/errors/app-error';

export const productCustomFieldUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    type: productCustomFieldTypeSchema.optional(),
    options: z.array(productCustomFieldOptionInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type !== 'checkbox_set') return;
    if (value.options !== undefined && value.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Checkbox sets require at least one checkbox option.',
      });
    }
  });

/**
 * PUT /api/v2/products/custom-fields/[id]
 * Updates a custom product field definition.
 */
export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id.trim();
  const data = ctx.body as z.infer<typeof productCustomFieldUpdateSchema>;

  const repository = await getCustomFieldRepository();
  const current = await repository.getCustomFieldById(id);

  if (!current) {
    throw notFoundError('Custom field not found', { customFieldId: id });
  }

  const nextType = data.type ?? current.type;
  const nextOptions = data.options ?? current.options;
  if (nextType === 'checkbox_set' && nextOptions.length === 0) {
    throw conflictError('Checkbox sets require at least one checkbox option.', {
      customFieldId: id,
    });
  }

  if (data.name !== undefined) {
    const existing = await repository.findByName(data.name);
    if (existing && existing.id !== id) {
      throw conflictError('A custom field with this name already exists.', {
        name: data.name,
      });
    }
  }

  const customField = await repository.updateCustomField(id, {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.type !== undefined ? { type: data.type } : {}),
    ...(data.options !== undefined ? { options: data.options } : {}),
  });

  CachedProductService.invalidateAll();

  return NextResponse.json(customField);
}

/**
 * DELETE /api/v2/products/custom-fields/[id]
 * Deletes a custom product field definition.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getCustomFieldRepository();
  await repository.deleteCustomField(params.id.trim());
  CachedProductService.invalidateAll();
  return NextResponse.json({ success: true });
}
