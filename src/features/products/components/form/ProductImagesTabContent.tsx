'use client';

import dynamic from 'next/dynamic';
import { useContext } from 'react';

import ProductImageManager, {
  type ProductImageManagerController,
} from '@/features/products/components/ProductImageManager';
import { ProductImageManagerControllerProvider } from '@/features/products/components/ProductImageManagerControllerContext';
import { ProductFormContext } from '@/features/products/context/ProductFormContext';
import { internalError } from '@/shared/errors/app-error';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import { Button, FormSection } from '@/shared/ui';

import { useOptionalProductImagesTabContext } from './ProductImagesTabContext';

const FileManager = dynamic(() => import('@/features/files/components/FileManager'), {
  ssr: false,
});

type ProductImagesTabContentProps = {
  showFileManager?: boolean | undefined;
  onShowFileManager?: ((show: boolean) => void) | undefined;
  onSelectFiles?: (files: ImageFileSelection[]) => void;
  imageManagerController?: ProductImageManagerController;
  inlineFileManager?: boolean;
  sectionTitle?: string;
  sectionDescription?: string;
  chooseButtonLabel?: string;
  chooseButtonAriaLabel?: string;
};

export function ProductImagesTabContent({
  showFileManager: showFileManagerProp,
  onShowFileManager: onShowFileManagerProp,
  onSelectFiles,
  imageManagerController,
  inlineFileManager: inlineFileManagerProp,
  sectionTitle: sectionTitleProp,
  sectionDescription: sectionDescriptionProp,
  chooseButtonLabel: chooseButtonLabelProp,
  chooseButtonAriaLabel: chooseButtonAriaLabelProp,
}: ProductImagesTabContentProps): React.JSX.Element {
  const formContext = useContext(ProductFormContext);
  const imagesTabContext = useOptionalProductImagesTabContext();
  const showFileManager =
    showFileManagerProp ??
    imagesTabContext?.showFileManager ??
    formContext?.showFileManager ??
    false;
  const onShowFileManager =
    onShowFileManagerProp ??
    imagesTabContext?.onShowFileManager ??
    formContext?.setShowFileManager ??
    null;
  const resolvedOnSelectFiles = onSelectFiles ?? imagesTabContext?.onSelectFiles;
  const resolvedImageManagerController =
    imageManagerController ?? imagesTabContext?.imageManagerController;
  const inlineFileManager =
    inlineFileManagerProp ?? imagesTabContext?.inlineFileManager ?? false;
  const sectionTitle = sectionTitleProp ?? imagesTabContext?.sectionTitle ?? 'Image Source';
  const sectionDescription =
    sectionDescriptionProp ??
    imagesTabContext?.sectionDescription ??
    'Upload directly from any slot (single or multi-select), or pick existing files from the platform library.';
  const chooseButtonLabel =
    chooseButtonLabelProp ??
    imagesTabContext?.chooseButtonLabel ??
    'Choose from File Manager';
  const chooseButtonAriaLabel =
    chooseButtonAriaLabelProp ??
    imagesTabContext?.chooseButtonAriaLabel ??
    'Choose multiple existing images for the product';

  if (!onShowFileManager) {
    throw internalError(
      'ProductImagesTabContent requires `onShowFileManager` prop when used outside ProductFormContext.'
    );
  }

  if (inlineFileManager && showFileManager && resolvedOnSelectFiles) {
    return (
      <div className='space-y-4'>
        <div className='flex justify-end'>
          <Button
            type='button'
            variant='outline'
            onClick={(): void => onShowFileManager(false)}
          >
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
