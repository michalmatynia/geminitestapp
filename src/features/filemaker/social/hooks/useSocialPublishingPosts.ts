import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import {
  socialPublishingPublishModeSchema,
  socialPublishingPostsSchema,
  normalizeSocialPublishingPost,
  type SocialPublishingGeneratedDraft,
  type SocialPublishingPost,
  type SocialPublishingPublishMode,
  type SocialPublishingVisualAnalysis,
  type SocialPublishingPostListStatus,
  type SocialPublishingPostsPageResult,
} from '@/shared/contracts/social-publishing-posts';
import { ApiError, api } from '@/shared/lib/api-client';
import {
  useListQueryV2,
  useSingleQueryV2,
  useUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export type { SocialPublishingPostListStatus } from '@/shared/contracts/social-publishing-posts';

export type SocialPublishingPostsScope = 'public' | 'admin';

type SocialPostsQueryOptions = {
  scope?: SocialPublishingPostsScope;
  limit?: number;
  enabled?: boolean;
};

type SocialPostsPageQueryOptions = {
  page: number;
  pageSize: number;
  search?: string;
  status?: SocialPublishingPostListStatus;
  enabled?: boolean;
};

const SOCIAL_POSTS_QUERY_TIMEOUT_MS = 60_000;
const SOCIAL_POSTS_PUBLISH_TIMEOUT_MS = 180_000;
const SOCIAL_POSTS_UNPUBLISH_TIMEOUT_MS = 60_000;
const SOCIAL_PUBLISHING_POSTS_QUERY_KEY = ['social-publishing', 'posts'] as const;

export const fetchSocialPublishingPosts = async (
  options?: SocialPostsQueryOptions
): Promise<SocialPublishingPost[]> => {
  const payload = await api.get<SocialPublishingPost[]>('/api/filemaker/social-posts', {
    params: {
      scope: options?.scope,
      limit: options?.limit,
    },
    timeout: SOCIAL_POSTS_QUERY_TIMEOUT_MS,
  });
  return socialPublishingPostsSchema.parse(payload).map((post) => normalizeSocialPublishingPost(post));
};

export const fetchSocialPublishingPostsPage = async (
  options: SocialPostsPageQueryOptions
): Promise<SocialPublishingPostsPageResult> => {
  const payload = await api.get<SocialPublishingPostsPageResult>('/api/filemaker/social-posts', {
    params: {
      scope: 'admin',
      page: options.page,
      pageSize: options.pageSize,
      search: options.search?.trim() || undefined,
      status: options.status && options.status !== 'all' ? options.status : undefined,
    },
    timeout: SOCIAL_POSTS_QUERY_TIMEOUT_MS,
  });

  return {
    ...payload,
    posts: socialPublishingPostsSchema
      .parse(Array.isArray(payload.posts) ? payload.posts : [])
      .map((post) => normalizeSocialPublishingPost(post)),
    total: typeof payload.total === 'number' ? payload.total : 0,
    page: typeof payload.page === 'number' ? payload.page : options.page,
    pageSize: typeof payload.pageSize === 'number' ? payload.pageSize : options.pageSize,
    statusCounts: {
      draft: payload.statusCounts?.draft ?? 0,
      scheduled: payload.statusCounts?.scheduled ?? 0,
      published: payload.statusCounts?.published ?? 0,
      failed: payload.statusCounts?.failed ?? 0,
    },
  };
};

export const fetchSocialPublishingPostById = async (id: string): Promise<SocialPublishingPost> => {
  const payload = await api.get<SocialPublishingPost>(`/api/filemaker/social-posts/${id}`, {
    timeout: SOCIAL_POSTS_QUERY_TIMEOUT_MS,
  });
  return normalizeSocialPublishingPost(payload);
};

export const useSocialPublishingPosts = (
  options?: SocialPostsQueryOptions
): ListQuery<SocialPublishingPost, SocialPublishingPost[]> =>
  useListQueryV2<SocialPublishingPost, SocialPublishingPost[]>({
    queryKey: QUERY_KEYS.socialPublishing.posts({
      scope: options?.scope ?? 'public',
      limit: options?.limit ?? null,
    }),
    queryFn: async (): Promise<SocialPublishingPost[]> => fetchSocialPublishingPosts(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'social-publishing.hooks.useSocialPublishingPosts',
      operation: 'list',
      resource: 'social-publishing.posts',
      domain: 'social-publishing',
      tags: ['social-publishing', 'posts'],
      description: 'Loads social publishing posts.',
    },
  });

export const useSocialPublishingPostsPage = (
  options: SocialPostsPageQueryOptions
): SingleQuery<SocialPublishingPostsPageResult> =>
  useSingleQueryV2<SocialPublishingPostsPageResult>({
    id: `admin:${options.page}:${options.pageSize}:${options.search ?? ''}:${options.status ?? 'all'}`,
    queryKey: QUERY_KEYS.socialPublishing.posts({
      scope: 'admin',
      page: options.page,
      pageSize: options.pageSize,
      search: options.search ?? null,
      status: options.status ?? 'all',
    }),
    queryFn: async (): Promise<SocialPublishingPostsPageResult> => fetchSocialPublishingPostsPage(options),
    enabled: options.enabled ?? true,
    staleTime: 1000 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'social-publishing.hooks.useSocialPublishingPostsPage',
      operation: 'detail',
      resource: 'social-publishing.posts.paged',
      domain: 'social-publishing',
      tags: ['social-publishing', 'posts', 'paged'],
      description: 'Loads paged admin social publishing posts.',
    },
  });

