'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { ImageFileSelection } from '@/shared/contracts/files';
import { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import { DebugInfo } from '@/shared/contracts/products/drafts';
import { internalError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useOptionalProductImageManagerController } from './ProductImageManagerControllerContext';


import type {
  ProductImageManagerUIActionsContextValue,
  ProductImageManagerUIStateContextValue,
  SlotViewMode,
} from './ProductImageManagerUIContext.types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type {
  ProductImageManagerUIActionsContextValue,
  ProductImageManagerUIContextValue,
  ProductImageManagerUIStateContextValue,
  SlotViewMode,
} from './ProductImageManagerUIContext.types';

const productImageManagerUIStateContextResult =
  createStrictContext<ProductImageManagerUIStateContextValue>({
    hookName: 'useProductImageManagerUIState',
    providerName: 'ProductImageManagerUIProvider',
    displayName: 'ProductImageManagerUIStateContext',
    errorFactory: (message) => internalError(message),
  });

const productImageManagerUIActionsContextResult =
  createStrictContext<ProductImageManagerUIActionsContextValue>({
    hookName: 'useProductImageManagerUIActions',
    providerName: 'ProductImageManagerUIProvider',
    displayName: 'ProductImageManagerUIActionsContext',
    errorFactory: (message) => internalError(message),
  });

const ProductImageManagerUIStateContext = productImageManagerUIStateContextResult.Context;
const ProductImageManagerUIActionsContext = productImageManagerUIActionsContextResult.Context;
export const PRODUCT_IMAGE_MANAGER_DEBUG_ENABLED = process.env[
  'NEXT_PUBLIC_PRODUCT_IMAGE_MANAGER_DEBUG'
] === 'true';

