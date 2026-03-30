'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/features/kangur/shared/ui';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { resolveSocialPostImageState } from '../social-post-image-assets';
import type { UseSocialMissingImageAddonsProps } from '../AdminKangurSocialPage.types';

export function useSocialMissingImageAddons({
  editor,
  crud,
  buildSocialContext,
}: UseSocialMissingImageAddonsProps) {
  const { toast } = useToast();
  const [missingImageAddonActionPending, setMissingImageAddonActionPending] = useState<
    'refresh' | 'remove' | null
  >(null);
  const [missingImageAddonActionErrorMessage, setMissingImageAddonActionErrorMessage] =
    useState<string | null>(null);

  const handleRefreshMissingImageAddons = useCallback(async (): Promise<void> => {
    setMissingImageAddonActionErrorMessage(null);
    setMissingImageAddonActionPending('refresh');

    try {
      const refreshTasks: Promise<unknown>[] = [];

      if (typeof editor.addonsQuery.refetch === 'function') {
        refreshTasks.push(Promise.resolve(editor.addonsQuery.refetch()));
      }
      if (typeof editor.postsQuery.refetch === 'function') {
        refreshTasks.push(Promise.resolve(editor.postsQuery.refetch()));
      }

      await Promise.all(refreshTasks);
      toast('Refreshed image add-ons for the current draft.', { variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to refresh the selected image add-ons.';
      setMissingImageAddonActionErrorMessage(message);
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'refreshMissingImageAddons',
        ...buildSocialContext({ error: true }),
      });
    } finally {
      setMissingImageAddonActionPending(null);
    }
  }, [
    buildSocialContext,
    editor.addonsQuery,
    editor.postsQuery,
    toast,
  ]);

  const handleRemoveMissingAddons = useCallback(async (): Promise<void> => {
    if (!editor.activePost || editor.missingSelectedImageAddonIds.length === 0) {
      return;
    }

    const removedAddonCount = editor.missingSelectedImageAddonIds.length;
    setMissingImageAddonActionErrorMessage(null);
    setMissingImageAddonActionPending('remove');

    try {
      const missingAddonIdSet = new Set(editor.missingSelectedImageAddonIds);
      const nextImageState = resolveSocialPostImageState({
        imageAssets: editor.imageAssets,
        imageAddonIds: editor.imageAddonIds.filter((addonId) => !missingAddonIdSet.has(addonId)),
        recentAddons: editor.recentAddons,
      });
      const patched = await crud.patchMutation.mutateAsync({
        id: editor.activePost.id,
        updates: {
          imageAddonIds: nextImageState.imageAddonIds,
          imageAssets: nextImageState.imageAssets,
        },
      });

      editor.setImageAddonIds(patched.imageAddonIds ?? nextImageState.imageAddonIds);
      editor.setImageAssets(patched.imageAssets ?? nextImageState.imageAssets);
      toast(
        removedAddonCount === 1
          ? 'Removed 1 missing image add-on from the current draft.'
          : `Removed ${removedAddonCount} missing image add-ons from the current draft.`,
        { variant: 'success' }
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to remove the missing image add-ons.';
      setMissingImageAddonActionErrorMessage(message);
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'removeMissingImageAddons',
        ...buildSocialContext({ error: true }),
      });
    } finally {
      setMissingImageAddonActionPending(null);
    }
  }, [
    buildSocialContext,
    crud.patchMutation,
    editor.activePost,
    editor.imageAddonIds,
    editor.imageAssets,
    editor.missingSelectedImageAddonIds,
    editor.recentAddons,
    editor.setImageAddonIds,
    editor.setImageAssets,
    toast,
  ]);

  return {
    missingImageAddonActionPending,
    missingImageAddonActionErrorMessage,
    handleRefreshMissingImageAddons,
    handleRemoveMissingAddons,
  };
}
