'use client';

import { SelectionBar } from '@/shared/ui/selection-bar';

import {
  ProductSelectionDropdownActions,
  ProductSelectionRightActions,
  ProductSelectionToolbarActions,
} from './ProductSelectionActions.menu';
import { ProductSelectionModalStack } from './ProductSelectionActions.modals';
import type { ProductSelectionActionsController } from './ProductSelectionActions.types';

export const ProductSelectionActionsView = ({
  controller,
}: {
  controller: ProductSelectionActionsController;
}): React.JSX.Element => {
  const { selection } = controller;
  return (
    <>
      <SelectionBar
        data={selection.data}
        getRowId={selection.getRowId}
        selectedCount={selection.selectedCount}
        onSelectPage={selection.handleSelectPage}
        onDeselectPage={selection.handleDeselectPage}
        onDeselectAll={selection.clearSelection}
        onSelectAllGlobal={selection.onSelectAllGlobal}
        loadingGlobal={selection.loadingGlobal}
        onDeleteSelected={selection.onDeleteSelected}
        className='border-t pt-3'
        label='Products'
        actions={<ProductSelectionDropdownActions controller={controller} />}
        afterBatchActions={<ProductSelectionToolbarActions controller={controller} />}
        rightActions={<ProductSelectionRightActions controller={controller} />}
      />
      <ProductSelectionModalStack controller={controller} />
    </>
  );
};
