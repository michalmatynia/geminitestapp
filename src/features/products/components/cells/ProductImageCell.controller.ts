'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { updateProduct } from '@/features/products/api';
import { useProductImagePreview } from '@/features/products/context/ProductImagePreviewContext';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  DEFAULT_NOTE_COLOR,
  applySavedProductNoteOverride,
  buildProductNoteUpdate,
  hasImageUrl,
  mergeProductIntoListCache,
  resolveProductNote,
  shouldCloseNoteModalAfterSave,
  shouldSkipOptimization,
  type ProductImageCellProps,
  type ProductListCacheValue,
  type ProductNoteValue,
  type ResolvedProductNote,
} from './ProductImageCell.helpers';
import type { ProductWithImages } from '@/shared/contracts/products/product';

interface SaveNoteOptions {
  closeAfter?: boolean;
}

export interface ProductImageCellController {
  cancelNoteModal: () => void;
  draftNoteText: string;
  hasDraftChanges: boolean;
  hidePreview: ReturnType<typeof useProductImagePreview>['hidePreview'];
  isSavingNote: boolean;
  noteColor: string;
  noteModalOpen: boolean;
  openNoteModal: (text: string) => void;
  resolvedNote: ResolvedProductNote | null;
  saveNote: (options?: SaveNoteOptions) => Promise<void>;
  setDraftNoteText: Dispatch<SetStateAction<string>>;
  showPreview: ReturnType<typeof useProductImagePreview>['showPreview'];
  unoptimized: boolean;
  updatePreview: ReturnType<typeof useProductImagePreview>['updatePreview'];
}

export function useProductImageCellController({
  imageUrl,
  note,
  productId,
}: ProductImageCellProps): ProductImageCellController {
  const { showPreview, updatePreview, hidePreview } = useProductImagePreview();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [draftNoteText, setDraftNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const unoptimized = useMemo(
    (): boolean => (hasImageUrl(imageUrl) ? shouldSkipOptimization(imageUrl) : false),
    [imageUrl]
  );
  const resolvedNote = useMemo((): ResolvedProductNote | null => resolveProductNote(note), [note]);
  const noteColor = resolvedNote?.color ?? DEFAULT_NOTE_COLOR;
  const hasDraftChanges = resolvedNote !== null && draftNoteText !== resolvedNote.text;

  useEffect(() => {
    if (noteModalOpen === true && resolvedNote !== null) {
      setDraftNoteText(resolvedNote.text);
    }
  }, [noteModalOpen, resolvedNote]);

  const syncSavedProduct = useCallback(
    (savedProduct: ProductWithImages, noteOverride?: ProductNoteValue): void => {
      const mergedSavedProduct = applySavedProductNoteOverride(savedProduct, noteOverride);
      queryClient.setQueriesData(
        { queryKey: QUERY_KEYS.products.lists() },
        (old: ProductListCacheValue) => mergeProductIntoListCache(old, mergedSavedProduct)
      );
      queryClient.setQueryData(QUERY_KEYS.products.detail(savedProduct.id), mergedSavedProduct);
      queryClient.setQueryData(QUERY_KEYS.products.detailEdit(savedProduct.id), mergedSavedProduct);
    },
    [queryClient]
  );

  const closeNoteModalIfRequested = useCallback((closeAfter: boolean): void => {
    if (closeAfter === true) setNoteModalOpen(false);
  }, []);

  const saveNote = useCallback(
    async (options: SaveNoteOptions = {}): Promise<void> => {
      const closeAfter = options.closeAfter === true;
      if (resolvedNote === null) {
        closeNoteModalIfRequested(closeAfter);
        return;
      }
      if (isSavingNote === true) {
        closeNoteModalIfRequested(closeAfter);
        return;
      }

      const nextText = draftNoteText.trim();
      if (nextText === resolvedNote.text) {
        closeNoteModalIfRequested(closeAfter);
        return;
      }

      try {
        setIsSavingNote(true);
        const noteUpdate = buildProductNoteUpdate(nextText, resolvedNote.color);
        const savedProduct = await updateProduct(productId, noteUpdate.payload);
        syncSavedProduct(savedProduct, noteUpdate.nextNotes);
        toast(noteUpdate.toastMessage, { variant: 'success' });
        if (shouldCloseNoteModalAfterSave(closeAfter, noteUpdate.hasText)) setNoteModalOpen(false);
      } catch (error) {
        logClientCatch(error, {
          source: 'ProductImageCell',
          action: 'saveNote',
          productId,
        });
        toast(error instanceof Error ? error.message : 'Failed to update product note', {
          variant: 'error',
        });
      } finally {
        setIsSavingNote(false);
      }
    },
    [
      closeNoteModalIfRequested,
      draftNoteText,
      isSavingNote,
      productId,
      resolvedNote,
      syncSavedProduct,
      toast,
    ]
  );

  const cancelNoteModal = useCallback((): void => {
    if (resolvedNote !== null) {
      setDraftNoteText(resolvedNote.text);
    }
    setNoteModalOpen(false);
  }, [resolvedNote]);

  const openNoteModal = useCallback((text: string): void => {
    hidePreview();
    setDraftNoteText(text);
    setNoteModalOpen(true);
  }, [hidePreview]);

  return {
    cancelNoteModal,
    draftNoteText,
    hasDraftChanges,
    hidePreview,
    isSavingNote,
    noteColor,
    noteModalOpen,
    openNoteModal,
    resolvedNote,
    saveNote,
    setDraftNoteText,
    showPreview,
    unoptimized,
    updatePreview,
  };
}
