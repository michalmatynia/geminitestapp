'use client';

import type {
  useDeleteShippingGroupMutation,
  useSaveShippingGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';
import type { useToast } from '@/shared/ui/toast';
import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

import {
  confirmShippingGroupDelete,
  repairShippingGroupRule,
  saveShippingGroup,
} from './ShippingGroupsContext.handler-actions';

type ShippingGroupToast = ReturnType<typeof useToast>['toast'];
type ShippingGroupSaveMutation = ReturnType<typeof useSaveShippingGroupMutation>;
type ShippingGroupDeleteMutation = ReturnType<typeof useDeleteShippingGroupMutation>;

export type ShippingGroupHandlersArgs = {
  formData: ShippingGroupFormData;
  editingShippingGroup: ProductShippingGroup | null;
  modalShippingGroupRuleConflicts: ShippingGroupRuleConflict[];
  modalCategoryLabelById: Map<string, string>;
  saveShippingGroupMutation: ShippingGroupSaveMutation;
  deleteShippingGroupMutation: ShippingGroupDeleteMutation;
  normalizedModalRuleIds: string[];
  normalizedModalCurrencyCodes: string[];
  setShowModal: (show: boolean) => void;
  onRefresh: () => void;
  toast: ShippingGroupToast;
  shippingGroupToDelete: ProductShippingGroup | null;
  setShippingGroupToDelete: (group: ProductShippingGroup | null) => void;
  selectedCatalogId: string | null;
  selectedCatalogCategories: ProductCategory[];
  shippingGroups: ProductShippingGroup[];
  selectedCatalogCurrencyCodes: string[];
  selectedCategoryLabelById: Map<string, string>;
};

export type ShippingGroupHandlers = {
  handleSave: () => Promise<void>;
  handleDelete: (shippingGroup: ProductShippingGroup) => void;
  handleConfirmDelete: () => Promise<void>;
  handleRepairRule: (shippingGroup: ProductShippingGroup) => Promise<void>;
};

export const useShippingGroupHandlers = (
  args: ShippingGroupHandlersArgs
): ShippingGroupHandlers => ({
  handleSave: (): Promise<void> => saveShippingGroup(args),
  handleDelete: (shippingGroup: ProductShippingGroup): void => {
    args.setShippingGroupToDelete(shippingGroup);
  },
  handleConfirmDelete: (): Promise<void> => confirmShippingGroupDelete(args),
  handleRepairRule: (shippingGroup: ProductShippingGroup): Promise<void> =>
    repairShippingGroupRule(args, shippingGroup),
});
