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

interface ProductNoteState {
  draftNoteText: string;
  hasDraftChanges: boolean;
  isSavingNote: boolean;
  noteColor: string;
  noteModalOpen: boolean;
  resolvedNote: ResolvedProductNote | null;
  setDraftNoteText: Dispatch<SetStateAction<string>>;
  setIsSavingNote: Dispatch<SetStateAction<boolean>>;
  setNoteModalOpen: Dispatch<SetStateAction<boolean>>;
}

type SyncSavedProduct = (savedProduct: ProductWithImages, noteOverride?: ProductNoteValue) => void;
type Toast = ReturnType<typeof useToast>['toast'];

interface ProductNoteSaveOptions extends ProductNoteState {
  closeNoteModalIfRequested: (closeAfter: boolean) => void;
  productId: string;
  syncSavedProduct: SyncSavedProduct;
  toast: Toast;
}

function useProductNoteState(note: ProductNoteValue): ProductNoteState {
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [draftNoteText, setDraftNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const resolvedNote = useMemo((): ResolvedProductNote | null => resolveProductNote(note), [note]);
  const noteColor = resolvedNote?.color ?? DEFAULT_NOTE_COLOR;
  const hasDraftChanges = resolvedNote !== null && draftNoteText !== resolvedNote.text;

  useEffect(() => {
    if (noteModalOpen === true && resolvedNote !== null) {
      setDraftNoteText(resolvedNote.text);
    }
  }, [noteModalOpen, resolvedNote]);

  return {
    draftNoteText,
    hasDraftChanges,
    isSavingNote,
    noteColor,
    noteModalOpen,
    resolvedNote,
    setDraftNoteText,
    setIsSavingNote,
    setNoteModalOpen,
  };
}

function useSyncSavedProductNote(): SyncSavedProduct {
  const queryClient = useQueryClient();

  return useCallback(
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
}

function useProductNoteSave({
  closeNoteModalIfRequested,
  draftNoteText,
  isSavingNote,
  productId,
  resolvedNote,
  setIsSavingNote,
  setNoteModalOpen,
  syncSavedProduct,
  toast,
}: ProductNoteSaveOptions): ProductImageCellController['saveNote'] {
  return useCallback(
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
        logClientCatch(error, { source: 'ProductImageCell', action: 'saveNote', productId });
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
      setIsSavingNote,
      setNoteModalOpen,
      syncSavedProduct,
      toast,
    ]
  );
}

export function useProductImageCellController({
  imageUrl,
  note,
  productId,
}: ProductImageCellProps): ProductImageCellController {
  const { showPreview, updatePreview, hidePreview } = useProductImagePreview();
  const { toast } = useToast();
  const noteState = useProductNoteState(note);
  const syncSavedProduct = useSyncSavedProductNote();

  const unoptimized = useMemo(
    (): boolean => (hasImageUrl(imageUrl) ? shouldSkipOptimization(imageUrl) : false),
    [imageUrl]
  );

  const closeNoteModalIfRequested = useCallback((closeAfter: boolean): void => {
    if (closeAfter === true) noteState.setNoteModalOpen(false);
  }, [noteState]);

  const saveNote = useProductNoteSave({
    ...noteState,
    closeNoteModalIfRequested,
    productId,
    syncSavedProduct,
    toast,
  });

  const cancelNoteModal = useCallback((): void => {
    if (noteState.resolvedNote !== null) {
      noteState.setDraftNoteText(noteState.resolvedNote.text);
    }
    noteState.setNoteModalOpen(false);
  }, [noteState]);

  const openNoteModal = useCallback((text: string): void => {
    hidePreview();
    noteState.setDraftNoteText(text);
    noteState.setNoteModalOpen(true);
  }, [hidePreview, noteState]);

  return {
    cancelNoteModal,
    draftNoteText: noteState.draftNoteText,
    hasDraftChanges: noteState.hasDraftChanges,
    hidePreview,
    isSavingNote: noteState.isSavingNote,
    noteColor: noteState.noteColor,
    noteModalOpen: noteState.noteModalOpen,
    openNoteModal,
    resolvedNote: noteState.resolvedNote,
    saveNote,
    setDraftNoteText: noteState.setDraftNoteText,
    showPreview,
    unoptimized,
    updatePreview,
  };
}
