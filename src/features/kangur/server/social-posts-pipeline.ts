import 'server-only';

import type { ImageFileSelection } from '@/shared/contracts/files';
import {
  buildKangurSocialPostCombinedBody,
  kangurSocialPostSchema,
  type KangurSocialDocUpdatesResponse,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import { operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { createKangurSocialImageAddonsBatch } from './social-image-addons-batch';
import {
  buildKangurDocContext,
  resolveKangurDocReferences,
} from './social-posts-docs';
import { planKangurSocialDocUpdates } from './social-posts-doc-updates';
import { generateKangurSocialPostDraft } from './social-posts-generation';
import {
  findKangurSocialImageAddonsByIds,
} from './social-image-addons-repository';
import {
  getKangurSocialPostById,
  updateKangurSocialPost,
  upsertKangurSocialPost,
} from './social-posts-repository';

type EditorState = {
  titlePl: string;
  titleEn: string;
  bodyPl: string;
  bodyEn: string;
};

export type KangurSocialImageAddonsBatchResult = {
  addons: KangurSocialImageAddon[];
  failures: Array<{ id: string; reason: string }>;
  runId: string;
};

export type RunKangurSocialPostPipelineInput = {
  postId: string;
  editorState: EditorState;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  linkedinConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
  projectUrl: string;
  generationNotes: string;
  docReferences: string[];
  actorId: string;
  forwardCookies?: string | null;
};

export type KangurSocialManualPipelineJobResult = {
  type: 'manual-post-pipeline';
  postId: string;
  addonsCreated: number;
  failures: number;
  runId: string;
  contextSummary: string | null;
  contextDocCount: number;
  imageAddonIds: string[];
  imageAssets: ImageFileSelection[];
  batchCaptureResult: KangurSocialImageAddonsBatchResult;
  savedPost: KangurSocialPost;
  generatedPost: KangurSocialPost;
  docUpdates: KangurSocialDocUpdatesResponse | null;
};

const MAX_IMAGE_ADDON_IDS = 30;
const MAX_IMAGE_ASSETS = 12;

const mergeImageAssets = (
  current: ImageFileSelection[],
  nextAssets: ImageFileSelection[]
): ImageFileSelection[] => {
  const existing = new Set(
    current
      .map((asset) => asset.id || asset.filepath || asset.url)
      .filter((value): value is string => Boolean(value))
  );
  const merged = [...current];
  nextAssets.forEach((asset) => {
    const key = asset.id || asset.filepath || asset.url;
    if (!key || existing.has(key)) return;
    existing.add(key);
    merged.push({
      ...asset,
      id: asset.id || asset.filepath || asset.url || `image-${merged.length}`,
    });
  });
  return merged;
};

const buildNoScreenshotsCapturedMessage = (
  failures: Array<{ id: string; reason: string }>
): string => {
  if (failures.length === 0) {
    return 'Pipeline stopped: no screenshots captured.';
  }

  const failureReasons = failures
    .map((failure) => `${failure.id}: ${failure.reason}`)
    .slice(0, 3)
    .join('; ');

  return `Pipeline stopped: no screenshots captured. Failures: ${failureReasons}`;
};

export async function runKangurSocialPostPipeline(
  input: RunKangurSocialPostPipelineInput
): Promise<KangurSocialManualPipelineJobResult> {
  const startedAt = Date.now();
  const postId = input.postId.trim();
  if (!postId) {
    throw operationFailedError('Pipeline stopped: missing post id.');
  }

  const batchCaptureBaseUrl = input.batchCaptureBaseUrl.trim();
  const batchCapturePresetIds = input.batchCapturePresetIds
    .map((id) => id.trim())
    .filter(Boolean);

  if (!batchCaptureBaseUrl || batchCapturePresetIds.length === 0) {
    throw operationFailedError(
      'Pipeline stopped: configure batch capture base URL and presets first.'
    );
  }

  const normalizedDocReferences = input.docReferences
    .map((reference) => reference.trim())
    .filter(Boolean)
    .slice(0, 80);
  const docs = resolveKangurDocReferences(normalizedDocReferences);
  const context =
    docs.length > 0 ? await buildKangurDocContext(docs) : { summary: '', context: '' };
  const contextSummary = context.summary.trim() || null;
  const existingPost = await getKangurSocialPostById(postId);

  if (!existingPost) {
    throw operationFailedError('Pipeline stopped: social post not found.');
  }

  try {
    const batchCaptureResult = await createKangurSocialImageAddonsBatch({
      baseUrl: batchCaptureBaseUrl,
      presetIds: batchCapturePresetIds,
      createdBy: input.actorId,
      forwardCookies: input.forwardCookies ?? null,
    });

    if (batchCaptureResult.addons.length === 0) {
      throw operationFailedError(
        buildNoScreenshotsCapturedMessage(batchCaptureResult.failures)
      );
    }

    const capturedAddonIds = batchCaptureResult.addons.map((addon) => addon.id);
    const capturedAssets = batchCaptureResult.addons
      .map((addon) => addon.imageAsset)
      .filter((asset): asset is ImageFileSelection => Boolean(asset));

    const mergedImageAddonIds = Array.from(
      new Set([...input.imageAddonIds, ...capturedAddonIds])
    ).slice(0, MAX_IMAGE_ADDON_IDS);
    const mergedImageAssets = mergeImageAssets(
      input.imageAssets,
      capturedAssets
    ).slice(0, MAX_IMAGE_ASSETS);

    const combinedBody = buildKangurSocialPostCombinedBody(
      input.editorState.bodyPl,
      input.editorState.bodyEn
    );

    const savedPost = await upsertKangurSocialPost(
      kangurSocialPostSchema.parse({
        ...existingPost,
        id: existingPost.id,
        titlePl: input.editorState.titlePl,
        titleEn: input.editorState.titleEn,
        bodyPl: input.editorState.bodyPl,
        bodyEn: input.editorState.bodyEn,
        combinedBody,
        status: 'draft',
        imageAssets: mergedImageAssets,
        imageAddonIds: mergedImageAddonIds,
        docReferences: normalizedDocReferences,
        contextSummary,
        linkedinConnectionId: input.linkedinConnectionId ?? null,
        brainModelId: input.brainModelId ?? null,
        visionModelId: input.visionModelId ?? null,
        publishError: null,
        updatedBy: input.actorId,
      })
    );

    const imageAddons = await findKangurSocialImageAddonsByIds(mergedImageAddonIds);
    const draft = await generateKangurSocialPostDraft({
      docReferences: normalizedDocReferences,
      notes: input.generationNotes,
      modelId: input.brainModelId ?? undefined,
      visionModelId: input.visionModelId ?? undefined,
      imageAddons,
      projectUrl: input.projectUrl || undefined,
    });

    const generatedPost = await updateKangurSocialPost(savedPost.id, {
      titlePl: draft.titlePl,
      titleEn: draft.titleEn,
      bodyPl: draft.bodyPl,
      bodyEn: draft.bodyEn,
      combinedBody: draft.combinedBody,
      generatedSummary: draft.summary,
      docReferences: draft.docReferences,
      visualSummary: draft.visualSummary,
      visualHighlights: draft.visualHighlights,
      visualDocUpdates: draft.visualDocUpdates,
      docUpdatesAppliedAt: null,
      docUpdatesAppliedBy: null,
      imageAddonIds: mergedImageAddonIds,
      imageAssets: mergedImageAssets,
      contextSummary,
      ...(input.brainModelId ? { brainModelId: input.brainModelId } : {}),
      ...(input.visionModelId ? { visionModelId: input.visionModelId } : {}),
      status: 'draft',
      publishError: null,
      updatedBy: input.actorId,
    });

    if (!generatedPost) {
      throw operationFailedError('Pipeline stopped: generated post could not be saved.');
    }

    let docUpdates: KangurSocialDocUpdatesResponse | null = null;
    try {
      docUpdates = {
        applied: false,
        plan: await planKangurSocialDocUpdates(generatedPost, { apply: false }),
        post: generatedPost,
      };
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'kangur.social-posts.pipeline',
        action: 'previewDocUpdates',
        postId: generatedPost.id,
      });
    }

    return {
      type: 'manual-post-pipeline',
      postId: generatedPost.id,
      addonsCreated: batchCaptureResult.addons.length,
      failures: batchCaptureResult.failures.length,
      runId: batchCaptureResult.runId,
      contextSummary,
      contextDocCount: docs.length,
      imageAddonIds: mergedImageAddonIds,
      imageAssets: mergedImageAssets,
      batchCaptureResult,
      savedPost,
      generatedPost,
      docUpdates,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.pipeline',
      action: 'run',
      postId,
      durationMs: Date.now() - startedAt,
      docReferenceCount: normalizedDocReferences.length,
      imageAddonCount: input.imageAddonIds.length,
      presetCount: batchCapturePresetIds.length,
    });
    throw error;
  }
}
