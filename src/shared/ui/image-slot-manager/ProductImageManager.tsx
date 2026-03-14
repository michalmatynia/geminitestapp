'use client';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';

import { ProductImageManagerHeader } from './ProductImageManagerHeader';
import {
  ProductImageManagerUIProvider,
  useProductImageManagerUIState,
} from './ProductImageManagerUIContext';
import { ProductImageSlot } from './ProductImageSlot';

export type { ProductImageManagerController };

interface ProductImageManagerProps {
  controller?: ProductImageManagerController;
  externalBaseUrl: string;
  productId?: string | null;
  minimalUi?: boolean;
  showDragHandle?: boolean;
  minimalSingleSlotAlign?: 'left' | 'center';
}

function ProductImageManagerGrid() {
  const { controller, minimalUi, minimalSingleSlotAlign } = useProductImageManagerUIState();
  const { imageSlots } = controller;

  const gridClass = minimalUi
    ? imageSlots.length === 1
      ? `flex w-full overflow-x-hidden ${minimalSingleSlotAlign === 'left' ? 'justify-start' : 'justify-center'}`
      : 'grid w-full grid-cols-2 justify-items-start gap-2 overflow-x-hidden'
    : 'grid grid-cols-5 gap-2';

  return (
    <div data-preserve-slot-selection='true'>
      <ProductImageManagerHeader />
      <div className={gridClass}>
        {imageSlots.map((_, index) => (
          <ProductImageSlot key={`slot-${index}`} index={index} />
        ))}
      </div>
    </div>
  );
}

export default function ProductImageManager(props: ProductImageManagerProps) {
  const {
    controller,
    externalBaseUrl,
    productId,
    minimalUi,
    showDragHandle,
    minimalSingleSlotAlign,
  } = props;

  return (
    <ProductImageManagerUIProvider
      explicitController={controller}
      externalBaseUrl={externalBaseUrl}
      productId={productId}
      minimalUi={minimalUi}
      showDragHandle={showDragHandle}
      minimalSingleSlotAlign={minimalSingleSlotAlign}
    >
      <ProductImageManagerGrid />
    </ProductImageManagerUIProvider>
  );
}
