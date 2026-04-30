'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';
import { ProductImageManager, ProductImageManagerControllerProvider } from '@/shared/ui/image-slot-manager';
import type { ProductImageManagerController } from '@/shared/ui/image-slot-manager';

import {
  useOptionalProductImagesTabActionsContext,
  useOptionalProductImagesTabStateContext,
  type ProductImagesTabActionsContextValue,
  type ProductImagesTabStateContextValue,
} from './ProductImagesTabContext';

const FileManager = dynamic(() => import('@/features/files/public').then((mod) => mod.default), {
  ssr: false,
});

type ProductFormImagesContextValue = ReturnType<typeof useProductFormImages>;
type OnSelectFiles = NonNullable<ProductImagesTabActionsContextValue['onSelectFiles']>;

interface ProductImagesTabModel {
  chooseButtonAriaLabel: string;
  chooseButtonLabel: string;
  imageExternalBaseUrl: string | null;
  imageManagerController: ProductImageManagerController;
  inlineFileManager: boolean;
  onSelectFiles?: OnSelectFiles | undefined;
  onShowFileManager: (show: boolean) => void;
  productId: string | undefined;
  sectionDescription: string;
  sectionTitle: string;
  showFileManager: boolean;
}

type ProductImagesTabTextOptions = Pick<
  ProductImagesTabModel,
  'chooseButtonAriaLabel' | 'chooseButtonLabel' | 'sectionDescription' | 'sectionTitle'
>;

const resolveChooseButtonAriaLabel = (
  stateContext: ProductImagesTabStateContextValue | null
): string =>
  stateContext?.chooseButtonAriaLabel ?? 'Choose multiple existing images for the product';

const resolveChooseButtonLabel = (
  stateContext: ProductImagesTabStateContextValue | null
): string => stateContext?.chooseButtonLabel ?? 'Choose from File Manager';

const resolveSectionDescription = (
  stateContext: ProductImagesTabStateContextValue | null
): string =>
  stateContext?.sectionDescription ??
  'Upload directly from any slot (single or multi-select), or pick existing files from the platform library.';

const resolveSectionTitle = (stateContext: ProductImagesTabStateContextValue | null): string =>
  stateContext?.sectionTitle ?? 'Image Source';

const resolveTextOptions = (
  stateContext: ProductImagesTabStateContextValue | null
): ProductImagesTabTextOptions => ({
  chooseButtonAriaLabel: resolveChooseButtonAriaLabel(stateContext),
  chooseButtonLabel: resolveChooseButtonLabel(stateContext),
  sectionDescription: resolveSectionDescription(stateContext),
  sectionTitle: resolveSectionTitle(stateContext),
});

const resolveImageManagerController = (
  stateContext: ProductImagesTabStateContextValue | null,
  fallbackImageManagerController: ProductImageManagerController
): ProductImageManagerController =>
  stateContext?.imageManagerController ?? fallbackImageManagerController;

const resolveInlineFileManager = (
  stateContext: ProductImagesTabStateContextValue | null
): boolean => stateContext?.inlineFileManager ?? false;

const resolveOnSelectFiles = (
  actionsContext: ProductImagesTabActionsContextValue | null
): OnSelectFiles | undefined => actionsContext?.onSelectFiles;

const resolveOnShowFileManager = (
  actionsContext: ProductImagesTabActionsContextValue | null,
  formImages: ProductFormImagesContextValue
): ((show: boolean) => void) => actionsContext?.onShowFileManager ?? formImages.setShowFileManager;

const resolveShowFileManager = (
  stateContext: ProductImagesTabStateContextValue | null,
  formImages: ProductFormImagesContextValue
): boolean => stateContext?.showFileManager ?? formImages.showFileManager;

const resolveControllerOptions = ({
  actionsContext,
  fallbackImageManagerController,
  formImages,
  imageExternalBaseUrl,
  stateContext,
}: {
  actionsContext: ProductImagesTabActionsContextValue | null;
  fallbackImageManagerController: ProductImageManagerController;
  formImages: ProductFormImagesContextValue;
  imageExternalBaseUrl: string | null;
  stateContext: ProductImagesTabStateContextValue | null;
}): Omit<ProductImagesTabModel, keyof ProductImagesTabTextOptions> => ({
  imageExternalBaseUrl,
  imageManagerController: resolveImageManagerController(
    stateContext,
    fallbackImageManagerController
  ),
  inlineFileManager: resolveInlineFileManager(stateContext),
  onSelectFiles: resolveOnSelectFiles(actionsContext),
  onShowFileManager: resolveOnShowFileManager(actionsContext, formImages),
  productId: formImages.productId,
  showFileManager: resolveShowFileManager(stateContext, formImages),
});

const useFallbackImageManagerController = (
  formImages: ProductFormImagesContextValue
): ProductImageManagerController =>
  useMemo<ProductImageManagerController>(
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

function useProductImagesTabModel(): ProductImagesTabModel {
  const formImages = useProductFormImages();
  const { imageExternalBaseUrl } = useProductSettings();
  const imagesTabStateContext = useOptionalProductImagesTabStateContext();
  const imagesTabActionsContext = useOptionalProductImagesTabActionsContext();
  const fallbackImageManagerController = useFallbackImageManagerController(formImages);

  return {
    ...resolveTextOptions(imagesTabStateContext),
    ...resolveControllerOptions({
      actionsContext: imagesTabActionsContext,
      fallbackImageManagerController,
      formImages,
      imageExternalBaseUrl,
      stateContext: imagesTabStateContext,
    }),
  };
}

function InlineFileManagerView({
  onSelectFiles,
  onShowFileManager,
}: {
  onSelectFiles: (files: ImageFileSelection[]) => void;
  onShowFileManager: (show: boolean) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <Button type='button' variant='outline' onClick={(): void => onShowFileManager(false)}>
          Back to Images
        </Button>
      </div>
      <FileManager onSelectFile={onSelectFiles} />
    </div>
  );
}

function ImageSourceSection({
  model,
}: {
  model: ProductImagesTabModel;
}): React.JSX.Element {
  return (
    <FormSection title={model.sectionTitle} description={model.sectionDescription}>
      <div className='flex space-x-4'>
        <Button
          type='button'
          variant='outline'
          onClick={(): void => model.onShowFileManager(true)}
          aria-label={model.chooseButtonAriaLabel}
        >
          {model.chooseButtonLabel}
        </Button>
      </div>
    </FormSection>
  );
}

function ProductImagesDefaultView({ model }: { model: ProductImagesTabModel }): React.JSX.Element {
  return (
    <div className='space-y-6'>
      <ImageSourceSection model={model} />
      <ProductImageManagerControllerProvider value={model.imageManagerController}>
        <ProductImageManager
          externalBaseUrl={model.imageExternalBaseUrl}
          productId={model.productId}
        />
      </ProductImageManagerControllerProvider>
    </div>
  );
}

export function ProductImagesTabContent(): React.JSX.Element {
  const model = useProductImagesTabModel();

  if (
    model.inlineFileManager === true &&
    model.showFileManager === true &&
    model.onSelectFiles !== undefined
  ) {
    return (
      <InlineFileManagerView
        onSelectFiles={model.onSelectFiles}
        onShowFileManager={model.onShowFileManager}
      />
    );
  }

  return <ProductImagesDefaultView model={model} />;
}
