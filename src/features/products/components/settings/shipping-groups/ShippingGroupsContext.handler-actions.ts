'use client';

import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import {
  buildShippingGroupRuleConflicts,
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
  type ShippingGroupRuleConflict,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ShippingGroupHandlersArgs } from './ShippingGroupsContext.handlers';
import {
  formatShippingGroupConflictMessage,
  readConflictMetaFromApiError,
} from './shipping-group-utils';

type SaveValidationResult =
  | {
      ok: false;
      message: string;
    }
  | {
      ok: true;
      name: string;
      description: string | null;
      catalogId: string;
      traderaShippingCondition: string | null;
      traderaShippingPriceEur: number | null;
    };

const toNullableTrimmedString = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseOptionalShippingPrice = (value: string): SaveValidationResult => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return {
      ok: true,
      name: '',
      description: null,
      catalogId: '',
      traderaShippingCondition: null,
      traderaShippingPriceEur: null,
    };
  }

  const parsedShippingPrice = Number(trimmed);
  if (!Number.isFinite(parsedShippingPrice) || parsedShippingPrice < 0) {
    return {
      ok: false,
      message: 'Tradera shipping price must be a non-negative EUR amount.',
    };
  }

  return {
    ok: true,
    name: '',
    description: null,
    catalogId: '',
    traderaShippingCondition: null,
    traderaShippingPriceEur: parsedShippingPrice,
  };
};

const validateShippingGroupSave = (args: ShippingGroupHandlersArgs): SaveValidationResult => {
  const name = args.formData.name.trim();
  if (name.length === 0) return { ok: false, message: 'Shipping group name is required.' };

  const catalogId = args.formData.catalogId.trim();
  if (catalogId.length === 0) return { ok: false, message: 'Catalog is required.' };

  const shippingPrice = parseOptionalShippingPrice(args.formData.traderaShippingPriceEur);
  if (shippingPrice.ok === false) return shippingPrice;

  return {
    ok: true,
    name,
    catalogId,
    description: toNullableTrimmedString(args.formData.description),
    traderaShippingCondition: toNullableTrimmedString(args.formData.traderaShippingCondition),
    traderaShippingPriceEur: shippingPrice.traderaShippingPriceEur,
  };
};

const resolveDraftShippingGroupId = (shippingGroup: ProductShippingGroup | null): string =>
  shippingGroup?.id ?? '__draft-shipping-group__';

const formatRuleConflicts = (
  conflicts: ShippingGroupRuleConflict[],
  categoryLabelById: Map<string, string>,
  draftShippingGroupId: string
): string =>
  formatShippingGroupConflictMessage({
    conflicts,
    categoryLabelById,
    draftShippingGroupId,
  });

const resolveSaveErrorMessage = (error: unknown, args: ShippingGroupHandlersArgs): string => {
  const conflictMeta = readConflictMetaFromApiError(error);
  if (conflictMeta.length > 0) {
    return formatRuleConflicts(
      conflictMeta,
      args.modalCategoryLabelById,
      resolveDraftShippingGroupId(args.editingShippingGroup)
    );
  }
  if (error instanceof Error) return error.message;
  return 'Failed to save shipping group.';
};

const resolveSaveSuccessMessage = (shippingGroup: ProductShippingGroup | null): string =>
  shippingGroup === null ? 'Shipping group created.' : 'Shipping group updated.';

export const saveShippingGroup = async (args: ShippingGroupHandlersArgs): Promise<void> => {
  const validation = validateShippingGroupSave(args);
  if (validation.ok === false) {
    args.toast(validation.message, { variant: 'error' });
    return;
  }
  if (args.modalShippingGroupRuleConflicts.length > 0) {
    args.toast(
      formatRuleConflicts(
        args.modalShippingGroupRuleConflicts,
        args.modalCategoryLabelById,
        resolveDraftShippingGroupId(args.editingShippingGroup)
      ),
      { variant: 'error' }
    );
    return;
  }

  try {
    await args.saveShippingGroupMutation.mutateAsync({
      id: args.editingShippingGroup?.id,
      data: {
        name: validation.name,
        description: validation.description,
        catalogId: validation.catalogId,
        traderaShippingCondition: validation.traderaShippingCondition,
        traderaShippingPriceEur: validation.traderaShippingPriceEur,
        autoAssignCategoryIds: args.normalizedModalRuleIds,
        autoAssignCurrencyCodes: args.normalizedModalCurrencyCodes,
      },
    });
    args.toast(resolveSaveSuccessMessage(args.editingShippingGroup), { variant: 'success' });
    args.setShowModal(false);
    args.onRefresh();
  } catch (error) {
    logClientCatch(error, {
      source: 'ShippingGroupsSettings',
      action: 'saveShippingGroup',
      shippingGroupId: args.editingShippingGroup?.id,
    });
    args.toast(resolveSaveErrorMessage(error, args), { variant: 'error' });
  }
};

