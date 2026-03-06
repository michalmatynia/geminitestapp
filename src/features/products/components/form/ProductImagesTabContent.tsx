'use client';

import dynamic from 'next/dynamic';

import ProductImageManager from '@/features/products/components/ProductImageManager';
import { ProductImageManagerControllerProvider } from '@/features/products/components/ProductImageManagerControllerContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import { internalError } from '@/shared/errors/app-error';
import { Button, FormSection } from '@/shared/ui';

import {
  useOptionalProductImagesTabActionsContext,
  useOptionalProductImagesTabStateContext,
} from './ProductImagesTabContext';

const FileManager = dynamic(() => import('@/features/files/components/FileManager'), {
  ssr: false,
});

export function ProductImagesTabContent(): React.JSX.Element {
  const formImages = useProductFormImages();
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
      {resolvedImageManagerController ? (
        <ProductImageManagerControllerProvider value={resolvedImageManagerController}>
          <ProductImageManager />
        </ProductImageManagerControllerProvider>
      ) : (
        <ProductImageManager />
      )}
    </div>
  );
}
