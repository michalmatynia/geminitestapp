'use client';
import dynamic from 'next/dynamic';
import { Profiler, memo, useMemo } from 'react';

import { useProductListTableContext } from '@/features/products/context/ProductListContext';
import { useProductsTableProps } from '@/features/products/hooks/useProductsTableProps';
import { DataTable, Button, ListPanel, Alert } from '@/shared/ui';
import { PromptModal } from '@/shared/ui/templates/modals';

const ProductListHeader = dynamic(
  () =>
    import('@/features/products/components/list/ProductListHeader').then(
      (mod: typeof import('@/features/products/components/list/ProductListHeader')) => mod.ProductListHeader
    ),
  { ssr: false }
);

const ProductFilters = dynamic(
  () =>
    import('@/features/products/components/list/ProductFilters').then(
      (mod: typeof import('@/features/products/components/list/ProductFilters')) => mod.ProductFilters
    ),
  { ssr: false }
);

const ProductSelectionActions = dynamic(
  () =>
    import('@/features/products/components/list/ProductFilters').then(
      (mod: typeof import('@/features/products/components/list/ProductFilters')) => mod.ProductSelectionActions
    ),
  { ssr: false }
);

export const ProductListPanel = memo(function ProductListPanel() {
  const {
    loadError,
    actionError,
    onDismissActionError,
    handleProductsTableRender,
    isPromptOpen,
    setIsPromptOpen,
    handleConfirmSku,
  } = useProductListTableContext();

  const tableProps = useProductsTableProps();

  const alerts = useMemo(() => {
    if (!loadError && !actionError) return null;
    return (
      <div className='flex flex-col gap-2'>
        {loadError && (
          <Alert variant='error'>
            {loadError}
          </Alert>
        )}
        {actionError && (
          <Alert variant='error'>
            <div className='flex items-center justify-between'>
              <span>{actionError}</span>
              <Button
                variant='ghost'
                onClick={onDismissActionError}
                className='h-auto p-0 text-red-200 hover:text-white bg-transparent hover:bg-transparent'
              >
                Dismiss
              </Button>
            </div>
          </Alert>
        )}
      </div>
    );
  }, [actionError, loadError, onDismissActionError]);

  return (
    <ListPanel
      header={<ProductListHeader filtersContent={<ProductFilters />} />}
      alerts={alerts}
      actions={
        <ProductSelectionActions />
      }
    >
      <Profiler id='ProductsTable' onRender={handleProductsTableRender}>
        <DataTable {...tableProps} />
      </Profiler>

      <PromptModal
        open={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        onConfirm={handleConfirmSku}
        title='Create New Product'
        label='Enter a new unique SKU'
        placeholder='e.g. ABC-123'
        required
      />
    </ListPanel>
  );
});
