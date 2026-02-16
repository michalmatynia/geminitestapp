'use client';
import { Table as ReactTable, Row } from '@tanstack/react-table';
import { Trash2, Image as ImageIcon } from 'lucide-react';
import React, { JSX, memo, useState } from 'react';

import { logClientError } from '@/features/observability';
import { useBulkDeleteProducts, useBulkConvertImagesToBase64 } from '@/features/products/hooks/useProductsMutations';
import { ProductWithImages } from '@/features/products/types';
import { Button, useToast } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logger } from '@/shared/utils/logger';

interface ProductTableFooterProps<TData> {
  table: ReactTable<TData>;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  setActionError: (error: string | null) => void;
}

export const ProductTableFooter = memo(function ProductTableFooter<TData>({
  table,
  setRefreshTrigger,
  setActionError,
}: ProductTableFooterProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const hasSelection = selectedCount > 0;
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBase64Confirm, setShowBase64Confirm] = useState(false);

  const { mutateAsync: bulkDelete, isPending: isDeleting } = useBulkDeleteProducts();
  const { mutateAsync: bulkBase64, isPending: isConverting } = useBulkConvertImagesToBase64();

  const handleMassDelete = async (): Promise<void> => {
    if (process.env['NODE_ENV'] !== 'production') {
      logger.info('[product-table-footer] Mass delete initiated.');
    }
    const selectedProductIds = table
      .getSelectedRowModel()
      .rows.map((row: Row<TData>) => (row.original as ProductWithImages)?.id)
      .filter(Boolean);

    if (selectedProductIds.length === 0) {
      setActionError('Please select products to delete.');
      return;
    }

    try {
      await bulkDelete(selectedProductIds);
      toast('Selected products deleted successfully.', {
        variant: 'success',
      });
      table.setRowSelection({}); // Clear selection after deletion
      setRefreshTrigger((prev: number) => prev + 1); // Refresh the product list
      setShowDeleteConfirm(false);
    } catch (error) {
      logClientError(error, { context: { source: 'ProductTableFooter', action: 'handleMassDelete' } });
      setActionError(error instanceof Error ? error.message : 'An error occurred during deletion.');
      toast('An error occurred during deletion', {
        variant: 'error',
      });
    }
  };

  const handleMassBase64 = async (): Promise<void> => {
    const selectedProductIds = table
      .getSelectedRowModel()
      .rows.map((row: Row<TData>) => (row.original as ProductWithImages)?.id)
      .filter(Boolean);

    if (selectedProductIds.length === 0) {
      setActionError('Please select products to convert.');
      return;
    }

    try {
      await bulkBase64(selectedProductIds);
      toast('Base64 images generated for selected products.', {
        variant: 'success',
      });
      table.setRowSelection({});
      setRefreshTrigger((prev: number) => prev + 1);
      setShowBase64Confirm(false);
    } catch (error) {
      logClientError(error, { context: { source: 'ProductTableFooter', action: 'handleMassBase64' } });
      setActionError(error instanceof Error ? error.message : 'An error occurred during base64 conversion.');
      toast('An error occurred during base64 conversion', {
        variant: 'error',
      });
    }
  };

  return (
    <>
      <div className='space-y-3 border-t bg-muted/50 px-4 py-4'>
        <div className='flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center'>
          <div className='text-sm text-muted-foreground'>
            <span className='font-medium text-foreground'>{selectedCount}</span>{' '}
            of <span className='font-medium text-foreground'>{table.getFilteredRowModel().rows.length}</span>{' '}
            row(s) selected.
          </div>
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!hasSelection || isDeleting}
            variant='destructive'
            size='sm'
            className='gap-2'
          >
            <Trash2 className='h-4 w-4' />
            {isDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}
          </Button>
          <Button
            onClick={() => setShowBase64Confirm(true)}
            disabled={!hasSelection || isConverting}
            variant='outline'
            size='sm'
            className='gap-2'
          >
            <ImageIcon className='h-4 w-4' />
            {isConverting ? 'Converting...' : `Base64 Images (${selectedCount})`}
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleMassDelete}
        title='Delete selected products?'
        message={`Are you sure you want to delete ${selectedCount} selected ${selectedCount === 1 ? 'product' : 'products'}? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
        loading={isDeleting}
      />

      <ConfirmModal
        isOpen={showBase64Confirm}
        onClose={() => setShowBase64Confirm(false)}
        onConfirm={handleMassBase64}
        title='Generate Base64 images?'
        message={`Create Base64-encoded image links for ${selectedCount} selected ${selectedCount === 1 ? 'product' : 'products'}? This can be heavy for large images.`}
        confirmText='Convert'
        loading={isConverting}
      />
    </>
  );
}) as <TData>(props: ProductTableFooterProps<TData>) => JSX.Element;
