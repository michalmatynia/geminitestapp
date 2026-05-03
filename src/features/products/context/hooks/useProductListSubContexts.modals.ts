import { useMemo } from 'react';

import type { ProductListModalsContextType } from '../ProductListContext.types';
import type { ProductListSubContextsInput } from './useProductListSubContexts.types';

const buildProductListModalsValue = (
  value: ProductListSubContextsInput
): ProductListModalsContextType => ({
  isCreateOpen: value.isCreateOpen,
  isPromptOpen: value.isPromptOpen,
  setIsPromptOpen: value.setIsPromptOpen,
  handleConfirmSku: value.handleConfirmSku,
  initialSku: value.initialSku,
  createDraft: value.createDraft,
  initialCatalogId: value.initialCatalogId,
  onCloseCreate: value.onCloseCreate,
  onCreateSuccess: value.onCreateSuccess,
  editingProduct: value.editingProduct,
  isEditHydrating: value.isEditHydrating,
  onCloseEdit: value.onCloseEdit,
  onEditSuccess: value.onEditSuccess,
  onEditSave: value.onEditSave,
  integrationsProduct: value.integrationsProduct,
  integrationsRecoveryContext: value.integrationsRecoveryContext,
  integrationsFilterIntegrationSlug: value.integrationsFilterIntegrationSlug,
  onCloseIntegrations: value.onCloseIntegrations,
  onStartListing: value.onStartListing,
  showListProductModal: value.showListProductModal,
  onCloseListProduct: value.onCloseListProduct,
  onListProductSuccess: value.onListProductSuccess,
  listProductPreset: value.listProductPreset,
  exportSettingsProduct: value.exportSettingsProduct,
  onCloseExportSettings: value.onCloseExportSettings,
  onListingsUpdated: value.onListingsUpdated,
  massListIntegration: value.massListIntegration,
  massListProductIds: value.massListProductIds,
  onCloseMassList: value.onCloseMassList,
  onMassListSuccess: value.onMassListSuccess,
  showIntegrationModal: value.showIntegrationModal,
  onCloseIntegrationModal: value.onCloseIntegrationModal,
  onSelectIntegrationFromModal: value.onSelectIntegrationFromModal,
});

const getProductListModalsDependencies = (
  value: ProductListSubContextsInput
): React.DependencyList => [
  value.isCreateOpen, value.isPromptOpen, value.setIsPromptOpen, value.handleConfirmSku,
  value.initialSku, value.createDraft, value.initialCatalogId, value.onCloseCreate,
  value.onCreateSuccess, value.editingProduct, value.isEditHydrating, value.onCloseEdit,
  value.onEditSuccess, value.onEditSave, value.integrationsProduct, value.integrationsRecoveryContext,
  value.integrationsFilterIntegrationSlug, value.onCloseIntegrations, value.onStartListing,
  value.showListProductModal, value.onCloseListProduct, value.onListProductSuccess,
  value.listProductPreset, value.exportSettingsProduct, value.onCloseExportSettings,
  value.onListingsUpdated, value.massListIntegration, value.massListProductIds,
  value.onCloseMassList, value.onMassListSuccess, value.showIntegrationModal,
  value.onCloseIntegrationModal, value.onSelectIntegrationFromModal,
];

export function useProductListModalsValue(
  value: ProductListSubContextsInput
): ProductListModalsContextType {
  return useMemo(
    () => buildProductListModalsValue(value),
    getProductListModalsDependencies(value)
  );
}
