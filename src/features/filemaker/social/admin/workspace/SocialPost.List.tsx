'use client';

import React from 'react';

import { KANGUR_ADMIN_CARD_CLASS_NAME } from '@/features/kangur/admin/components/KangurAdminCard';
import { useSocialPublishingPostsPage } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';
import { ListPanel } from '@/shared/ui';
import { SocialPostListContent } from './SocialPost.ListContent';
import { SocialPostListHeader } from './SocialPost.ListHeader';
import {
  DEFAULT_STATUS_COUNTS,
  SOCIAL_POST_LIST_PAGE_SIZE,
  type SocialPostListContext,
} from './SocialPost.ListRuntime';
import { useSocialPostContext } from './SocialPostContext';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import type { SocialPublishingPostListStatus } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';

const useAutoSelectFirstSocialPost = (
  context: SocialPostListContext,
  posts: SocialPublishingPost[]
): void => {
  React.useEffect(() => {
    if ((context.activePostId?.length ?? 0) > 0) return;
    const firstPostId = posts[0]?.id ?? null;
    if (firstPostId !== null) context.setActivePostId(firstPostId);
  }, [context, posts]);
};

export function SocialPostList(): React.JSX.Element {
  const context = useSocialPostContext();
  const [searchValue, setSearchValue] = React.useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<SocialPublishingPostListStatus>('all');
  const [page, setPage] = React.useState(1);
  const postsPageQuery = useSocialPublishingPostsPage({
    page,
    pageSize: SOCIAL_POST_LIST_PAGE_SIZE,
    search: debouncedSearchValue,
    status: statusFilter,
  });
  const posts = postsPageQuery.data?.posts ?? [];
  const totalMatches = postsPageQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMatches / SOCIAL_POST_LIST_PAGE_SIZE));
  const statusCounts = postsPageQuery.data?.statusCounts ?? DEFAULT_STATUS_COUNTS;

  React.useEffect(() => {
    const timeoutId = safeSetTimeout(() => {
      setDebouncedSearchValue(searchValue.trim());
    }, 200);
    return () => safeClearTimeout(timeoutId);
  }, [searchValue]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearchValue, statusFilter]);

  React.useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useAutoSelectFirstSocialPost(context, posts);

  return (
    <ListPanel
      header={
        <SocialPostListHeader
          page={page}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          setStatusFilter={setStatusFilter}
          statusCounts={statusCounts}
          statusFilter={statusFilter}
          totalMatches={totalMatches}
          totalPages={totalPages}
        />
      }
      className={KANGUR_ADMIN_CARD_CLASS_NAME} contentClassName='space-y-2'
      isLoading={postsPageQuery.isLoading}
      loadingMessage='Loading social posts...'
    >
      <SocialPostListContent
        context={context}
        page={page}
        posts={posts}
        searchValue={searchValue}
        setPage={setPage}
        statusFilter={statusFilter}
        totalMatches={totalMatches}
        totalPages={totalPages}
      />
    </ListPanel>
  );
}
