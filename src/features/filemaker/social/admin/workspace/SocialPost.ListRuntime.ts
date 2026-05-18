import {
  hasSocialPublishingPublication,
  type SocialPublishingPost,
} from '@/shared/contracts/social-publishing-posts';
import type { SocialPublishingPostListStatus } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import { type useSocialPostContext } from './SocialPostContext';
import {
  isSocialRuntimeJobInFlight,
  runtimeJobStatus,
} from './SocialPost.VisualsRuntime';

export const SOCIAL_POST_LIST_PAGE_SIZE = 8;
export const SOCIAL_POST_RUNTIME_LOCK_TITLE = 'Wait for the current Social runtime job to finish.';

export const STATUS_FILTER_OPTIONS: Array<{
  value: SocialPublishingPostListStatus;
  label: string;
}> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Drafts' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
] as const;

export type SocialPostListContext = ReturnType<typeof useSocialPostContext>;

export type SocialPostListStatusCounts = {
  draft: number;
  failed: number;
  published: number;
  scheduled: number;
};

export type SocialPostListRowState = {
  hasBlockingRuntimeSelectionJob: boolean;
  hasPublication: boolean;
  isActive: boolean;
  isDeleteBlocked: boolean;
  isSelectionBlocked: boolean;
  listStatus: SocialPublishingPost['status'];
  pipelineSelectionLabel: string;
  title: string;
};

export const DEFAULT_STATUS_COUNTS: SocialPostListStatusCounts = {
  draft: 0,
  failed: 0,
  published: 0,
  scheduled: 0,
};

export const resolveStatusFilterValue = (value: string): SocialPublishingPostListStatus => {
  const isKnownStatus = STATUS_FILTER_OPTIONS.some((option) => option.value === value);
  if (isKnownStatus) return value as SocialPublishingPostListStatus;
  return 'all';
};

export const resolveSocialPostListStatus = (
  post: SocialPublishingPost
): SocialPublishingPost['status'] =>
  hasSocialPublishingPublication(post) ? 'published' : post.status;

export const resolveSocialPostTitle = (post: SocialPublishingPost): string => {
  if (post.titlePl.length > 0) return post.titlePl;
  if (post.titleEn.length > 0) return post.titleEn;
  return 'Untitled update';
};

export const hasBlockingRuntimeSelectionJob = (context: SocialPostListContext): boolean =>
  isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentVisualAnalysisJob)) ||
  isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentGenerationJob)) ||
  isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentPipelineJob));

export const hasBlockingPublicationJob = (
  context: SocialPostListContext,
  isActive: boolean
): boolean => {
  if (!isActive) return false;
  return (
    isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentGenerationJob)) ||
    isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentPipelineJob))
  );
};

export const buildSocialPostListRowState = ({
  context,
  post,
}: {
  context: SocialPostListContext;
  post: SocialPublishingPost;
}): SocialPostListRowState => {
  const title = resolveSocialPostTitle(post);
  const isActive = context.activePostId === post.id;
  const listStatus = resolveSocialPostListStatus(post);
  const hasPublication = listStatus === 'published';
  const blockingRuntimeJob = hasBlockingRuntimeSelectionJob(context);

  return {
    hasBlockingRuntimeSelectionJob: blockingRuntimeJob,
    hasPublication,
    isActive,
    isDeleteBlocked: isActive && blockingRuntimeJob,
    isSelectionBlocked: !isActive && blockingRuntimeJob,
    listStatus,
    pipelineSelectionLabel: isActive ? `${title} is active for pipeline` : `Select ${title} for pipeline`,
    title,
  };
};

export const formatMatchCount = (totalMatches: number): string => {
  if (totalMatches === 0) return 'No matches';
  return `${totalMatches} match${totalMatches === 1 ? '' : 'es'}`;
};

export const shouldShowEmptyFilterMessage = (
  searchValue: string,
  statusFilter: SocialPublishingPostListStatus
): boolean => searchValue.trim().length > 0 || statusFilter !== 'all';
