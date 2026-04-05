'use client';

import {
  memo,
  startTransition,
  useEffect,
  useState,
  type ComponentType,
} from 'react';

import { ProductTableSkeleton } from '@/features/products/components/list/ProductTableSkeleton';
import { loadProductListTableSurface } from '@/features/products/components/product-list-table-surface-loader';
import { useProductListModalsContext } from '@/features/products/context/ProductListContext';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody } from '@/shared/ui/table';
import { PromptModal } from '@/shared/ui/templates/modals/PromptModal';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const ProductCreatePromptModal = memo(function ProductCreatePromptModal() {
  const { isPromptOpen, setIsPromptOpen, handleConfirmSku } = useProductListModalsContext();
  if (!isPromptOpen) return null;

  return (
    <PromptModal
      open={isPromptOpen}
      onClose={() => setIsPromptOpen(false)}
      onConfirm={handleConfirmSku}
      title='Create New Product'
      label='Enter a new unique SKU'
      placeholder='e.g. ABC-123'
      required
    />
  );
});

const ProductListPanelFallback = memo(function ProductListPanelFallback() {
  return (
    <div className='space-y-4' data-testid='product-list-panel-fallback'>
      <div className='space-y-2'>
        <Skeleton className='h-4 w-40' />
        <Skeleton className='h-8 w-52' />
      </div>
      <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
        <div className='flex flex-wrap gap-2'>
          <Skeleton className='h-8 w-28' />
          <Skeleton className='h-8 w-24' />
          <Skeleton className='h-8 w-32' />
        </div>
        <Table wrapperClassName='overflow-hidden rounded-md border border-white/10'>
          <TableBody>
            <ProductTableSkeleton rows={8} />
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

const ProductListPanelSurface = memo(function ProductListPanelSurface() {
  const [SurfaceComponent, setSurfaceComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isCancelled = false;

    void loadProductListTableSurface()
      .then((nextSurfaceComponent) => {
        if (isCancelled) return;
        startTransition(() => {
          setSurfaceComponent(() => nextSurfaceComponent);
        });
      })
      .catch((error) => {
        logClientCatch(error, {
          source: 'ProductListPanel',
          action: 'loadProductListTableSurface',
          level: 'warn',
        });
      });

    return (): void => {
      isCancelled = true;
    };
  }, []);

  if (!SurfaceComponent) {
    return <ProductListPanelFallback />;
  }

  return <SurfaceComponent />;
});

export const ProductListPanel = memo(function ProductListPanel() {
  return (
    <AppErrorBoundary source='products.ProductListPanel'>
      <ProductListPanelSurface />
      <ProductCreatePromptModal />
    </AppErrorBoundary>
  );
});
