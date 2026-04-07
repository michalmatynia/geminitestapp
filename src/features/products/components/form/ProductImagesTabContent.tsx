'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import { internalError } from '@/shared/errors/app-error';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';
import { ProductImageManager, ProductImageManagerControllerProvider } from '@/shared/ui/image-slot-manager';
import type { ProductImageManagerController } from '@/shared/ui/image-slot-manager';

import {
  useOptionalProductImagesTabActionsContext,
  useOptionalProductImagesTabStateContext,
} from './ProductImagesTabContext';

const FileManager = dynamic(() => import('@/features/files/public').then(m => m.default || m.FileManager), {
  ssr: false,
});

export function ProductImagesTabContent(): React.JSX.Element {
  const formImages = useProductFormImages();
  const { imageExternalBaseUrl } = useProductSettings();
  const imagesTabStateContext = useOptionalProductImagesTabStateContext();
  const imagesTabActionsContext = useOptionalProductImagesTabActionsContext();
  const showFileManager =
    imagesTabStateContext?.showFileManager ?? formImages?.showFileManager ?? false;
  const onShowFileManager =
    imagesTabActionsContext?.onShowFileManager ?? formImages?.setShowFileManager ?? null;
  const resolvedOnSelectFiles = imagesTabActionsContext?.onSelectFiles;
  const resolvedImageManagerController = imagesTabStateContext?.imageManagerController;
  const inlineFileManager = imagesTabStateContext?.inlineFileManager ?? false;
  const sectionTitle = imagesTabStateContext?.sectionTitle ?? 'Image Source';
  const sectionDescription =
    imagesTabStateContext?.sectionDescription ??
    'Upload directly from any slot (single or multi-select), or pick existing files from the platform library.';
  const chooseButtonLabel = imagesTabStateContext?.chooseButtonLabel ?? 'Choose from File Manager';
  const chooseButtonAriaLabel =
    imagesTabStateContext?.chooseButtonAriaLabel ??
    'Choose multiple existing images for the product';

  const fallbackImageManagerController = useMemo<ProductImageManagerController>(
    () => ({
      imageSlots: formImages.imageSlots,
      imageLinks: formImages.imageLinks,
      imageBase64s: formImages.imageBase64s,
      setImageLinkAt: formImages.setImageLinkAt,
      setImageBase64At: formImages.setImageBase64At,
      handleSlotImageChange: formImages.handleSlotImageChange,
      handleSlotFileSelect: formImages.handleSlotFileSelect,
      handleSlotDisconnectImage: formImages.handleSlotDisconnectImage,
      setShowFileManager: formImages.setShowFileManager,
      setShowFileManagerForSlot: () => formImages.setShowFileManager(true),
      swapImageSlots: formImages.swapImageSlots,
      setImagesReordering: formImages.setImagesReordering,
      uploadError: formImages.uploadError,
    }),
    [
      formImages.imageSlots,
      formImages.imageLinks,
      formImages.imageBase64s,
      formImages.setImageLinkAt,
      formImages.setImageBase64At,
      formImages.handleSlotImageChange,
      formImages.handleSlotFileSelect,
      formImages.handleSlotDisconnectImage,
      formImages.setShowFileManager,
      formImages.swapImageSlots,
      formImages.setImagesReordering,
      formImages.uploadError,
    ]
  );
  const imageManagerController = resolvedImageManagerController ?? fallbackImageManagerController;

  if (!onShowFileManager) {
    throw internalError(
      'ProductImagesTabContent requires ProductFormContext or ProductImagesTabProvider.'
    );
  }

  if (inlineFileManager && showFileManager && resolvedOnSelectFiles) {
    return (
      <div className='space-y-4'>
        <div className='flex justify-end'>
          <Button type='button' variant='outline' onClick={(): void => onShowFileManager(false)}>
            Back to Images
          </Button>
        </div>
        <FileManager onSelectFile={resolvedOnSelectFiles} />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <FormSection title={sectionTitle} description={sectionDescription}>
        <div className='flex space-x-4'>
          <Button
            type='button'
            variant='outline'
            onClick={(): void => onShowFileManager(true)}
            aria-label={chooseButtonAriaLabel}
          >
            {chooseButtonLabel}
          </Button>
        </div>
      </FormSection>
      <ProductImageManagerControllerProvider value={imageManagerController}>
        <ProductImageManager
          externalBaseUrl={imageExternalBaseUrl}
          productId={formImages?.productId}
        />
      </ProductImageManagerControllerProvider>
    </div>
  );
}
