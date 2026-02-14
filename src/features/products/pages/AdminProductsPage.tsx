'use client';

import DebugPanel from '@/features/products/components/DebugPanel';
import { ProductListPanel } from '@/features/products/components/ProductListPanel';
import { ProductModals } from '@/features/products/components/ProductModals';
import { ProductListProvider } from '@/features/products/context/ProductListContext';
import { useProductListState } from '@/features/products/hooks/useProductListState';
import { ConfirmDialog } from '@/shared/ui';

export function AdminProductsPage(): React.JSX.Element {
  const state = useProductListState();

  return (
    <>
      {state.isDebugOpen && <DebugPanel />}
      <ConfirmDialog
        open={state.isMassDeleteConfirmOpen}
        onOpenChange={(open: boolean): void => state.setIsMassDeleteConfirmOpen(open)}
        onConfirm={(): void => {
          void state.handleMassDelete();
        }}
        title='Delete Products'
        description={`Are you sure you want to delete ${Object.keys(state.rowSelection).filter((id: string) => state.rowSelection[id]).length} selected products? This action cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
        loading={state.bulkDeletePending}
      />
      <ConfirmDialog
        open={!!state.productToDelete}
        onOpenChange={(open: boolean): void => {
          if (!open) state.setProductToDelete(null);
        }}
        onConfirm={(): void => {
          void state.handleConfirmSingleDelete();
        }}
        title='Delete Product'
        description={`Are you sure you want to delete product "${state.productToDelete?.name_en || state.productToDelete?.name_pl || 'this product'}"? This action cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
        loading={state.bulkDeletePending}
      />
      <ProductListProvider value={state}>
        <ProductListPanel />
        <ProductModals />
      </ProductListProvider>
    </>
  );
}
