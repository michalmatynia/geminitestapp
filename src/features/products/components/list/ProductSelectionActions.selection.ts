'use client';

import { useCallback, useMemo } from 'react';

import { getProductRowId, getSelectedProductIds } from './ProductSelectionActions.helpers';
import type { ProductSelectionBaseController } from './ProductSelectionActions.types';

type ProductSelectionBaseInput = Pick<
  ProductSelectionBaseController,
  | 'data'
  | 'loadingGlobal'
  | 'onAddToMarketplace'
  | 'onDeleteSelected'
  | 'onSelectAllGlobal'
  | 'rowSelection'
  | 'setRowSelection'
>;

export const useProductSelectionBaseController = (
  input: ProductSelectionBaseInput
): ProductSelectionBaseController => {
  const { data, rowSelection, setRowSelection } = input;
  const selectedCount = useMemo(() => getSelectedProductIds(rowSelection).length, [rowSelection]);

  const handleSelectPage = useCallback((): void => {
    const newSelection = { ...rowSelection };
    data.forEach((item) => {
      newSelection[item.id] = true;
    });
    setRowSelection(newSelection);
  }, [data, rowSelection, setRowSelection]);

  const handleDeselectPage = useCallback((): void => {
    const newSelection = { ...rowSelection };
    data.forEach((item) => {
      delete newSelection[item.id];
    });
    setRowSelection(newSelection);
  }, [data, rowSelection, setRowSelection]);

  const clearSelection = useCallback((): void => {
    setRowSelection({});
  }, [setRowSelection]);

  return {
    ...input,
    clearSelection,
    getRowId: getProductRowId,
    handleDeselectPage,
    handleSelectPage,
    selectedCount,
  };
};
