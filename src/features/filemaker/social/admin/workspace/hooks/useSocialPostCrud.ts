'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type z } from 'zod';

import { useToast } from '@/shared/ui';
import {
  fetchSocialPublishingPosts,
  useDeleteSocialPublishingPost,
  usePatchSocialPublishingPost,
  usePublishSocialPublishingPost,
  useSaveSocialPublishingPost,
  useUnpublishSocialPublishingPost,
} from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import {
  isExpectedSocialPublishingClientError,
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';
import {
  buildSocialPublishingPostCombinedBody,
  hasSocialPublishingPublication,
  socialPublishingPostSchema,
  type SocialPublishingPost,
  type SocialPublishingPublishMode,
} from '@/shared/contracts/social-publishing-posts';
import { ApiError } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';

import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';

import { parseDatetimeLocal, type EditorState } from '../SocialPublishingPage.Constants';
import { resolveSocialPostImageState } from '../social-post-image-assets';

type SocialPostCrudDeps = {
  activePost: SocialPublishingPost | null;
  activePostId: string | null;
  setActivePostId: (value: string | null | ((prev: string | null) => string | null)) => void;
  editorState: EditorState;
  scheduledAt: string;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  recentAddons: SocialPublishingImageAddon[];
  resolveDocReferences: () => string[];
  publishingConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

const socialPostUpdateSchema = socialPublishingPostSchema.partial();
const SOCIAL_PUBLISHING_ADMIN_POSTS_QUERY_KEY = QUERY_KEYS.socialPublishing.posts({
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
  publishingConnectionId: 'Publishing connection',
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

const resolvePublishSuccessToast = (mode: SocialPublishingPublishMode): string =>
  mode === 'draft' ? 'Draft sent to publishing channel.' : 'Published.';

const ALREADY_PUBLISHED_TOAST = 'This post is already published. Unpublish it before publishing again.';
const ALREADY_PUBLISHED_SCHEDULE_TOAST =
  'This post is already published. Unpublish it before scheduling again.';

const didRecoverSuccessfulPublish = (
  post: SocialPublishingPost | null,
  mode: SocialPublishingPublishMode
): boolean => {
  if (!post || post.publishError?.trim()) {
    return false;
  }

  if (mode === 'draft') {
    return (
      post.status === 'draft' &&
      Boolean(post.publishedPostId?.trim() || post.publishedUrl?.trim())
    );
  }

  return hasSocialPublishingPublication(post);
};

export function useSocialPostCrud(deps: SocialPostCrudDeps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const saveMutation = useSaveSocialPublishingPost();
  const patchMutation = usePatchSocialPublishingPost();
  const deleteMutation = useDeleteSocialPublishingPost();
  const publishMutation = usePublishSocialPublishingPost();
  const unpublishMutation = useUnpublishSocialPublishingPost();

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [unpublishingPostId, setUnpublishingPostId] = useState<string | null>(null);

  const syncPostInCache = (post: SocialPublishingPost): void => {
    queryClient.setQueryData<SocialPublishingPost[] | undefined>(
      SOCIAL_PUBLISHING_ADMIN_POSTS_QUERY_KEY,
      (current) => {
        if (!current) {
          return current;
        }

        const nextEntries = current.map((entry) => (entry.id === post.id ? post : entry));
        return nextEntries.some((entry) => entry.id === post.id)
          ? nextEntries
          : [post, ...current];
      }
    );
  };

  const recoverRefreshedPost = async (postId: string): Promise<SocialPublishingPost | null> => {
    try {
      const refreshedPosts =
        (await fetchQueryV2<SocialPublishingPost[]>(queryClient, {
          queryKey: SOCIAL_PUBLISHING_ADMIN_POSTS_QUERY_KEY,
          queryFn: async () =>
            fetchSocialPublishingPosts({
              scope: 'admin',
            }),
          staleTime: 0,
          meta: {
            source: 'social-publishing.admin.useSocialPostCrud.publishErrorRecovery',
            operation: 'list',
            resource: 'social-publishing.posts',
            domain: 'social-publishing',
            queryKey: SOCIAL_PUBLISHING_ADMIN_POSTS_QUERY_KEY,
            tags: ['social-publishing', 'posts'],
            description: 'Refetches social posts after publish failure.',
          },
        })()) ?? null;
      return refreshedPosts?.find((entry) => entry.id === postId) ?? null;
    } catch {
      return null;
    }
  };

  const buildValidatedPostUpdates = (
    nextStatus: SocialPublishingPost['status']
  ): Partial<SocialPublishingPost> | null => {
    const shouldKeepPublishedStatus =
      nextStatus === 'draft' && hasSocialPublishingPublication(deps.activePost);
    const resolvedImageState = resolveSocialPostImageState({
      imageAssets: deps.imageAssets,
      imageAddonIds: deps.imageAddonIds,
      recentAddons: deps.recentAddons,
    });
    const updates: Partial<SocialPublishingPost> = {
      ...deps.editorState,
      combinedBody: buildSocialPublishingPostCombinedBody(
        deps.editorState.bodyPl,
        deps.editorState.bodyEn
      ),
      status: shouldKeepPublishedStatus ? 'published' : nextStatus,
      scheduledAt: nextStatus === 'scheduled' ? parseDatetimeLocal(deps.scheduledAt) : null,
      imageAssets: resolvedImageState.imageAssets,
      imageAddonIds: resolvedImageState.imageAddonIds,
      docReferences: deps.resolveDocReferences(),
      publishingConnectionId: deps.publishingConnectionId ?? null,
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

  const handleCreateDraft = async (): Promise<SocialPublishingPost | null> => {
    trackSocialPublishingClientEvent('social_publishing_post_create_attempt', deps.buildSocialContext());
    try {
      const created = await saveMutation.mutateAsync({});
      deps.setActivePostId(created.id);
      trackSocialPublishingClientEvent(
        'social_publishing_post_create_success',
        deps.buildSocialContext({ postId: created.id })
      );
      return created;
    } catch (error) {
      void ErrorSystem.captureException(error);
      logSocialPublishingClientError(error, {
        source: 'AdminSocialPublishingPage',
        action: 'createDraft',
        ...deps.buildSocialContext(),
      });
      trackSocialPublishingClientEvent(
        'social_publishing_post_create_failed',
        deps.buildSocialContext({ error: true })
      );
      return null;
    }
  };

  const handleDeletePost = async (postId: string): Promise<void> => {
    if (!postId) return;
    setDeleteError(null);
    const queryKey = QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null });
    const wasActive = deps.activePostId === postId;
    const previousPosts = queryClient.getQueryData<SocialPublishingPost[]>(queryKey) ?? [];
    trackSocialPublishingClientEvent(
      'social_publishing_post_delete_attempt',
      deps.buildSocialContext({ postId })
    );
    try {
      await deleteMutation.mutateAsync(postId);
      const currentPosts = queryClient.getQueryData<SocialPublishingPost[]>(queryKey) ?? previousPosts;
      const nextPosts = currentPosts.filter((post) => post.id !== postId);
      queryClient.setQueryData(queryKey, nextPosts);
      deps.setActivePostId((current) => (current === postId ? nextPosts[0]?.id ?? null : current));
      toast('Draft deleted.', { variant: 'success' });
      trackSocialPublishingClientEvent(
        'social_publishing_post_delete_success',
        deps.buildSocialContext({ postId })
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        let refreshedPosts: SocialPublishingPost[] | null = null;
        try {
          const refetchResult = await fetchQueryV2<SocialPublishingPost[]>(queryClient, {
            queryKey,
            queryFn: async () =>
              fetchSocialPublishingPosts({
                scope: 'admin',
              }),
            staleTime: 0,
            meta: {
              source: 'social-publishing.admin.useSocialPostCrud.deletePost',
              operation: 'list',
              resource: 'social-publishing.posts',
              domain: 'social-publishing',
              queryKey,
              tags: ['social-publishing', 'posts'],
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
        trackSocialPublishingClientEvent(
          'social_publishing_post_delete_not_found',
          deps.buildSocialContext({ postId })
        );
        return;
      }
      void ErrorSystem.captureException(error);
      logSocialPublishingClientError(error, {
        source: 'AdminSocialPublishingPage',
        action: 'deletePost',
        ...deps.buildSocialContext({ postId }),
      });
      const message = error instanceof Error ? error.message : 'Failed to delete draft.';
      setDeleteError(message);
      toast(message, { variant: 'error' });
      trackSocialPublishingClientEvent(
        'social_publishing_post_delete_failed',
        deps.buildSocialContext({ postId, error: true })
      );
      throw error;
    }
  };

  const handleQuickPublishPost = async (
    postId: string,
    mode: SocialPublishingPublishMode = 'published',
    options?: { skipImages?: boolean }
  ): Promise<void> => {
    if (!postId) return;
    if (publishMutation.isPending || publishingPostId) return;
    setPublishingPostId(postId);
    try {
      const published = await publishMutation.mutateAsync({ id: postId, mode, skipImages: options?.skipImages });
      syncPostInCache(published);
      toast(
        resolvePublishSuccessToast(mode),
        { variant: 'success' }
      );
    } catch (error) {
      const recoveredPost = await recoverRefreshedPost(postId);
      if (recoveredPost && didRecoverSuccessfulPublish(recoveredPost, mode)) {
        syncPostInCache(recoveredPost);
        toast(resolvePublishSuccessToast(mode), { variant: 'success' });
        return;
      }
      const savedPublishError = recoveredPost?.publishError?.trim() || null;
      const message =
        savedPublishError ??
        (error instanceof Error
          ? error.message
          : mode === 'draft'
            ? 'Failed to publish draft.'
            : 'Failed to publish post.');
      const shouldReportClientError =
        !savedPublishError && !isExpectedSocialPublishingClientError(error);
      if (shouldReportClientError) {
        void ErrorSystem.captureException(error);
        logSocialPublishingClientError(error, {
          source: 'AdminSocialPublishingPage',
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
      const queryKey = QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null });

      if (keepLocal) {
        queryClient.setQueryData<SocialPublishingPost[]>(queryKey, (current) => {
          const entries = current ?? [];
          return entries.map((entry) => (entry.id === result.id ? result : entry));
        });
        toast('Unpublished. Post kept as draft.', { variant: 'success' });
      } else {
        let nextEntries: SocialPublishingPost[] = [];
        queryClient.setQueryData<SocialPublishingPost[]>(queryKey, (current) => {
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
      logSocialPublishingClientError(error, {
        source: 'AdminSocialPublishingPage',
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

  const handleSave = async (nextStatus: SocialPublishingPost['status']): Promise<void> => {
    if (!deps.activePost) return;
    if (
      nextStatus === 'scheduled' &&
      hasSocialPublishingPublication(deps.activePost)
    ) {
      toast(ALREADY_PUBLISHED_SCHEDULE_TOAST, { variant: 'info' });
      return;
    }
    const updates = buildValidatedPostUpdates(nextStatus);
    if (!updates) {
      trackSocialPublishingClientEvent(
        'social_publishing_post_save_failed',
        deps.buildSocialContext({ nextStatus, error: true, validationError: true })
      );
      return;
    }
    trackSocialPublishingClientEvent(
      'social_publishing_post_save_attempt',
      deps.buildSocialContext({ nextStatus })
    );
    try {
      await patchMutation.mutateAsync({
        id: deps.activePost.id,
        updates,
      });
      trackSocialPublishingClientEvent(
        'social_publishing_post_save_success',
        deps.buildSocialContext({ nextStatus })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logSocialPublishingClientError(error, {
        source: 'AdminSocialPublishingPage',
        action: 'savePost',
        ...deps.buildSocialContext({ nextStatus }),
      });
      toast(error instanceof Error ? error.message : 'Failed to save draft.', {
        variant: 'error',
      });
      trackSocialPublishingClientEvent(
        'social_publishing_post_save_failed',
        deps.buildSocialContext({ nextStatus, error: true })
      );
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!deps.activePost) return;
    if (hasSocialPublishingPublication(deps.activePost)) {
      toast(ALREADY_PUBLISHED_TOAST, { variant: 'info' });
      return;
    }
    const updates = buildValidatedPostUpdates('scheduled');
    if (!updates) {
      trackSocialPublishingClientEvent(
        'social_publishing_post_publish_failed',
        deps.buildSocialContext({ stage: 'prepare', error: true, validationError: true })
      );
      return;
    }
    trackSocialPublishingClientEvent(
      'social_publishing_post_publish_attempt',
      deps.buildSocialContext()
    );
    let stage: 'prepare' | 'publish' = 'prepare';
    try {
      await patchMutation.mutateAsync({
        id: deps.activePost.id,
        updates,
      });
      stage = 'publish';
      const published = await publishMutation.mutateAsync({
        id: deps.activePost.id,
        mode: 'published',
      });
      syncPostInCache(published);
      toast(resolvePublishSuccessToast('published'), { variant: 'success' });
      trackSocialPublishingClientEvent(
        'social_publishing_post_publish_success',
        deps.buildSocialContext()
      );
    } catch (error) {
      const recoveredPost =
        stage === 'publish' ? await recoverRefreshedPost(deps.activePost.id) : null;
      if (
        stage === 'publish' &&
        recoveredPost &&
        didRecoverSuccessfulPublish(recoveredPost, 'published')
      ) {
        syncPostInCache(recoveredPost);
        toast(resolvePublishSuccessToast('published'), { variant: 'success' });
        trackSocialPublishingClientEvent(
          'social_publishing_post_publish_success',
          deps.buildSocialContext({ recoveredPublishState: true })
        );
        return;
      }
      const savedPublishError = recoveredPost?.publishError?.trim() || null;
      const message =
        savedPublishError ??
        (error instanceof Error
          ? error.message
          : stage === 'prepare'
            ? 'Failed to prepare the post for publishing.'
            : 'Failed to publish post.');
      const shouldReportClientError =
        !savedPublishError && !isExpectedSocialPublishingClientError(error);
      if (shouldReportClientError) {
        void ErrorSystem.captureException(error);
        logSocialPublishingClientError(error, {
          source: 'AdminSocialPublishingPage',
          action: 'publishPost',
          stage,
          ...deps.buildSocialContext(),
        });
      }
      toast(message, { variant: 'error' });
      trackSocialPublishingClientEvent(
        'social_publishing_post_publish_failed',
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
