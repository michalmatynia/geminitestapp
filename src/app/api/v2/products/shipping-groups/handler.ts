import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getShippingGroupRepository } from '@/features/products/server';
import { createProductShippingGroupSchema } from '@/shared/contracts/products';
export { createProductShippingGroupSchema as productShippingGroupCreateSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import { catalogIdQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

export const querySchema = catalogIdQuerySchema;

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const catalogId = query.catalogId;

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const repository = await getShippingGroupRepository();
  const shippingGroups = await repository.listShippingGroups({ catalogId });

  return NextResponse.json(shippingGroups);
}

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof createProductShippingGroupSchema>;
  const { name, catalogId } = data;

  const repository = await getShippingGroupRepository();
  const existing = await repository.findByName(catalogId, name);

  if (existing) {
    throw conflictError('A shipping group with this name already exists in this catalog', {
      name,
      catalogId,
    });
  }

  const shippingGroup = await repository.createShippingGroup({
    name,
    description: data.description ?? null,
    catalogId,
    traderaShippingCondition: data.traderaShippingCondition ?? null,
  });

  return NextResponse.json(shippingGroup, { status: 201 });
}
