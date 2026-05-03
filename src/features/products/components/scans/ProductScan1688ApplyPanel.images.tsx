import { Button } from '@/shared/ui/button';
import {
  appendImageUrls,
  replaceImageUrls,
} from './ProductScan1688ApplyPanel.actions';
import type { ProductScan1688ApplyModel } from './ProductScan1688ApplyPanel.types';

type ProductScan1688ApplySectionProps = {
  model: ProductScan1688ApplyModel;
};

export function ProductScan1688ImageUrlsSection(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element | null {
  const { model } = props;
  const { imageState } = model;
  if (
    model.blockActions ||
    imageState.extractedImageUrls.length === 0 ||
    imageState.imageSlotCount === 0
  ) {
    return null;
  }

  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <ProductScan1688ImageUrlsSummary model={model} />
      <ProductScan1688ImageUrlActions model={model} />
    </div>
  );
}

function ProductScan1688ImageUrlsSummary(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { imageState } = props.model;
  return (
    <div className='min-w-0 space-y-1'>
      <p className='text-sm font-medium text-foreground'>Image URL slots</p>
      <p className='text-xs text-muted-foreground'>
        Current URLs: {imageState.currentImageLinkSlots.filter((entry) => entry.length > 0).length}
      </p>
      <p className='text-xs text-muted-foreground'>
        1688 extracted: {Math.min(imageState.extractedImageUrls.length, imageState.imageSlotCount)} of {imageState.imageSlotCount} slots
      </p>
      <p className='text-xs text-muted-foreground'>
        Empty slots: {imageState.emptyImageSlotCount} · Appendable URLs: {imageState.appendableImageUrlCount}
      </p>
      <p className='text-xs text-muted-foreground'>
        Append fills empty URL slots first. Replace overwrites URL/base64 slot values. Uploaded file slots stay untouched.
      </p>
    </div>
  );
}

function ProductScan1688ImageUrlActions(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { model } = props;
  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={model.actions.canAppendImageUrls === false}
        onClick={() => appendImageUrls(model)}
        className='h-7 px-2 text-xs'
      >
        Append Image URLs
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={model.actions.canReplaceImageUrls === false}
        onClick={() => replaceImageUrls(model)}
        className='h-7 px-2 text-xs'
      >
        Replace Image URLs
      </Button>
    </div>
  );
}
