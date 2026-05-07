'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAdminSocialPublishingPage } from './SocialPublishingPage.hooks';
import { useSocialPublishingImageAddonsBatchJobs } from '@/features/filemaker/social/hooks/useSocialPublishingImageAddons';
import { internalError } from '@/shared/errors/app-error';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import type {
  SocialPublishingImageAddon,
  SocialPublishingImageAddonsBatchJob,
} from '@/shared/contracts/social-publishing-image-addons';
import type { ListQuery } from '@/shared/contracts/ui/queries';

type SocialPostContextValue = ReturnType<typeof useAdminSocialPublishingPage> & {
  addonsQuery: ListQuery<SocialPublishingImageAddon, SocialPublishingImageAddon[]>;
  missingSelectedImageAddonIds: string[];
  handleRefreshMissingImageAddons: () => Promise<void>;
  handleRemoveMissingAddons: () => Promise<void>;
  missingImageAddonActionPending: 'refresh' | 'remove' | null;
  missingImageAddonActionErrorMessage: string | null;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  batchCaptureRecentJobs: SocialPublishingImageAddonsBatchJob[];
  batchCaptureRecentJobsLoading: boolean;
  isPostEditorModalOpen: boolean;
  setIsPostEditorModalOpen: (open: boolean) => void;
  postToDelete: SocialPublishingPost | null;
  setPostToDelete: (post: SocialPublishingPost | null) => void;
  postToUnpublish: SocialPublishingPost | null;
  setPostToUnpublish: (post: SocialPublishingPost | null) => void;
  handleOpenPostEditor: (postId: string) => void;
};

const SocialPostContext = createContext<SocialPostContextValue | null>(null);

type SocialPostModalsContextValue = {
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isPostEditorModalOpen: boolean;
  setIsPostEditorModalOpen: (open: boolean) => void;
  postToDelete: SocialPublishingPost | null;
  setPostToDelete: (post: SocialPublishingPost | null) => void;
  postToUnpublish: SocialPublishingPost | null;
  setPostToUnpublish: (post: SocialPublishingPost | null) => void;
  handleOpenPostEditor: (postId: string) => void;
};

const SocialPostModalsContext = createContext<SocialPostModalsContextValue | null>(null);

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialPostProvider({ children }: { children: React.ReactNode }) {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPostEditorModalOpen, setIsPostEditorModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<SocialPublishingPost | null>(null);
  const [postToUnpublish, setPostToUnpublish] = useState<SocialPublishingPost | null>(null);
  
  const socialPage = useAdminSocialPublishingPage({
    preloadSettingsModalData: isSettingsModalOpen,
  });
  
  const batchCaptureRecentJobsQuery = useSocialPublishingImageAddonsBatchJobs({
    limit: 5,
    enabled: isSettingsModalOpen || socialPage.isProgrammablePlaywrightModalOpen,
  });

  const handleOpenPostEditor = useCallback(
    (postId: string): void => {
      const isCrossPostEditorSwitch =
        Boolean(socialPage.activePost?.id) && socialPage.activePost?.id !== postId;
      const hasBlockingRuntimeJob =
        isSocialRuntimeJobInFlight(socialPage.currentVisualAnalysisJob?.status) ||
        isSocialRuntimeJobInFlight(socialPage.currentGenerationJob?.status) ||
        isSocialRuntimeJobInFlight(socialPage.currentPipelineJob?.status);

      if (isCrossPostEditorSwitch && hasBlockingRuntimeJob) {
        return;
      }

      socialPage.setActivePostId(postId);
      setIsPostEditorModalOpen(true);
    },
    [
      socialPage.activePost?.id,
      socialPage.currentGenerationJob?.status,
      socialPage.currentPipelineJob?.status,
      socialPage.currentVisualAnalysisJob?.status,
      socialPage.setActivePostId,
    ]
  );

  const rawMissingSelectedImageAddonIds: unknown = socialPage.missingSelectedImageAddonIds;
  const normalizedMissingSelectedImageAddonIds = useMemo(() => 
    Array.isArray(rawMissingSelectedImageAddonIds)
      ? rawMissingSelectedImageAddonIds.filter((value): value is string => typeof value === 'string')
      : [],
    [rawMissingSelectedImageAddonIds]
  );

  const normalizedHandleRemoveMissingAddons = useMemo(() => 
    typeof socialPage.handleRemoveMissingAddons === 'function'
      ? (socialPage.handleRemoveMissingAddons as () => Promise<void>)
      : async () => undefined,
    [socialPage.handleRemoveMissingAddons]
  );

  const normalizedHandleRefreshMissingImageAddons = useMemo(() => 
    typeof socialPage.handleRefreshMissingImageAddons === 'function'
      ? (socialPage.handleRefreshMissingImageAddons as () => Promise<void>)
      : async () => undefined,
    [socialPage.handleRefreshMissingImageAddons]
  );

  const normalizedMissingImageAddonActionPending = 
    socialPage.missingImageAddonActionPending === 'refresh' ||
    socialPage.missingImageAddonActionPending === 'remove'
      ? socialPage.missingImageAddonActionPending
      : null;

  const normalizedMissingImageAddonActionErrorMessage = 
    typeof socialPage.missingImageAddonActionErrorMessage === 'string'
      ? socialPage.missingImageAddonActionErrorMessage
      : null;

  const modalsValue = useMemo<SocialPostModalsContextValue>(() => ({
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPostEditorModalOpen,
    setIsPostEditorModalOpen,
    postToDelete,
    setPostToDelete,
    postToUnpublish,
    setPostToUnpublish,
    handleOpenPostEditor,
  }), [
    isSettingsModalOpen,
    isPostEditorModalOpen,
    postToDelete,
    postToUnpublish,
    handleOpenPostEditor,
  ]);

  const value = useMemo<SocialPostContextValue>(() => ({
    ...socialPage,
    batchCaptureRecentJobs: batchCaptureRecentJobsQuery.data ?? [],
    batchCaptureRecentJobsLoading: batchCaptureRecentJobsQuery.isLoading,
    missingSelectedImageAddonIds: normalizedMissingSelectedImageAddonIds,
    handleRefreshMissingImageAddons: normalizedHandleRefreshMissingImageAddons,
    handleRemoveMissingAddons: normalizedHandleRemoveMissingAddons,
    missingImageAddonActionPending: normalizedMissingImageAddonActionPending,
    missingImageAddonActionErrorMessage: normalizedMissingImageAddonActionErrorMessage,
    ...modalsValue,
  }), [
    socialPage,
    batchCaptureRecentJobsQuery.data,
    batchCaptureRecentJobsQuery.isLoading,
    normalizedMissingSelectedImageAddonIds,
    normalizedHandleRefreshMissingImageAddons,
    normalizedHandleRemoveMissingAddons,
    normalizedMissingImageAddonActionPending,
    normalizedMissingImageAddonActionErrorMessage,
    modalsValue,
  ]);

  return (
    <SocialPostModalsContext.Provider value={modalsValue}>
      <SocialPostContext.Provider value={value}>
        {children}
      </SocialPostContext.Provider>
    </SocialPostModalsContext.Provider>
  );
}

export function useSocialPostContext() {
  const context = useContext(SocialPostContext);
  if (!context) {
    throw internalError('useSocialPostContext must be used within a SocialPostProvider');
  }
  return context;
}

export function useSocialPostModalsContext() {
  const context = useContext(SocialPostModalsContext);
  if (!context) {
    throw internalError('useSocialPostModalsContext must be used within a SocialPostProvider');
  }
  return context;
}
