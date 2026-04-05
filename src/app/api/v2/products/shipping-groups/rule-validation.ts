import { getCategoryRepository, getShippingGroupRepository } from '@/features/products/server';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import { conflictError } from '@/shared/errors/app-error';
import {
  buildShippingGroupRuleConflicts,
  normalizeShippingGroupRuleCategoryIds,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const validateShippingGroupRuleConflictsOrThrow = async ({
  draftShippingGroup,
  ignoredShippingGroupIds = [],
}: {
  draftShippingGroup: ProductShippingGroup;
  ignoredShippingGroupIds?: string[];
}): Promise<void> => {
  const draftRuleIds = Array.isArray(draftShippingGroup.autoAssignCategoryIds)
    ? draftShippingGroup.autoAssignCategoryIds
        .map((categoryId) => toTrimmedString(categoryId))
        .filter(Boolean)
    : [];
  if (draftRuleIds.length === 0) {
    return;
  }

  const ignoredIds = new Set(
    [draftShippingGroup.id, ...ignoredShippingGroupIds]
      .map((shippingGroupId) => toTrimmedString(shippingGroupId))
      .filter(Boolean)
  );

  const [shippingGroupRepository, categoryRepository] = await Promise.all([
    getShippingGroupRepository(),
    getCategoryRepository(),
  ]);
  const [peerShippingGroups, categories] = await Promise.all([
    shippingGroupRepository.listShippingGroups({ catalogId: draftShippingGroup.catalogId }),
    categoryRepository.listCategories({ catalogId: draftShippingGroup.catalogId }),
  ]);
  const normalizedDraftRuleIds = normalizeShippingGroupRuleCategoryIds({
    categoryIds: draftRuleIds,
    categories,
  });

  const conflicts = buildShippingGroupRuleConflicts({
    shippingGroups: [
      {
        ...draftShippingGroup,
        autoAssignCategoryIds: normalizedDraftRuleIds,
      },
      ...peerShippingGroups.filter((shippingGroup) => !ignoredIds.has(toTrimmedString(shippingGroup.id))),
    ],
    categories,
  }).filter((conflict) => conflict.groupIds.includes(draftShippingGroup.id));

  if (conflicts.length === 0) {
    return;
  }

  throw conflictError(
    'This shipping group auto-assign rule overlaps with another shipping group in this catalog',
    {
      catalogId: draftShippingGroup.catalogId,
      shippingGroupId: draftShippingGroup.id,
      conflicts: conflicts.map((conflict) => ({
        groupIds: conflict.groupIds,
        groupNames: conflict.groupNames,
        overlapCategoryIds: conflict.overlapCategoryIds,
      })),
    }
  );
};

export const normalizeShippingGroupRuleCategoryIdsForCatalog = async ({
  catalogId,
  categoryIds,
}: {
  catalogId: string;
  categoryIds: readonly string[];
}): Promise<string[]> => {
  const categoryRepository = await getCategoryRepository();
  const categories = await categoryRepository.listCategories({ catalogId });

  return normalizeShippingGroupRuleCategoryIds({
    categoryIds,
    categories,
  });
};
