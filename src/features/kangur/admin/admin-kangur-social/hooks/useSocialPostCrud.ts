'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/features/kangur/shared/ui';
import {
  useDeleteKangurSocialPost,
  usePatchKangurSocialPost,
  usePublishKangurSocialPost,
  useSaveKangurSocialPost,
  useUnpublishKangurSocialPost,
  type KangurSocialPublishMode,
} from '@/features/kangur/ui/hooks/useKangurSocialPosts';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  buildKangurSocialPostCombinedBody,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import { ApiError } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ImageFileSelection } from '@/shared/contracts/files';

import { parseDatetimeLocal, type EditorState } from '../AdminKangurSocialPage.Constants';

type SocialPostCrudDeps = {
  activePost: KangurSocialPost | null;
  activePostId: string | null;
  setActivePostId: (value: string | null | ((prev: string | null) => string | null)) => void;
  editorState: EditorState;
  scheduledAt: string;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  resolveDocReferences: () => string[];
  linkedinConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

export function useSocialPostCrud(deps: SocialPostCrudDeps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const saveMutation = useSaveKangurSocialPost();
  const patchMutation = usePatchKangurSocialPost();
  const deleteMutation = useDeleteKangurSocialPost();
  const publishMutation = usePublishKangurSocialPost();
  const unpublishMutation = useUnpublishKangurSocialPost();

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [unpublishingPostId, setUnpublishingPostId] = useState<string | null>(null);

  const clearDeleteError = (): void => {
    setDeleteError(null);
  };

  const handleCreateDraft = async (): Promise<KangurSocialPost | null> => {
    trackKangurClientEvent('kangur_social_post_create_attempt', deps.buildSocialContext());
    try {
      const created = await saveMutation.mutateAsync({});
      deps.setActivePostId(created.id);
      trackKangurClientEvent(
        'kangur_social_post_create_success',
        deps.buildSocialContext({ postId: created.id })
      );
      return created;
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'createDraft',
        ...deps.buildSocialContext(),
      });
      trackKangurClientEvent(
        'kangur_social_post_create_failed',
        deps.buildSocialContext({ error: true })
      );
      return null;
    }
  };

  const handleDeletePost = async (postId: string): Promise<void> => {
    if (!postId) return;
    setDeleteError(null);
    const queryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });
    const wasActive = deps.activePostId === postId;
    const previousPosts = queryClient.getQueryData<KangurSocialPost[]>(queryKey) ?? [];
    const nextPosts = previousPosts.filter((post) => post.id !== postId);
    queryClient.setQueryData(queryKey, nextPosts);
    deps.setActivePostId((current) => (current === postId ? nextPosts[0]?.id ?? null : current));
    trackKangurClientEvent(
      'kangur_social_post_delete_attempt',
      deps.buildSocialContext({ postId })
    );
    try {
      await deleteMutation.mutateAsync(postId);
      toast('Draft deleted.', { variant: 'success' });
      trackKangurClientEvent(
        'kangur_social_post_delete_success',
        deps.buildSocialContext({ postId })
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        let refreshedPosts: KangurSocialPost[] | null = null;
        try {
          const refetchResult = await queryClient.fetchQuery<KangurSocialPost[]>({
            queryKey,
            staleTime: 0,
          });
          refreshedPosts = refetchResult ?? null;
        } catch {
          refreshedPosts = null;
        }
        const effectivePosts = refreshedPosts ?? previousPosts;
        const stillExists = effectivePosts.some((post) => post.id === postId);
        if (!refreshedPosts) {
          queryClient.setQueryData(queryKey, previousPosts);
        }
        if (stillExists) {
          deps.setActivePostId((current) => {
            if (wasActive && effectivePosts.some((post) => post.id === postId)) {
              return postId;
            }
            if (current && effectivePosts.some((post) => post.id === current)) {
              return current;
            }
            return effectivePosts[0]?.id ?? null;
          });
          const message = 'Failed to delete draft.';
          setDeleteError(message);
          toast(message, { variant: 'error' });
          throw new Error(message);
        }
        trackKangurClientEvent(
          'kangur_social_post_delete_not_found',
          deps.buildSocialContext({ postId })
        );
        return;
      }
      queryClient.setQueryData(queryKey, previousPosts);
      deps.setActivePostId((current) => {
        if (current && previousPosts.some((post) => post.id === current)) {
          return current;
        }
        return previousPosts[0]?.id ?? null;
      });
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'deletePost',
        ...deps.buildSocialContext({ postId }),
      });
      const message = error instanceof Error ? error.message : 'Failed to delete draft.';
      setDeleteError(message);
      toast(message, { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_post_delete_failed',
        deps.buildSocialContext({ postId, error: true })
      );
      throw error;
    }
  };

  const handleQuickPublishPost = async (
    postId: string,
    mode: KangurSocialPublishMode = 'published',
    options?: { skipImages?: boolean }
  ): Promise<void> => {
    if (!postId) return;
    if (publishMutation.isPending || publishingPostId) return;
    setPublishingPostId(postId);
    try {
      const published = await publishMutation.mutateAsync({ id: postId, mode, skipImages: options?.skipImages });
      const queryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });
      queryClient.setQueryData<KangurSocialPost[]>(queryKey, (current) => {
        const entries = current ?? [];
        return entries.map((entry) => (entry.id === published.id ? published : entry));
      });
      toast(
        mode === 'draft' ? 'Draft sent to LinkedIn.' : 'Published to LinkedIn.',
        { variant: 'success' }
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'quickPublish',
        ...deps.buildSocialContext({ postId, publishMode: mode }),
      });
      const message =
        error instanceof Error
          ? error.message
          : mode === 'draft'
            ? 'Failed to publish draft.'
            : 'Failed to publish post.';
      toast(message, { variant: 'error' });
      throw error;
    } finally {
      setPublishingPostId(null);
    }
  };

  const handleUnpublishPost = async (
    postId: string,
    options?: { keepLocal?: boolean }
  ): Promise<void> => {
    if (!postId) return;
    if (unpublishMutation.isPending || unpublishingPostId) return;
    const keepLocal = options?.keepLocal ?? false;
    setUnpublishingPostId(postId);
    try {
      const result = await unpublishMutation.mutateAsync({ id: postId, keepLocal });
      const queryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });

      if (keepLocal) {
        queryClient.setQueryData<KangurSocialPost[]>(queryKey, (current) => {
          const entries = current ?? [];
          return entries.map((entry) => (entry.id === result.id ? result : entry));
        });
        toast('Unpublished from LinkedIn. Post kept as draft.', { variant: 'success' });
      } else {
        let nextEntries: KangurSocialPost[] = [];
        queryClient.setQueryData<KangurSocialPost[]>(queryKey, (current) => {
          const entries = current ?? [];
          nextEntries = entries.filter((entry) => entry.id !== result.id);
          return nextEntries;
        });
        deps.setActivePostId((current) =>
          current === postId ? nextEntries[0]?.id ?? null : current
        );
        toast('Post unpublished and removed.', { variant: 'success' });
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'unpublishPost',
        ...deps.buildSocialContext({ postId }),
      });
      const message = error instanceof Error ? error.message : 'Failed to unpublish post.';
      toast(message, { variant: 'error' });
      throw error;
    } finally {
      setUnpublishingPostId(null);
    }
  };

  const handleSave = async (nextStatus: KangurSocialPost['status']): Promise<void> => {
    if (!deps.activePost) return;
    const combinedBody = buildKangurSocialPostCombinedBody(
      deps.editorState.bodyPl,
      deps.editorState.bodyEn
    );
    trackKangurClientEvent(
      'kangur_social_post_save_attempt',
      deps.buildSocialContext({ nextStatus })
    );
    try {
      await patchMutation.mutateAsync({
        id: deps.activePost.id,
        updates: {
          ...deps.editorState,
          combinedBody,
          status: nextStatus,
          scheduledAt: nextStatus === 'scheduled' ? parseDatetimeLocal(deps.scheduledAt) : null,
          imageAssets: deps.imageAssets,
          imageAddonIds: deps.imageAddonIds,
          docReferences: deps.resolveDocReferences(),
          linkedinConnectionId: deps.linkedinConnectionId ?? null,
          brainModelId: deps.brainModelId ?? null,
          visionModelId: deps.visionModelId ?? null,
          publishError: null,
        },
      });
      trackKangurClientEvent(
        'kangur_social_post_save_success',
        deps.buildSocialContext({ nextStatus })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'savePost',
        ...deps.buildSocialContext({ nextStatus }),
      });
      trackKangurClientEvent(
        'kangur_social_post_save_failed',
        deps.buildSocialContext({ nextStatus, error: true })
      );
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!deps.activePost) return;
    const combinedBody = buildKangurSocialPostCombinedBody(
      deps.editorState.bodyPl,
      deps.editorState.bodyEn
    );
    trackKangurClientEvent(
      'kangur_social_post_publish_attempt',
      deps.buildSocialContext()
    );
    let stage: 'prepare' | 'publish' = 'prepare';
    try {
      await patchMutation.mutateAsync({
        id: deps.activePost.id,
        updates: {
          ...deps.editorState,
          combinedBody,
          scheduledAt: parseDatetimeLocal(deps.scheduledAt),
          imageAssets: deps.imageAssets,
          imageAddonIds: deps.imageAddonIds,
          docReferences: deps.resolveDocReferences(),
          linkedinConnectionId: deps.linkedinConnectionId ?? null,
          brainModelId: deps.brainModelId ?? null,
          visionModelId: deps.visionModelId ?? null,
          publishError: null,
        },
      });
      stage = 'publish';
      await publishMutation.mutateAsync({ id: deps.activePost.id, mode: 'published' });
      trackKangurClientEvent(
        'kangur_social_post_publish_success',
        deps.buildSocialContext()
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'publishPost',
        stage,
        ...deps.buildSocialContext(),
      });
      trackKangurClientEvent(
        'kangur_social_post_publish_failed',
        deps.buildSocialContext({ stage, error: true })
      );
    }
  };

  return {
    saveMutation,
    patchMutation,
    deleteMutation,
    publishMutation,
    unpublishMutation,
    deleteError,
    clearDeleteError,
    publishingPostId,
    unpublishingPostId,
    handleCreateDraft,
    handleDeletePost,
    handleQuickPublishPost,
    handleUnpublishPost,
    handleSave,
    handlePublish,
  };
}
