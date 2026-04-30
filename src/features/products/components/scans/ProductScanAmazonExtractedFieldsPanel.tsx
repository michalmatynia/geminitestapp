'use client';

import { resolveProductScanAmazonExtractedFieldsModel } from './ProductScanAmazonExtractedFieldsPanel.model';
import type { ProductScanAmazonFormBindings } from './ProductScanAmazonExtractedFieldsPanel.types';
import { ProductScanAmazonExtractedFieldsView } from './ProductScanAmazonExtractedFieldsPanel.view';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

export type { ProductScanAmazonFormBindings };

export function ProductScanAmazonExtractedFieldsPanel(props: {
  formBindings?: ProductScanAmazonFormBindings | null;
  scan: ProductScanRecord;
}): React.JSX.Element | null {
  const model = resolveProductScanAmazonExtractedFieldsModel(
    props.scan,
    props.formBindings ?? null
  );
  if (model === null) return null;
  return <ProductScanAmazonExtractedFieldsView model={model} />;
}
