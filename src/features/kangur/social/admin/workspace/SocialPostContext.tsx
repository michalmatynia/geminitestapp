'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAdminKangurSocialPage } from './AdminKangurSocialPage.hooks';
import { useKangurSocialImageAddonsBatchJobs } from '@/features/kangur/social/hooks/useKangurSocialImageAddons';
import { internalError } from '@/shared/errors/app-error';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import type {
  KangurSocialImageAddon,
  KangurSocialImageAddonsBatchJob,
} from '@/shared/contracts/kangur-social-image-addons';
import type { ListQuery } from '@/shared/contracts/ui/queries';

type SocialPostContextValue = ReturnType<typeof useAdminKangurSocialPage> & {
  addonsQuery: ListQuery<KangurSocialImageAddon, KangurSocialImageAddon[]>;
  missingSelectedImageAddonIds: string[];
  handleRefreshMissingImageAddons: () => Promise<void>;
  handleRemoveMissingAddons: () => Promise<void>;
  missingImageAddonActionPending: 'refresh' | 'remove' | null;
  missingImageAddonActionErrorMessage: string | null;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  batchCaptureRecentJobs: KangurSocialImageAddonsBatchJob[];
  batchCaptureRecentJobsLoading: boolean;
  isPostEditorModalOpen: boolean;
  setIsPostEditorModalOpen: (open: boolean) => void;
  postToDelete: KangurSocialPost | null;
  setPostToDelete: (post: KangurSocialPost | null) => void;
  postToUnpublish: KangurSocialPost | null;
  setPostToUnpublish: (post: KangurSocialPost | null) => void;
  handleOpenPostEditor: (postId: string) => void;
};

const SocialPostContext = createContext<SocialPostContextValue | null>(null);

type SocialPostModalsContextValue = {
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isPostEditorModalOpen: boolean;
  setIsPostEditorModalOpen: (open: boolean) => void;
  postToDelete: KangurSocialPost | null;
  setPostToDelete: (post: KangurSocialPost | null) => void;
  postToUnpublish: KangurSocialPost | null;
  setPostToUnpublish: (post: KangurSocialPost | null) => void;
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
  const [postToDelete, setPostToDelete] = useState<KangurSocialPost | null>(null);
  const [postToUnpublish, setPostToUnpublish] = useState<KangurSocialPost | null>(null);
  
  const socialPage = useAdminKangurSocialPage({
    preloadSettingsModalData: isSettingsModalOpen,
  });
  
  const batchCaptureRecentJobsQuery = useKangurSocialImageAddonsBatchJobs({
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
