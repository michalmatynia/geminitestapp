import { useMemo } from 'react';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import type { ProductFormImageContextType } from '@/features/products/context/ProductFormImageContext';

import type { DraftCreatorFormContextValue } from './DraftCreatorFormContext';
import {
  DEFAULT_DRAFT_ICON_COLOR,
  normalizeIconColor,
} from './DraftCreator.save';
import type { useDraftCreatorForm } from '../hooks/useDraftCreatorForm';

type DraftCreatorFormRuntime = ReturnType<typeof useDraftCreatorForm>;
type DraftCreatorImages = DraftCreatorFormRuntime['images'];

export const useDraftCreatorImageManagerController = (
  images: DraftCreatorImages
): ProductImageManagerController =>
  useMemo<ProductImageManagerController>(
    () => ({
      imageSlots: images.imageSlots,
      imageLinks: images.imageLinks,
      imageBase64s: images.imageBase64s,
      setImageLinkAt: images.setImageLinkAt,
      setImageBase64At: images.setImageBase64At,
      handleSlotImageChange: images.handleSlotImageChange,
      handleSlotFileSelect: images.handleSlotFileSelect,
      handleSlotDisconnectImage: images.handleSlotDisconnectImage,
      setShowFileManager: images.setShowFileManager,
      swapImageSlots: images.swapImageSlots,
      setImagesReordering: images.setImagesReordering,
      uploadError: null,
    }),
    [images]
  );

export const useDraftCreatorProductImageContextValue = (
  images: DraftCreatorImages
): ProductFormImageContextType =>
  useMemo<ProductFormImageContextType>(
    () => ({
      imageSlots: images.imageSlots,
      imageLinks: images.imageLinks,
      imageBase64s: images.imageBase64s,
      productId: null,
      uploading: false,
      uploadError: null,
      uploadSuccess: false,
      showFileManager: images.showFileManager,
      setShowFileManager: images.setShowFileManager,
      handleSlotImageChange: images.handleSlotImageChange,
      handleSlotFileSelect: images.handleSlotFileSelect,
      handleSlotDisconnectImage: images.handleSlotDisconnectImage,
      handleMultiImageChange: images.handleMultiImageChange,
      handleMultiFileSelect: images.handleMultiFileSelect,
      swapImageSlots: images.swapImageSlots,
      setImageLinkAt: images.setImageLinkAt,
      setImageBase64At: images.setImageBase64At,
      setImagesReordering: images.setImagesReordering,
      refreshImagesFromProduct: images.refreshFromProduct,
    }),
    [images]
  );

export const useDraftCreatorFormContextValue = (
  form: DraftCreatorFormRuntime,
  imageManagerController: ProductImageManagerController
): DraftCreatorFormContextValue => {
  const { images, metadata, queries, state } = form;
  const resolvedIconColor = normalizeIconColor(state.iconColor) ?? DEFAULT_DRAFT_ICON_COLOR;
  return useMemo<DraftCreatorFormContextValue>(
    () => ({
      ...state,
      ...queries,
      ...metadata,
      ...images,
      resolvedIconColor,
      openIconLibrary: () => state.setIsIconLibraryOpen(true),
      imageManagerController,
    }),
    [state, queries, metadata, images, resolvedIconColor, imageManagerController]
  );
};
