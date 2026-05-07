'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { updateProduct } from '@/features/products/api';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  DEFAULT_NOTE_COLOR,
  buildProductNoteUpdate,
  shouldCloseNoteModalAfterSave,
  type ProductNoteUpdate,
  type ProductNoteValue,
  type ResolvedProductNote,
} from './ProductImageCell.helpers';

export interface SaveNoteOptions {
  closeAfter?: boolean;
}

export interface ProductNoteState {
  draftNoteColor: string;
  draftNoteText: string;
  hasDraftChanges: boolean;
  isSavingNote: boolean;
  markNoteDeleted: () => void;
  noteColor: string;
  noteModalOpen: boolean;
  resolvedNote: ResolvedProductNote | null;
  setDraftNoteColor: Dispatch<SetStateAction<string>>;
  setDraftNoteText: Dispatch<SetStateAction<string>>;
  setIsSavingNote: Dispatch<SetStateAction<boolean>>;
  setNoteModalOpen: Dispatch<SetStateAction<boolean>>;
}

export type SyncSavedProduct = (
  savedProduct: ProductWithImages,
  noteOverride?: ProductNoteValue
) => void;

type Toast = ReturnType<typeof useToast>['toast'];

interface ProductNoteSaveOptions extends ProductNoteState {
  closeNoteModalIfRequested: (closeAfter: boolean) => void;
  productId: string;
  syncSavedProduct: SyncSavedProduct;
  toast: Toast;
}

interface ProductNoteSaveRequest {
  color: string;
  hasChanges: boolean;
  nextText: string;
}

interface ProductNoteSaveSuccessOptions {
  closeAfter: boolean;
  noteUpdate: ProductNoteUpdate;
  savedProduct: ProductWithImages;
  saveOptions: ProductNoteSaveOptions;
}

const normalizeDraftNoteColor = (color: string): string => {
  const trimmed = color.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_NOTE_COLOR;
};

export const hasProductNoteDraftChanges = ({
  draftNoteColor,
  draftNoteText,
  resolvedNote,
}: Pick<ProductNoteState, 'draftNoteColor' | 'draftNoteText' | 'resolvedNote'>): boolean => {
  const nextText = draftNoteText.trim();
  const nextColor = normalizeDraftNoteColor(draftNoteColor);
  if (resolvedNote === null) return nextText.length > 0;
  return nextText !== resolvedNote.text || nextColor !== resolvedNote.color;
};

function resolveProductNoteSaveRequest({
  draftNoteColor,
  draftNoteText,
  resolvedNote,
}: Pick<
  ProductNoteSaveOptions,
  'draftNoteColor' | 'draftNoteText' | 'resolvedNote'
>): ProductNoteSaveRequest {
  const nextText = draftNoteText.trim();
  const nextColor = normalizeDraftNoteColor(draftNoteColor);
  return {
    color: nextColor,
    hasChanges: hasProductNoteDraftChanges({ draftNoteColor: nextColor, draftNoteText, resolvedNote }),
    nextText,
  };
}

function applyProductNoteSaveSuccess({
  closeAfter,
  noteUpdate,
  savedProduct,
  saveOptions,
}: ProductNoteSaveSuccessOptions): void {
  saveOptions.syncSavedProduct(savedProduct, noteUpdate.nextNotes);
  if (noteUpdate.hasText === false) {
    saveOptions.markNoteDeleted();
  }
  saveOptions.toast(noteUpdate.toastMessage, { variant: 'success' });
  if (shouldCloseNoteModalAfterSave(closeAfter, noteUpdate.hasText)) {
    saveOptions.setNoteModalOpen(false);
  }
}

export function useProductNoteSave(
  saveOptions: ProductNoteSaveOptions
): (options?: SaveNoteOptions) => Promise<void> {
  return useCallback(async (options: SaveNoteOptions = {}): Promise<void> => {
    const closeAfter = options.closeAfter === true;
    if (saveOptions.isSavingNote === true) {
      saveOptions.closeNoteModalIfRequested(closeAfter);
      return;
    }
    const saveRequest = resolveProductNoteSaveRequest(saveOptions);
    if (saveRequest.hasChanges === false) {
      saveOptions.closeNoteModalIfRequested(closeAfter);
      return;
    }
    try {
      saveOptions.setIsSavingNote(true);
      const noteUpdate = buildProductNoteUpdate(
        saveRequest.nextText,
        saveRequest.color,
        saveOptions.resolvedNote !== null
      );
      const savedProduct = await updateProduct(saveOptions.productId, noteUpdate.payload);
      applyProductNoteSaveSuccess({ closeAfter, noteUpdate, savedProduct, saveOptions });
    } catch (error) {
      logClientCatch(error, {
        source: 'ProductImageCell',
        action: 'saveNote',
        productId: saveOptions.productId,
      });
      saveOptions.toast(error instanceof Error ? error.message : 'Failed to update product note', {
        variant: 'error',
      });
    } finally {
      saveOptions.setIsSavingNote(false);
    }
  }, [saveOptions]);
}
