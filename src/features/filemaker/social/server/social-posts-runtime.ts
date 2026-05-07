import 'server-only';

import {
  notFoundError,
  operationFailedError,
} from '@/shared/errors/app-error';
import { normalizeSocialPublishingVisualAnalysis } from '@/shared/lib/social-publishing-visual-analysis';
import {
  hasSocialPublishingPublication,
  socialPublishingVisualAnalysisSchema,
  type SocialPublishingGeneratedDraft,
  type SocialPublishingPost,
  type SocialPublishingVisualAnalysis,
} from '@/shared/contracts/social-publishing-posts';
import type {
  SocialPublishingManualGenerationJobResult,
  SocialPublishingManualVisualAnalysisJobResult,
} from '@/shared/contracts/social-publishing-pipeline';
import {
  getSocialPublishingProjectUrlError,
  normalizeSocialPublishingProjectUrl,
} from '@/features/filemaker/social/project-url';

import { findSocialPublishingImageAddonsByIds } from './social-image-addons-repository';
import { generateSocialPublishingPostDraft } from './social-posts-generation';
import {
  getSocialPublishingPostById,
  updateSocialPublishingPost,
} from './social-posts-repository';
import { analyzeSocialPublishingVisuals } from './social-posts-vision';

type SocialVisualAnalysisRuntimeInput = {
  postId?: string | null;
  visionModelId?: string | null;
  imageAddonIds?: string[];
  actorId?: string | null;
  jobId?: string | null;
};

type SocialGenerationRuntimeInput = {
  postId?: string | null;
  docReferences?: string[];
  notes?: string;
  modelId?: string | null;
  visionModelId?: string | null;
  imageAddonIds?: string[];
  projectUrl?: string;
  prefetchedVisualAnalysis?: SocialPublishingVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
  actorId?: string | null;
};

const normalizeTrimmedIdArray = (values: string[] | undefined): string[] =>
  (values ?? []).map((value) => value.trim()).filter(Boolean);

const normalizeOptionalId = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized || null;
};

const hasVisualAnalysisContent = (draft: SocialPublishingGeneratedDraft): boolean =>
  Boolean(draft.visualSummary?.trim() || (draft.visualHighlights?.length ?? 0) > 0);

const hasUsableVisualAnalysis = (analysis: SocialPublishingVisualAnalysis): boolean =>
  Boolean(analysis.summary.trim() || analysis.highlights.length > 0);

const buildVisualAnalysisPatch = ({
  analysis,
  actorId,
  imageAddonIds,
  jobId,
  visionModelId,
}: {
  analysis: SocialPublishingVisualAnalysis;
  actorId: string | null;
  imageAddonIds: string[];
  jobId: string | null;
  visionModelId: string | null;
}) => {
  const normalized = normalizeSocialPublishingVisualAnalysis(analysis);

  return {
    visualSummary: normalized.summary || null,
    visualHighlights: normalized.highlights,
    visualAnalysisSourceImageAddonIds: imageAddonIds,
    visualAnalysisSourceVisionModelId: visionModelId,
    visualAnalysisStatus: 'completed' as const,
    visualAnalysisUpdatedAt: new Date().toISOString(),
    visualAnalysisJobId: jobId,
    visualAnalysisModelId: visionModelId,
    visualAnalysisError: null,
    imageAddonIds,
    ...(visionModelId ? { visionModelId } : {}),
    ...(actorId ? { updatedBy: actorId } : {}),
  };
};

const persistVisualAnalysisOnPost = async ({
  postId,
  analysis,
  actorId,
  imageAddonIds,
  jobId,
  visionModelId,
}: {
  postId: string | null;
  analysis: SocialPublishingVisualAnalysis;
  actorId: string | null;
  imageAddonIds: string[];
  jobId: string | null;
  visionModelId: string | null;
}): Promise<SocialPublishingPost | null> => {
  if (!postId) return null;

  const updated = await updateSocialPublishingPost(
    postId,
    buildVisualAnalysisPatch({
      analysis,
      actorId,
      imageAddonIds,
      jobId,
      visionModelId,
    })
  );

  if (!updated) {
    throw notFoundError('Social post not found.');
  }

  return updated;
};

