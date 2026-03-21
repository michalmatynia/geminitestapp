import 'server-only';

import type { ImageFileSelection } from '@/shared/contracts/files';
import type {
  KangurSocialPipelineCaptureMode,
  KangurSocialManualPipelineProgress,
  KangurSocialManualPipelineProgressStep,
} from '@/shared/contracts/kangur-social-pipeline';
import {
  buildKangurSocialPostCombinedBody,
  kangurSocialPostSchema,
  type KangurSocialDocUpdatesResponse,
  type KangurSocialPostEditorStateDto,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import type {
  KangurSocialImageAddon,
  KangurSocialImageAddonsBatchResult,
} from '@/shared/contracts/kangur-social-image-addons';
import { operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';

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

export type RunKangurSocialPostPipelineInput = {
  postId: string;
  editorState: KangurSocialPostEditorStateDto;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  captureMode: Extract<KangurSocialPipelineCaptureMode, 'existing_assets' | 'fresh_capture'>;
  batchCaptureBaseUrl?: string;
  batchCapturePresetIds?: string[];
  batchCapturePresetLimit?: number | null;
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
  captureMode: Extract<KangurSocialPipelineCaptureMode, 'existing_assets' | 'fresh_capture'>;
  addonsCreated: number;
  failures: number;
  runId: string | null;
  contextSummary: string | null;
  contextDocCount: number;
  imageAddonIds: string[];
  imageAssets: ImageFileSelection[];
  batchCaptureResult: KangurSocialImageAddonsBatchResult | null;
  savedPost: KangurSocialPost;
  generatedPost: KangurSocialPost;
  docUpdates: KangurSocialDocUpdatesResponse | null;
};

type RunKangurSocialPostPipelineOptions = {
  reportProgress?: (
    progress: KangurSocialManualPipelineProgress
  ) => Promise<void> | void;
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
  const ordered = KANGUR_SOCIAL_CAPTURE_PRESETS
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
  existingAddons: KangurSocialImageAddon[];
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

export async function runKangurSocialPostPipeline(
  input: RunKangurSocialPostPipelineInput,
  options?: RunKangurSocialPostPipelineOptions
): Promise<KangurSocialManualPipelineJobResult> {
  const startedAt = Date.now();
  const postId = input.postId.trim();
  if (!postId) {
    throw operationFailedError('Pipeline stopped: missing post id.');
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
  const progressState: Omit<KangurSocialManualPipelineProgress, 'updatedAt'> = {
    type: 'manual-post-pipeline',
    step: 'loading_context',
    captureMode,
    message: null,
    contextDocCount: null,
    contextSummary: null,
    addonsCreated: null,
    captureFailureCount: null,
    captureFailures: [],
    requestedPresetCount: effectiveCapturePresetIds.length || null,
    usedPresetCount: null,
    usedPresetIds: [],
    runId: null,
  };
  const publishProgress = async (
    step: KangurSocialManualPipelineProgressStep,
    updates?: Partial<
      Omit<KangurSocialManualPipelineProgress, 'type' | 'step' | 'updatedAt'>
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

  await publishProgress('loading_context', {
    message: 'Loading documentation context...',
  });
  const docs = resolveKangurDocReferences(normalizedDocReferences);
  const context =
    docs.length > 0 ? await buildKangurDocContext(docs) : { summary: '', context: '' };
  const contextSummary = context.summary.trim() || null;
  await publishProgress('loading_context', {
    message:
      docs.length > 0
        ? `Loaded ${docs.length} documentation reference${docs.length === 1 ? '' : 's'}.`
        : 'No documentation references selected.',
    contextDocCount: docs.length,
    contextSummary,
  });
  const existingPost = await getKangurSocialPostById(postId);

  if (!existingPost) {
    throw operationFailedError('Pipeline stopped: social post not found.');
  }

  try {
    let batchCaptureResult: KangurSocialImageAddonsBatchResult | null = null;
    let mergedImageAddonIds = input.imageAddonIds.slice(0, MAX_IMAGE_ADDON_IDS);
    let mergedImageAssets = input.imageAssets.slice(0, MAX_IMAGE_ASSETS);

    if (captureMode === 'fresh_capture') {
      await publishProgress('capturing', {
        message:
          effectiveCapturePresetIds.length === 1
            ? 'Capturing 1 selected screenshot preset...'
            : `Capturing ${effectiveCapturePresetIds.length} selected screenshot presets...`,
      });
      batchCaptureResult = await createKangurSocialImageAddonsBatch({
        baseUrl: batchCaptureBaseUrl,
        presetIds: batchCapturePresetIds,
        presetLimit: batchCapturePresetLimit,
        createdBy: input.actorId,
        forwardCookies: input.forwardCookies ?? null,
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
        existingAddons: await findKangurSocialImageAddonsByIds(input.imageAddonIds),
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
        runId: null,
      });
    }

    const combinedBody = buildKangurSocialPostCombinedBody(
      input.editorState.bodyPl,
      input.editorState.bodyEn
    );

    await publishProgress('saving', {
      message:
        captureMode === 'fresh_capture'
          ? `Linking ${mergedImageAddonIds.length} captured image${mergedImageAddonIds.length === 1 ? '' : 's'} to the draft.`
          : `Saving the draft with ${mergedImageAddonIds.length} attached image${mergedImageAddonIds.length === 1 ? '' : 's'}.`,
    });
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
    await publishProgress('generating', {
      message:
        captureMode === 'fresh_capture'
          ? 'Generating the draft from the fresh screenshots...'
          : 'Generating the draft from the currently attached visuals...',
    });
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
      await publishProgress('previewing', {
        message: 'Preparing documentation diff...',
      });
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
      captureMode,
      presetCount: effectiveCapturePresetIds.length,
    });
    throw error;
  }
}
