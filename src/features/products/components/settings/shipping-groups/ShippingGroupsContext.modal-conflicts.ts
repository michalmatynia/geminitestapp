'use client';

import { useMemo } from 'react';

import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  buildShippingGroupRuleConflicts,
  type ShippingGroupRuleConflict,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

import { DRAFT_SHIPPING_GROUP_ID } from './shipping-group-utils';

type ModalShippingGroupRuleConflictArgs = {
  editingShippingGroup: ProductShippingGroup | null;
  formData: ShippingGroupFormData;
  modalCatalogCategories: ProductCategory[];
  modalCatalogCurrencyCodes: string[];
  modalCatalogShippingGroups: ProductShippingGroup[];
  normalizedModalCurrencyCodes: string[];
  normalizedModalRuleIds: string[];
};

const toNullableTrimmedString = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveDraftName = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'This shipping group';
};

const parseOptionalShippingPrice = (value: string): number | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? Number(trimmed) : null;
};

const createDraftShippingGroup = ({
  editingShippingGroup,
  formData,
  normalizedModalCurrencyCodes,
  normalizedModalRuleIds,
}: Pick<
  ModalShippingGroupRuleConflictArgs,
  'editingShippingGroup' | 'formData' | 'normalizedModalCurrencyCodes' | 'normalizedModalRuleIds'
>): ProductShippingGroup => ({
  id: editingShippingGroup?.id ?? DRAFT_SHIPPING_GROUP_ID,
  name: resolveDraftName(formData.name),
  description: toNullableTrimmedString(formData.description),
  catalogId: formData.catalogId,
  traderaShippingCondition: toNullableTrimmedString(formData.traderaShippingCondition),
  traderaShippingPriceEur: parseOptionalShippingPrice(formData.traderaShippingPriceEur),
  autoAssignCategoryIds: normalizedModalRuleIds,
  autoAssignCurrencyCodes: normalizedModalCurrencyCodes,
});

const buildModalPeerShippingGroups = (
  shippingGroups: ProductShippingGroup[],
  draftShippingGroupId: string
): ProductShippingGroup[] =>
  shippingGroups.filter((shippingGroup) => shippingGroup.id !== draftShippingGroupId);

const resolveModalShippingGroupRuleConflicts = ({
  draftShippingGroup,
  modalCatalogCategories,
  modalCatalogCurrencyCodes,
  modalPeerShippingGroups,
}: {
  draftShippingGroup: ProductShippingGroup;
  modalCatalogCategories: ProductCategory[];
  modalCatalogCurrencyCodes: string[];
  modalPeerShippingGroups: ProductShippingGroup[];
}): ShippingGroupRuleConflict[] =>
  buildShippingGroupRuleConflicts({
    shippingGroups: [draftShippingGroup, ...modalPeerShippingGroups],
    categories: modalCatalogCategories,
    availableCurrencyCodes: modalCatalogCurrencyCodes,
  }).filter((conflict) => conflict.groupIds.includes(draftShippingGroup.id));

export const useModalShippingGroupRuleConflicts = ({
  editingShippingGroup,
  formData,
  modalCatalogCategories,
  modalCatalogCurrencyCodes,
  modalCatalogShippingGroups,
  normalizedModalCurrencyCodes,
  normalizedModalRuleIds,
}: ModalShippingGroupRuleConflictArgs): ShippingGroupRuleConflict[] =>
  useMemo(() => {
    if (formData.catalogId.length === 0 || normalizedModalRuleIds.length === 0) return [];
    const draftShippingGroup = createDraftShippingGroup({
      editingShippingGroup,
      formData,
      normalizedModalCurrencyCodes,
      normalizedModalRuleIds,
    });
    return resolveModalShippingGroupRuleConflicts({
      draftShippingGroup,
      modalCatalogCategories,
      modalCatalogCurrencyCodes,
      modalPeerShippingGroups: buildModalPeerShippingGroups(
        modalCatalogShippingGroups,
        draftShippingGroup.id
      ),
    });
  }, [
    editingShippingGroup,
    formData,
    modalCatalogCategories,
    modalCatalogCurrencyCodes,
    modalCatalogShippingGroups,
    normalizedModalCurrencyCodes,
    normalizedModalRuleIds,
  ]);
