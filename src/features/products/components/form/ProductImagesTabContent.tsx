'use client';

import dynamic from 'next/dynamic';
import { useContext } from 'react';

import ProductImageManager, {
  type ProductImageManagerController,
} from '@/features/products/components/ProductImageManager';
import { ProductFormContext } from '@/features/products/context/ProductFormContext';
import { internalError } from '@/shared/errors/app-error';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import { Button, FormSection } from '@/shared/ui';

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
  inlineFileManager = false,
  sectionTitle = 'Image Source',
  sectionDescription = 'Upload directly from any slot (single or multi-select), or pick existing files from the platform library.',
  chooseButtonLabel = 'Choose from File Manager',
  chooseButtonAriaLabel = 'Choose multiple existing images for the product',
}: ProductImagesTabContentProps): React.JSX.Element {
  const formContext = useContext(ProductFormContext);
  const showFileManager = showFileManagerProp ?? formContext?.showFileManager ?? false;
  const onShowFileManager = onShowFileManagerProp ?? formContext?.setShowFileManager ?? null;

  if (!onShowFileManager) {
    throw internalError(
      'ProductImagesTabContent requires `onShowFileManager` prop when used outside ProductFormContext.'
    );
  }

  if (inlineFileManager && showFileManager && onSelectFiles) {
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
        <FileManager onSelectFile={onSelectFiles} />
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
      <ProductImageManager
        {...(imageManagerController ? { controller: imageManagerController } : {})}
      />
    </div>
  );
}
