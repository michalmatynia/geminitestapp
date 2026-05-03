'use client';

import { resolveProductScan1688ApplyModel } from './ProductScan1688ApplyPanel.model';
import type {
  ProductScan1688ApplyPanelProps,
  ProductScan1688FormBindings,
} from './ProductScan1688ApplyPanel.types';
import { ProductScan1688ApplyPanelView } from './ProductScan1688ApplyPanel.view';

export type { ProductScan1688FormBindings };

export function ProductScan1688ApplyPanel(
  props: ProductScan1688ApplyPanelProps
): React.JSX.Element | null {
  const model = resolveProductScan1688ApplyModel(props.scan, props.formBindings);
  if (model === null) return null;
  return <ProductScan1688ApplyPanelView model={model} />;
}
