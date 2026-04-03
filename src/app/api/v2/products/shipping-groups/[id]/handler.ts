import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getShippingGroupRepository } from '@/features/products/server';
import {
  updateProductShippingGroupSchema,
  type ProductShippingGroup,
} from '@/shared/contracts/products';
export { updateProductShippingGroupSchema as productShippingGroupUpdateSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { conflictError, notFoundError, validationError } from '@/shared/errors/app-error';

import {
  normalizeShippingGroupRuleCategoryIdsForCatalog,
  validateShippingGroupRuleConflictsOrThrow,
} from '../rule-validation';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Shipping group id is required'),
});

const parseShippingGroupId = (params: { id: string }): string => {
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
  const shippingGroupId = parseShippingGroupId(params);
  const data = ctx.body as z.infer<typeof updateProductShippingGroupSchema>;
  const { name, catalogId } = data;

  const repository = await getShippingGroupRepository();
  const current = await repository.getShippingGroupById(shippingGroupId);

  if (!current) {
    throw notFoundError('Shipping group not found', { shippingGroupId });
  }

  const nextCatalogId = catalogId ?? current.catalogId;
  const normalizedAutoAssignCategoryIds =
    data.autoAssignCategoryIds !== undefined
      ? await normalizeShippingGroupRuleCategoryIdsForCatalog({
          catalogId: nextCatalogId,
          categoryIds: data.autoAssignCategoryIds,
        })
      : undefined;

  if (name !== undefined) {
    const existing = await repository.findByName(nextCatalogId, name);
    if (existing && existing.id !== shippingGroupId) {
      throw conflictError('A shipping group with this name already exists in this catalog', {
        name,
        catalogId: nextCatalogId,
      });
    }
  }

  if (catalogId !== undefined || data.autoAssignCategoryIds !== undefined) {
    await validateShippingGroupRuleConflictsOrThrow({
      draftShippingGroup: {
        id: current.id,
        name: name ?? current.name,
        description: data.description !== undefined ? data.description : (current.description ?? null),
        catalogId: nextCatalogId,
        traderaShippingCondition:
          data.traderaShippingCondition !== undefined
            ? data.traderaShippingCondition
            : (current.traderaShippingCondition ?? null),
        traderaShippingPriceEur:
          data.traderaShippingPriceEur !== undefined
            ? data.traderaShippingPriceEur
            : (current.traderaShippingPriceEur ?? null),
        autoAssignCategoryIds:
          normalizedAutoAssignCategoryIds !== undefined
            ? normalizedAutoAssignCategoryIds
            : (current.autoAssignCategoryIds ?? []),
      } satisfies ProductShippingGroup,
      ignoredShippingGroupIds: [shippingGroupId],
    });
  }

  const shippingGroup = await repository.updateShippingGroup(shippingGroupId, {
    ...(name !== undefined && { name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(catalogId !== undefined && { catalogId }),
    ...(data.traderaShippingCondition !== undefined && {
      traderaShippingCondition: data.traderaShippingCondition,
    }),
    ...(data.traderaShippingPriceEur !== undefined && {
      traderaShippingPriceEur: data.traderaShippingPriceEur,
    }),
    ...(normalizedAutoAssignCategoryIds !== undefined && {
      autoAssignCategoryIds: normalizedAutoAssignCategoryIds,
    }),
  });

  return NextResponse.json(shippingGroup);
}

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getShippingGroupRepository();
  const shippingGroupId = parseShippingGroupId(params);
  await repository.deleteShippingGroup(shippingGroupId);
  return NextResponse.json({ success: true });
}
