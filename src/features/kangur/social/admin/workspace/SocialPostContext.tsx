'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAdminKangurSocialPage } from './AdminKangurSocialPage.hooks';
import { internalError } from '@/shared/errors/app-error';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

type SocialPostContextValue = ReturnType<typeof useAdminKangurSocialPage> & {
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

const SocialPostContext = createContext<SocialPostContextValue | null>(null);

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialPostProvider({ children }: { children: React.ReactNode }) {
  const socialPage = useAdminKangurSocialPage();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPostEditorModalOpen, setIsPostEditorModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<KangurSocialPost | null>(null);
  const [postToUnpublish, setPostToUnpublish] = useState<KangurSocialPost | null>(null);

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

  const value = {
    ...socialPage,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPostEditorModalOpen,
    setIsPostEditorModalOpen,
    postToDelete,
    setPostToDelete,
    postToUnpublish,
    setPostToUnpublish,
    handleOpenPostEditor,
  };

  return (
    <SocialPostContext.Provider value={value}>
      {children}
    </SocialPostContext.Provider>
  );
}

export function useSocialPostContext() {
  const context = useContext(SocialPostContext);
  if (!context) {
    throw internalError('useSocialPostContext must be used within a SocialPostProvider');
  }
  return context;
}
