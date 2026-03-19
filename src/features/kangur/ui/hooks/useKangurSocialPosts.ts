'use client';

import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import {
  kangurSocialPostsSchema,
  type KangurSocialDocUpdate,
  type KangurSocialDocUpdatesResponse,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import { ApiError, api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export type KangurSocialPostsScope = 'public' | 'admin';

type SocialPostsQueryOptions = {
  scope?: KangurSocialPostsScope;
  limit?: number;
  enabled?: boolean;
};

const SOCIAL_POSTS_QUERY_TIMEOUT_MS = 60_000;
const KANGUR_SOCIAL_POSTS_QUERY_KEY = ['kangur', 'social-posts'] as const;

const fetchSocialPosts = async (options?: SocialPostsQueryOptions): Promise<KangurSocialPost[]> => {
  const payload = await api.get<KangurSocialPost[]>('/api/kangur/social-posts', {
    params: {
      scope: options?.scope,
      limit: options?.limit,
    },
    timeout: SOCIAL_POSTS_QUERY_TIMEOUT_MS,
  });
  return kangurSocialPostsSchema.parse(payload);
};

export const useKangurSocialPosts = (
  options?: SocialPostsQueryOptions
): ListQuery<KangurSocialPost, KangurSocialPost[]> =>
  createListQueryV2<KangurSocialPost, KangurSocialPost[]>({
    queryKey: QUERY_KEYS.kangur.socialPosts({
      scope: options?.scope ?? 'public',
      limit: options?.limit ?? null,
    }),
    queryFn: async (): Promise<KangurSocialPost[]> => fetchSocialPosts(options),
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
      operation: 'delete',
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
};

export type KangurSocialPostGenerationResult =
  | KangurSocialPost
  | {
      titlePl: string;
      titleEn: string;
      bodyPl: string;
      bodyEn: string;
      combinedBody: string;
      summary?: string;
      docReferences?: string[];
      visualSummary?: string | null;
      visualHighlights?: string[];
      visualDocUpdates?: KangurSocialDocUpdate[];
    };

export const useGenerateKangurSocialPost = (): MutationResult<
  KangurSocialPostGenerationResult,
  KangurSocialPostGenerationPayload
> =>
  createUpdateMutationV2<KangurSocialPostGenerationResult, KangurSocialPostGenerationPayload>({
    mutationKey: [...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }), 'generate'],
    mutationFn: async (payload): Promise<KangurSocialPostGenerationResult> =>
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

export type KangurSocialPublishMode = 'published' | 'draft';

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
        ...(mode ? { mode } : {}),
        ...(skipImages ? { skipImages } : {}),
      }),
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
      }),
    invalidate: invalidateSocialPosts,
    meta: {
      source: 'kangur.hooks.useUnpublishKangurSocialPost',
      operation: 'delete',
      resource: 'kangur.social-posts.unpublish',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'unpublish'],
      description: 'Unpublishes Kangur social posts from LinkedIn.',
    },
  });

const makeDocUpdatesMutation = (mode: 'preview' | 'apply') =>
  createUpdateMutationV2<KangurSocialDocUpdatesResponse, string>({
    mutationKey: [
      ...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }),
      'doc-updates',
      mode,
    ],
    mutationFn: async (postId: string): Promise<KangurSocialDocUpdatesResponse> =>
      await api.post<KangurSocialDocUpdatesResponse>(
        `/api/kangur/social-posts/${postId}/doc-updates`,
        { mode },
        { timeout: 120_000 }
      ),
    invalidate: invalidateSocialPosts,
    meta: {
      source: `kangur.hooks.useKangurSocialDocUpdates.${mode}`,
      operation: 'update',
      resource: 'kangur.social-posts.doc-updates',
      domain: 'kangur',
      tags: ['kangur', 'social-posts', 'doc-updates', mode],
      description:
        mode === 'apply'
          ? 'Applies Kangur social post doc updates.'
          : 'Previews Kangur social post doc updates.',
    },
  });

export const usePreviewKangurSocialDocUpdates = (): MutationResult<
  KangurSocialDocUpdatesResponse,
  string
> => makeDocUpdatesMutation('preview');

export const useApplyKangurSocialDocUpdates = (): MutationResult<
  KangurSocialDocUpdatesResponse,
  string
> => makeDocUpdatesMutation('apply');
