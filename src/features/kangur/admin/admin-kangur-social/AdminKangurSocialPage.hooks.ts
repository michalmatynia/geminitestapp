'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/features/kangur/shared/ui';
import {
  useApplyKangurSocialDocUpdates,
  useGenerateKangurSocialPost,
  useKangurSocialPosts,
  usePatchKangurSocialPost,
  usePreviewKangurSocialDocUpdates,
  usePublishKangurSocialPost,
  useSaveKangurSocialPost,
} from '@/features/kangur/ui/hooks/useKangurSocialPosts';
import {
  useBatchCaptureKangurSocialImageAddons,
  useCreateKangurSocialImageAddon,
  useKangurSocialImageAddons,
  type KangurSocialImageAddonsBatchResult,
} from '@/features/kangur/ui/hooks/useKangurSocialImageAddons';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import {
  useIntegrationConnections,
  useIntegrations,
} from '@/features/integrations/hooks/useIntegrationQueries';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  buildKangurSocialPostCombinedBody,
  type KangurSocialDocUpdatesResponse,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import {
  BRAIN_MODEL_DEFAULT_VALUE,
  buildImageSelection,
  emptyAddonForm,
  emptyEditorState,
  formatDatetimeLocal,
  matchesImageAsset,
  mergeImageAssets,
  parseDatetimeLocal,
} from './AdminKangurSocialPage.Constants';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';

