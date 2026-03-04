'use client';

import ProductFormDebugPanel from '@/features/products/components/ProductFormDebugPanel';
import { ProductListPanel } from '@/features/products/components/ProductListPanel';
import { ProductModals } from '@/features/products/components/ProductModals';
import { ProductListProvider } from '@/features/products/context/ProductListContext';
import { useProductListState } from '@/features/products/hooks/useProductListState';
import { ConfirmModal } from '@/shared/ui/templates/modals';

export function AdminProductsPage(): React.JSX.Element {
  const state = useProductListState();

  return (
    <>
      {state.isDebugOpen && <ProductFormDebugPanel />}
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
      <ProductListProvider value={state}>
        <ProductListPanel />
        <ProductModals />
      </ProductListProvider>
    </>
  );
}
