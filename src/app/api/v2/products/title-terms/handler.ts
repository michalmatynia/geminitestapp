import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getTitleTermRepository } from '@/features/products/server';
import {
  createProductTitleTermSchema,
  productTitleTermTypeSchema,
} from '@/shared/contracts/products/title-terms';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { conflictError } from '@/shared/errors/app-error';

const optionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const querySchema = z.object({
  catalogId: z.preprocess(optionalTrimmedString, z.string().optional()),
  type: z.preprocess(optionalTrimmedString, productTitleTermTypeSchema.optional()),
  search: z.preprocess(optionalTrimmedString, z.string().optional()),
});

export async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse({
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  });
  const repository = await getTitleTermRepository();
  const titleTerms = await repository.listTitleTerms(query);
  return NextResponse.json(titleTerms);
}

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof createProductTitleTermSchema>;
  const repository = await getTitleTermRepository();
  const existing = await repository.findByName(data.catalogId, data.type, data.name_en);

  if (existing) {
    throw conflictError('A title term with this English name already exists in this catalog', {
      catalogId: data.catalogId,
      type: data.type,
      name_en: data.name_en,
      titleTermId: existing.id,
    });
  }

  const titleTerm = await repository.createTitleTerm({
    catalogId: data.catalogId,
    type: data.type,
    name_en: data.name_en,
    name_pl: data.name_pl ?? null,
  });

  return NextResponse.json(titleTerm, { status: 201 });
}
