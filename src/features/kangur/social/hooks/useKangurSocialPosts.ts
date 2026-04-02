import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui';
import {
  kangurSocialPublishModeSchema,
  kangurSocialPostsSchema,
  normalizeKangurSocialPost,
  type KangurSocialGeneratedDraft,
  type KangurSocialPost,
  type KangurSocialPublishMode,
  type KangurSocialVisualAnalysis,
  type KangurSocialPostListStatus,
  type KangurSocialPostsPageResult,
} from '@/shared/contracts/kangur-social-posts';
import { ApiError, api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export type KangurSocialPostsScope = 'public' | 'admin';

type SocialPostsQueryOptions = {
  scope?: KangurSocialPostsScope;
  limit?: number;
  enabled?: boolean;
};

type SocialPostsPageQueryOptions = {
  page: number;
  pageSize: number;
  search?: string;
  status?: KangurSocialPostListStatus;
  enabled?: boolean;
};

const SOCIAL_POSTS_QUERY_TIMEOUT_MS = 60_000;
const SOCIAL_POSTS_PUBLISH_TIMEOUT_MS = 180_000;
const SOCIAL_POSTS_UNPUBLISH_TIMEOUT_MS = 60_000;
const KANGUR_SOCIAL_POSTS_QUERY_KEY = ['kangur', 'social-posts'] as const;

export const fetchKangurSocialPosts = async (
  options?: SocialPostsQueryOptions
): Promise<KangurSocialPost[]> => {
  const payload = await api.get<KangurSocialPost[]>('/api/kangur/social-posts', {
    params: {
      scope: options?.scope,
      limit: options?.limit,
    },
    timeout: SOCIAL_POSTS_QUERY_TIMEOUT_MS,
  });
  return kangurSocialPostsSchema.parse(payload).map((post) => normalizeKangurSocialPost(post));
};

export const fetchKangurSocialPostsPage = async (
  options: SocialPostsPageQueryOptions
): Promise<KangurSocialPostsPageResult> => {
  const payload = await api.get<KangurSocialPostsPageResult>('/api/kangur/social-posts', {
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
    posts: kangurSocialPostsSchema
      .parse(Array.isArray(payload.posts) ? payload.posts : [])
      .map((post) => normalizeKangurSocialPost(post)),
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

export const fetchKangurSocialPostById = async (id: string): Promise<KangurSocialPost> => {
  const payload = await api.get<KangurSocialPost>(`/api/kangur/social-posts/${id}`, {
    timeout: SOCIAL_POSTS_QUERY_TIMEOUT_MS,
  });
  return normalizeKangurSocialPost(payload);
};

export const useKangurSocialPosts = (
  options?: SocialPostsQueryOptions
): ListQuery<KangurSocialPost, KangurSocialPost[]> =>
  createListQueryV2<KangurSocialPost, KangurSocialPost[]>({
    queryKey: QUERY_KEYS.kangur.socialPosts({
      scope: options?.scope ?? 'public',
      limit: options?.limit ?? null,
    }),
    queryFn: async (): Promise<KangurSocialPost[]> => fetchKangurSocialPosts(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurSocialPosts',
      operation: 'list',
      resource: 'kangur.social-posts',
      domain: 'kangur',
      tags: ['kangur', 'social-posts'],
      description: 'Loads Kangur social posts.',
    },
  });

export const useKangurSocialPostsPage = (
  options: SocialPostsPageQueryOptions
): SingleQuery<KangurSocialPostsPageResult> =>
  createSingleQueryV2<KangurSocialPostsPageResult>({
    id: `admin:${options.page}:${options.pageSize}:${options.search ?? ''}:${options.status ?? 'all'}`,
    queryKey: QUERY_KEYS.kangur.socialPosts({
      scope: 'admin',
      page: options.page,
      pageSize: options.pageSize,
      search: options.search ?? null,
      status: options.status ?? 'all',
    }),
    queryFn: async (): Promise<KangurSocialPostsPageResult> => fetchKangurSocialPostsPage(options),
    enabled: options.enabled ?? true,
    staleTime: 1000 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurSocialPostsPage',
      operation: 'list',
      resource: 'kangur.social-posts.paged',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'paged'],
      description: 'Loads paged admin Kangur social posts.',
    },
  });

export const useKangurSocialPost = (
  id: string | null,
  options?: { enabled?: boolean }
): SingleQuery<KangurSocialPost> =>
  createSingleQueryV2<KangurSocialPost>({
    id: id ?? null,
    queryKey: QUERY_KEYS.kangur.socialPost(id),
    queryFn: async (): Promise<KangurSocialPost> => {
      if (!id) {
        throw new Error('Missing social post id.');
      }
      return await fetchKangurSocialPostById(id);
    },
    enabled: (options?.enabled ?? true) && Boolean(id),
    staleTime: 1000 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurSocialPost',
      operation: 'detail',
      resource: 'kangur.social-post',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'detail'],
      description: 'Loads a single Kangur social post for admin editing.',
    },
  });

const invalidateSocialPosts = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: KANGUR_SOCIAL_POSTS_QUERY_KEY });
};

export const useSaveKangurSocialPost = (): MutationResult<
  KangurSocialPost,
  Partial<KangurSocialPost>
