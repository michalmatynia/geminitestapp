'use client';

import type { JSX } from 'react';

import type { DebugInfo } from '@/shared/contracts/products';
import { Button, Alert } from '@/shared/ui/primitives.public';

import {
  PRODUCT_IMAGE_MANAGER_DEBUG_ENABLED,
  useProductImageManagerUIActions,
  useProductImageManagerUIState,
} from './ProductImageManagerUIContext';

type ProductImageManagerHeaderContentProps = {
  chooseFileManagerButtonAriaLabel: string;
  chooseFileManagerButtonLabel: string;
  debugInfo: DebugInfo | null;
  imageSlotCount: number;
  onChooseFromFileManager?: (() => void) | undefined;
  onConvertAllSlotsToBase64: () => void;
  showChooseFromFileManagerButton: boolean;
  showDebug: boolean;
  uploadError: string | null | undefined;
};

const hasNonEmptyText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const defaultChooseFileManagerButtonAriaLabel = 'Choose multiple existing images for the product';
const defaultChooseFileManagerButtonLabel = 'Choose from File Manager';

const ProductImageManagerDebugAlert = (
  props: Pick<ProductImageManagerHeaderContentProps, 'debugInfo' | 'uploadError'>
): JSX.Element | null => {
  const { debugInfo, uploadError } = props;
  const hasUploadError = hasNonEmptyText(uploadError);

  if (!hasUploadError && debugInfo === null) return null;

  return (
    <Alert variant='error' className='mb-3 p-3 text-xs'>
      {hasUploadError ? <div>Upload error: {uploadError}</div> : null}
      {debugInfo === null ? null : (
        <div className='space-y-1 mt-2'>
          <div>
            Debug: {debugInfo.action} — {debugInfo.message}
          </div>
          <div className='text-[11px] text-red-300/80'>
            {debugInfo.timestamp}
            {debugInfo.slotIndex !== undefined ? ` · slot ${debugInfo.slotIndex + 1}` : ''}
            {hasNonEmptyText(debugInfo.filename) ? ` · ${debugInfo.filename}` : ''}
          </div>
        </div>
      )}
    </Alert>
  );
};

const ProductImageManagerHeaderContent = (
  props: ProductImageManagerHeaderContentProps
): JSX.Element => {
  const {
    chooseFileManagerButtonAriaLabel,
    chooseFileManagerButtonLabel,
    debugInfo,
    imageSlotCount,
    onChooseFromFileManager,
    onConvertAllSlotsToBase64,
    showChooseFromFileManagerButton,
    showDebug,
    uploadError,
  } = props;
  const showConvertAllButton = imageSlotCount > 1;
  const showChooseButton =
    showChooseFromFileManagerButton && onChooseFromFileManager !== undefined;
  const showActionsRow = showChooseButton || showConvertAllButton;

  return (
    <>
      {showActionsRow ? (
        <div className='mb-3 flex items-center justify-end gap-2'>
          {showChooseButton ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onChooseFromFileManager}
              aria-label={chooseFileManagerButtonAriaLabel}
              className='h-7 px-2 text-xs'
            >
              {chooseFileManagerButtonLabel}
            </Button>
          ) : null}
          {showConvertAllButton ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onConvertAllSlotsToBase64}
              className='h-7 px-2 text-xs'
            >
              Convert All to Base64
            </Button>
          ) : null}
        </div>
      ) : null}

      {showDebug ? (
        <ProductImageManagerDebugAlert debugInfo={debugInfo} uploadError={uploadError} />
      ) : null}
    </>
  );
};

const ProductImageManagerMinimalHeader = (
  props: Pick<ProductImageManagerHeaderContentProps, 'uploadError'>
): JSX.Element | null => {
  const { uploadError } = props;

  if (!PRODUCT_IMAGE_MANAGER_DEBUG_ENABLED) return null;
  if (!hasNonEmptyText(uploadError)) return null;

  return (
    <Alert variant='error' className='mb-2 p-2 text-[11px]'>
      {uploadError}
    </Alert>
  );
};

type ProductImageManagerHeaderProps = {
  chooseFileManagerButtonAriaLabel?: string;
  chooseFileManagerButtonLabel?: string;
  onChooseFromFileManager?: (() => void) | undefined;
  showChooseFromFileManagerButton?: boolean;
};

export function ProductImageManagerHeader(
  props: ProductImageManagerHeaderProps
): JSX.Element | null {
  const {
    chooseFileManagerButtonAriaLabel = defaultChooseFileManagerButtonAriaLabel,
    chooseFileManagerButtonLabel = defaultChooseFileManagerButtonLabel,
    onChooseFromFileManager,
    showChooseFromFileManagerButton = false,
  } = props;
  const { showDebug, debugInfo, controller, minimalUi } = useProductImageManagerUIState();
  const { convertAllSlotsToBase64 } = useProductImageManagerUIActions();

  const { imageSlots, uploadError } = controller;
  const handleConvertAllSlotsToBase64 = (): void => {
    convertAllSlotsToBase64().catch(() => undefined);
  };

  if (minimalUi) {
    return <ProductImageManagerMinimalHeader uploadError={uploadError} />;
  }

  return (
    <ProductImageManagerHeaderContent
      chooseFileManagerButtonAriaLabel={chooseFileManagerButtonAriaLabel}
      chooseFileManagerButtonLabel={chooseFileManagerButtonLabel}
      debugInfo={debugInfo}
      imageSlotCount={imageSlots.length}
      onChooseFromFileManager={onChooseFromFileManager}
      onConvertAllSlotsToBase64={handleConvertAllSlotsToBase64}
      showChooseFromFileManagerButton={showChooseFromFileManagerButton}
      showDebug={showDebug}
      uploadError={uploadError}
    />
  );
}
