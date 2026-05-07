'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { useProductImagePreview } from '@/features/products/context/ProductImagePreviewContext';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui/toast';

import {
  DEFAULT_NOTE_COLOR,
  applySavedProductNoteOverride,
  hasImageUrl,
  mergeProductIntoListCache,
  resolveProductNote,
  shouldSkipOptimization,
  type ProductImageCellProps,
  type ProductListCacheValue,
  type ProductNoteValue,
  type ResolvedProductNote,
} from './ProductImageCell.helpers';
import {
  hasProductNoteDraftChanges,
  useProductNoteSave,
  type ProductNoteState,
  type SaveNoteOptions,
  type SyncSavedProduct,
} from './ProductImageCell.note-save';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export interface ProductImageCellController {
  cancelNoteModal: () => void;
  draftNoteColor: string;
  draftNoteText: string;
  hasDraftChanges: boolean;
  hidePreview: ReturnType<typeof useProductImagePreview>['hidePreview'];
  isSavingNote: boolean;
  noteColor: string;
  noteModalOpen: boolean;
  openNoteModal: (text: string) => void;
  resolvedNote: ResolvedProductNote | null;
  saveNote: (options?: SaveNoteOptions) => Promise<void>;
  setDraftNoteColor: Dispatch<SetStateAction<string>>;
  setDraftNoteText: Dispatch<SetStateAction<string>>;
  showPreview: ReturnType<typeof useProductImagePreview>['showPreview'];
  unoptimized: boolean;
  updatePreview: ReturnType<typeof useProductImagePreview>['updatePreview'];
}

function useProductNoteState(note: ProductNoteValue): ProductNoteState {
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [draftNoteText, setDraftNoteText] = useState('');
  const [draftNoteColor, setDraftNoteColor] = useState(DEFAULT_NOTE_COLOR);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const resolvedNote = useMemo((): ResolvedProductNote | null => resolveProductNote(note), [note]);
  const noteColor = resolvedNote?.color ?? DEFAULT_NOTE_COLOR;
  const hasDraftChanges = hasProductNoteDraftChanges({
    draftNoteColor,
    draftNoteText,
    resolvedNote,
  });

  useEffect(() => {
    if (noteModalOpen === false) return;
    if (resolvedNote !== null) {
      setDraftNoteText(resolvedNote.text);
    }
    setDraftNoteColor(noteColor);
  }, [noteColor, noteModalOpen, resolvedNote]);

  return {
    draftNoteColor,
    draftNoteText,
    hasDraftChanges,
    isSavingNote,
    noteColor: draftNoteColor,
    noteModalOpen,
    resolvedNote,
    setDraftNoteColor,
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
      noteState.setDraftNoteColor(noteState.resolvedNote.color);
      noteState.setDraftNoteText(noteState.resolvedNote.text);
    } else {
      noteState.setDraftNoteColor(DEFAULT_NOTE_COLOR);
      noteState.setDraftNoteText('');
    }
    noteState.setNoteModalOpen(false);
  }, [noteState]);

  const openNoteModal = useCallback((text: string): void => {
    hidePreview();
    noteState.setDraftNoteColor(noteState.resolvedNote?.color ?? DEFAULT_NOTE_COLOR);
    noteState.setDraftNoteText(text);
    noteState.setNoteModalOpen(true);
  }, [hidePreview, noteState]);

  return {
    cancelNoteModal,
    draftNoteColor: noteState.draftNoteColor,
    draftNoteText: noteState.draftNoteText,
    hasDraftChanges: noteState.hasDraftChanges,
    hidePreview,
    isSavingNote: noteState.isSavingNote,
    noteColor: noteState.noteColor,
    noteModalOpen: noteState.noteModalOpen,
    openNoteModal,
    resolvedNote: noteState.resolvedNote,
    saveNote,
    setDraftNoteColor: noteState.setDraftNoteColor,
    setDraftNoteText: noteState.setDraftNoteText,
    showPreview,
    unoptimized,
    updatePreview,
  };
}
