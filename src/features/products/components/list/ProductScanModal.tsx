'use client';

import { useProductScanModalController } from './ProductScanModal.controller';
import type { ProductScanModalProps } from './ProductScanModal.types';
import { ProductScanModalView } from './ProductScanModal.view';

export function ProductScanModal(
  props: ProductScanModalProps
): React.JSX.Element {
  const controller = useProductScanModalController(props);

  return <ProductScanModalView {...controller} />;
}
