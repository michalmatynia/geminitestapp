'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAdminKangurSocialPage } from './AdminKangurSocialPage.hooks';
import { internalError } from '@/shared/errors/app-error';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import type { ListQuery } from '@/shared/contracts/ui';

type SocialPostContextValue = ReturnType<typeof useAdminKangurSocialPage> & {
  addonsQuery: ListQuery<KangurSocialImageAddon, KangurSocialImageAddon[]>;
  missingSelectedImageAddonIds: string[];
  handleRefreshMissingImageAddons: () => Promise<void>;
  handleRemoveMissingAddons: () => Promise<void>;
  missingImageAddonActionPending: 'refresh' | 'remove' | null;
  missingImageAddonActionErrorMessage: string | null;
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

  const rawMissingSelectedImageAddonIds: unknown = socialPage.missingSelectedImageAddonIds;
  const normalizedMissingSelectedImageAddonIds = Array.isArray(rawMissingSelectedImageAddonIds)
    ? rawMissingSelectedImageAddonIds.filter((value): value is string => typeof value === 'string')
    : [];
  const rawHandleRemoveMissingAddons: unknown = socialPage.handleRemoveMissingAddons;
  const normalizedHandleRemoveMissingAddons =
    typeof rawHandleRemoveMissingAddons === 'function'
      ? (rawHandleRemoveMissingAddons as () => Promise<void>)
      : async () => undefined;
  const rawHandleRefreshMissingImageAddons: unknown =
    socialPage.handleRefreshMissingImageAddons;
  const normalizedHandleRefreshMissingImageAddons =
    typeof rawHandleRefreshMissingImageAddons === 'function'
      ? (rawHandleRefreshMissingImageAddons as () => Promise<void>)
      : async () => undefined;
  const rawMissingImageAddonActionPending: unknown =
    socialPage.missingImageAddonActionPending;
  const normalizedMissingImageAddonActionPending =
    rawMissingImageAddonActionPending === 'refresh' ||
    rawMissingImageAddonActionPending === 'remove'
      ? rawMissingImageAddonActionPending
      : null;
  const rawMissingImageAddonActionErrorMessage: unknown =
    socialPage.missingImageAddonActionErrorMessage;
  const normalizedMissingImageAddonActionErrorMessage =
    typeof rawMissingImageAddonActionErrorMessage === 'string'
      ? rawMissingImageAddonActionErrorMessage
      : null;

  const value = {
    ...socialPage,
    missingSelectedImageAddonIds: normalizedMissingSelectedImageAddonIds,
    handleRefreshMissingImageAddons: normalizedHandleRefreshMissingImageAddons,
    handleRemoveMissingAddons: normalizedHandleRemoveMissingAddons,
    missingImageAddonActionPending: normalizedMissingImageAddonActionPending,
    missingImageAddonActionErrorMessage: normalizedMissingImageAddonActionErrorMessage,
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
