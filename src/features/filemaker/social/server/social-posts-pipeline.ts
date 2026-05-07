import 'server-only';

import type { ImageFileSelection } from '@/shared/contracts/files';
import {
  createSocialPublishingManualPipelineProgressBase,
  type SocialPublishingPipelineCaptureMode,
  type SocialPublishingManualPipelineProgress,
  type SocialPublishingManualPipelineProgressBase,
  type SocialPublishingManualPipelineProgressStep,
} from '@/shared/contracts/social-publishing-pipeline';
import {
  buildSocialPublishingPostCombinedBody,
  hasSocialPublishingPublication,
  socialPublishingPostSchema,
  type SocialPublishingVisualAnalysis,
  type SocialPublishingPostEditorStateDto,
  type SocialPublishingPost,
} from '@/shared/contracts/social-publishing-posts';
import type {
  SocialPublishingImageAddon,
  SocialPublishingImageAddonsBatchResult,
} from '@/shared/contracts/social-publishing-image-addons';
import { operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { SOCIAL_PUBLISHING_CAPTURE_PRESETS } from '@/features/filemaker/social/shared/social-capture-presets';
import {
  getSocialPublishingProjectUrlError,
  normalizeSocialPublishingProjectUrl,
} from '@/features/filemaker/social/project-url';

import { createSocialPublishingImageAddonsBatch } from './social-image-addons-batch';
import {
  buildKangurDocContext,
  resolveKangurDocReferences,
} from './social-posts-docs';
import { generateSocialPublishingPostDraft } from './social-posts-generation';
import {
  findSocialPublishingImageAddonsByIds,
} from './social-image-addons-repository';
import {
  getSocialPublishingPostById,
  updateSocialPublishingPost,
  upsertSocialPublishingPost,
} from './social-posts-repository';

export type RunSocialPublishingPostPipelineInput = {
  postId: string;
  editorState: SocialPublishingPostEditorStateDto;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  captureMode: Extract<SocialPublishingPipelineCaptureMode, 'existing_assets' | 'fresh_capture'>;
  batchCaptureBaseUrl?: string;
  batchCapturePresetIds?: string[];
  batchCapturePresetLimit?: number | null;
  publishingConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
  projectUrl: string;
  generationNotes: string;
  docReferences: string[];
  prefetchedVisualAnalysis?: SocialPublishingVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
  actorId: string;
  forwardCookies?: string | null;
};

export type SocialPublishingManualPipelineJobResult = {
  type: 'manual-post-pipeline';
  postId: string;
  captureMode: Extract<SocialPublishingPipelineCaptureMode, 'existing_assets' | 'fresh_capture'>;
  addonsCreated: number;
  failures: number;
  runId: string | null;
  contextSummary: string | null;
  contextDocCount: number;
  imageAddonIds: string[];
  imageAssets: ImageFileSelection[];
  batchCaptureResult: SocialPublishingImageAddonsBatchResult | null;
  savedPost: SocialPublishingPost;
  generatedPost: SocialPublishingPost;
};

type RunSocialPublishingPostPipelineOptions = {
  reportProgress?: (
    progress: SocialPublishingManualPipelineProgress
  ) => Promise<void> | void;
};

const MAX_IMAGE_ADDON_IDS = 30;
const MAX_IMAGE_ASSETS = 30;

const mergeImageAssets = (
  current: ImageFileSelection[],
  nextAssets: ImageFileSelection[]
): ImageFileSelection[] => {
  const merged = [...current];
  nextAssets.forEach((asset) => {
    const key = asset.id || asset.filepath || asset.url;
    if (!key) return;
    if (merged.some((existingAsset) => matchesImageAsset(existingAsset, asset))) {
      return;
    }
    merged.push({
      ...asset,
      id: asset.id || asset.filepath || asset.url || `image-${merged.length}`,
    });
  });
  return merged;
};

const matchesImageAsset = (
  asset: ImageFileSelection,
  candidate: ImageFileSelection
): boolean => {
  const keys = new Set(
    [asset.id, asset.filepath, asset.url].filter((value): value is string => Boolean(value))
  );
  return [candidate.id, candidate.filepath, candidate.url].some(
    (value) => Boolean(value && keys.has(value))
  );
};

const resolveEffectiveCapturePresetIds = (
  presetIds: string[],
  presetLimit: number | null | undefined
): string[] => {
  const selected = new Set(presetIds.map((id) => id.trim()).filter(Boolean));
  const ordered = SOCIAL_PUBLISHING_CAPTURE_PRESETS
    .map((preset) => preset.id)
    .filter((id) => selected.has(id));
  if (presetLimit == null) {
    return ordered;
  }
  const normalizedLimit = Math.max(1, Math.floor(presetLimit));
  return ordered.slice(0, normalizedLimit);
};

const removePresetBasedSelections = (params: {
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  existingAddons: SocialPublishingImageAddon[];
  presetIds: string[];
}): {
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
} => {
  if (params.presetIds.length === 0 || params.existingAddons.length === 0) {
    return {
      imageAssets: params.imageAssets,
      imageAddonIds: params.imageAddonIds,
    };
  }

  const presetIdSet = new Set(params.presetIds);
  const removedAddons = params.existingAddons.filter(
    (addon) => addon.presetId && presetIdSet.has(addon.presetId)
  );
  if (removedAddons.length === 0) {
    return {
      imageAssets: params.imageAssets,
      imageAddonIds: params.imageAddonIds,
    };
  }

  const removedAddonIdSet = new Set(removedAddons.map((addon) => addon.id));
  const removedAssets = removedAddons
    .map((addon) => addon.imageAsset)
    .filter((asset): asset is ImageFileSelection => Boolean(asset));

  return {
    imageAddonIds: params.imageAddonIds.filter((id) => !removedAddonIdSet.has(id)),
    imageAssets: params.imageAssets.filter(
      (asset) => !removedAssets.some((candidate) => matchesImageAsset(asset, candidate))
    ),
  };
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

const buildLiveCaptureProgressMessage = (params: {
  completedCount: number;
  remainingCount: number;
  failureCount: number;
  totalCount: number;
  message?: string | null;
}): string => {
  const totalLabel = params.totalCount === 1 ? 'preset' : 'presets';
  const failureMessage =
    params.failureCount > 0
      ? ` ${params.failureCount} failed.`
      : '';
  const progressSummary = `${params.completedCount} captured, ${params.remainingCount} left of ${params.totalCount} ${totalLabel}.${failureMessage}`;
  const detailedMessage = params.message?.trim();
  if (detailedMessage) {
    return `${detailedMessage} (${progressSummary})`;
  }
  return `Playwright capture in progress: ${params.completedCount} captured, ${params.remainingCount} left of ${params.totalCount} ${totalLabel}.${failureMessage}`;
};

const processContextLoading = async (
  normalizedDocReferences: string[],
  publishProgress: (step: SocialPublishingManualPipelineProgressStep, updates?: any) => Promise<void>
) => {
  await publishProgress('loading_context', {
    message: 'Loading documentation context...',
  });
  const docs = resolveKangurDocReferences(normalizedDocReferences);
  const context = docs.length > 0 ? await buildKangurDocContext(docs) : { summary: '', context: '' };
  const contextSummary = context.summary.trim() || null;
  await publishProgress('loading_context', {
    message:
      docs.length > 0
        ? `Loaded ${docs.length} documentation reference${docs.length === 1 ? '' : 's'}.`
        : 'No documentation references selected.',
    contextDocCount: docs.length,
    contextSummary,
  });
  return { docs, contextSummary };
};

export async function runSocialPublishingPostPipeline(
  input: RunSocialPublishingPostPipelineInput,
  options?: RunSocialPublishingPostPipelineOptions
): Promise<SocialPublishingManualPipelineJobResult> {
  const startedAt = Date.now();
  const postId = input.postId.trim();
  const normalizedProjectUrl = normalizeSocialPublishingProjectUrl(input.projectUrl);
  const projectUrlError = getSocialPublishingProjectUrlError(normalizedProjectUrl);
  if (!postId) {
    throw operationFailedError('Pipeline stopped: missing post id.');
  }
  if (projectUrlError) {
    throw operationFailedError(projectUrlError);
  }

  const captureMode = input.captureMode;
  const batchCaptureBaseUrl = input.batchCaptureBaseUrl?.trim() ?? '';
  const batchCapturePresetIds = (input.batchCapturePresetIds ?? [])
    .map((id) => id.trim())
    .filter(Boolean);
  const batchCapturePresetLimit =
    typeof input.batchCapturePresetLimit === 'number' &&
    Number.isFinite(input.batchCapturePresetLimit)
      ? Math.max(1, Math.floor(input.batchCapturePresetLimit))
      : null;
  const effectiveCapturePresetIds =
    captureMode === 'fresh_capture'
      ? resolveEffectiveCapturePresetIds(batchCapturePresetIds, batchCapturePresetLimit)
      : [];

  if (captureMode === 'fresh_capture' && (!batchCaptureBaseUrl || effectiveCapturePresetIds.length === 0)) {
    throw operationFailedError(
      'Pipeline stopped: configure batch capture base URL and presets first.'
    );
  }

  const normalizedDocReferences = input.docReferences
    .map((reference) => reference.trim())
    .filter(Boolean)
    .slice(0, 80);
  const progressState: SocialPublishingManualPipelineProgressBase =
    createSocialPublishingManualPipelineProgressBase({
      step: 'loading_context',
      captureMode,
      requestedPresetCount: effectiveCapturePresetIds.length || null,
    });
  const publishProgress = async (
    step: SocialPublishingManualPipelineProgressStep,
    updates?: Partial<
      Omit<SocialPublishingManualPipelineProgress, 'type' | 'step' | 'updatedAt'>
    >
  ): Promise<void> => {
    if (!options?.reportProgress) return;
    Object.assign(progressState, updates ?? {});
    progressState.step = step;
    await options.reportProgress({
      ...progressState,
      updatedAt: Date.now(),
    });
  };

  const { docs, contextSummary } = await processContextLoading(normalizedDocReferences, publishProgress);
  const existingPost = await getSocialPublishingPostById(postId);

  if (!existingPost) {
    throw operationFailedError('Pipeline stopped: social post not found.');
  }
  const persistedStatus = hasSocialPublishingPublication(existingPost)
    ? 'published'
    : 'draft';

  try {
    // ... rest of logic

    let batchCaptureResult: SocialPublishingImageAddonsBatchResult | null = null;
    let mergedImageAddonIds = input.imageAddonIds.slice(0, MAX_IMAGE_ADDON_IDS);
    let mergedImageAssets = input.imageAssets.slice(0, MAX_IMAGE_ASSETS);

    if (captureMode === 'fresh_capture') {
      await publishProgress('capturing', {
        message:
          effectiveCapturePresetIds.length === 1
            ? 'Capturing 1 selected screenshot preset...'
            : `Capturing ${effectiveCapturePresetIds.length} selected screenshot presets...`,
        captureCompletedCount: 0,
        captureFailureCount: 0,
        captureRemainingCount: effectiveCapturePresetIds.length,
        captureTotalCount: effectiveCapturePresetIds.length,
      });
      batchCaptureResult = await createSocialPublishingImageAddonsBatch({
        baseUrl: batchCaptureBaseUrl,
        presetIds: batchCapturePresetIds,
        presetLimit: batchCapturePresetLimit,
        createdBy: input.actorId,
        forwardCookies: input.forwardCookies ?? null,
        onProgress: async (progress) => {
          await publishProgress('capturing', {
            message: buildLiveCaptureProgressMessage(progress),
            captureCompletedCount: progress.completedCount,
            captureFailureCount: progress.failureCount,
            captureRemainingCount: progress.remainingCount,
            captureTotalCount: progress.totalCount,
          });
        },
      });

      await publishProgress('capturing', {
        message:
          batchCaptureResult.addons.length > 0
            ? `Captured ${batchCaptureResult.addons.length} screenshot${batchCaptureResult.addons.length === 1 ? '' : 's'} from ${batchCaptureResult.usedPresetCount ?? effectiveCapturePresetIds.length} preset${(batchCaptureResult.usedPresetCount ?? effectiveCapturePresetIds.length) === 1 ? '' : 's'}.`
            : buildNoScreenshotsCapturedMessage(batchCaptureResult.failures),
        addonsCreated: batchCaptureResult.addons.length,
        captureFailureCount: batchCaptureResult.failures.length,
        captureFailures: batchCaptureResult.failures,
        requestedPresetCount:
          batchCaptureResult.requestedPresetCount ?? effectiveCapturePresetIds.length,
        usedPresetCount:
          batchCaptureResult.usedPresetCount ?? effectiveCapturePresetIds.length,
        usedPresetIds: batchCaptureResult.usedPresetIds ?? effectiveCapturePresetIds,
        captureCompletedCount: batchCaptureResult.addons.length,
        captureRemainingCount: 0,
        captureTotalCount:
          batchCaptureResult.usedPresetCount ?? effectiveCapturePresetIds.length,
        runId: batchCaptureResult.runId,
      });

      if (batchCaptureResult.addons.length === 0) {
        throw operationFailedError(
          buildNoScreenshotsCapturedMessage(batchCaptureResult.failures)
        );
      }

      const preservedSelections = removePresetBasedSelections({
        imageAssets: input.imageAssets,
        imageAddonIds: input.imageAddonIds,
        existingAddons: await findSocialPublishingImageAddonsByIds(input.imageAddonIds),
        presetIds: effectiveCapturePresetIds,
      });

      const capturedAddonIds = batchCaptureResult.addons.map((addon) => addon.id);
      const capturedAssets = batchCaptureResult.addons
        .map((addon) => addon.imageAsset)
        .filter((asset): asset is ImageFileSelection => Boolean(asset));

      mergedImageAddonIds = Array.from(
        new Set([...preservedSelections.imageAddonIds, ...capturedAddonIds])
      ).slice(0, MAX_IMAGE_ADDON_IDS);
      mergedImageAssets = mergeImageAssets(
        preservedSelections.imageAssets,
        capturedAssets
      ).slice(0, MAX_IMAGE_ASSETS);
    } else {
      await publishProgress('capturing', {
        message: `Skipping Playwright capture and using ${Math.max(
          input.imageAddonIds.length,
          input.imageAssets.length
        )} existing visual${Math.max(input.imageAddonIds.length, input.imageAssets.length) === 1 ? '' : 's'}.`,
        addonsCreated: 0,
        captureFailureCount: 0,
        captureFailures: [],
        requestedPresetCount: 0,
        usedPresetCount: 0,
        usedPresetIds: [],
        captureCompletedCount: 0,
        captureRemainingCount: 0,
        captureTotalCount: 0,
        runId: null,
      });
    }

    const combinedBody = buildSocialPublishingPostCombinedBody(
      input.editorState.bodyPl,
      input.editorState.bodyEn
    );

    await publishProgress('saving', {
      message:
        captureMode === 'fresh_capture'
          ? `Linking ${mergedImageAddonIds.length} captured image${mergedImageAddonIds.length === 1 ? '' : 's'} to the draft.`
          : `Saving the draft with ${mergedImageAddonIds.length} attached image${mergedImageAddonIds.length === 1 ? '' : 's'}.`,
    });
    const savedPost = await upsertSocialPublishingPost(
      socialPublishingPostSchema.parse({
        ...existingPost,
        id: existingPost.id,
        titlePl: input.editorState.titlePl,
        titleEn: input.editorState.titleEn,
        bodyPl: input.editorState.bodyPl,
        bodyEn: input.editorState.bodyEn,
        combinedBody,
        status: persistedStatus,
        imageAssets: mergedImageAssets,
        imageAddonIds: mergedImageAddonIds,
        docReferences: normalizedDocReferences,
        contextSummary,
        publishingConnectionId: input.publishingConnectionId ?? null,
        brainModelId: input.brainModelId ?? null,
        visionModelId: input.visionModelId ?? null,
        publishError: null,
        updatedBy: input.actorId,
      })
    );

    const imageAddons = await findSocialPublishingImageAddonsByIds(mergedImageAddonIds);
    await publishProgress('generating', {
      message:
        captureMode === 'fresh_capture'
          ? 'Generating the draft from the fresh screenshots...'
          : 'Generating the draft from the currently attached visuals...',
    });
    const draft = await generateSocialPublishingPostDraft({
      docReferences: normalizedDocReferences,
      notes: input.generationNotes,
      modelId: input.brainModelId ?? undefined,
      visionModelId: input.visionModelId ?? undefined,
      imageAddons,
      projectUrl: normalizedProjectUrl,
      prefetchedVisualAnalysis: input.prefetchedVisualAnalysis,
      requireVisualAnalysisInBody: input.requireVisualAnalysisInBody,
    });
    const hasVisualAnalysisContent = Boolean(
      draft.visualSummary?.trim() || (draft.visualHighlights?.length ?? 0) > 0
    );

    const generatedPost = await updateSocialPublishingPost(savedPost.id, {
      titlePl: draft.titlePl,
      titleEn: draft.titleEn,
      bodyPl: draft.bodyPl,
      bodyEn: draft.bodyEn,
      combinedBody: draft.combinedBody,
      generatedSummary: draft.summary,
      docReferences: draft.docReferences,
      visualSummary: draft.visualSummary,
      visualHighlights: draft.visualHighlights,
      visualAnalysisSourceImageAddonIds: hasVisualAnalysisContent ? mergedImageAddonIds : [],
      visualAnalysisSourceVisionModelId: hasVisualAnalysisContent
        ? (input.visionModelId ?? null)
        : null,
      imageAddonIds: mergedImageAddonIds,
      imageAssets: mergedImageAssets,
      contextSummary,
      ...(input.brainModelId ? { brainModelId: input.brainModelId } : {}),
      ...(input.visionModelId ? { visionModelId: input.visionModelId } : {}),
      status: persistedStatus,
      publishError: null,
      updatedBy: input.actorId,
    });

    if (!generatedPost) {
      throw operationFailedError('Pipeline stopped: generated post could not be saved.');
    }

    return {
      type: 'manual-post-pipeline',
      postId: generatedPost.id,
      captureMode,
      addonsCreated: batchCaptureResult?.addons.length ?? 0,
      failures: batchCaptureResult?.failures.length ?? 0,
      runId: batchCaptureResult?.runId ?? null,
      contextSummary,
      contextDocCount: docs.length,
      imageAddonIds: mergedImageAddonIds,
      imageAssets: mergedImageAssets,
      batchCaptureResult,
      savedPost,
      generatedPost,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'social-publishing.posts.pipeline',
      action: 'run',
      postId,
      durationMs: Date.now() - startedAt,
      docReferenceCount: normalizedDocReferences.length,
      imageAddonCount: input.imageAddonIds.length,
      captureMode,
      presetCount: effectiveCapturePresetIds.length,
    });
    throw error;
  }
}
