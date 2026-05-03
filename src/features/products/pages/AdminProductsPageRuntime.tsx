'use client';

// AdminProductsPageRuntime: page runtime wrapper for the admin products
// experience. Wires global providers, background sync, and dev-time guards
// required to run the product list UI (keeps heavy initialization out of the
// view component for testability and faster client hydration).

import dynamic from 'next/dynamic';

import { ProductModals } from '@/features/products/components/ProductModals';
import { ProductListPanel } from '@/features/products/components/ProductListPanel';
import { ProductImagePreviewProvider } from '@/features/products/context/ProductImagePreviewContext';
import { ProductListProvider } from '@/features/products/context/ProductListContext';
import { useProductListState } from '@/features/products/hooks/useProductListState';

const ProductFormDebugPanel = dynamic(
  () => import('@/features/products/components/ProductFormDebugPanel'),
  { ssr: false }
);

const ConfirmModal = dynamic(
  () =>
    import('@/shared/ui/templates/modals/ConfirmModal').then((mod) => mod.ConfirmModal),
  { ssr: false }
);

type ProductListState = ReturnType<typeof useProductListState>;

const PRODUCT_MODAL_STATE_SELECTORS: ReadonlyArray<(state: ProductListState) => boolean> = [
  (state) => state.isCreateOpen,
  (state) => state.editingProduct !== null,
  (state) => state.isEditHydrating,
  (state) => state.integrationsProduct !== null,
  (state) => state.showListProductModal,
  (state) => state.exportSettingsProduct !== null,
  (state) => state.massListIntegration !== null,
  (state) => state.showIntegrationModal === true,
];

const shouldRenderProductModalsForState = (state: ProductListState): boolean =>
  PRODUCT_MODAL_STATE_SELECTORS.some((selectShouldRender) => selectShouldRender(state));

const countSelectedProducts = (state: ProductListState): number =>
  Object.keys(state.rowSelection).filter((id: string) => state.rowSelection[id] === true).length;

const resolveDeleteProductName = (state: ProductListState): string => {
  const product = state.productToDelete;
  if (product === null) {
    return 'this product';
  }

  const englishName = product.name_en.trim();
  if (englishName.length > 0) {
    return englishName;
  }

  const polishName = product.name_pl.trim();
  return polishName.length > 0 ? polishName : 'this product';
};

const SelectedProductsDeleteConfirmModal = ({
  state,
}: {
  state: ProductListState;
}): React.JSX.Element | null => {
  if (!state.isMassDeleteConfirmOpen) {
    return null;
  }

  return (
    <ConfirmModal
      isOpen={state.isMassDeleteConfirmOpen}
      onClose={() => state.setIsMassDeleteConfirmOpen(false)}
      onConfirm={state.handleMassDelete}
      title='Delete Products'
      message={`Are you sure you want to delete ${countSelectedProducts(state)} selected products? This action cannot be undone.`}
      confirmText='Delete'
      isDangerous={true}
      loading={state.bulkDeletePending}
    />
  );
};

const SingleProductDeleteConfirmModal = ({
  state,
}: {
  state: ProductListState;
}): React.JSX.Element | null => {
  if (state.productToDelete === null) {
    return null;
  }

  return (
    <ConfirmModal
      isOpen={true}
      onClose={() => state.setProductToDelete(null)}
      onConfirm={state.handleConfirmSingleDelete}
      title='Delete Product'
      message={`Are you sure you want to delete product "${resolveDeleteProductName(state)}"? This action cannot be undone.`}
      confirmText='Delete'
      isDangerous={true}
      loading={state.bulkDeletePending}
    />
  );
};

export function AdminProductsPageRuntime(): React.JSX.Element {
  const state = useProductListState();
  const shouldRenderProductModals = shouldRenderProductModalsForState(state);

  return (
    <>
      {state.isDebugOpen ? <ProductFormDebugPanel /> : null}
      <SelectedProductsDeleteConfirmModal state={state} />
      <SingleProductDeleteConfirmModal state={state} />
      <ProductListProvider value={state}>
        <ProductImagePreviewProvider>
          <ProductListPanel />
          {shouldRenderProductModals ? <ProductModals /> : null}
        </ProductImagePreviewProvider>
      </ProductListProvider>
    </>
  );
}
