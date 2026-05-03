'use client';

import { type Table as ReactTable, type Row } from '@tanstack/react-table';
import { Trash2, Image as ImageIcon } from 'lucide-react';
import React, { type JSX, memo, useState } from 'react';

import {
  useBulkDeleteProducts,
  useBulkConvertImagesToBase64,
} from '@/features/products/hooks/useProductsMutations';
import { type ProductWithImages } from '@/shared/contracts/products/product';
import { Button } from '@/shared/ui/button';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { useToast } from '@/shared/ui/toast';

import { logger } from '@/shared/utils/logger';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

interface ProductTableFooterProps<TData> {
  table: ReactTable<TData>;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  setActionError: (error: string | null) => void;
}

type ToastFn = ReturnType<typeof useToast>['toast'];

type BulkProductActionInput<TData> = {
  table: ReactTable<TData>;
  setActionError: (error: string | null) => void;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  toast: ToastFn;
  mutate: (productIds: string[]) => Promise<unknown>;
  emptySelectionMessage: string;
  successMessage: string;
  failureMessage: string;
  sourceAction: string;
  closeConfirm: () => void;
};

type FooterActionBaseInput<TData> = Pick<
  BulkProductActionInput<TData>,
  'table' | 'setActionError' | 'setRefreshTrigger' | 'toast'
>;

const getSelectedProductIds = <TData,>(table: ReactTable<TData>): string[] =>
  table
    .getSelectedRowModel()
    .rows.map((row: Row<TData>) => (row.original as ProductWithImages).id)
    .filter((id: string): boolean => id !== '');

const runBulkProductAction = async <TData,>({
  table,
  setActionError,
  setRefreshTrigger,
  toast,
  mutate,
  emptySelectionMessage,
  successMessage,
  failureMessage,
  sourceAction,
  closeConfirm,
}: BulkProductActionInput<TData>): Promise<void> => {
  const selectedProductIds = getSelectedProductIds(table);
  if (selectedProductIds.length === 0) {
    setActionError(emptySelectionMessage);
    return;
  }

  try {
    await mutate(selectedProductIds);
    toast(successMessage, { variant: 'success' });
    table.setRowSelection({});
    setRefreshTrigger((prev: number) => prev + 1);
    closeConfirm();
  } catch (error) {
    logClientCatch(error, {
      source: 'ProductTableFooter',
      action: sourceAction,
    });
    setActionError(error instanceof Error ? error.message : failureMessage);
    toast(failureMessage, { variant: 'error' });
  }
};

const runMassDeleteAction = async <TData,>({
  bulkDelete,
  closeConfirm,
  ...baseInput
}: FooterActionBaseInput<TData> & {
  bulkDelete: (productIds: string[]) => Promise<unknown>;
  closeConfirm: () => void;
}): Promise<void> => {
  if (process.env['NODE_ENV'] !== 'production') {
    logger.info('[product-table-footer] Mass delete initiated.');
  }
  await runBulkProductAction({
    ...baseInput,
    mutate: bulkDelete,
    emptySelectionMessage: 'Please select products to delete.',
    successMessage: 'Selected products deleted successfully.',
    failureMessage: 'An error occurred during deletion.',
    sourceAction: 'handleMassDelete',
    closeConfirm,
  });
};

const runMassBase64Action = async <TData,>({
  bulkBase64,
  closeConfirm,
  ...baseInput
}: FooterActionBaseInput<TData> & {
  bulkBase64: (productIds: string[]) => Promise<unknown>;
  closeConfirm: () => void;
}): Promise<void> => {
  await runBulkProductAction({
    ...baseInput,
    mutate: bulkBase64,
    emptySelectionMessage: 'Please select products to convert.',
    successMessage: 'Base64 images generated for selected products.',
    failureMessage: 'An error occurred during base64 conversion.',
    sourceAction: 'handleMassBase64',
    closeConfirm,
  });
};