export function useAdminKangurSocialPage() {
  const { toast } = useToast();
  const postsQuery = useKangurSocialPosts({ scope: 'admin' });
  const saveMutation = useSaveKangurSocialPost();
  const patchMutation = usePatchKangurSocialPost();
  const publishMutation = usePublishKangurSocialPost();
  const generateMutation = useGenerateKangurSocialPost();
  const previewDocUpdatesMutation = usePreviewKangurSocialDocUpdates();
  const applyDocUpdatesMutation = useApplyKangurSocialDocUpdates();
  const addonsQuery = useKangurSocialImageAddons({ limit: 12 });
  const createAddonMutation = useCreateKangurSocialImageAddon();
  const batchCaptureMutation = useBatchCaptureKangurSocialImageAddons();
  const brainModelOptions = useBrainModelOptions({ capability: 'kangur_social.post_generation' });
  const visionModelOptions = useBrainModelOptions({ capability: 'kangur_social.visual_analysis' });
  const integrationsQuery = useIntegrations();
  
  const linkedinIntegration = useMemo(
    () => integrationsQuery.data?.find((integration) => integration.slug === 'linkedin') ?? null,
    [integrationsQuery.data]
  );
  const linkedinConnectionsQuery = useIntegrationConnections(linkedinIntegration?.id);
  const linkedinConnections = linkedinConnectionsQuery.data ?? [];

  const posts = postsQuery.data ?? [];
  const recentAddons = addonsQuery.data ?? [];
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const activePost = useMemo(
    () => posts.find((post) => post.id === activePostId) ?? null,
    [activePostId, posts]
  );
  
  const hasTrackedViewRef = useRef(false);
  const [editorState, setEditorState] = useState(emptyEditorState);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [docReferenceInput, setDocReferenceInput] = useState<string>('');
  const [generationNotes, setGenerationNotes] = useState<string>('');
  const [imageAssets, setImageAssets] = useState<ImageFileSelection[]>([]);
  const [imageAddonIds, setImageAddonIds] = useState<string[]>([]);
  const [addonForm, setAddonForm] = useState(emptyAddonForm);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [linkedinConnectionId, setLinkedinConnectionId] = useState<string | null>(null);
  const [brainModelId, setBrainModelId] = useState<string | null>(null);
  const [visionModelId, setVisionModelId] = useState<string | null>(null);
  const [docUpdatesResult, setDocUpdatesResult] =
    useState<KangurSocialDocUpdatesResponse | null>(null);
  const [batchCaptureBaseUrl, setBatchCaptureBaseUrl] = useState<string>('');
  const [batchCapturePresetIds, setBatchCapturePresetIds] = useState<string[]>(
    () => KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => preset.id)
  );
  const [batchCaptureResult, setBatchCaptureResult] =
    useState<KangurSocialImageAddonsBatchResult | null>(null);
  const [pipelineStep, setPipelineStep] = useState<
    'idle' | 'capturing' | 'saving' | 'generating' | 'previewing' | 'done' | 'error'
  >('idle');

  const resolveDocReferences = useCallback((): string[] =>
    docReferenceInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean), [docReferenceInput]);

  const buildSocialContext = useCallback((overrides?: Record<string, unknown>): Record<string, unknown> => ({
    postId: activePost?.id ?? null,
    status: activePost?.status ?? null,
    scheduledAt: parseDatetimeLocal(scheduledAt),
    imageCount: imageAssets.length,
    imageAddonCount: imageAddonIds.length,
    docReferenceCount: resolveDocReferences().length,
    visualDocUpdateCount: activePost?.visualDocUpdates?.length ?? 0,
    notesLength: generationNotes.trim().length,
    hasLinkedInConnection: Boolean(linkedinConnectionId),
    brainModelId: brainModelId ?? null,
    visionModelId: visionModelId ?? null,
    batchCapturePresetCount: batchCapturePresetIds.length,
    batchCaptureBaseUrl: batchCaptureBaseUrl.trim() || null,
    ...overrides,
  }), [activePost?.id, activePost?.status, activePost?.visualDocUpdates?.length, batchCaptureBaseUrl, batchCapturePresetIds.length, brainModelId, docReferenceInput, generationNotes, imageAddonIds.length, imageAssets.length, linkedinConnectionId, resolveDocReferences, scheduledAt, visionModelId]);

  useEffect(() => {
    if (!activePostId && posts.length > 0) {
      setActivePostId(posts[0]?.id ?? null);
    }
  }, [activePostId, posts]);

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    if (postsQuery.isLoading) return;
    hasTrackedViewRef.current = true;
    trackKangurClientEvent('kangur_social_page_view', {
      postCount: posts.length,
      hasLinkedInIntegration: Boolean(linkedinIntegration),
      connectionCount: linkedinConnections.length,
      brainModelId: brainModelId ?? null,
      visionModelId: visionModelId ?? null,
    });
  }, [
    brainModelId,
    visionModelId,
    linkedinConnections.length,
    linkedinIntegration,
    posts.length,
    postsQuery.isLoading,
  ]);

  useEffect(() => {
    if (!activePost) {
      setEditorState(emptyEditorState);
      setScheduledAt('');
      setDocReferenceInput('');
      setImageAssets([]);
      setImageAddonIds([]);
      setLinkedinConnectionId(null);
      setBrainModelId(null);
      setVisionModelId(null);
      return;
    }
    setEditorState({
      titlePl: activePost.titlePl ?? '',
      titleEn: activePost.titleEn ?? '',
      bodyPl: activePost.bodyPl ?? '',
      bodyEn: activePost.bodyEn ?? '',
    });
    setScheduledAt(formatDatetimeLocal(activePost.scheduledAt));
    setDocReferenceInput(activePost.docReferences?.join(', ') ?? '');
    setLinkedinConnectionId(activePost.linkedinConnectionId ?? null);
    setBrainModelId(activePost.brainModelId ?? null);
    setVisionModelId(activePost.visionModelId ?? null);
    setImageAddonIds(activePost.imageAddonIds ?? []);
    setImageAssets(
      (activePost.imageAssets ?? []).map((asset, index) => ({
        ...asset,
        id: asset.id || asset.filepath || asset.url || `image-${index}`,
      }))
    );
  }, [activePost]);

  useEffect(() => {
    setDocUpdatesResult(null);
    setBatchCaptureResult(null);
  }, [activePostId]);

  useEffect(() => {
    if (batchCaptureBaseUrl) return;
    if (typeof window === 'undefined') return;
    setBatchCaptureBaseUrl(window.location.origin);
  }, [batchCaptureBaseUrl]);

  useEffect(() => {
    if (!activePost) return;
    if (activePost.linkedinConnectionId) return;
    if (linkedinConnectionId) return;
    const fallback =
      linkedinConnections.find((connection) => connection.hasLinkedInAccessToken) ??
      linkedinConnections[0];
    if (fallback) {
      setLinkedinConnectionId(fallback.id);
    }
  }, [activePost, linkedinConnections, linkedinConnectionId]);

  const handleCreateDraft = async (): Promise<void> => {
    trackKangurClientEvent('kangur_social_post_create_attempt', buildSocialContext());
    try {
      const created = await saveMutation.mutateAsync({});
      setActivePostId(created.id);
      trackKangurClientEvent(
        'kangur_social_post_create_success',
        buildSocialContext({ postId: created.id })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'createDraft',
        ...buildSocialContext(),
      });
      trackKangurClientEvent(
        'kangur_social_post_create_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  const handleSave = async (nextStatus: KangurSocialPost['status']): Promise<void> => {
    if (!activePost) return;
    const combinedBody = buildKangurSocialPostCombinedBody(
      editorState.bodyPl,
      editorState.bodyEn
    );
    trackKangurClientEvent(
      'kangur_social_post_save_attempt',
      buildSocialContext({ nextStatus })
    );
    try {
      await patchMutation.mutateAsync({
        id: activePost.id,
        updates: {
          ...editorState,
          combinedBody,
          status: nextStatus,
          scheduledAt: nextStatus === 'scheduled' ? parseDatetimeLocal(scheduledAt) : null,
          imageAssets,
          imageAddonIds,
          docReferences: resolveDocReferences(),
          linkedinConnectionId: linkedinConnectionId ?? null,
          brainModelId: brainModelId ?? null,
          visionModelId: visionModelId ?? null,
          publishError: null,
        },
      });
      trackKangurClientEvent(
        'kangur_social_post_save_success',
        buildSocialContext({ nextStatus })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'savePost',
        ...buildSocialContext({ nextStatus }),
      });
      trackKangurClientEvent(
        'kangur_social_post_save_failed',
        buildSocialContext({ nextStatus, error: true })
      );
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (!activePost) return;
    trackKangurClientEvent(
      'kangur_social_post_generate_attempt',
      buildSocialContext()
    );
    try {
      await generateMutation.mutateAsync({
        postId: activePost.id,
        docReferences: resolveDocReferences(),
        notes: generationNotes,
        modelId: brainModelId ?? undefined,
        visionModelId: visionModelId ?? undefined,
        imageAddonIds,
      });
      setDocUpdatesResult(null);
      trackKangurClientEvent(
        'kangur_social_post_generate_success',
        buildSocialContext()
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'generatePost',
        ...buildSocialContext(),
      });
      trackKangurClientEvent(
        'kangur_social_post_generate_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  const handlePreviewDocUpdates = async (): Promise<void> => {
    if (!activePost) return;
    trackKangurClientEvent(
      'kangur_social_doc_updates_preview_attempt',
      buildSocialContext()
    );
    try {
      const result = await previewDocUpdatesMutation.mutateAsync(activePost.id);
      setDocUpdatesResult(result);
      const fileCount = result.plan.files.length;
      const updateCount = result.plan.items.length;
      toast(
        `Documentation preview ready (${fileCount} file${fileCount === 1 ? '' : 's'}, ${updateCount} update${updateCount === 1 ? '' : 's'})`,
        { variant: 'success' }
      );
      trackKangurClientEvent(
        'kangur_social_doc_updates_preview_success',
        buildSocialContext({ fileCount, updateCount })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'previewDocUpdates',
        ...buildSocialContext({ error: true }),
      });
      toast('Failed to preview documentation updates', { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_doc_updates_preview_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  const handleApplyDocUpdates = async (): Promise<void> => {
    if (!activePost) return;
    trackKangurClientEvent(
      'kangur_social_doc_updates_apply_attempt',
      buildSocialContext()
    );
    try {
      const result = await applyDocUpdatesMutation.mutateAsync(activePost.id);
      setDocUpdatesResult(result);
      const appliedFiles = result.plan.files.filter((file) => file.applied).length;
      const updateCount = result.plan.items.length;
      toast(
        `${appliedFiles > 0 ? 'Documentation updated' : 'No documentation changes applied'} (${appliedFiles} file${appliedFiles === 1 ? '' : 's'} updated, ${updateCount} update${updateCount === 1 ? '' : 's'})`,
        { variant: appliedFiles > 0 ? 'success' : 'warning' }
      );
      trackKangurClientEvent(
        'kangur_social_doc_updates_apply_success',
        buildSocialContext({ appliedFiles, updateCount })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'applyDocUpdates',
        ...buildSocialContext({ error: true }),
      });
      toast('Failed to apply documentation updates', { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_doc_updates_apply_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  const handleAddImages = (filepaths: string[]): void => {
    const nextAssets = filepaths
      .filter((filepath): filepath is string => Boolean(filepath))
      .map((filepath) => buildImageSelection(filepath));
    if (nextAssets.length === 0) return;
    setImageAssets((prev) => mergeImageAssets(prev, nextAssets));
  };

  const handleRemoveImage = (id: string): void => {
    setImageAssets((prev) => prev.filter((asset) => asset.id !== id));
    const matchedAddon = recentAddons.find((addon) => {
      const asset = addon.imageAsset;
      if (!asset) return false;
      return asset.id === id || asset.filepath === id || asset.url === id;
    });
    if (matchedAddon) {
      setImageAddonIds((prev) => prev.filter((addonId) => addonId !== matchedAddon.id));
    }
  };

  const handleBrainModelChange = (value: string): void => {
    const nextValue = value === BRAIN_MODEL_DEFAULT_VALUE ? null : value;
    setBrainModelId(nextValue);
    trackKangurClientEvent('kangur_social_post_model_select', {
      ...buildSocialContext({ nextModelId: nextValue }),
    });
  };

  const handleVisionModelChange = (value: string): void => {
    const nextValue = value === BRAIN_MODEL_DEFAULT_VALUE ? null : value;
    setVisionModelId(nextValue);
    trackKangurClientEvent('kangur_social_post_vision_model_select', {
      ...buildSocialContext({ nextVisionModelId: nextValue }),
    });
  };

  const handleLinkedInConnectionChange = (value: string): void => {
    setLinkedinConnectionId(value);
    trackKangurClientEvent('kangur_social_post_connection_select', {
      ...buildSocialContext({ nextConnectionId: value }),
    });
  };

  const handleToggleCapturePreset = (presetId: string): void => {
    setBatchCapturePresetIds((prev) =>
      prev.includes(presetId) ? prev.filter((id) => id !== presetId) : [...prev, presetId]
    );
  };

  const selectAllCapturePresets = (): void => {
    setBatchCapturePresetIds(KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => preset.id));
  };

  const clearCapturePresets = (): void => {
    setBatchCapturePresetIds([]);
  };

  const handleSelectAddon = (addon: KangurSocialImageAddon): void => {
    setImageAddonIds((prev) => (prev.includes(addon.id) ? prev : [...prev, addon.id]));
    if (addon.imageAsset) {
      setImageAssets((prev) => mergeImageAssets(prev, [addon.imageAsset]));
    }
  };

  const handleSelectAddons = (addons: KangurSocialImageAddon[]): void => {
    if (addons.length === 0) return;
    setImageAddonIds((prev) => {
      const next = new Set(prev);
      addons.forEach((addon) => next.add(addon.id));
      return Array.from(next);
    });
    const assets = addons
      .map((addon) => addon.imageAsset)
      .filter((asset): asset is ImageFileSelection => Boolean(asset));
    if (assets.length > 0) {
      setImageAssets((prev) => mergeImageAssets(prev, assets));
    }
  };

  const handleRemoveAddon = (addonId: string): void => {
    const addon = recentAddons.find((entry) => entry.id === addonId) ?? null;
    setImageAddonIds((prev) => prev.filter((id) => id !== addonId));
    if (addon?.imageAsset) {
      setImageAssets((prev) =>
        prev.filter((asset) => !matchesImageAsset(asset, addon.imageAsset))
      );
    }
  };

  const handleCreateAddon = async (): Promise<void> => {
    const title = addonForm.title.trim();
    const sourceUrl = addonForm.sourceUrl.trim();
    if (!title || !sourceUrl) return;
    const waitForMsRaw = Number(addonForm.waitForMs);
    const waitForMs = Number.isFinite(waitForMsRaw) ? Math.max(0, waitForMsRaw) : undefined;
    trackKangurClientEvent(
      'kangur_social_addon_capture_attempt',
      buildSocialContext({ addonTitleLength: title.length })
    );
    try {
      const created = await createAddonMutation.mutateAsync({
        title,
        sourceUrl,
        description: addonForm.description.trim() || undefined,
        selector: addonForm.selector.trim() || undefined,
        ...(waitForMs !== undefined ? { waitForMs } : {}),
      });
      setAddonForm(emptyAddonForm);
      handleSelectAddon(created);
      trackKangurClientEvent(
        'kangur_social_addon_capture_success',
        buildSocialContext({ addonId: created.id })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'createAddon',
        ...buildSocialContext({ error: true }),
      });
      trackKangurClientEvent(
        'kangur_social_addon_capture_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  const handleBatchCapture = async (): Promise<void> => {
    const baseUrl = batchCaptureBaseUrl.trim();
    if (!baseUrl) {
      toast('Base URL is required for batch capture', { variant: 'error' });
      return;
    }
    if (batchCapturePresetIds.length === 0) {
      toast('Select at least one capture preset', { variant: 'warning' });
      return;
    }
    trackKangurClientEvent(
      'kangur_social_batch_capture_attempt',
      buildSocialContext({ baseUrl, presetCount: batchCapturePresetIds.length })
    );
    try {
      const result = await batchCaptureMutation.mutateAsync({
        baseUrl,
        presetIds: batchCapturePresetIds,
      });
      setBatchCaptureResult(result);
      handleSelectAddons(result.addons);
      const successCount = result.addons.length;
      const failureCount = result.failures.length;
      toast(
        `${successCount > 0 ? 'Batch capture completed' : 'Batch capture finished with no assets'} (${successCount} add-on${successCount === 1 ? '' : 's'}, ${failureCount} failure${failureCount === 1 ? '' : 's'})`,
        { variant: successCount > 0 ? 'success' : 'warning' }
      );
      trackKangurClientEvent(
        'kangur_social_batch_capture_success',
        buildSocialContext({ successCount, failureCount })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'batchCapture',
        ...buildSocialContext({ error: true }),
      });
      toast('Batch capture failed', { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_batch_capture_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!activePost) return;
    const combinedBody = buildKangurSocialPostCombinedBody(
      editorState.bodyPl,
      editorState.bodyEn
    );
    trackKangurClientEvent(
      'kangur_social_post_publish_attempt',
      buildSocialContext()
    );
    let stage: 'prepare' | 'publish' = 'prepare';
    try {
      await patchMutation.mutateAsync({
        id: activePost.id,
        updates: {
          ...editorState,
          combinedBody,
          scheduledAt: parseDatetimeLocal(scheduledAt),
          imageAssets,
          imageAddonIds,
          docReferences: resolveDocReferences(),
          linkedinConnectionId: linkedinConnectionId ?? null,
          brainModelId: brainModelId ?? null,
          visionModelId: visionModelId ?? null,
          publishError: null,
        },
      });
      stage = 'publish';
      await publishMutation.mutateAsync(activePost.id);
      trackKangurClientEvent(
        'kangur_social_post_publish_success',
        buildSocialContext()
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'publishPost',
        stage,
        ...buildSocialContext(),
      });
      trackKangurClientEvent(
        'kangur_social_post_publish_failed',
        buildSocialContext({ stage, error: true })
      );
    }
  };

  const handleRunFullPipeline = async (): Promise<void> => {
    if (!activePost) {
      toast('Create or select a post first', { variant: 'warning' });
      return;
    }
    trackKangurClientEvent('kangur_social_pipeline_attempt', buildSocialContext());
    try {
      // Step 1: Batch capture
      setPipelineStep('capturing');
      toast('Pipeline: capturing screenshots...', { variant: 'default' });
      const baseUrl = batchCaptureBaseUrl.trim();
      if (!baseUrl || batchCapturePresetIds.length === 0) {
        toast('Pipeline stopped: configure batch capture base URL and presets first', {
          variant: 'warning',
        });
        setPipelineStep('error');
        return;
      }
      const captureResult = await batchCaptureMutation.mutateAsync({
        baseUrl,
        presetIds: batchCapturePresetIds,
      });
      setBatchCaptureResult(captureResult);
      handleSelectAddons(captureResult.addons);
      if (captureResult.addons.length === 0) {
        toast('Pipeline stopped: no screenshots captured', { variant: 'warning' });
        setPipelineStep('error');
        return;
      }

      // Step 2: Save post with new addon IDs
      setPipelineStep('saving');
      toast('Pipeline: saving post with captured images...', { variant: 'default' });
      const combinedBody = buildKangurSocialPostCombinedBody(
        editorState.bodyPl,
        editorState.bodyEn
      );
      await patchMutation.mutateAsync({
        id: activePost.id,
        updates: {
          ...editorState,
          combinedBody,
          status: 'draft' as const,
          imageAssets,
          imageAddonIds,
          docReferences: resolveDocReferences(),
          linkedinConnectionId: linkedinConnectionId ?? null,
          brainModelId: brainModelId ?? null,
          visionModelId: visionModelId ?? null,
          publishError: null,
        },
      });

      // Step 3: Generate draft with vision
      setPipelineStep('generating');
      toast('Pipeline: generating draft with vision analysis...', { variant: 'default' });
      await generateMutation.mutateAsync({
        postId: activePost.id,
        docReferences: resolveDocReferences(),
        notes: generationNotes,
        modelId: brainModelId ?? undefined,
        visionModelId: visionModelId ?? undefined,
        imageAddonIds,
      });
      setDocUpdatesResult(null);

      // Step 4: Preview doc updates (non-blocking)
      setPipelineStep('previewing');
      toast('Pipeline: previewing documentation updates...', { variant: 'default' });
      try {
        const docResult = await previewDocUpdatesMutation.mutateAsync(activePost.id);
        setDocUpdatesResult(docResult);
      } catch {
        // Doc updates preview is optional — don't fail the pipeline
      }

      setPipelineStep('done');
      toast('Pipeline complete — review your post and documentation updates', {
        variant: 'success',
      });
      trackKangurClientEvent('kangur_social_pipeline_success', buildSocialContext());
    } catch (error) {
      setPipelineStep('error');
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'runFullPipeline',
        ...buildSocialContext({ error: true }),
      });
      toast('Pipeline failed — check logs for details', { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_pipeline_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  return {
    posts,
    recentAddons,
    activePostId,
    setActivePostId,
    activePost,
    editorState,
    setEditorState,
    scheduledAt,
    setScheduledAt,
    docReferenceInput,
    setDocReferenceInput,
    generationNotes,
    setGenerationNotes,
    imageAssets,
    setImageAssets,
    imageAddonIds,
    setImageAddonIds,
    addonForm,
    setAddonForm,
    showMediaLibrary,
    setShowMediaLibrary,
    linkedinConnectionId,
    setLinkedinConnectionId,
    brainModelId,
    setBrainModelId,
    visionModelId,
    setVisionModelId,
    docUpdatesResult,
    setDocUpdatesResult,
    batchCaptureBaseUrl,
    setBatchCaptureBaseUrl,
    batchCapturePresetIds,
    setBatchCapturePresetIds,
    batchCaptureResult,
    setBatchCaptureResult,
    linkedinIntegration,
    linkedinConnections,
    brainModelOptions,
    visionModelOptions,
    postsQuery,
    addonsQuery,
    saveMutation,
    patchMutation,
    publishMutation,
    generateMutation,
    previewDocUpdatesMutation,
    applyDocUpdatesMutation,
    createAddonMutation,
    batchCaptureMutation,
    handleCreateDraft,
    handleSave,
    handleGenerate,
    handlePreviewDocUpdates,
    handleApplyDocUpdates,
    handleSelectAddon,
    handleRemoveAddon,
    handleCreateAddon,
    handleBatchCapture,
    handlePublish,
    handleRemoveImage,
    handleAddImages,
    handleToggleCapturePreset,
    selectAllCapturePresets,
    clearCapturePresets,
    handleBrainModelChange,
    handleVisionModelChange,
    handleLinkedInConnectionChange,
    resolveDocReferences,
    pipelineStep,
    handleRunFullPipeline,
  };
}
