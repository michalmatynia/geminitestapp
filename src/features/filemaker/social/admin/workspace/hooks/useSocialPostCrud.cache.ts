import type { QueryClient } from '@tanstack/react-query';

import { fetchSocialPublishingPosts } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { SOCIAL_PUBLISHING_ADMIN_POSTS_QUERY_KEY } from './useSocialPostCrud.runtime';

export const syncSocialPostInCache = (
  queryClient: QueryClient,
  post: SocialPublishingPost
): void => {
  queryClient.setQueryData<SocialPublishingPost[] | undefined>(
    SOCIAL_PUBLISHING_ADMIN_POSTS_QUERY_KEY,
    (current) => {
      if (current === undefined) {
        return current;
      }

      const nextEntries = current.map((entry) => (entry.id === post.id ? post : entry));
      return nextEntries.some((entry) => entry.id === post.id) ? nextEntries : [post, ...current];
    }
  );
};

export const recoverRefreshedSocialPost = async (
  queryClient: QueryClient,
  postId: string
): Promise<SocialPublishingPost | null> => {
  try {
    const refreshedPosts = await fetchQueryV2<SocialPublishingPost[]>(queryClient, {
      queryKey: SOCIAL_PUBLISHING_ADMIN_POSTS_QUERY_KEY,
      queryFn: async () => fetchSocialPublishingPosts({ scope: 'admin' }),
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
    })();
    return refreshedPosts.find((entry) => entry.id === postId) ?? null;
  } catch {
    return null;
  }
};

export const refetchSocialPostsAfterDelete = async (
  queryClient: QueryClient
): Promise<SocialPublishingPost[] | null> => {
  const queryKey = QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null });

  try {
    return await fetchQueryV2<SocialPublishingPost[]>(queryClient, {
      queryKey,
      queryFn: async () => fetchSocialPublishingPosts({ scope: 'admin' }),
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
  } catch {
    return null;
  }
};
