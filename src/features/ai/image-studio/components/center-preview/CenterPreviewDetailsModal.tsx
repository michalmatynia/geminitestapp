'use client';

import React, { useCallback, useMemo } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { getImageStudioSlotImageSrc } from '@/features/ai/image-studio/utils/image-src';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/shared/lib/products/constants';

import { useCenterPreviewContext } from './CenterPreviewContext';
import { useSlotsState } from '../../context/SlotsContext';
import { buildDetailsNodeForCenterPreview } from './variant-thumbnails';
import { VersionNodeDetailsModal } from '../VersionNodeDetailsModal';
import { VersionNodeDetailsModalRuntimeProvider } from '../VersionNodeDetailsModalRuntimeContext';

export function CenterPreviewDetailsModal(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const { slots } = useSlotsState();
  const { detailsSlotId, setDetailsSlotId } = useCenterPreviewContext();

  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const detailsSlot = useMemo(
    () => (detailsSlotId ? (slots.find((slot) => slot.id === detailsSlotId) ?? null) : null),
    [detailsSlotId, slots]
  );

  const detailsNode = useMemo(
    () => buildDetailsNodeForCenterPreview(detailsSlot, slots),
    [detailsSlot, slots]
  );

  const getSlotImageSrc = useCallback(
    (slot: ImageStudioSlotRecord): string | null =>
      getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl),
    [productImagesExternalBaseUrl]
  );

  const handleCloseDetails = useCallback((): void => {
    setDetailsSlotId(null);
  }, [setDetailsSlotId]);

  const detailsModalRuntimeValue = useMemo(
    () => ({
      isOpen: Boolean(detailsNode),
      item: detailsNode,
      onClose: handleCloseDetails,
      getSlotImageSrc,
    }),
    [detailsNode, handleCloseDetails, getSlotImageSrc]
  );

  return (
    <VersionNodeDetailsModalRuntimeProvider value={detailsModalRuntimeValue}>
      <VersionNodeDetailsModal />
    </VersionNodeDetailsModalRuntimeProvider>
  );
}
