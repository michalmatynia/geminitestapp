import type React from 'react';

import type {
  useDeleteShippingGroupMutation,
  useSaveShippingGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';
import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import type { useToast } from '@/shared/ui/toast';

import type { useShippingGroupsModalState } from './ShippingGroupsContext.state';

export type ShippingGroupToast = ReturnType<typeof useToast>['toast'];
export type ShippingGroupSaveMutation = ReturnType<typeof useSaveShippingGroupMutation>;
export type ShippingGroupDeleteMutation = ReturnType<typeof useDeleteShippingGroupMutation>;
export type ShippingGroupRuleCoverage = ReturnType<
  typeof useShippingGroupsModalState
>['modalRuleCoverage'];

export type ShippingGroupsStateValue = {
  loading: boolean;
  shippingGroups: ProductShippingGroup[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string | null) => void;
  onRefresh: () => void;
  toast: ShippingGroupToast;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingShippingGroup: ProductShippingGroup | null;
  shippingGroupToDelete: ProductShippingGroup | null;
  setShippingGroupToDelete: (group: ProductShippingGroup | null) => void;
  formData: ShippingGroupFormData;
  setFormData: React.Dispatch<React.SetStateAction<ShippingGroupFormData>>;
  selectedCatalogCategories: ProductCategory[];
  loadingSelectedCatalogCategories: boolean;
  modalCatalogCategories: ProductCategory[];
  loadingModalCatalogCategories: boolean;
  modalCatalogShippingGroups: ProductShippingGroup[];
  loadingModalCatalogShippingGroups: boolean;
  saveShippingGroupMutation: ShippingGroupSaveMutation;
  deleteShippingGroupMutation: ShippingGroupDeleteMutation;
  normalizedModalRuleIds: string[];
  normalizedModalCurrencyCodes: string[];
  redundantModalRuleIds: string[];
  openCreateModal: () => void;
  openEditModal: (shippingGroup: ProductShippingGroup) => void;
  handleSave: () => Promise<void>;
  handleDelete: (shippingGroup: ProductShippingGroup) => void;
  handleConfirmDelete: () => Promise<void>;
  handleRepairRule: (shippingGroup: ProductShippingGroup) => Promise<void>;
  handleRepairAllSafeRules: () => Promise<void>;
  catalogOptions: LabeledOptionDto<string>[];
  selectedCategoryLabelById: Map<string, string>;
  modalCategoryLabelById: Map<string, string>;
  modalCategoryOptions: LabeledOptionDto<string>[];
  modalCurrencyOptions: LabeledOptionDto<string>[];
  shippingGroupConflictSummaryById: Map<string, string | null>;
  shippingGroupEffectiveRuleDisplayById: Map<string, string>;
  shippingGroupRedundantRuleSummaryById: Map<string, string | null>;
  shippingGroupMissingRuleSummaryById: Map<string, string | null>;
  shippingGroupsWithRepairAvailable: ProductShippingGroup[];
  modalShippingGroupRuleConflicts: ShippingGroupRuleConflict[];
  modalRuleCoverage: ShippingGroupRuleCoverage;
  redundantModalRuleSummary: string | null;
  normalizedModalRuleSummary: string | null;
  normalizedModalCurrencySummary: string | null;
  missingModalRuleSummary: string | null;
  shouldShowNormalizedModalRuleSummary: boolean;
};
