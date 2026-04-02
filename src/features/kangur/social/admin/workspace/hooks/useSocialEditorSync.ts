'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useKangurSocialPost,
} from '@/features/kangur/social/hooks/useKangurSocialPosts';
import {
  useKangurSocialImageAddons,
} from '@/features/kangur/social/hooks/useKangurSocialImageAddons';
import {
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';

import {
  type EditorState,
  type AddonFormState,
  emptyEditorState,
  emptyAddonForm,
  formatDatetimeLocal,
  buildImageSelection,
  mergeImageAssets,
} from '../AdminKangurSocialPage.Constants';
import {
  mergeSocialPostSelectedAddons,
  removeSocialPostSelectedAddon,
  resolveSocialPostImageState,
} from '../social-post-image-assets';

type SocialEditorSyncDeps = {
  linkedinConnections: Array<{ id: string; hasLinkedInAccessToken?: boolean }>;
  linkedinConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
};

const buildImageAssetSignature = (assets: Array<Partial<ImageFileSelection> | null | undefined>): string =>
  assets
    .map((asset, index) => asset?.id || asset?.filepath || asset?.url || `image-${index}`)
    .filter((value): value is string => Boolean(value))
    .sort()
    .join('|');

const buildStringArraySignature = (values: string[] | null | undefined): string =>
  (values ?? [])
    .filter(Boolean)
    .slice()
    .sort()
    .join('|');

export function useSocialEditorSync(deps: SocialEditorSyncDeps) {
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const activePostQuery = useKangurSocialPost(activePostId, {
    enabled: Boolean(activePostId),
  });
  const activePost = activePostQuery.data ?? null;
  const [editorState, setEditorState] = useState<EditorState>(emptyEditorState);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [docReferenceInput, setDocReferenceInput] = useState<string>('');
  const [generationNotes, setGenerationNotes] = useState<string>('');
  const [draftImageAssets, setDraftImageAssets] = useState<ImageFileSelection[]>([]);
  const [draftImageAddonIds, setDraftImageAddonIds] = useState<string[]>([]);
  const [hydratedDraftPostId, setHydratedDraftPostId] = useState<string | null>(null);
  const [addonForm, setAddonForm] = useState<AddonFormState>(emptyAddonForm);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [contextSummary, setContextSummary] = useState<string | null>(null);
  const posts = useMemo(() => (activePost ? [activePost] : []), [activePost]);
  const requestedAddonIds = useMemo(() => {
    const candidateIds =
      hydratedDraftPostId === activePost?.id ? draftImageAddonIds : activePost?.imageAddonIds ?? [];
    return Array.from(new Set(candidateIds.map((value) => value.trim()).filter(Boolean)));
  }, [activePost?.id, activePost?.imageAddonIds, draftImageAddonIds, hydratedDraftPostId]);
  const addonsQuery = useKangurSocialImageAddons({
    ids: requestedAddonIds,
    enabled: requestedAddonIds.length > 0,
  });
  const recentAddons = addonsQuery.data ?? [];
  const hasTrackedViewRef = useRef(false);

  const resolvedImageState = useMemo(
    () =>
      resolveSocialPostImageState({
        imageAssets: draftImageAssets,
        imageAddonIds: draftImageAddonIds,
        recentAddons,
      }),
    [draftImageAddonIds, draftImageAssets, recentAddons]
  );
  const activePostImageState = useMemo(
    () =>
      resolveSocialPostImageState({
        imageAssets: activePost?.imageAssets ?? [],
        imageAddonIds: activePost?.imageAddonIds ?? [],
        recentAddons,
      }),
    [activePost, recentAddons]
  );
  const imageAssets = resolvedImageState.imageAssets;
  const imageAddonIds = resolvedImageState.imageAddonIds;
  const missingSelectedImageAddonIds = resolvedImageState.missingSelectedImageAddonIds;

  const setImageAssets: React.Dispatch<React.SetStateAction<ImageFileSelection[]>> = useCallback(
    (value) => {
      setDraftImageAssets((prev) => (typeof value === 'function' ? value(prev) : value));
    },
    []
  );
  const setImageAddonIds: React.Dispatch<React.SetStateAction<string[]>> = useCallback((value) => {
    setDraftImageAddonIds((prev) => (typeof value === 'function' ? value(prev) : value));
  }, []);

  const resolveDocReferences = useCallback((): string[] =>
    docReferenceInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean), [docReferenceInput]);

  const hasUnsavedChanges = useMemo(() => {
    if (!activePost) return false;

    if (editorState.titlePl !== (activePost.titlePl ?? '')) return true;
    if (editorState.titleEn !== (activePost.titleEn ?? '')) return true;
    if (editorState.bodyPl !== (activePost.bodyPl ?? '')) return true;
    if (editorState.bodyEn !== (activePost.bodyEn ?? '')) return true;
    if (scheduledAt !== formatDatetimeLocal(activePost.scheduledAt)) return true;
    if (
      buildStringArraySignature(imageAddonIds) !==
      buildStringArraySignature(activePostImageState.imageAddonIds)
    ) {
      return true;
    }
    if (
      buildImageAssetSignature(imageAssets) !==
      buildImageAssetSignature(activePostImageState.imageAssets)
    ) {
      return true;
    }

    return false;
  }, [
    activePost,
    activePostImageState.imageAddonIds,
    activePostImageState.imageAssets,
    editorState.bodyEn,
    editorState.bodyPl,
    editorState.titleEn,
    editorState.titlePl,
    imageAddonIds,
    imageAssets,
    scheduledAt,
  ]);

  // Track page view
  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackKangurClientEvent('kangur_social_page_view', {
      hasActivePostSelection: Boolean(activePostId),
      hasLinkedInIntegration: Boolean(deps.linkedinConnectionId),
      connectionCount: deps.linkedinConnections.length,
      brainModelId: deps.brainModelId ?? null,
      visionModelId: deps.visionModelId ?? null,
    });
  }, [
    deps.brainModelId,
    deps.visionModelId,
    deps.linkedinConnections.length,
    deps.linkedinConnectionId,
    activePostId,
  ]);

  // Sync editor state when active post changes
  useEffect(() => {
    if (!activePost) {
      setEditorState(emptyEditorState);
      setScheduledAt('');
      setDocReferenceInput('');
      setDraftImageAssets([]);
      setDraftImageAddonIds([]);
      setHydratedDraftPostId(null);
      setContextSummary(null);
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
    setDraftImageAddonIds(activePost.imageAddonIds ?? []);
    setDraftImageAssets(
      (activePost.imageAssets ?? []).map((asset, index) => ({
        ...asset,
        id: asset.id || asset.filepath || asset.url || `image-${index}`,
      }))
    );
    setHydratedDraftPostId(activePost.id);
    setContextSummary(activePost.contextSummary ?? null);
  }, [activePost]);

  // Image & addon handlers
  const handleAddImages = (filepaths: string[]): void => {
    const nextAssets = filepaths
      .filter((filepath): filepath is string => Boolean(filepath))
      .map((filepath) => buildImageSelection(filepath));
    if (nextAssets.length === 0) return;
    setDraftImageAssets((prev) => mergeImageAssets(prev, nextAssets));
  };

  const handleRemoveImage = (id: string): void => {
    const matchedAddon = resolvedImageState.latestSelectedAddons.find((addon) => {
      const asset = addon.imageAsset;
      if (!asset) return false;
      return asset.id === id || asset.filepath === id || asset.url === id;
    });
    if (matchedAddon) {
      const nextImageState = removeSocialPostSelectedAddon({
        imageAssets: draftImageAssets,
        imageAddonIds: draftImageAddonIds,
        recentAddons,
        addonId: matchedAddon.id,
      });
      setDraftImageAddonIds(nextImageState.imageAddonIds);
      setDraftImageAssets(nextImageState.imageAssets);
      return;
    }
    setDraftImageAssets((prev) =>
      prev.filter((asset) => asset.id !== id && asset.filepath !== id && asset.url !== id)
    );
  };

  const handleSelectAddon = (addon: KangurSocialImageAddon): void => {
    const nextImageState = mergeSocialPostSelectedAddons({
      imageAssets: draftImageAssets,
      imageAddonIds: draftImageAddonIds,
      recentAddons,
      nextAddons: [addon],
    });
    setDraftImageAddonIds(nextImageState.imageAddonIds);
    setDraftImageAssets(nextImageState.imageAssets);
  };

  const handleSelectAddons = (addons: KangurSocialImageAddon[]): void => {
    if (addons.length === 0) return;
    const nextImageState = mergeSocialPostSelectedAddons({
      imageAssets: draftImageAssets,
      imageAddonIds: draftImageAddonIds,
      recentAddons,
      nextAddons: addons,
    });
    setDraftImageAddonIds(nextImageState.imageAddonIds);
    setDraftImageAssets(nextImageState.imageAssets);
  };

  const handleRemoveAddon = (addonId: string): void => {
    const nextImageState = removeSocialPostSelectedAddon({
      imageAssets: draftImageAssets,
      imageAddonIds: draftImageAddonIds,
      recentAddons,
      addonId,
    });
    setDraftImageAddonIds(nextImageState.imageAddonIds);
    setDraftImageAssets(nextImageState.imageAssets);
  };

  const handleRemoveMissingAddons = useCallback((): void => {
    if (missingSelectedImageAddonIds.length === 0) return;

    const missingAddonIdSet = new Set(missingSelectedImageAddonIds);
    const nextImageState = resolveSocialPostImageState({
      imageAssets: draftImageAssets,
      imageAddonIds: draftImageAddonIds.filter((addonId) => !missingAddonIdSet.has(addonId)),
      recentAddons,
    });
    setDraftImageAddonIds(nextImageState.imageAddonIds);
    setDraftImageAssets(nextImageState.imageAssets);
  }, [draftImageAddonIds, draftImageAssets, missingSelectedImageAddonIds, recentAddons]);

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
    missingSelectedImageAddonIds,
    setImageAddonIds,
    addonForm,
    setAddonForm,
    showMediaLibrary,
    setShowMediaLibrary,
    contextSummary,
    setContextSummary,
    hasUnsavedChanges,
    resolveDocReferences,
    handleAddImages,
    handleRemoveImage,
    handleSelectAddon,
    handleSelectAddons,
    handleRemoveAddon,
    handleRemoveMissingAddons,
    postsQuery: activePostQuery,
    addonsQuery,
  };
}
