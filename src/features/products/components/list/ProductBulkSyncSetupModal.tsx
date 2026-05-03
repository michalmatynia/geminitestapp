'use client';

import { useProductBulkSyncSetupController } from './ProductBulkSyncSetupModal.controller';
import type { ProductBulkSyncSetupModalProps } from './ProductBulkSyncSetupModal.types';
import { ProductBulkSyncSetupModalView } from './ProductBulkSyncSetupModal.view';

export function ProductBulkSyncSetupModal(
  props: ProductBulkSyncSetupModalProps
): React.JSX.Element {
  const controller = useProductBulkSyncSetupController(props);
  return <ProductBulkSyncSetupModalView controller={controller} />;
}
