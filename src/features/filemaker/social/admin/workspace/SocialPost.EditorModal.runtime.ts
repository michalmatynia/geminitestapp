import {
  hasSocialPublishingPublication,
  type SocialPublishingPost,
} from '@/shared/contracts/social-publishing-posts';

import { formatDatetimeDisplay } from './SocialPublishingPage.Constants';
import type { useSocialPostContext } from './SocialPostContext';

export type SocialPostEditorTab = 'edit' | 'schedule' | 'images';
export type SocialPostEditorContextValue = ReturnType<typeof useSocialPostContext>;

export type SocialPostEditorRuntimeState = {
  isSavingDraft: boolean;
  isSubmitting: boolean;
  hasPublication: boolean;
  hasBlockingRuntimeJob: boolean;
  hasBlockingImageMutationJob: boolean;
  editorActionTitle: string | undefined;
  publishActionLabel: string | undefined;
  imageMutationTitle: string | undefined;
  scheduleActionTitle: string | undefined;
  saveDraftTitle: string | undefined;
};

type SocialRuntimeJobLike = {
  id?: string | null;
  status?: string | null;
  failedReason?: string | null;
  progress?: { message?: string | null } | null;
} | null | undefined;

const RUNTIME_BLOCKED_TITLE = 'Wait for the current Social runtime job to finish.';

export const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) {
    return false;
  }

  return normalized !== 'completed' && normalized !== 'failed';
};

export const resolvePostTitle = (
  post: Pick<SocialPublishingPost, 'titlePl' | 'titleEn'> | null
): string => {
  const titlePl = post?.titlePl.trim() ?? '';
  if (titlePl.length > 0) {
    return titlePl;
  }

  const titleEn = post?.titleEn.trim() ?? '';
  return titleEn.length > 0 ? titleEn : 'Untitled update';
};

export const resolvePostSubtitle = (
  post: Pick<
    SocialPublishingPost,
    'status' | 'publishedAt' | 'scheduledAt' | 'publishedPostId' | 'publishedUrl'
  > | null
): string => {
  if (post === null) {
    return 'Edit copy and review attached images.';
  }
  if (hasSocialPublishingPublication(post)) {
    return post.publishedAt !== null
      ? `Published ${formatDatetimeDisplay(post.publishedAt)}`
      : 'Published';
  }
  if (post.status === 'scheduled' && post.scheduledAt !== null) {
    return `Scheduled ${formatDatetimeDisplay(post.scheduledAt)}`;
  }

  return 'Edit copy and review attached images.';
};

const resolveEditorActionTitle = ({
  hasBlockingRuntimeJob,
  hasPublication,
}: Pick<SocialPostEditorRuntimeState, 'hasBlockingRuntimeJob' | 'hasPublication'>): string | undefined => {
  if (hasBlockingRuntimeJob) {
    return RUNTIME_BLOCKED_TITLE;
  }
  if (hasPublication) {
    return 'This post is already published. Unpublish it from the posts list before publishing again.';
  }

  return undefined;
};

const resolveScheduleActionTitle = ({
  hasBlockingRuntimeJob,
  hasPublication,
}: Pick<SocialPostEditorRuntimeState, 'hasBlockingRuntimeJob' | 'hasPublication'>): string | undefined => {
  if (hasBlockingRuntimeJob) {
    return RUNTIME_BLOCKED_TITLE;
  }
  if (hasPublication) {
    return 'This post is already published. Unpublish it from the posts list before scheduling again.';
  }

  return undefined;
};

const resolveSaveDraftTitle = ({
  hasBlockingRuntimeJob,
  activePost,
  hasUnsavedChanges,
}: {
  hasBlockingRuntimeJob: boolean;
  activePost: SocialPostEditorContextValue['activePost'];
  hasUnsavedChanges: boolean;
}): string | undefined => {
  if (hasBlockingRuntimeJob) {
    return RUNTIME_BLOCKED_TITLE;
  }
  if (activePost === null) {
    return 'Select a social post to save it.';
  }
  if (!hasUnsavedChanges) {
    return 'No draft changes to save.';
  }

  return undefined;
};

export const buildSocialRuntimeJobTitle = (job: SocialRuntimeJobLike): string => {
  return [readRuntimeJobProgressMessage(job), readRuntimeJobFailedReason(job), readRuntimeJobQueueTitle(job)]
    .filter((value): value is string => value !== null && value.length > 0)
    .join(' · ');
};

const readRuntimeJobProgressMessage = (job: SocialRuntimeJobLike): string | null =>
  job?.progress?.message ?? null;

const readRuntimeJobFailedReason = (job: SocialRuntimeJobLike): string | null =>
  job?.failedReason ?? null;

const readRuntimeJobQueueTitle = (job: SocialRuntimeJobLike): string | null => {
  const jobId = job?.id ?? null;
  return jobId !== null && jobId.length > 0 ? `Queue job: ${jobId}` : null;
};

const hasBlockingRuntimeJob = (context: SocialPostEditorContextValue): boolean =>
  isSocialRuntimeJobInFlight(context.currentGenerationJob?.status) ||
  isSocialRuntimeJobInFlight(context.currentPipelineJob?.status);

const resolvePublishActionLabel = ({
  isPending,
  hasPublication,
}: {
  isPending: boolean;
  hasPublication: boolean;
}): string | undefined => {
  if (isPending) {
    return 'Publishing...';
  }
  if (hasPublication) {
    return 'Published';
  }

  return undefined;
};

export const resolveEditorModalRuntimeState = (
  context: SocialPostEditorContextValue
): SocialPostEditorRuntimeState => {
  const isSavingDraft = context.patchMutation.isPending && !context.publishMutation.isPending;
  const isSubmitting = context.patchMutation.isPending || context.publishMutation.isPending;
  const hasPublication = hasSocialPublishingPublication(context.activePost);
  const hasRuntimeJob = hasBlockingRuntimeJob(context);
  const hasBlockingImageMutationJob =
    isSocialRuntimeJobInFlight(context.currentVisualAnalysisJob?.status) ||
    hasRuntimeJob;

  return {
    isSavingDraft,
    isSubmitting,
    hasPublication,
    hasBlockingRuntimeJob: hasRuntimeJob,
    hasBlockingImageMutationJob,
    editorActionTitle: resolveEditorActionTitle({ hasBlockingRuntimeJob: hasRuntimeJob, hasPublication }),
    publishActionLabel: resolvePublishActionLabel({
      isPending: context.publishMutation.isPending,
      hasPublication,
    }),
    imageMutationTitle: hasBlockingImageMutationJob ? RUNTIME_BLOCKED_TITLE : undefined,
    scheduleActionTitle: resolveScheduleActionTitle({ hasBlockingRuntimeJob: hasRuntimeJob, hasPublication }),
    saveDraftTitle: resolveSaveDraftTitle({
      hasBlockingRuntimeJob: hasRuntimeJob,
      activePost: context.activePost,
      hasUnsavedChanges: context.hasUnsavedChanges,
    }),
  };
};
