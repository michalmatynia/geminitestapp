'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useToast } from '@/features/kangur/shared/ui';
import {
  fetchKangurSocialPosts,
  useDeleteKangurSocialPost,
  usePatchKangurSocialPost,
  usePublishKangurSocialPost,
  useSaveKangurSocialPost,
  useUnpublishKangurSocialPost,
} from '@/features/kangur/social/hooks/useKangurSocialPosts';
import {
  isExpectedKangurClientError,
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  buildKangurSocialPostCombinedBody,
  kangurSocialPostSchema,
  type KangurSocialPost,
  type KangurSocialPublishMode,
} from '@/shared/contracts/kangur-social-posts';
import { ApiError } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';

import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';

import { parseDatetimeLocal, type EditorState } from '../AdminKangurSocialPage.Constants';
import { resolveSocialPostImageState } from '../social-post-image-assets';

type SocialPostCrudDeps = {
  activePost: KangurSocialPost | null;
  activePostId: string | null;
  setActivePostId: (value: string | null | ((prev: string | null) => string | null)) => void;
  editorState: EditorState;
  scheduledAt: string;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  recentAddons: KangurSocialImageAddon[];
  resolveDocReferences: () => string[];
  linkedinConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

const socialPostUpdateSchema = kangurSocialPostSchema.partial();
const KANGUR_SOCIAL_ADMIN_POSTS_QUERY_KEY = QUERY_KEYS.kangur.socialPosts({
  scope: 'admin',
  limit: null,
});

const SOCIAL_POST_FIELD_LABELS: Record<string, string> = {
  titlePl: 'Polish title',
  titleEn: 'English title',
  bodyPl: 'Polish body',
  bodyEn: 'English body',
  combinedBody: 'Combined body',
  scheduledAt: 'Scheduled publish time',
  imageAssets: 'Attached images',
  imageAddonIds: 'Image add-ons',
  docReferences: 'Documentation references',
  linkedinConnectionId: 'LinkedIn connection',
  brainModelId: 'Post model',
  visionModelId: 'Vision model',
};

const formatSocialPostValidationError = (error: z.ZodError): string => {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return 'Review the post fields and try again.';
  }

  const firstPathSegment = firstIssue.path[0];
  const fieldKey =
    typeof firstPathSegment === 'string' || typeof firstPathSegment === 'number'
      ? String(firstPathSegment)
      : '';
  const fieldLabel = SOCIAL_POST_FIELD_LABELS[fieldKey];
  const issueMessage = firstIssue.message.trim();

  if (!fieldLabel) {
    return issueMessage || 'Review the post fields and try again.';
  }

  return issueMessage ? `${fieldLabel}: ${issueMessage}` : `${fieldLabel} is invalid.`;
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

  const recoverSavedPublishError = async (postId: string): Promise<string | null> => {
    try {
      const refreshedPosts =
        (await fetchQueryV2<KangurSocialPost[]>(queryClient, {
          queryKey: KANGUR_SOCIAL_ADMIN_POSTS_QUERY_KEY,
          queryFn: async () =>
            fetchKangurSocialPosts({
              scope: 'admin',
            }),
          staleTime: 0,
          meta: {
            source: 'kangur.admin.social.useSocialPostCrud.publishErrorRecovery',
            operation: 'list',
            resource: 'kangur.social-posts',
            domain: 'kangur',
            queryKey: KANGUR_SOCIAL_ADMIN_POSTS_QUERY_KEY,
            tags: ['kangur', 'social-posts'],
            description: 'Refetches social posts after LinkedIn publish failure.',
          },
        })()) ?? null;
      const refreshedPost = refreshedPosts?.find((entry) => entry.id === postId) ?? null;
      const publishError = refreshedPost?.publishError?.trim() ?? '';
      return publishError || null;
    } catch {
      return null;
    }
  };

  const buildValidatedPostUpdates = (
    nextStatus: KangurSocialPost['status']
  ): Partial<KangurSocialPost> | null => {
    const resolvedImageState = resolveSocialPostImageState({
      imageAssets: deps.imageAssets,
      imageAddonIds: deps.imageAddonIds,
      recentAddons: deps.recentAddons,
    });
    const updates: Partial<KangurSocialPost> = {
      ...deps.editorState,
      combinedBody: buildKangurSocialPostCombinedBody(
        deps.editorState.bodyPl,
        deps.editorState.bodyEn
      ),
      status: nextStatus,
      scheduledAt: nextStatus === 'scheduled' ? parseDatetimeLocal(deps.scheduledAt) : null,
      imageAssets: resolvedImageState.imageAssets,
      imageAddonIds: resolvedImageState.imageAddonIds,
      docReferences: deps.resolveDocReferences(),
      linkedinConnectionId: deps.linkedinConnectionId ?? null,
      brainModelId: deps.brainModelId ?? null,
      visionModelId: deps.visionModelId ?? null,
      publishError: null,
    };

    const parsed = socialPostUpdateSchema.safeParse(updates);
    if (parsed.success) {
      return parsed.data;
    }

    toast(formatSocialPostValidationError(parsed.error), { variant: 'error' });
    return null;
  };

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
    trackKangurClientEvent(
      'kangur_social_post_delete_attempt',
      deps.buildSocialContext({ postId })
    );
    try {
      await deleteMutation.mutateAsync(postId);
      const currentPosts = queryClient.getQueryData<KangurSocialPost[]>(queryKey) ?? previousPosts;
      const nextPosts = currentPosts.filter((post) => post.id !== postId);
      queryClient.setQueryData(queryKey, nextPosts);
      deps.setActivePostId((current) => (current === postId ? nextPosts[0]?.id ?? null : current));
      toast('Draft deleted.', { variant: 'success' });
      trackKangurClientEvent(
        'kangur_social_post_delete_success',
        deps.buildSocialContext({ postId })
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        let refreshedPosts: KangurSocialPost[] | null = null;
        try {
          const refetchResult = await fetchQueryV2<KangurSocialPost[]>(queryClient, {
            queryKey,
            queryFn: async () =>
              fetchKangurSocialPosts({
                scope: 'admin',
              }),
            staleTime: 0,
            meta: {
              source: 'kangur.admin.social.useSocialPostCrud.deletePost',
              operation: 'list',
              resource: 'kangur.social-posts',
              domain: 'kangur',
              queryKey,
              tags: ['kangur', 'social-posts'],
              description: 'Refetches social posts after 404 on delete.',
            },
          })();
          refreshedPosts = refetchResult ?? null;
        } catch {
          refreshedPosts = null;
        }
        const effectivePosts = refreshedPosts ?? previousPosts;
        const stillExists = effectivePosts.some((post) => post.id === postId);
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
        queryClient.setQueryData(queryKey, effectivePosts);
        deps.setActivePostId((current) => (current === postId ? effectivePosts[0]?.id ?? null : current));
        trackKangurClientEvent(
          'kangur_social_post_delete_not_found',
          deps.buildSocialContext({ postId })
        );
        return;
      }
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
      const savedPublishError = await recoverSavedPublishError(postId);
      const message =
        savedPublishError ??
        (error instanceof Error
          ? error.message
          : mode === 'draft'
            ? 'Failed to publish draft.'
            : 'Failed to publish post.');
      const shouldReportClientError =
        !savedPublishError && !isExpectedKangurClientError(error);
      if (shouldReportClientError) {
        void ErrorSystem.captureException(error);
        logKangurClientError(error, {
          source: 'AdminKangurSocialPage',
          action: 'quickPublish',
          ...deps.buildSocialContext({ postId, publishMode: mode }),
        });
      }
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
    const updates = buildValidatedPostUpdates(nextStatus);
    if (!updates) {
      trackKangurClientEvent(
        'kangur_social_post_save_failed',
        deps.buildSocialContext({ nextStatus, error: true, validationError: true })
      );
      return;
    }
    trackKangurClientEvent(
      'kangur_social_post_save_attempt',
      deps.buildSocialContext({ nextStatus })
    );
    try {
      await patchMutation.mutateAsync({
        id: deps.activePost.id,
        updates,
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
      toast(error instanceof Error ? error.message : 'Failed to save draft.', {
        variant: 'error',
      });
      trackKangurClientEvent(
        'kangur_social_post_save_failed',
        deps.buildSocialContext({ nextStatus, error: true })
      );
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!deps.activePost) return;
    const updates = buildValidatedPostUpdates('scheduled');
    if (!updates) {
      trackKangurClientEvent(
        'kangur_social_post_publish_failed',
        deps.buildSocialContext({ stage: 'prepare', error: true, validationError: true })
      );
      return;
    }
    trackKangurClientEvent(
      'kangur_social_post_publish_attempt',
      deps.buildSocialContext()
    );
    let stage: 'prepare' | 'publish' = 'prepare';
    try {
      await patchMutation.mutateAsync({
        id: deps.activePost.id,
        updates,
      });
      stage = 'publish';
      await publishMutation.mutateAsync({ id: deps.activePost.id, mode: 'published' });
      trackKangurClientEvent(
        'kangur_social_post_publish_success',
        deps.buildSocialContext()
      );
    } catch (error) {
      const savedPublishError =
        stage === 'publish' ? await recoverSavedPublishError(deps.activePost.id) : null;
      const message =
        savedPublishError ??
        (error instanceof Error
          ? error.message
          : stage === 'prepare'
            ? 'Failed to prepare the post for publishing.'
            : 'Failed to publish post.');
      const shouldReportClientError =
        !savedPublishError && !isExpectedKangurClientError(error);
      if (shouldReportClientError) {
        void ErrorSystem.captureException(error);
        logKangurClientError(error, {
          source: 'AdminKangurSocialPage',
          action: 'publishPost',
          stage,
          ...deps.buildSocialContext(),
        });
      }
      toast(message, { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_post_publish_failed',
        deps.buildSocialContext({
          stage,
          error: true,
          ...(savedPublishError ? { recoveredPublishError: true } : {}),
        })
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