export const useSocialPublishingPost = (
  id: string | null,
  options?: { enabled?: boolean }
): SingleQuery<SocialPublishingPost> =>
  useSingleQueryV2<SocialPublishingPost>({
    id: id ?? null,
    queryKey: QUERY_KEYS.socialPublishing.post(id),
    queryFn: async (): Promise<SocialPublishingPost> => {
      if (!id) {
        throw new Error('Missing social post id.');
      }
      return await fetchSocialPublishingPostById(id);
    },
    enabled: (options?.enabled ?? true) && Boolean(id),
    staleTime: 1000 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'social-publishing.hooks.useSocialPublishingPost',
      operation: 'detail',
      resource: 'social-publishing.post',
      domain: 'social-publishing',
      tags: ['social-publishing', 'posts', 'detail'],
      description: 'Loads a single social publishing post for admin editing.',
    },
  });

const invalidateSocialPosts = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: SOCIAL_PUBLISHING_POSTS_QUERY_KEY });
};

export const useSaveSocialPublishingPost = (): MutationResult<
  SocialPublishingPost,
  Partial<SocialPublishingPost>
> =>
  useUpdateMutationV2<SocialPublishingPost, Partial<SocialPublishingPost>>({
    mutationKey: [...QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null }), 'save'],
    mutationFn: async (post: Partial<SocialPublishingPost>): Promise<SocialPublishingPost> =>
      await api.post<SocialPublishingPost>('/api/filemaker/social-posts', { post }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'social-publishing.hooks.useSaveSocialPublishingPost',
      operation: 'update',
      resource: 'social-publishing.posts',
      domain: 'social-publishing',
      tags: ['social-publishing', 'posts', 'save'],
      description: 'Creates or updates social publishing posts.',
    },
  });

export const usePatchSocialPublishingPost = (): MutationResult<
  SocialPublishingPost,
  { id: string; updates: Partial<SocialPublishingPost> }
> =>
  useUpdateMutationV2<SocialPublishingPost, { id: string; updates: Partial<SocialPublishingPost> }>({
    mutationKey: [...QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null }), 'patch'],
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SocialPublishingPost>;
    }): Promise<SocialPublishingPost> =>
      await api.patch<SocialPublishingPost>(`/api/filemaker/social-posts/${id}`, { updates }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'social-publishing.hooks.usePatchSocialPublishingPost',
      operation: 'update',
      resource: 'social-publishing.posts',
      domain: 'social-publishing',
      tags: ['social-publishing', 'posts', 'patch'],
      description: 'Patches social publishing posts.',
    },
  });

export const useDeleteSocialPublishingPost = (): MutationResult<SocialPublishingPost, string> =>
  useUpdateMutationV2<SocialPublishingPost, string>({
    mutationKey: [...QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null }), 'delete'],
    mutationFn: async (postId: string): Promise<SocialPublishingPost> => {
      try {
        return await api.delete<SocialPublishingPost>('/api/filemaker/social-posts', {
          params: { id: postId },
        });
      } catch (error) {
        if (error instanceof ApiError && [400, 404, 405, 501].includes(error.status)) {
          try {
            return await api.delete<SocialPublishingPost>(`/api/filemaker/social-posts/${postId}`);
          } catch (fallbackError) {
            if (fallbackError instanceof ApiError && [404, 405, 501].includes(fallbackError.status)) {
              return await api.post<SocialPublishingPost>('/api/filemaker/social-posts/delete', {
                id: postId,
              });
            }
            throw fallbackError;
          }
        }
        throw error;
      }
    },
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'social-publishing.hooks.useDeleteSocialPublishingPost',
      operation: 'action',
      resource: 'social-publishing.posts',
      domain: 'social-publishing',
      tags: ['social-publishing', 'posts', 'delete'],
      description: 'Deletes social publishing posts.',
    },
  });

