'use client';

import { memo } from 'react';

import { useProductSelectionActionsController } from './ProductSelectionActions.controller';
import { ProductSelectionActionsView } from './ProductSelectionActions.view';

export const ProductSelectionActions = memo(() => {
  const controller = useProductSelectionActionsController();
  return <ProductSelectionActionsView controller={controller} />;
});

ProductSelectionActions.displayName = 'ProductSelectionActions';