export function ProductImageManagerUIProvider({
  children,
  explicitController,
  externalBaseUrl,
  productId,
  minimalUi = false,
  showDragHandle = true,
  minimalSingleSlotAlign = 'center',
}: {
  children: React.ReactNode;
  explicitController?: ProductImageManagerController;
  externalBaseUrl: string;
  productId?: string | null;
  minimalUi?: boolean;
  showDragHandle?: boolean;
  minimalSingleSlotAlign?: 'left' | 'center';
}) {
  const controllerContext = useOptionalProductImageManagerController();
  const controller: ProductImageManagerController | null =
    explicitController ?? controllerContext ?? null;

  if (!controller) {
    throw internalError(
      'ProductImageManagerUIProvider requires a controller via explicitController prop or ProductImageManagerControllerProvider.'
    );
  }

  const {
    imageSlots,
    imageLinks,
    imageBase64s,
    setImageLinkAt,
    setImageBase64At,
    handleSlotImageChange,
    handleSlotDisconnectImage,
    setShowFileManager,
    swapImageSlots,
    setImagesReordering,
  } = controller;

  const handleSlotFileSelect = controller.handleSlotFileSelect;
  const setShowFileManagerForSlot = controller.setShowFileManagerForSlot;
  const isSlotImageLocked = controller.isSlotImageLocked;
  const slotImageLockedReason = controller.slotImageLockedReason || 'Image is locked.';

  // UI State
  const [showDebug, setShowDebugState] = useState(PRODUCT_IMAGE_MANAGER_DEBUG_ENABLED);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [slotViewModes, setSlotViewModes] = useState<SlotViewMode[]>(
    Array(imageSlots.length).fill('upload')
  );
  const [base64LoadingSlots, setBase64LoadingSlots] = useState<Record<number, boolean>>({});
  const [linkToFileLoadingSlots, setLinkToFileLoadingSlots] = useState<Record<number, boolean>>({});

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Sync view modes when image source changes
  useEffect(() => {
    if (isReordering) return;
    setSlotViewModes((prev) => {
      const next = Array(imageSlots.length).fill('upload') as SlotViewMode[];
      let changed = next.length !== prev.length;

      for (let i = 0; i < imageSlots.length; i++) {
        const hasUpload = Boolean(imageSlots[i]);
        const hasLink = Boolean(imageLinks[i]?.trim());
        const hasBase64 = Boolean(imageBase64s[i]?.trim());
        const current = prev[i];

        const currentValid =
          (current === 'upload' && hasUpload) ||
          (current === 'link' && hasLink) ||
          (current === 'base64' && hasBase64);

        if (hasUpload && (hasLink || hasBase64)) {
          if (currentValid) next[i] = current;
          else if (hasBase64) next[i] = 'base64';
          else if (hasLink) next[i] = 'link';
          else next[i] = 'upload';
        } else if (hasBase64 && !hasUpload) {
          next[i] = 'base64';
        } else if (hasLink && !hasUpload) {
          next[i] = 'link';
        } else {
          next[i] = 'upload';
        }
        if (next[i] !== current) changed = true;
      }
      return changed ? next : prev;
    });
  }, [imageSlots, imageLinks, imageBase64s, isReordering]);

  // Handlers
  const pushDebug = useCallback((info: Omit<DebugInfo, 'timestamp'>) => {
    if (!PRODUCT_IMAGE_MANAGER_DEBUG_ENABLED) return;
    setDebugInfo({ ...info, timestamp: new Date().toISOString() });
  }, []);

  const setShowDebug = useCallback((value: boolean) => {
    if (!PRODUCT_IMAGE_MANAGER_DEBUG_ENABLED) return;
    setShowDebugState(value);
  }, []);

  const setSlotViewMode = useCallback((index: number, mode: SlotViewMode) => {
    setSlotViewModes((prev) => {
      const next = [...prev];
      next[index] = mode;
      return next;
    });
  }, []);

  const triggerFileManager = useCallback(
    (index: number) => {
      if (index < 0 || index >= imageSlots.length) return;
      if (setShowFileManagerForSlot) setShowFileManagerForSlot(index);
      else setShowFileManager(true);
    },
    [imageSlots.length, setShowFileManagerForSlot, setShowFileManager]
  );

  const handleSlotFileUpload = useCallback(
    (slotIndex: number, files: File[]) => {
      if (files.length === 0) return;
      let nextSearchIndex = slotIndex + 1;
      files.forEach((file, fileIndex) => {
        const targetIndex =
          fileIndex === 0
            ? slotIndex
            : (() => {
              for (let i = nextSearchIndex; i < imageSlots.length; i++) {
                if (imageSlots[i] === null) {
                  nextSearchIndex = i + 1;
                  return i;
                }
              }
              return -1;
            })();
        if (targetIndex < 0) return;
        try {
          handleSlotImageChange(file, targetIndex);
        } catch (error: unknown) {
          logClientError(error);
          const message = error instanceof Error ? error.message : String(error);
          pushDebug({ action: 'file-change', message, slotIndex: targetIndex });
        }
      });
    },
    [imageSlots, handleSlotImageChange, pushDebug]
  );

  const convertSlotToBase64 = useCallback(
    async (index: number) => {
      const slot = imageSlots[index];
      const linkValue = imageLinks[index] ?? '';
      const base64Value = imageBase64s[index] ?? '';
      const displayUrl = slot?.previewUrl || (linkValue.trim() ? linkValue : '');

      if (!slot && !displayUrl && !base64Value.trim()) return;

      try {
        setBase64LoadingSlots((prev) => ({ ...prev, [index]: true }));
        let dataUrl = base64Value.trim();

        if (!dataUrl && linkValue.trim().startsWith('data:')) {
          dataUrl = linkValue.trim();
        } else if (!dataUrl && slot?.type === 'file') {
          const reader = new FileReader();
          dataUrl = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Read failed'));
            reader.readAsDataURL(slot.data as File);
          });
        } else if (!dataUrl && displayUrl) {
          const res = await fetch(displayUrl);
          const blob = await res.blob();
          dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Read failed'));
            reader.readAsDataURL(blob);
          });
        }

        setImageBase64At(index, dataUrl);
        setSlotViewMode(index, 'base64');
      } catch (error: unknown) {
        logClientError(error);
        const message = error instanceof Error ? error.message : String(error);
        pushDebug({ action: 'base64-convert', message, slotIndex: index });
      } finally {
        setBase64LoadingSlots((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    },
    [imageSlots, imageLinks, imageBase64s, setImageBase64At, setSlotViewMode, pushDebug]
  );

  const convertAllSlotsToBase64 = useCallback(async () => {
    for (let i = 0; i < imageSlots.length; i++) {
      if (imageSlots[i] || (imageLinks[i] ?? '').trim()) {
        await convertSlotToBase64(i);
      }
    }
  }, [imageSlots, imageLinks, convertSlotToBase64]);

  const convertLinkToFile = useCallback(
    async (index: number) => {
      const linkValue = (imageLinks[index] ?? '').trim();
      if (!linkValue) return;

      try {
        setLinkToFileLoadingSlots((prev) => ({ ...prev, [index]: true }));

        if (productId && handleSlotFileSelect && !linkValue.toLowerCase().startsWith('data:')) {
          const result = await api.post<{ status: 'ok'; imageFile: ImageFileSelection }>(
            `/api/v2/products/${encodeURIComponent(productId)}/images/link-to-file`,
            { url: linkValue }
          );
          handleSlotFileSelect(result.imageFile, index);
        } else {
          const res = await fetch(linkValue);
          const blob = await res.blob();
          const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
          handleSlotImageChange(file, index);
        }
        setImageLinkAt(index, '');
        setSlotViewMode(index, 'upload');
      } catch (error: unknown) {
        logClientError(error);
        const message = error instanceof Error ? error.message : String(error);
        pushDebug({ action: 'link-to-file', message, slotIndex: index });
      } finally {
        setLinkToFileLoadingSlots((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    },
    [
      imageLinks,
      productId,
      handleSlotFileSelect,
      handleSlotImageChange,
      setImageLinkAt,
      setSlotViewMode,
      pushDebug,
    ]
  );

  const clearVisibleImage = useCallback(
    async (index: number) => {
      if (isSlotImageLocked?.(index)) {
        pushDebug({ action: 'remove-image', message: slotImageLockedReason, slotIndex: index });
        return;
      }
      if (imageSlots[index]) {
        await handleSlotDisconnectImage(index);
      } else {
        if (imageBase64s[index]) setImageBase64At(index, '');
        if (imageLinks[index]) setImageLinkAt(index, '');
      }
      setSlotViewMode(index, 'upload');
    },
    [
      isSlotImageLocked,
      imageSlots,
      handleSlotDisconnectImage,
      imageBase64s,
      imageLinks,
      setImageBase64At,
      setImageLinkAt,
      setSlotViewMode,
      pushDebug,
      slotImageLockedReason,
    ]
  );

  // Drag and Drop
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      if (!imageSlots[index]) return;
      setDraggedIndex(index);
      setIsReordering(true);
      setImagesReordering(true);
      e.dataTransfer.setData('text/plain', String(index));
    },
    [imageSlots, setImagesReordering]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsReordering(false);
    setImagesReordering(false);
  }, [setImagesReordering]);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== index && dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex, dragOverIndex]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX: x, clientY: y } = e;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      const fromIndexRaw = e.dataTransfer.getData('text/plain');
      const fromIndex = parseInt(fromIndexRaw, 10);
      if (isNaN(fromIndex) || fromIndex === toIndex) return;

      swapImageSlots(fromIndex, toIndex);
      setSlotViewModes((prev) => {
        const next = [...prev];
        const temp = next[fromIndex]!;
        next[fromIndex] = next[toIndex]!;
        next[toIndex] = temp;
        return next;
      });
      handleDragEnd();
    },
    [swapImageSlots, handleDragEnd]
  );

  const stateValue = useMemo(
    (): ProductImageManagerUIStateContextValue => ({
      slotViewModes,
      base64LoadingSlots,
      linkToFileLoadingSlots,
      draggedIndex,
      dragOverIndex,
      isReordering,
      debugInfo: PRODUCT_IMAGE_MANAGER_DEBUG_ENABLED ? debugInfo : null,
      showDebug: PRODUCT_IMAGE_MANAGER_DEBUG_ENABLED ? showDebug : false,
      externalBaseUrl,
      minimalUi,
      showDragHandle,
      minimalSingleSlotAlign,
      controller,
    }),
    [
      slotViewModes,
      base64LoadingSlots,
      linkToFileLoadingSlots,
      draggedIndex,
      dragOverIndex,
      isReordering,
      debugInfo,
      showDebug,
      externalBaseUrl,
      minimalUi,
      showDragHandle,
      minimalSingleSlotAlign,
      controller,
    ]
  );
  const actionsValue = useMemo(
    (): ProductImageManagerUIActionsContextValue => ({
      setSlotViewMode,
      setShowDebug,
      pushDebug,
      convertSlotToBase64,
      convertAllSlotsToBase64,
      convertLinkToFile,
      triggerFileManager,
      handleSlotFileUpload,
      clearVisibleImage,
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragLeave,
      handleDrop,
    }),
    [
      setSlotViewMode,
      setShowDebug,
      pushDebug,
      convertSlotToBase64,
      convertAllSlotsToBase64,
      convertLinkToFile,
      triggerFileManager,
      handleSlotFileUpload,
      clearVisibleImage,
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragLeave,
      handleDrop,
    ]
  );

  return (
    <ProductImageManagerUIActionsContext.Provider value={actionsValue}>
      <ProductImageManagerUIStateContext.Provider value={stateValue}>
        {children}
      </ProductImageManagerUIStateContext.Provider>
    </ProductImageManagerUIActionsContext.Provider>
  );
}

export const useProductImageManagerUIState = productImageManagerUIStateContextResult.useStrictContext;

export const useProductImageManagerUIActions =
  productImageManagerUIActionsContextResult.useStrictContext;