const persistGeneratedDraftOnPost = async ({
  actorId,
  brainModelId,
  currentPost,
  draft,
  imageAddonIds,
  postId,
  visionModelId,
}: {
  actorId: string | null;
  brainModelId: string | null;
  currentPost: SocialPublishingPost | null;
  draft: SocialPublishingGeneratedDraft;
  imageAddonIds: string[];
  postId: string | null;
  visionModelId: string | null;
}): Promise<SocialPublishingPost | null> => {
  if (!postId) return null;

  const persistedStatus = hasSocialPublishingPublication(currentPost)
    ? 'published'
    : 'draft';

  const includeVisualAnalysisSource = hasVisualAnalysisContent(draft);

  const updated = await updateSocialPublishingPost(postId, {
    titlePl: draft.titlePl,
    titleEn: draft.titleEn,
    bodyPl: draft.bodyPl,
    bodyEn: draft.bodyEn,
    combinedBody: draft.combinedBody,
    contextSummary: draft.summary ?? null,
    generatedSummary: draft.summary ?? null,
    docReferences: draft.docReferences ?? [],
    visualSummary: draft.visualSummary ?? null,
    visualHighlights: draft.visualHighlights ?? [],
    visualAnalysisSourceImageAddonIds: includeVisualAnalysisSource ? imageAddonIds : [],
    visualAnalysisSourceVisionModelId: includeVisualAnalysisSource ? visionModelId : null,
    imageAddonIds,
    ...(brainModelId ? { brainModelId } : {}),
    ...(visionModelId ? { visionModelId } : {}),
    ...(actorId ? { updatedBy: actorId } : {}),
    status: persistedStatus,
  });

  if (!updated) {
    throw notFoundError('Social post not found.');
  }

  return updated;
};

export async function runSocialPublishingPostVisualAnalysisJob(
  input: SocialVisualAnalysisRuntimeInput
): Promise<SocialPublishingManualVisualAnalysisJobResult> {
  const imageAddonIds = normalizeTrimmedIdArray(input.imageAddonIds);
  const normalizedPostId = normalizeOptionalId(input.postId);
  const normalizedVisionModelId = normalizeOptionalId(input.visionModelId);
  const normalizedActorId = normalizeOptionalId(input.actorId);
  const normalizedJobId = normalizeOptionalId(input.jobId);

  if (imageAddonIds.length === 0) {
    throw operationFailedError(
      'Image analysis requires at least one selected image add-on.'
    );
  }

  const imageAddons =
    imageAddonIds.length > 0 ? await findSocialPublishingImageAddonsByIds(imageAddonIds) : [];

  if (imageAddons.length === 0) {
    throw operationFailedError(
      'Image analysis could not load the selected image add-ons. Refresh the add-ons and try again.'
    );
  }

  const analysis = socialPublishingVisualAnalysisSchema.parse(
    await analyzeSocialPublishingVisuals({
      modelId: normalizedVisionModelId ?? undefined,
      imageAddons,
    })
  );

  if (!hasUsableVisualAnalysis(analysis)) {
    throw operationFailedError(
      'Image analysis completed without any usable description. Try a different vision model or capture clearer screenshots.'
    );
  }

  const savedPost = await persistVisualAnalysisOnPost({
    postId: normalizedPostId,
    analysis,
    actorId: normalizedActorId,
    imageAddonIds,
    jobId: normalizedJobId,
    visionModelId: normalizedVisionModelId,
  });

  return {
    type: 'manual-post-visual-analysis',
    postId: normalizedPostId,
    imageAddonIds,
    visionModelId: normalizedVisionModelId,
    analysis,
    savedPost,
  };
}

export async function runSocialPublishingPostGenerationJob(
  input: SocialGenerationRuntimeInput
): Promise<SocialPublishingManualGenerationJobResult> {
  const imageAddonIds = normalizeTrimmedIdArray(input.imageAddonIds);
  const docReferences = normalizeTrimmedIdArray(input.docReferences);
  const normalizedPostId = normalizeOptionalId(input.postId);
  const normalizedBrainModelId = normalizeOptionalId(input.modelId);
  const normalizedVisionModelId = normalizeOptionalId(input.visionModelId);
  const normalizedActorId = normalizeOptionalId(input.actorId);
  const normalizedProjectUrl = normalizeSocialPublishingProjectUrl(input.projectUrl);
  const projectUrlError = getSocialPublishingProjectUrlError(normalizedProjectUrl);
  if (projectUrlError) {
    throw operationFailedError(projectUrlError);
  }
  const currentPost = normalizedPostId
    ? await getSocialPublishingPostById(normalizedPostId)
    : null;
  const imageAddons =
    imageAddonIds.length > 0 ? await findSocialPublishingImageAddonsByIds(imageAddonIds) : [];

  const draft = await generateSocialPublishingPostDraft({
    docReferences,
    notes: input.notes?.trim() ?? '',
    modelId: normalizedBrainModelId ?? undefined,
    visionModelId: normalizedVisionModelId ?? undefined,
    imageAddons,
    projectUrl: normalizedProjectUrl,
    prefetchedVisualAnalysis: input.prefetchedVisualAnalysis,
    requireVisualAnalysisInBody: input.requireVisualAnalysisInBody,
  });

  const generatedPost = await persistGeneratedDraftOnPost({
    actorId: normalizedActorId,
    brainModelId: normalizedBrainModelId,
    currentPost,
    draft,
    imageAddonIds,
    postId: normalizedPostId,
    visionModelId: normalizedVisionModelId,
  });

  return {
    type: 'manual-post-generation',
    postId: normalizedPostId,
    imageAddonIds,
    docReferences,
    brainModelId: normalizedBrainModelId,
    visionModelId: normalizedVisionModelId,
    generatedPost,
    draft: normalizedPostId ? null : draft,
  };
}
