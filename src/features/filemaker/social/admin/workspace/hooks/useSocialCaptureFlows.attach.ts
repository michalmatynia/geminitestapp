'use client';

import { useCallback } from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';

import { mergeSocialPostSelectedAddons } from '../social-post-image-assets';
import type {
  AttachBatchCaptureResult,
  SocialCaptureFlowsProps,
} from './useSocialCaptureFlows.types';

const readPatchedImageAddonIds = (patched: unknown, fallback: string[]): string[] => {
  const value = (patched as { imageAddonIds?: unknown }).imageAddonIds;

  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return value;
  }

  return fallback;
};

const readPatchedImageAssets = (
  patched: unknown,
  fallback: ImageFileSelection[]
): ImageFileSelection[] => {
  const value = (patched as { imageAssets?: unknown }).imageAssets;

  if (Array.isArray(value)) {
    return value as ImageFileSelection[];
  }

  return fallback;
};

export const useAttachBatchCaptureResultToActiveDraft = ({
  crud,
  editor,
}: Pick<SocialCaptureFlowsProps, 'crud' | 'editor'>): AttachBatchCaptureResult =>
  useCallback(
    async (result) => {
      if (editor.activePost === null || result.addons.length === 0) {
        return null;
      }

      const resultAddonIds = new Set(result.addons.map((addon) => addon.id));
      const knownAddons = [
        ...result.addons,
        ...editor.recentAddons.filter((addon) => !resultAddonIds.has(addon.id)),
      ];
      const nextImageState = mergeSocialPostSelectedAddons({
        imageAssets: editor.imageAssets,
        imageAddonIds: editor.imageAddonIds,
        recentAddons: knownAddons,
        nextAddons: result.addons,
      });
      const nextImageAddonIds = nextImageState.imageAddonIds;
      const nextImageAssets = nextImageState.imageAssets;

      const patched = await crud.patchMutation.mutateAsync({
        id: editor.activePost.id,
        updates: {
          imageAddonIds: nextImageAddonIds,
          imageAssets: nextImageAssets,
        },
      });

      const imageAddonIds = readPatchedImageAddonIds(patched, nextImageAddonIds);
      const imageAssets = readPatchedImageAssets(patched, nextImageAssets);

      editor.setImageAddonIds(imageAddonIds);
      editor.setImageAssets(imageAssets);

      return {
        imageAddonIds,
        imageAssets,
      };
    },
    [
      crud.patchMutation,
      editor.activePost,
      editor.imageAddonIds,
      editor.imageAssets,
      editor.recentAddons,
      editor.setImageAddonIds,
      editor.setImageAssets,
    ]
  );
