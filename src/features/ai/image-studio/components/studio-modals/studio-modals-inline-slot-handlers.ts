
import { asRecord } from './slot-inline-edit-utils';

import type {
  EnvironmentReferenceDraftViewModel,
  LinkedGeneratedVariantViewModel,
} from './slot-inline-edit-tab-types';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { Dispatch, SetStateAction } from 'react';

type Toast = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'warning' | 'info' | 'default' }
) => void;

type UpdateSlotMutationLike = {
  mutateAsync: (args: {
    id: string;
    data: Record<string, unknown>;
  }) => Promise<unknown>;
};

type InlineSlotHandlersDeps = {
  clearInlineSlotSyncTimeouts: () => void;
  environmentReferenceDraft: EnvironmentReferenceDraftViewModel;
  flushInlineSlotDraftSync: () => Promise<void>;
  isCardImageRemovalLocked: (slot: ImageStudioSlotRecord | null | undefined) => boolean;
  setLinkedVariantApplyBusyKey: Dispatch<SetStateAction<string | null>>;
  setSlotBase64Draft: (value: string) => void;
  setSlotImageUrlDraft: (value: string) => void;
  setSlotInlineEditOpen: (open: boolean) => void;
  setSlotUpdateBusy: (busy: boolean) => void;
  selectedSlot: ImageStudioSlotRecord | null;
  slotFolderDraft: string;
  slotNameDraft: string;
  slotsCount: number;
  toast: Toast;
  updateSlotMutation: UpdateSlotMutationLike;
};

type InlineSlotHandlers = {
  handleSaveInlineSlot: () => Promise<void>;
  handleClearSlotImage: () => Promise<void>;
  handleApplyLinkedVariantToCard: (variant: LinkedGeneratedVariantViewModel) => Promise<void>;
};

export const createInlineSlotHandlers = (
  deps: InlineSlotHandlersDeps
): InlineSlotHandlers => {
  const handleSaveInlineSlot = async (): Promise<void> => {
    if (!deps.selectedSlot) return;
    deps.setSlotUpdateBusy(true);
    try {
      await deps.flushInlineSlotDraftSync();
      const baseMetadata = asRecord(deps.selectedSlot.metadata)
        ? { ...(deps.selectedSlot.metadata as Record<string, unknown>) }
        : {};
      const hasEnvironmentReference = Boolean(
        deps.environmentReferenceDraft.imageFileId ||
        deps.environmentReferenceDraft.imageUrl.trim()
      );
      if (hasEnvironmentReference) {
        baseMetadata['environmentReference'] = {
          imageFileId: deps.environmentReferenceDraft.imageFileId,
          imageUrl: deps.environmentReferenceDraft.imageUrl.trim(),
          filename: deps.environmentReferenceDraft.filename.trim() || null,
          mimetype: deps.environmentReferenceDraft.mimetype.trim() || null,
          size: deps.environmentReferenceDraft.size,
          width: deps.environmentReferenceDraft.width,
          height: deps.environmentReferenceDraft.height,
          updatedAt: deps.environmentReferenceDraft.updatedAt ?? new Date().toISOString(),
        };
      } else {
        delete baseMetadata['environmentReference'];
      }

      await deps.updateSlotMutation.mutateAsync({
        id: deps.selectedSlot.id,
        data: {
          name: deps.slotNameDraft.trim() || deps.selectedSlot.name || `Card ${deps.slotsCount + 1}`,
          folderPath: deps.slotFolderDraft.trim(),
          metadata: Object.keys(baseMetadata).length > 0 ? baseMetadata : null,
        },
      });
      deps.setSlotInlineEditOpen(false);
      deps.toast('Card updated.', { variant: 'success' });
    } catch (error: unknown) {
      deps.toast(error instanceof Error ? error.message : 'Failed to update card', { variant: 'error' });
    } finally {
      deps.setSlotUpdateBusy(false);
    }
  };

  const handleClearSlotImage = async (): Promise<void> => {
    if (!deps.selectedSlot) return;
    if (deps.isCardImageRemovalLocked(deps.selectedSlot)) {
      deps.toast('Card image is locked and can only be removed by deleting the card.', { variant: 'warning' });
      return;
    }
    deps.setSlotUpdateBusy(true);
    try {
      deps.clearInlineSlotSyncTimeouts();
      await deps.updateSlotMutation.mutateAsync({
        id: deps.selectedSlot.id,
        data: {
          imageFileId: null,
          imageUrl: null,
          imageBase64: null,
        },
      });
      deps.setSlotImageUrlDraft('');
      deps.setSlotBase64Draft('');
      deps.toast('Card image cleared.', { variant: 'success' });
    } catch (error: unknown) {
      deps.toast(error instanceof Error ? error.message : 'Failed to clear card image', { variant: 'error' });
    } finally {
      deps.setSlotUpdateBusy(false);
    }
  };

  const handleApplyLinkedVariantToCard = async (
    variant: LinkedGeneratedVariantViewModel
  ): Promise<void> => {
    if (!deps.selectedSlot) return;
    deps.setLinkedVariantApplyBusyKey(variant.key);
    deps.setSlotUpdateBusy(true);
    try {
      deps.clearInlineSlotSyncTimeouts();
      await deps.updateSlotMutation.mutateAsync({
        id: deps.selectedSlot.id,
        data: {
          imageFileId: variant.output.id,
          imageUrl: variant.output.filepath,
          imageBase64: null,
        },
      });
      deps.setSlotImageUrlDraft(variant.output.filepath);
      deps.setSlotBase64Draft('');
      deps.toast('Linked variant applied to card.', { variant: 'success' });
    } catch (error: unknown) {
      deps.toast(error instanceof Error ? error.message : 'Failed to apply linked variant.', { variant: 'error' });
    } finally {
      deps.setLinkedVariantApplyBusyKey((current) => (current === variant.key ? null : current));
      deps.setSlotUpdateBusy(false);
    }
  };

  return {
    handleSaveInlineSlot,
    handleClearSlotImage,
    handleApplyLinkedVariantToCard,
  };
};
