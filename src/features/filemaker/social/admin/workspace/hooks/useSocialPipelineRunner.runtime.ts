import { normalizeSocialPublishingVisualAnalysis } from '@/shared/lib/social-publishing-visual-analysis';
import type {
  SocialPublishingPost,
  SocialPublishingVisualAnalysis,
} from '@/shared/contracts/social-publishing-posts';

import type {
  ManualPipelineJobResult,
  SocialPipelineRunnerDeps,
  VisualAnalysisJobResult,
} from './useSocialPipelineRunner.types';

export const PIPELINE_POLL_INTERVAL_MS = 2_000;
export const PIPELINE_TIMEOUT_MS = 10 * 60 * 1000;
export const PIPELINE_REQUEST_TIMEOUT_MS = 60_000;
export const SOCIAL_PUBLISHING_POSTS_QUERY_KEY = ['social-publishing', 'posts'] as const;
export const SOCIAL_PUBLISHING_IMAGE_ADDONS_QUERY_KEY = [
  'social-publishing',
  'image-addons',
] as const;

export type SocialQueryInvalidator = {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const recordType = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  const type = value['type'];
  return typeof type === 'string' ? type : null;
};

export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export const isManualPipelineResult = (value: unknown): value is ManualPipelineJobResult =>
  recordType(value) === 'manual-post-pipeline';

export const isVisualAnalysisJobResult = (
  value: unknown
): value is VisualAnalysisJobResult => recordType(value) === 'manual-post-visual-analysis';

export const invalidateSocialQueries = (queryClient: SocialQueryInvalidator): void => {
  void queryClient.invalidateQueries({ queryKey: SOCIAL_PUBLISHING_POSTS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: SOCIAL_PUBLISHING_IMAGE_ADDONS_QUERY_KEY });
};

export const buildVisualAnalysisFromPost = (
  post: SocialPublishingPost | null
): SocialPublishingVisualAnalysis | null => {
  if (post === null) return null;

  const { summary, highlights } = normalizeSocialPublishingVisualAnalysis({
    summary: post.visualSummary,
    highlights: post.visualHighlights,
  });

  if (summary.trim().length === 0 && highlights.length === 0) return null;

  return {
    summary,
    highlights,
  };
};

const buildStringArraySignature = (values: string[] | null | undefined): string =>
  (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice()
    .sort()
    .join('|');

const hasText = (value: string | null | undefined): boolean =>
  (value?.trim().length ?? 0) > 0;

const visualSourceImageAddonIds = (post: SocialPublishingPost): string[] => {
  const value = (post as Partial<SocialPublishingPost>).visualAnalysisSourceImageAddonIds;
  return Array.isArray(value) ? value : [];
};

const hasSavedVisualAnalysisScopeMetadata = (post: SocialPublishingPost | null): boolean => {
  if (post === null) return false;
  return (
    visualSourceImageAddonIds(post).length > 0 ||
    hasText(post.visualAnalysisSourceVisionModelId)
  );
};

export const savedVisualAnalysisMatchesDraft = ({
  post,
  currentImageAddonIds,
  currentVisionModelId,
}: {
  post: SocialPublishingPost | null;
  currentImageAddonIds: string[];
  currentVisionModelId: string | null;
}): boolean => {
  if (post === null) return false;
  if (!hasSavedVisualAnalysisScopeMetadata(post)) return true;

  return (
    buildStringArraySignature(visualSourceImageAddonIds(post)) ===
      buildStringArraySignature(currentImageAddonIds) &&
    (post.visualAnalysisSourceVisionModelId?.trim() ?? '') ===
      (currentVisionModelId?.trim() ?? '')
  );
};

export const visualAnalysisScopeForDeps = (deps: SocialPipelineRunnerDeps): string =>
  JSON.stringify({
    postId: deps.activePostId,
    imageAddonIds: deps.imageAddonIds,
    visionModelId: deps.visionModelId,
  });
