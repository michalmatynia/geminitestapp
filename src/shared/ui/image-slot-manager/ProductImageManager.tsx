import type { JSX } from 'react';

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
  chooseFileManagerButtonAriaLabel?: string;
  chooseFileManagerButtonLabel?: string;
  onChooseFromFileManager?: (() => void) | undefined;
  productId?: string | null;
  productSku?: string | null;
  minimalUi?: boolean;
  showDragHandle?: boolean;
  minimalSingleSlotAlign?: 'left' | 'center';
}

type ProductImageManagerGridProps = Pick<
  ProductImageManagerProps,
  | 'chooseFileManagerButtonAriaLabel'
  | 'chooseFileManagerButtonLabel'
  | 'onChooseFromFileManager'
>;

const resolveImageSlotKey = (
  slot: ProductImageManagerController['imageSlots'][number],
  index: number
): string => slot?.slotId ?? `slot-${index}`;

const resolveGridClass = ({
  imageSlotCount,
  minimalSingleSlotAlign,
  minimalUi,
}: {
  imageSlotCount: number;
  minimalSingleSlotAlign: 'left' | 'center';
  minimalUi: boolean;
}): string => {
  if (!minimalUi) return 'grid grid-cols-5 gap-2';
  if (imageSlotCount === 1) {
    return `flex w-full overflow-x-hidden ${minimalSingleSlotAlign === 'left' ? 'justify-start' : 'justify-center'}`;
  }
  return 'grid w-full grid-cols-2 justify-items-start gap-2 overflow-x-hidden';
};

function ProductImageManagerGrid(props: ProductImageManagerGridProps): JSX.Element {
  const {
    chooseFileManagerButtonAriaLabel,
    chooseFileManagerButtonLabel,
    onChooseFromFileManager,
  } = props;
  const { controller, minimalUi, minimalSingleSlotAlign } = useProductImageManagerUIState();
  const { imageSlots } = controller;

  const gridClass = resolveGridClass({
    imageSlotCount: imageSlots.length,
    minimalSingleSlotAlign,
    minimalUi,
  });

  return (
    <div data-preserve-slot-selection='true'>
      <ProductImageManagerHeader
        chooseFileManagerButtonAriaLabel={chooseFileManagerButtonAriaLabel}
        chooseFileManagerButtonLabel={chooseFileManagerButtonLabel}
        onChooseFromFileManager={onChooseFromFileManager}
        showChooseFromFileManagerButton={onChooseFromFileManager !== undefined}
      />
      <div className={gridClass}>
        {imageSlots.map((slot, index: number) => (
          <ProductImageSlot key={resolveImageSlotKey(slot, index)} index={index} />
        ))}
      </div>
    </div>
  );
}

export default function ProductImageManager(props: ProductImageManagerProps): JSX.Element {
  const {
    controller,
    externalBaseUrl,
    chooseFileManagerButtonAriaLabel,
    chooseFileManagerButtonLabel,
    onChooseFromFileManager,
    productId,
    productSku,
    minimalUi,
    showDragHandle,
    minimalSingleSlotAlign,
  } = props;

  return (
    <ProductImageManagerUIProvider
      explicitController={controller}
      externalBaseUrl={externalBaseUrl}
      productId={productId}
      productSku={productSku}
      minimalUi={minimalUi}
      showDragHandle={showDragHandle}
      minimalSingleSlotAlign={minimalSingleSlotAlign}
    >
      <ProductImageManagerGrid
        chooseFileManagerButtonAriaLabel={chooseFileManagerButtonAriaLabel}
        chooseFileManagerButtonLabel={chooseFileManagerButtonLabel}
        onChooseFromFileManager={onChooseFromFileManager}
      />
    </ProductImageManagerUIProvider>
  );
}