> =>
  createUpdateMutationV2<KangurSocialPost, Partial<KangurSocialPost>>({
    mutationKey: [...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }), 'save'],
    mutationFn: async (post: Partial<KangurSocialPost>): Promise<KangurSocialPost> =>
      await api.post<KangurSocialPost>('/api/kangur/social-posts', { post }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'kangur.hooks.useSaveKangurSocialPost',
      operation: 'update',
      resource: 'kangur.social-posts',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'save'],
      description: 'Creates or updates Kangur social posts.',
    },
  });

export const usePatchKangurSocialPost = (): MutationResult<
  KangurSocialPost,
  { id: string; updates: Partial<KangurSocialPost> }
> =>
  createUpdateMutationV2<KangurSocialPost, { id: string; updates: Partial<KangurSocialPost> }>({
    mutationKey: [...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }), 'patch'],
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<KangurSocialPost>;
    }): Promise<KangurSocialPost> =>
      await api.patch<KangurSocialPost>(`/api/kangur/social-posts/${id}`, { updates }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'kangur.hooks.usePatchKangurSocialPost',
      operation: 'update',
      resource: 'kangur.social-posts',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'patch'],
      description: 'Patches Kangur social posts.',
    },
  });

export const useDeleteKangurSocialPost = (): MutationResult<KangurSocialPost, string> =>
  createUpdateMutationV2<KangurSocialPost, string>({
    mutationKey: [...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }), 'delete'],
    mutationFn: async (postId: string): Promise<KangurSocialPost> => {
      try {
        return await api.delete<KangurSocialPost>('/api/kangur/social-posts', {
          params: { id: postId },
        });
      } catch (error) {
        if (error instanceof ApiError && [400, 404, 405, 501].includes(error.status)) {
          try {
            return await api.delete<KangurSocialPost>(`/api/kangur/social-posts/${postId}`);
          } catch (fallbackError) {
            if (fallbackError instanceof ApiError && [404, 405, 501].includes(fallbackError.status)) {
              return await api.post<KangurSocialPost>('/api/kangur/social-posts/delete', {
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
      source: 'kangur.hooks.useDeleteKangurSocialPost',
      operation: 'action',
      resource: 'kangur.social-posts',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'delete'],
      description: 'Deletes Kangur social posts.',
    },
  });

export type KangurSocialPostGenerationPayload = {
  postId?: string;
  docReferences?: string[];
  notes?: string;
  modelId?: string;
  visionModelId?: string;
  imageAddonIds?: string[];
  projectUrl?: string;
  prefetchedVisualAnalysis?: KangurSocialVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
};

export type KangurSocialPostGenerationResult =
  | KangurSocialPost
  | KangurSocialGeneratedDraft;

export type KangurSocialQueuedJobTriggerResponse = {
  success: boolean;
  jobId: string;
  jobType: 'manual-post-generation';
};

export const useGenerateKangurSocialPost = (): MutationResult<
  KangurSocialQueuedJobTriggerResponse,
  KangurSocialPostGenerationPayload
> =>
  createUpdateMutationV2<KangurSocialQueuedJobTriggerResponse, KangurSocialPostGenerationPayload>({
    mutationKey: [...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }), 'generate'],
    mutationFn: async (payload): Promise<KangurSocialQueuedJobTriggerResponse> =>
      await api.post('/api/kangur/social-posts/generate', payload, { timeout: 180_000 }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'kangur.hooks.useGenerateKangurSocialPost',
      operation: 'update',
      resource: 'kangur.social-posts.generate',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'generate'],
      description: 'Generates Kangur social posts via Brain.',
    },
  });

export type KangurSocialPostPublishInput = {
  id: string;
  mode?: KangurSocialPublishMode;
  skipImages?: boolean;
};

export const usePublishKangurSocialPost = (): MutationResult<
  KangurSocialPost,
  KangurSocialPostPublishInput
> =>
  createUpdateMutationV2<KangurSocialPost, KangurSocialPostPublishInput>({
    mutationKey: [...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }), 'publish'],
    mutationFn: async ({ id, mode, skipImages }: KangurSocialPostPublishInput): Promise<KangurSocialPost> =>
      await api.post<KangurSocialPost>(`/api/kangur/social-posts/${id}/publish`, {
        ...(mode ? { mode: kangurSocialPublishModeSchema.parse(mode) } : {}),
        ...(skipImages ? { skipImages } : {}),
      }, { timeout: SOCIAL_POSTS_PUBLISH_TIMEOUT_MS }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'kangur.hooks.usePublishKangurSocialPost',
      operation: 'update',
      resource: 'kangur.social-posts.publish',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'publish'],
      description: 'Publishes Kangur social posts to LinkedIn.',
    },
  });

export type KangurSocialPostUnpublishInput = {
  id: string;
  keepLocal?: boolean;
};

export const useUnpublishKangurSocialPost = (): MutationResult<KangurSocialPost, KangurSocialPostUnpublishInput> =>
  createUpdateMutationV2<KangurSocialPost, KangurSocialPostUnpublishInput>({
    mutationKey: [...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }), 'unpublish'],
    mutationFn: async ({ id, keepLocal }: KangurSocialPostUnpublishInput): Promise<KangurSocialPost> =>
      await api.post<KangurSocialPost>(`/api/kangur/social-posts/${id}/unpublish`, {
        ...(keepLocal ? { keepLocal } : {}),
      }, { timeout: SOCIAL_POSTS_UNPUBLISH_TIMEOUT_MS }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'kangur.hooks.useUnpublishKangurSocialPost',
      operation: 'action',
      resource: 'kangur.social-posts.unpublish',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'unpublish'],
      description: 'Unpublishes Kangur social posts from LinkedIn.',
    },
  });
