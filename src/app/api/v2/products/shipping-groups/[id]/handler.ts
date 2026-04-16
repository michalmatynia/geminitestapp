import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { getShippingGroupRepository } from '@/features/products/server';
import { updateProductShippingGroupSchema } from '@/shared/contracts/products/shipping-groups';
export { updateProductShippingGroupSchema as productShippingGroupUpdateSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';

import {
  normalizeShippingGroupRuleCategoryIdsForCatalog,
  validateShippingGroupRuleConflictsOrThrow,
} from '../rule-validation';
import {
  assertAvailableShippingGroupName,
  buildShippingGroupNameLookupInput,
  buildShippingGroupUpdateInput,
  buildShippingGroupValidationDraft,
  parseShippingGroupId,
  shouldValidateShippingGroupRuleConflicts,
} from './handler.helpers';

export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const shippingGroupId = parseShippingGroupId(params);
  const data = ctx.body as z.infer<typeof updateProductShippingGroupSchema>;

  const repository = await getShippingGroupRepository();
  const current = await repository.getShippingGroupById(shippingGroupId);

  if (!current) {
    throw notFoundError('Shipping group not found', { shippingGroupId });
  }

  const nextCatalogId = data.catalogId ?? current.catalogId;
  const normalizedAutoAssignCategoryIds =
    data.autoAssignCategoryIds !== undefined
      ? await normalizeShippingGroupRuleCategoryIdsForCatalog({
          catalogId: nextCatalogId,
          categoryIds: data.autoAssignCategoryIds,
        })
      : undefined;

  const lookup = buildShippingGroupNameLookupInput(current, data);
  if (lookup) {
    const existing = await repository.findByName(lookup.catalogId, lookup.name);
    assertAvailableShippingGroupName(existing, shippingGroupId, lookup);
  }

  if (shouldValidateShippingGroupRuleConflicts(data)) {
    await validateShippingGroupRuleConflictsOrThrow({
      draftShippingGroup: buildShippingGroupValidationDraft(
        current,
        data,
        normalizedAutoAssignCategoryIds,
        data.autoAssignCurrencyCodes
      ),
      ignoredShippingGroupIds: [shippingGroupId],
    });
  }

  const shippingGroup = await repository.updateShippingGroup(
    shippingGroupId,
    buildShippingGroupUpdateInput(
      data,
      normalizedAutoAssignCategoryIds,
      data.autoAssignCurrencyCodes
    )
  );

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
