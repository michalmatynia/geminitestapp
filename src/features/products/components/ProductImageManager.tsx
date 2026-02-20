'use client';

import React from 'react';

import { ProductImageManagerUIProvider, useProductImageManagerUI } from './ProductImageManagerUIContext';
import { ProductImageManagerHeader } from './ProductImageManagerHeader';
import { ProductImageSlot } from './ProductImageSlot';
import type { ProductImageManagerController } from './ProductImageManager';

export type { ProductImageManagerController };

interface ProductImageManagerProps {
  controller?: ProductImageManagerController;
  minimalUi?: boolean;
  showDragHandle?: boolean;
  minimalSingleSlotAlign?: 'left' | 'center';
}

function ProductImageManagerGrid({
  minimalUi = false,
  showDragHandle = true,
  minimalSingleSlotAlign = 'center',
}: Omit<ProductImageManagerProps, 'controller'>) {
  const { controller } = useProductImageManagerUI();
  const { imageSlots } = controller;

  const gridClass = minimalUi
    ? imageSlots.length === 1
      ? `flex w-full overflow-x-hidden ${minimalSingleSlotAlign === 'left' ? 'justify-start' : 'justify-center'}`
      : 'grid w-full grid-cols-2 justify-items-start gap-2 overflow-x-hidden'
    : 'grid grid-cols-5 gap-2';

  return (
    <div data-preserve-slot-selection='true'>
      <ProductImageManagerHeader minimalUi={minimalUi} />
      <div className={gridClass}>
        {imageSlots.map((_, index) => (
          <ProductImageSlot
            key={`slot-${index}`}
            index={index}
            minimalUi={minimalUi}
            showDragHandle={showDragHandle}
            minimalSingleSlotAlign={minimalSingleSlotAlign}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProductImageManager(props: ProductImageManagerProps) {
  return (
    <ProductImageManagerUIProvider explicitController={props.controller}>
      <ProductImageManagerGrid {...props} />
    </ProductImageManagerUIProvider>
  );
}
