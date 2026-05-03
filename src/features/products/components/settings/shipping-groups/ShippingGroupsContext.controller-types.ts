import type React from 'react';

import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';

import type { ShippingGroupHandlers } from './ShippingGroupsContext.handlers';
import type { useModalShippingGroupRuleConflicts } from './ShippingGroupsContext.modal-conflicts';
import type { useShippingGroupsModalState } from './ShippingGroupsContext.state';
import type { ShippingGroupSummaries } from './ShippingGroupsContext.summary-builders';
import type {
  ShippingGroupDeleteMutation,
  ShippingGroupSaveMutation,
  ShippingGroupToast,
} from './ShippingGroupsContext.types';

export type ShippingGroupsLocalState = {
  toast: ShippingGroupToast;
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  editingShippingGroup: ProductShippingGroup | null;
  setEditingShippingGroup: React.Dispatch<React.SetStateAction<ProductShippingGroup | null>>;
  shippingGroupToDelete: ProductShippingGroup | null;
  setShippingGroupToDelete: React.Dispatch<React.SetStateAction<ProductShippingGroup | null>>;
  formData: ShippingGroupFormData;
  setFormData: React.Dispatch<React.SetStateAction<ShippingGroupFormData>>;
};

export type ShippingGroupsQueryState = {
  selectedCatalogCategories: ProductCategory[];
  loadingSelectedCatalogCategories: boolean;
  modalCatalogCategories: ProductCategory[];
  loadingModalCatalogCategories: boolean;
  modalCatalogShippingGroups: ProductShippingGroup[];
  loadingModalCatalogShippingGroups: boolean;
};

export type ShippingGroupsSettingsState = {
  loading: boolean;
  shippingGroups: ProductShippingGroup[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string | null) => void;
  onRefresh: () => void;
  priceGroups: PriceGroup[];
};

export type ShippingGroupsSelectedState = {
  catalogCurrencyCodesByCatalogId: Map<string, string[]>;
  selectedCatalogCurrencyCodes: string[];
  selectedCategoryLabelById: Map<string, string>;
  summaries: ShippingGroupSummaries;
};

export type ShippingGroupsModalDerivedState = {
  normalizedModalRuleIds: string[];
  normalizedModalCurrencyCodes: string[];
  redundantModalRuleIds: string[];
  modalCategoryLabelById: Map<string, string>;
  modalShippingGroupRuleConflicts: ReturnType<typeof useModalShippingGroupRuleConflicts>;
  modalState: ReturnType<typeof useShippingGroupsModalState>;
};

export type ShippingGroupsMutations = {
  saveShippingGroupMutation: ShippingGroupSaveMutation;
  deleteShippingGroupMutation: ShippingGroupDeleteMutation;
};

export type ShippingGroupsActions = ShippingGroupHandlers & {
  openCreateModal: () => void;
  openEditModal: (shippingGroup: ProductShippingGroup) => void;
};
