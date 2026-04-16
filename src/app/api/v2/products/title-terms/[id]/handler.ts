import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getTitleTermRepository } from '@/features/products/server';
import {
  type ProductTitleTermType,
  updateProductTitleTermSchema,
} from '@/shared/contracts/products/title-terms';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { conflictError, notFoundError, validationError } from '@/shared/errors/app-error';

export { updateProductTitleTermSchema as titleTermUpdateSchema };

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Title term id is required'),
});

const parseTitleTermId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }

  return parsed.data.id;
};

export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = parseTitleTermId(params);
  const repository = await getTitleTermRepository();
  const current = await repository.getTitleTermById(id);

  if (!current) {
    throw notFoundError('Title term not found', { titleTermId: id });
  }

  const data = ctx.body as z.infer<typeof updateProductTitleTermSchema>;
  const nextCatalogId = data.catalogId ?? current.catalogId;
  const nextType: ProductTitleTermType = data.type ?? current.type;
  const nextNameEn = data.name_en ?? current.name_en;
  const existing = await repository.findByName(nextCatalogId, nextType, nextNameEn);

  if (existing && existing.id !== current.id) {
    throw conflictError('A title term with this English name already exists in this catalog', {
      catalogId: nextCatalogId,
      type: nextType,
      name_en: nextNameEn,
      titleTermId: existing.id,
    });
  }

  const updated = await repository.updateTitleTerm(id, data);
  return NextResponse.json(updated);
}

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = parseTitleTermId(params);
  const repository = await getTitleTermRepository();
  await repository.deleteTitleTerm(id);
  return NextResponse.json({ success: true });
}
