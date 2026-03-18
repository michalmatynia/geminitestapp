'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useKangurSocialPosts,
} from '@/features/kangur/ui/hooks/useKangurSocialPosts';
import {
  useKangurSocialImageAddons,
} from '@/features/kangur/ui/hooks/useKangurSocialImageAddons';
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
  matchesImageAsset,
  mergeImageAssets,
} from '../AdminKangurSocialPage.Constants';

type SocialEditorSyncDeps = {
  persistedSocialSettings: {
    linkedinConnectionId: string | null;
    brainModelId: string | null;
    visionModelId: string | null;
  };
  setLinkedinConnectionId: (value: string | null) => void;
  setBrainModelId: (value: string | null) => void;
  setVisionModelId: (value: string | null) => void;
  linkedinConnections: Array<{ id: string; hasLinkedInAccessToken?: boolean }>;
  linkedinConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
};

export function useSocialEditorSync(deps: SocialEditorSyncDeps) {
  const postsQuery = useKangurSocialPosts({ scope: 'admin' });
  const addonsQuery = useKangurSocialImageAddons({ limit: 12 });

  const posts = postsQuery.data ?? [];
  const recentAddons = addonsQuery.data ?? [];
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const activePost = useMemo(
    () => posts.find((post) => post.id === activePostId) ?? null,
    [activePostId, posts]
  );

  const hasTrackedViewRef = useRef(false);
  const [editorState, setEditorState] = useState<EditorState>(emptyEditorState);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [docReferenceInput, setDocReferenceInput] = useState<string>('');
  const [generationNotes, setGenerationNotes] = useState<string>('');
  const [imageAssets, setImageAssets] = useState<ImageFileSelection[]>([]);
  const [imageAddonIds, setImageAddonIds] = useState<string[]>([]);
  const [addonForm, setAddonForm] = useState<AddonFormState>(emptyAddonForm);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [contextSummary, setContextSummary] = useState<string | null>(null);

  const resolveDocReferences = useCallback((): string[] =>
    docReferenceInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean), [docReferenceInput]);

  // Auto-select first post
  useEffect(() => {
    if (!activePostId && posts.length > 0) {
      setActivePostId(posts[0]?.id ?? null);
    }
  }, [activePostId, posts]);

  // Track page view
  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    if (postsQuery.isLoading) return;
    hasTrackedViewRef.current = true;
    trackKangurClientEvent('kangur_social_page_view', {
      postCount: posts.length,
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
    posts.length,
    postsQuery.isLoading,
  ]);

  // Sync editor state when active post changes
  useEffect(() => {
    if (!activePost) {
      setEditorState(emptyEditorState);
      setScheduledAt('');
      setDocReferenceInput('');
      setImageAssets([]);
      setImageAddonIds([]);
      deps.setLinkedinConnectionId(deps.persistedSocialSettings.linkedinConnectionId);
      deps.setBrainModelId(deps.persistedSocialSettings.brainModelId);
      deps.setVisionModelId(deps.persistedSocialSettings.visionModelId);
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
    deps.setLinkedinConnectionId(
      activePost.linkedinConnectionId ?? deps.persistedSocialSettings.linkedinConnectionId ?? null
    );
    deps.setBrainModelId(
      deps.persistedSocialSettings.brainModelId ?? activePost.brainModelId ?? null
    );
    deps.setVisionModelId(
      deps.persistedSocialSettings.visionModelId ?? activePost.visionModelId ?? null
    );
    setImageAddonIds(activePost.imageAddonIds ?? []);
    setImageAssets(
      (activePost.imageAssets ?? []).map((asset, index) => ({
        ...asset,
        id: asset.id || asset.filepath || asset.url || `image-${index}`,
      }))
    );
    setContextSummary(activePost.contextSummary ?? null);
  }, [activePost, deps.persistedSocialSettings]);

  // Auto-select LinkedIn connection fallback
  useEffect(() => {
    if (!activePost) return;
    if (activePost.linkedinConnectionId) return;
    if (deps.linkedinConnectionId) return;
    const fallback =
      deps.linkedinConnections.find((connection) => connection.hasLinkedInAccessToken) ??
      deps.linkedinConnections[0];
    if (fallback) {
      deps.setLinkedinConnectionId(fallback.id);
    }
  }, [activePost, deps.linkedinConnections, deps.linkedinConnectionId]);

  // Image & addon handlers
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
    contextSummary,
    setContextSummary,
    resolveDocReferences,
    handleAddImages,
    handleRemoveImage,
    handleSelectAddon,
    handleSelectAddons,
    handleRemoveAddon,
    postsQuery,
    addonsQuery,
  };
}