export type SocialPublishingPostGenerationPayload = {
  postId?: string;
  docReferences?: string[];
  notes?: string;
  modelId?: string;
  visionModelId?: string;
  imageAddonIds?: string[];
  projectUrl?: string;
  prefetchedVisualAnalysis?: SocialPublishingVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
};

export type SocialPublishingPostGenerationResult =
  | SocialPublishingPost
  | SocialPublishingGeneratedDraft;

export type SocialPublishingQueuedJobTriggerResponse = {
  success: boolean;
  jobId: string;
  jobType: 'manual-post-generation';
};

export const useGenerateSocialPublishingPost = (): MutationResult<
  SocialPublishingQueuedJobTriggerResponse,
  SocialPublishingPostGenerationPayload
> =>
  useUpdateMutationV2<SocialPublishingQueuedJobTriggerResponse, SocialPublishingPostGenerationPayload>({
    mutationKey: [...QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null }), 'generate'],
    mutationFn: async (payload): Promise<SocialPublishingQueuedJobTriggerResponse> =>
      await api.post('/api/filemaker/social-posts/generate', payload, { timeout: 180_000 }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'social-publishing.hooks.useGenerateSocialPublishingPost',
      operation: 'update',
      resource: 'social-publishing.posts.generate',
      domain: 'social-publishing',
      tags: ['social-publishing', 'posts', 'generate'],
      description: 'Generates social publishing posts via Brain.',
    },
  });

export type SocialPublishingPostPublishInput = {
  id: string;
  mode?: SocialPublishingPublishMode;
  skipImages?: boolean;
};

export const usePublishSocialPublishingPost = (): MutationResult<
  SocialPublishingPost,
  SocialPublishingPostPublishInput
> =>
  useUpdateMutationV2<SocialPublishingPost, SocialPublishingPostPublishInput>({
    mutationKey: [...QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null }), 'publish'],
    mutationFn: async ({ id, mode, skipImages }: SocialPublishingPostPublishInput): Promise<SocialPublishingPost> =>
      await api.post<SocialPublishingPost>(`/api/filemaker/social-posts/${id}/publish`, {
        ...(mode ? { mode: socialPublishingPublishModeSchema.parse(mode) } : {}),
        ...(skipImages ? { skipImages } : {}),
      }, { timeout: SOCIAL_POSTS_PUBLISH_TIMEOUT_MS }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'social-publishing.hooks.usePublishSocialPublishingPost',
      operation: 'update',
      resource: 'social-publishing.posts.publish',
      domain: 'social-publishing',
      tags: ['social-publishing', 'posts', 'publish'],
      description: 'Publishes social publishing posts to the configured channel.',
    },
  });

export type SocialPublishingPostUnpublishInput = {
  id: string;
  keepLocal?: boolean;
};

export const useUnpublishSocialPublishingPost = (): MutationResult<SocialPublishingPost, SocialPublishingPostUnpublishInput> =>
  useUpdateMutationV2<SocialPublishingPost, SocialPublishingPostUnpublishInput>({
    mutationKey: [...QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null }), 'unpublish'],
    mutationFn: async ({ id, keepLocal }: SocialPublishingPostUnpublishInput): Promise<SocialPublishingPost> =>
      await api.post<SocialPublishingPost>(`/api/filemaker/social-posts/${id}/unpublish`, {
        ...(keepLocal ? { keepLocal } : {}),
      }, { timeout: SOCIAL_POSTS_UNPUBLISH_TIMEOUT_MS }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'social-publishing.hooks.useUnpublishSocialPublishingPost',
      operation: 'action',
      resource: 'social-publishing.posts.unpublish',
      domain: 'social-publishing',
      tags: ['social-publishing', 'posts', 'unpublish'],
      description: 'Unpublishes social publishing posts from the configured channel.',
    },
  });
