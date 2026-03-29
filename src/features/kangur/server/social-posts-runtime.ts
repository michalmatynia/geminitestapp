import 'server-only';

import {
  notFoundError,
} from '@/shared/errors/app-error';
import { normalizeKangurSocialVisualAnalysis } from '@/shared/lib/kangur-social-visual-analysis';
import {
  kangurSocialVisualAnalysisSchema,
  type KangurSocialGeneratedDraft,
  type KangurSocialPost,
  type KangurSocialVisualAnalysis,
} from '@/shared/contracts/kangur-social-posts';
import type {
  KangurSocialManualGenerationJobResult,
  KangurSocialManualVisualAnalysisJobResult,
} from '@/shared/contracts/kangur-social-pipeline';

import { findKangurSocialImageAddonsByIds } from './social-image-addons-repository';
import { generateKangurSocialPostDraft } from './social-posts-generation';
import { updateKangurSocialPost } from './social-posts-repository';
import { analyzeKangurSocialVisuals } from './social-posts-vision';

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
  prefetchedVisualAnalysis?: KangurSocialVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
  actorId?: string | null;
};

const normalizeTrimmedIdArray = (values: string[] | undefined): string[] =>
  (values ?? []).map((value) => value.trim()).filter(Boolean);

const normalizeOptionalId = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized || null;
};

const hasVisualAnalysisContent = (draft: KangurSocialGeneratedDraft): boolean =>
  Boolean(draft.visualSummary?.trim() || (draft.visualHighlights?.length ?? 0) > 0);

const buildVisualAnalysisPatch = ({
  analysis,
  actorId,
  imageAddonIds,
  jobId,
  visionModelId,
}: {
  analysis: KangurSocialVisualAnalysis;
  actorId: string | null;
  imageAddonIds: string[];
  jobId: string | null;
  visionModelId: string | null;
}) => {
  const normalized = normalizeKangurSocialVisualAnalysis(analysis);

  return {
    visualSummary: normalized.summary || null,
    visualHighlights: normalized.highlights,
    visualAnalysisSourceImageAddonIds: imageAddonIds,
    visualAnalysisSourceVisionModelId: visionModelId,
    visualAnalysisStatus: 'completed' as const,
    visualAnalysisUpdatedAt: new Date().toISOString(),
    visualAnalysisJobId: jobId,
    visualAnalysisModelId: visionModelId,
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
  analysis: KangurSocialVisualAnalysis;
  actorId: string | null;
  imageAddonIds: string[];
  jobId: string | null;
  visionModelId: string | null;
}): Promise<KangurSocialPost | null> => {
  if (!postId) return null;

  const updated = await updateKangurSocialPost(
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
  draft,
  imageAddonIds,
  postId,
  visionModelId,
}: {
  actorId: string | null;
  brainModelId: string | null;
  draft: KangurSocialGeneratedDraft;
  imageAddonIds: string[];
  postId: string | null;
  visionModelId: string | null;
}): Promise<KangurSocialPost | null> => {
  if (!postId) return null;

  const includeVisualAnalysisSource = hasVisualAnalysisContent(draft);

  const updated = await updateKangurSocialPost(postId, {
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
    status: 'draft',
  });

  if (!updated) {
    throw notFoundError('Social post not found.');
  }

  return updated;
};

export async function runKangurSocialPostVisualAnalysisJob(
  input: SocialVisualAnalysisRuntimeInput
): Promise<KangurSocialManualVisualAnalysisJobResult> {
  const imageAddonIds = normalizeTrimmedIdArray(input.imageAddonIds);
  const normalizedPostId = normalizeOptionalId(input.postId);
  const normalizedVisionModelId = normalizeOptionalId(input.visionModelId);
  const normalizedActorId = normalizeOptionalId(input.actorId);
  const normalizedJobId = normalizeOptionalId(input.jobId);
  const imageAddons =
    imageAddonIds.length > 0 ? await findKangurSocialImageAddonsByIds(imageAddonIds) : [];

  const analysis = kangurSocialVisualAnalysisSchema.parse(
    await analyzeKangurSocialVisuals({
      modelId: normalizedVisionModelId ?? undefined,
      imageAddons,
    })
  );

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

export async function runKangurSocialPostGenerationJob(
  input: SocialGenerationRuntimeInput
): Promise<KangurSocialManualGenerationJobResult> {
  const imageAddonIds = normalizeTrimmedIdArray(input.imageAddonIds);
  const docReferences = normalizeTrimmedIdArray(input.docReferences);
  const normalizedPostId = normalizeOptionalId(input.postId);
  const normalizedBrainModelId = normalizeOptionalId(input.modelId);
  const normalizedVisionModelId = normalizeOptionalId(input.visionModelId);
  const normalizedActorId = normalizeOptionalId(input.actorId);
  const imageAddons =
    imageAddonIds.length > 0 ? await findKangurSocialImageAddonsByIds(imageAddonIds) : [];

  const draft = await generateKangurSocialPostDraft({
    docReferences,
    notes: input.notes?.trim() ?? '',
    modelId: normalizedBrainModelId ?? undefined,
    visionModelId: normalizedVisionModelId ?? undefined,
    imageAddons,
    projectUrl: input.projectUrl?.trim() ?? '',
    prefetchedVisualAnalysis: input.prefetchedVisualAnalysis,
    requireVisualAnalysisInBody: input.requireVisualAnalysisInBody,
  });

  const generatedPost = await persistGeneratedDraftOnPost({
    actorId: normalizedActorId,
    brainModelId: normalizedBrainModelId,
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
