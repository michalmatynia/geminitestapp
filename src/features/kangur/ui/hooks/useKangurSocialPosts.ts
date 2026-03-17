'use client';

import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import {
  kangurSocialPostsSchema,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export type KangurSocialPostsScope = 'public' | 'admin';

type SocialPostsQueryOptions = {
  scope?: KangurSocialPostsScope;
  limit?: number;
  enabled?: boolean;
};

const fetchSocialPosts = async (options?: SocialPostsQueryOptions): Promise<KangurSocialPost[]> => {
  const payload = await api.get<KangurSocialPost[]>('/api/kangur/social-posts', {
    params: {
      scope: options?.scope,
      limit: options?.limit,
    },
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
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.all });
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

export type KangurSocialPostGenerationPayload = {
  postId?: string;
  docReferences?: string[];
  notes?: string;
  modelId?: string;
  imageAddonIds?: string[];
};

export type KangurSocialPostGenerationResult =
  | KangurSocialPost
  | { titlePl: string; titleEn: string; bodyPl: string; bodyEn: string; combinedBody: string };

export const useGenerateKangurSocialPost = (): MutationResult<
  KangurSocialPostGenerationResult,
  KangurSocialPostGenerationPayload
> =>
  createUpdateMutationV2<KangurSocialPostGenerationResult, KangurSocialPostGenerationPayload>({
    mutationKey: [...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }), 'generate'],
    mutationFn: async (payload): Promise<KangurSocialPostGenerationResult> =>
      await api.post('/api/kangur/social-posts/generate', payload),
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

export const usePublishKangurSocialPost = (): MutationResult<KangurSocialPost, string> =>
  createUpdateMutationV2<KangurSocialPost, string>({
    mutationKey: [...QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null }), 'publish'],
    mutationFn: async (postId: string): Promise<KangurSocialPost> =>
      await api.post<KangurSocialPost>(`/api/kangur/social-posts/${postId}/publish`),
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
