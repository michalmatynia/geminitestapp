import type { ProductListStateReturn } from './useProductListState.types';
import type { ProductListValueInput } from './useProductListState.value.types';

export type ProductListActionValue = Pick<
  ProductListStateReturn,
  | 'activeDrafts'
  | 'actionError'
  | 'categoryNameById'
  | 'currencyCode'
  | 'imageExternalBaseUrl'
  | 'loadError'
  | 'onCreateFromDraft'
  | 'onCreateProduct'
  | 'onDismissActionError'
  | 'onDuplicateProduct'
  | 'onExportSettingsClick'
  | 'onIntegrationsClick'
  | 'onPrefetchProductDetail'
  | 'onProductDeleteClick'
  | 'onProductEditClick'
  | 'onProductNameClick'
  | 'priceGroups'
  | 'productNameKey'
  | 'setRefreshTrigger'
  | 'thumbnailSource'
>;

export const buildActionValue = ({
  callbacks,
  data,
  modal,
  runtime,
}: ProductListValueInput): ProductListActionValue => ({
  onCreateProduct: modal.modals.handleOpenCreate,
  onCreateFromDraft: callbacks.handleCreateFromDraftOpen,
  activeDrafts: data.activeDrafts,
  loadError: data.productData.loadError?.message ?? null,
  actionError: modal.operations.actionError,
  onDismissActionError: callbacks.handleDismissActionError,
  setRefreshTrigger: runtime.setRefreshTrigger,
  productNameKey: data.preferencesState.preferences.nameLocale,
  priceGroups: data.catalogState.priceGroups,
  currencyCode: data.catalogState.currencyCode,
  onPrefetchProductDetail: modal.hydration.prefetchProductDetail,
  onProductNameClick: modal.hydration.handleOpenEditModal,
  onProductEditClick: modal.hydration.handleOpenEditModal,
  onProductDeleteClick: modal.selection.setProductToDelete,
  onDuplicateProduct: callbacks.handleDuplicateProduct,
  onIntegrationsClick: modal.modals.handleOpenIntegrationsModal,
  onExportSettingsClick: modal.modals.handleOpenExportSettings,
  categoryNameById: data.categoryNameById,
  thumbnailSource: data.preferencesState.preferences.thumbnailSource,
  imageExternalBaseUrl: data.imageExternalBaseUrl,
});
