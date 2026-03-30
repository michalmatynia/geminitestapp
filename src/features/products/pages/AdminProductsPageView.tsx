import dynamic from 'next/dynamic';

import { ProductListPanel } from '@/features/products/components/ProductListPanel';
import { ProductListProvider } from '@/features/products/context/ProductListContext';
import { useProductListState } from '@/features/products/hooks/useProductListState';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';

const ProductFormDebugPanel = dynamic(
  () => import('@/features/products/components/ProductFormDebugPanel'),
  { ssr: false }
);

const ProductModals = dynamic(
  () =>
    import('@/features/products/components/ProductModals').then(
      (mod: typeof import('@/features/products/components/ProductModals')) => mod.ProductModals
    ),
  { ssr: false }
);

const ConfirmModal = dynamic(
  () =>
    import('@/shared/ui/templates/modals').then(
      (mod: typeof import('@/shared/ui/templates/modals')) => mod.ConfirmModal
    ),
  { ssr: false }
);

function AdminProductsPageContent(): React.JSX.Element {
  const state = useProductListState();
  const shouldRenderProductModals =
    state.isCreateOpen ||
    Boolean(state.editingProduct) ||
    state.isEditHydrating ||
    Boolean(state.integrationsProduct) ||
    state.showListProductModal ||
    Boolean(state.exportSettingsProduct) ||
    Boolean(state.massListIntegration) ||
    state.showIntegrationModal;

  return (
    <>
      {state.isDebugOpen ? <ProductFormDebugPanel /> : null}
      {state.isMassDeleteConfirmOpen ? (
        <ConfirmModal
          isOpen={state.isMassDeleteConfirmOpen}
          onClose={() => state.setIsMassDeleteConfirmOpen(false)}
          onConfirm={state.handleMassDelete}
          title='Delete Products'
          message={`Are you sure you want to delete ${Object.keys(state.rowSelection).filter((id: string) => state.rowSelection[id]).length} selected products? This action cannot be undone.`}
          confirmText='Delete'
          isDangerous={true}
          loading={state.bulkDeletePending}
        />
      ) : null}
      {state.productToDelete ? (
        <ConfirmModal
          isOpen={!!state.productToDelete}
          onClose={() => state.setProductToDelete(null)}
          onConfirm={state.handleConfirmSingleDelete}
          title='Delete Product'
          message={`Are you sure you want to delete product "${state.productToDelete?.name_en || state.productToDelete?.name_pl || 'this product'}"? This action cannot be undone.`}
          confirmText='Delete'
          isDangerous={true}
          loading={state.bulkDeletePending}
        />
      ) : null}
      <ProductListProvider value={state}>
        <ProductListPanel />
        {shouldRenderProductModals ? <ProductModals /> : null}
      </ProductListProvider>
    </>
  );
}

export function AdminProductsPageView(): React.JSX.Element {
  return (
    <AppErrorBoundary source='products.AdminProductsPageView'>
      <AdminProductsPageContent />
    </AppErrorBoundary>
  );
}