function ProductTableFooterActions({
  selectedCount,
  totalRowCount,
  hasSelection,
  isDeleting,
  isConverting,
  onDeleteClick,
  onBase64Click,
}: {
  selectedCount: number;
  totalRowCount: number;
  hasSelection: boolean;
  isDeleting: boolean;
  isConverting: boolean;
  onDeleteClick: () => void;
  onBase64Click: () => void;
}): React.JSX.Element {
  return (
    <div className='space-y-3 border-t bg-muted/50 px-4 py-4'>
      <div className='flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center'>
        <div className='text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>{selectedCount}</span> of{' '}
          <span className='font-medium text-foreground'>{totalRowCount}</span> row(s) selected.
        </div>
        <Button
          onClick={onDeleteClick}
          disabled={!hasSelection || isDeleting}
          variant='destructive'
          size='sm'
          className='gap-2'
        >
          <Trash2 className='h-4 w-4' />
          {isDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}
        </Button>
        <Button
          onClick={onBase64Click}
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
  );
}

function ProductTableFooterConfirmModals({
  selectedCount,
  showDeleteConfirm,
  showBase64Confirm,
  isDeleting,
  isConverting,
  onCloseDelete,
  onCloseBase64,
  onConfirmDelete,
  onConfirmBase64,
}: {
  selectedCount: number;
  showDeleteConfirm: boolean;
  showBase64Confirm: boolean;
  isDeleting: boolean;
  isConverting: boolean;
  onCloseDelete: () => void;
  onCloseBase64: () => void;
  onConfirmDelete: () => Promise<void>;
  onConfirmBase64: () => Promise<void>;
}): React.JSX.Element {
  const selectedProductLabel = selectedCount === 1 ? 'product' : 'products';

  return (
    <>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title='Delete selected products?'
        message={`Are you sure you want to delete ${selectedCount} selected ${selectedProductLabel}? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
        loading={isDeleting}
      />
      <ConfirmModal
        isOpen={showBase64Confirm}
        onClose={onCloseBase64}
        onConfirm={onConfirmBase64}
        title='Generate Base64 images?'
        message={`Create Base64-encoded image links for ${selectedCount} selected ${selectedProductLabel}? This can be heavy for large images.`}
        confirmText='Convert'
        loading={isConverting}
      />
    </>
  );
}

export const ProductTableFooter = memo(<TData,>({
  table,
  setRefreshTrigger,
  setActionError,
}: ProductTableFooterProps<TData>) => {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const hasSelection = selectedCount > 0;
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBase64Confirm, setShowBase64Confirm] = useState(false);

  const { mutateAsync: bulkDelete, isPending: isDeleting } = useBulkDeleteProducts();
  const { mutateAsync: bulkBase64, isPending: isConverting } = useBulkConvertImagesToBase64();

  const handleMassDelete = async (): Promise<void> => {
    await runMassDeleteAction({
      table,
      setActionError,
      setRefreshTrigger,
      toast,
      bulkDelete,
      closeConfirm: () => setShowDeleteConfirm(false),
    });
  };

  const handleMassBase64 = async (): Promise<void> => {
    await runMassBase64Action({
      table,
      setActionError,
      setRefreshTrigger,
      toast,
      bulkBase64,
      closeConfirm: () => setShowBase64Confirm(false),
    });
  };

  return (
    <>
      <ProductTableFooterActions
        selectedCount={selectedCount}
        totalRowCount={table.getFilteredRowModel().rows.length}
        hasSelection={hasSelection}
        isDeleting={isDeleting}
        isConverting={isConverting}
        onDeleteClick={() => setShowDeleteConfirm(true)}
        onBase64Click={() => setShowBase64Confirm(true)}
      />
      <ProductTableFooterConfirmModals
        selectedCount={selectedCount}
        showDeleteConfirm={showDeleteConfirm}
        showBase64Confirm={showBase64Confirm}
        isDeleting={isDeleting}
        isConverting={isConverting}
        onCloseDelete={() => setShowDeleteConfirm(false)}
        onCloseBase64={() => setShowBase64Confirm(false)}
        onConfirmDelete={handleMassDelete}
        onConfirmBase64={handleMassBase64}
      />
    </>
  );
}) as <TData>(props: ProductTableFooterProps<TData>) => JSX.Element;
