/**
 * Social Editor Synchronization Hook
 * 
 * React hook for synchronizing social media editor state and content.
 * Provides:
 * - Post content synchronization between editor and backend
 * - Image addon management and file selection
 * - Real-time editor state tracking
 * - Client-side event tracking for social publishing
 * - Optimistic updates and conflict resolution
 */

'use client';

import { useCallback, useMemo } from 'react';

import {
  useSocialPublishingPost,
} from '@/features/filemaker/social/hooks/useSocialPublishingPosts';

import { useSocialEditorHydration } from './useSocialEditorSync.hydration';
import { useSocialEditorImages } from './useSocialEditorSync.images';
import { buildSocialEditorSyncResult } from './useSocialEditorSync.result';
import {
  resolveDocReferencesFromInput,
  resolveEditorHasUnsavedChanges,
  resolvePosts,
} from './useSocialEditorSync.runtime';
import { useSocialEditorLocalState } from './useSocialEditorSync.state';
import { useSocialEditorTracking } from './useSocialEditorSync.tracking';
import type {
  SocialEditorSyncDeps,
  SocialEditorSyncResult,
} from './useSocialEditorSync.types';

export function useSocialEditorSync(
  deps: SocialEditorSyncDeps
): SocialEditorSyncResult {
  const state = useSocialEditorLocalState();
  const activePostQuery = useSocialPublishingPost(state.activePostId, {
    enabled: state.activePostId !== null,
  });
  const activePost = activePostQuery.data ?? null;
  const posts = useMemo(() => resolvePosts(activePost), [activePost]);
  const images = useSocialEditorImages({
    activePost,
    draftImageAddonIds: state.draftImageAddonIds,
    draftImageAssets: state.draftImageAssets,
    hydratedDraftPostId: state.hydratedDraftPostId,
    setDraftImageAddonIds: state.setDraftImageAddonIds,
    setDraftImageAssets: state.setDraftImageAssets,
  });
  const resolveDocReferences = useCallback(
    (): string[] => resolveDocReferencesFromInput(state.docReferenceInput),
    [state.docReferenceInput]
  );
  const hasUnsavedChanges = useMemo(
    () =>
      resolveEditorHasUnsavedChanges({
        activePost,
        activePostImageState: images.activePostImageState,
        editorState: state.editorState,
        imageAddonIds: images.imageAddonIds,
        imageAssets: images.imageAssets,
        scheduledAt: state.scheduledAt,
      }),
    [activePost, images, state.editorState, state.scheduledAt]
  );

  useSocialEditorTracking({ activePostId: state.activePostId, deps });
  useSocialEditorHydration({ activePost, ...state });

  return buildSocialEditorSyncResult({
    activePost,
    hasUnsavedChanges,
    images,
    posts,
    postsQuery: activePostQuery,
    resolveDocReferences,
    state,
  });
}