export const confirmShippingGroupDelete = async (
  args: ShippingGroupHandlersArgs
): Promise<void> => {
  const shippingGroupToDelete = args.shippingGroupToDelete;
  if (shippingGroupToDelete === null) return;

  try {
    await args.deleteShippingGroupMutation.mutateAsync({
      id: shippingGroupToDelete.id,
      catalogId: args.selectedCatalogId,
    });
    args.toast('Shipping group deleted.', { variant: 'success' });
    args.onRefresh();
  } catch (error) {
    logClientCatch(error, {
      source: 'ShippingGroupsSettings',
      action: 'deleteShippingGroup',
      shippingGroupId: shippingGroupToDelete.id,
    });
    args.toast(error instanceof Error ? error.message : 'Failed to delete shipping group.', {
      variant: 'error',
    });
  } finally {
    args.setShippingGroupToDelete(null);
  }
};

const resolveRepairConflicts = (
  args: ShippingGroupHandlersArgs,
  shippingGroup: ProductShippingGroup,
  normalizedRuleIds: string[]
): ShippingGroupRuleConflict[] => {
  const repairedShippingGroups = args.shippingGroups.map((group) =>
    group.id === shippingGroup.id ? { ...group, autoAssignCategoryIds: normalizedRuleIds } : group
  );
  return buildShippingGroupRuleConflicts({
    shippingGroups: repairedShippingGroups,
    categories: args.selectedCatalogCategories,
    availableCurrencyCodes: args.selectedCatalogCurrencyCodes,
  }).filter((conflict) => conflict.groupIds.includes(shippingGroup.id));
};

const resolvePersistedShippingPrice = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const resolveRepairSuccessMessage = (
  shippingGroup: ProductShippingGroup,
  normalizedRuleIds: string[]
): string => {
  if (normalizedRuleIds.length > 0) return `Repaired auto-assign rule for ${shippingGroup.name}.`;
  return `Removed invalid auto-assign rule for ${shippingGroup.name}.`;
};

const resolveRepairErrorMessage = (
  error: unknown,
  args: ShippingGroupHandlersArgs,
  shippingGroup: ProductShippingGroup
): string => {
  const conflictMeta = readConflictMetaFromApiError(error);
  if (conflictMeta.length > 0) {
    return formatRuleConflicts(
      conflictMeta,
      args.selectedCategoryLabelById,
      shippingGroup.id
    );
  }
  if (error instanceof Error) return error.message;
  return 'Failed to repair shipping group rule.';
};

export const repairShippingGroupRule = async (
  args: ShippingGroupHandlersArgs,
  shippingGroup: ProductShippingGroup
): Promise<void> => {
  const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
    categoryIds: shippingGroup.autoAssignCategoryIds,
    categories: args.selectedCatalogCategories,
  });
  const repairConflicts = resolveRepairConflicts(args, shippingGroup, normalizedRuleIds);
  if (repairConflicts.length > 0) {
    args.toast(
      formatRuleConflicts(repairConflicts, args.selectedCategoryLabelById, shippingGroup.id),
      { variant: 'error' }
    );
    return;
  }

  try {
    await args.saveShippingGroupMutation.mutateAsync({
      id: shippingGroup.id,
      data: {
        name: shippingGroup.name,
        description: shippingGroup.description ?? null,
        catalogId: shippingGroup.catalogId,
        traderaShippingCondition: shippingGroup.traderaShippingCondition ?? null,
        traderaShippingPriceEur: resolvePersistedShippingPrice(
          shippingGroup.traderaShippingPriceEur
        ),
        autoAssignCategoryIds: normalizedRuleIds,
        autoAssignCurrencyCodes: normalizeShippingGroupRuleCurrencyCodes({
          currencyCodes: shippingGroup.autoAssignCurrencyCodes,
          availableCurrencyCodes: args.selectedCatalogCurrencyCodes,
        }),
      },
    });
    args.toast(resolveRepairSuccessMessage(shippingGroup, normalizedRuleIds), {
      variant: 'success',
    });
    args.onRefresh();
  } catch (error) {
    logClientCatch(error, {
      source: 'ShippingGroupsSettings',
      action: 'repairShippingGroupRule',
      shippingGroupId: shippingGroup.id,
    });
    args.toast(resolveRepairErrorMessage(error, args, shippingGroup), { variant: 'error' });
  }
};
