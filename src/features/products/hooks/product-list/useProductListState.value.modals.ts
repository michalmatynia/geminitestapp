import type { ProductListStateReturn } from './useProductListState.types';
import type { ProductListValueInput } from './useProductListState.value.types';

export type ProductListModalValue = Pick<
  ProductListStateReturn,
  | 'createDraft'
  | 'editingProduct'
  | 'exportSettingsProduct'
  | 'handleConfirmSku'
  | 'initialCatalogId'
  | 'initialSku'
  | 'integrationsFilterIntegrationSlug'
  | 'integrationsProduct'
  | 'integrationsRecoveryContext'
  | 'isCreateOpen'
  | 'isEditHydrating'
  | 'isPromptOpen'
  | 'listProductPreset'
  | 'massListIntegration'
  | 'massListProductIds'
  | 'onCloseCreate'
  | 'onCloseEdit'
  | 'onCloseExportSettings'
  | 'onCloseIntegrationModal'
  | 'onCloseIntegrations'
  | 'onCloseListProduct'
  | 'onCloseMassList'
  | 'onCreateSuccess'
  | 'onEditSave'
  | 'onEditSuccess'
  | 'onListProductSuccess'
  | 'onListingsUpdated'
  | 'onMassListSuccess'
  | 'onSelectIntegrationFromModal'
  | 'onStartListing'
  | 'setIsPromptOpen'
  | 'showIntegrationModal'
  | 'showListProductModal'
>;

const resolveInitialCatalogId = (catalogFilter: string): string | null =>
  catalogFilter !== 'all' && catalogFilter !== 'unassigned' ? catalogFilter : null;

export const buildModalValue = ({
  callbacks,
  data,
  modal,
}: ProductListValueInput): ProductListModalValue => ({
  isCreateOpen: modal.operations.isCreateOpen,
  isPromptOpen: modal.operations.isPromptOpen,
  setIsPromptOpen: modal.operations.setIsPromptOpen,
  handleConfirmSku: modal.operations.handleConfirmSku,
  initialSku: modal.operations.initialSku,
  createDraft: modal.modals.createDraft,
  initialCatalogId: resolveInitialCatalogId(data.productData.catalogFilter),
  onCloseCreate: callbacks.handleCloseCreateModal,
  onCreateSuccess: callbacks.handleCreateSuccessWithDraftReset,
  editingProduct: modal.operations.editingProduct,
  isEditHydrating: modal.hydration.isEditHydrating,
  onCloseEdit: modal.hydration.handleCloseEdit,
  onEditSuccess: modal.operations.handleEditSuccess,
  onEditSave: modal.operations.handleEditSave,
  integrationsProduct: modal.modals.integrationsProduct,
  integrationsRecoveryContext: modal.modals.integrationsRecoveryContext,
  integrationsFilterIntegrationSlug: modal.modals.integrationsFilterIntegrationSlug,
  onCloseIntegrations: modal.modals.handleCloseIntegrations,
  onStartListing: modal.modals.handleStartListing,
  showListProductModal: modal.modals.showListProductModal,
  onCloseListProduct: modal.modals.handleCloseListProduct,
  onListProductSuccess: modal.modals.handleListProductSuccess,
  listProductPreset: modal.modals.listProductPreset,
  exportSettingsProduct: modal.modals.exportSettingsProduct,
  onCloseExportSettings: callbacks.handleCloseExportSettingsModal,
  onListingsUpdated: callbacks.handleListingsUpdated,
  massListIntegration: modal.modals.massListIntegration,
  massListProductIds: modal.modals.massListProductIds,
  onCloseMassList: modal.modals.handleCloseMassList,
  onMassListSuccess: modal.modals.handleMassListSuccess,
  showIntegrationModal: modal.modals.showIntegrationModal,
  onCloseIntegrationModal: modal.modals.handleCloseIntegrationModal,
  onSelectIntegrationFromModal: modal.modals.handleSelectIntegrationFromModal,
});
