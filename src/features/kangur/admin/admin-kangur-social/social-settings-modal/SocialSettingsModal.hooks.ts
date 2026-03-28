'use client';

import { useState } from 'react';
import { useSocialPostContext } from './SocialPostContext';

export type SocialSettingsTab = 'models' | 'project' | 'documentation' | 'publishing' | 'capture';
export type SocialPostContextValue = ReturnType<typeof useSocialPostContext>;

export function useSocialSettingsModalState(context: SocialPostContextValue) {
  const [activeTab, setActiveTab] = useState<SocialSettingsTab>('models');

  const brainModelOptions = context.brainModelOptions.data ?? [];
  const visionModelOptions = context.visionModelOptions.data ?? [];

  const brainModelSelectOptions = [
    { value: 'routing_default', label: 'Use Brain routing' },
    ...brainModelOptions.map((m) => ({
      value: m.id,
      label: m.name,
      description: m.provider,
    })),
  ];

  const visionModelSelectOptions = [
    { value: 'routing_default', label: 'Use Brain routing' },
    ...visionModelOptions.map((m) => ({
      value: m.id,
      label: m.name,
      description: m.provider,
    })),
  ];

  const brainModelBadgeLabel =
    context.brainModelId === 'routing_default' || !context.brainModelId
      ? context.brainModelOptions.data?.find((m) => m.id === context.activePost?.brainModelId)?.name ??
        'AI Brain Default'
      : brainModelOptions.find((m) => m.id === context.brainModelId)?.name ?? 'Not configured';

  const visionModelBadgeLabel =
    context.visionModelId === 'routing_default' || !context.visionModelId
      ? context.visionModelOptions.data?.find((m) => m.id === context.activePost?.visionModelId)?.name ??
        'AI Brain Default'
      : visionModelOptions.find((m) => m.id === context.visionModelId)?.name ?? 'Not configured';

  const selectedPostTitle = context.activePost?.title || 'selected post';
  const hasUnsavedChanges =
    context.brainModelId !== (context.activePost?.brainModelId || 'routing_default') ||
    context.visionModelId !== (context.activePost?.visionModelId || 'routing_default') ||
    context.projectUrl !== (context.activePost?.projectUrl || '') ||
    context.linkedinConnectionId !== (context.activePost?.linkedinConnectionId || null) ||
    context.batchCaptureBaseUrl !== (context.activePost?.batchCaptureBaseUrl || '') ||
    context.batchCapturePresetLimit !== (context.activePost?.batchCapturePresetLimit || 10) ||
    JSON.stringify(context.batchCapturePresetIds) !== JSON.stringify(context.activePost?.batchCapturePresetIds || []);

  const linkedInIntegration = context.linkedinIntegration.data;
  const linkedInOptions = (linkedInIntegration?.connections ?? []).map((c) => ({
    value: c.id,
    label: c.name,
    description: c.integrationName,
    disabled: !c.hasLinkedInAccessToken,
  }));

  const selectedLinkedInConnection =
    linkedInIntegration?.connections.find((c) => c.id === context.linkedinConnectionId) ?? null;

  const linkedInExpiryStatus = selectedLinkedInConnection?.linkedInAccessTokenExpiresAt
    ? Date.parse(selectedLinkedInConnection.linkedInAccessTokenExpiresAt) < Date.now()
      ? 'expired'
      : Date.parse(selectedLinkedInConnection.linkedInAccessTokenExpiresAt) < Date.now() + 7 * 24 * 60 * 60 * 1000
        ? 'warning'
        : 'ok'
    : null;

  const linkedInExpiryLabel = selectedLinkedInConnection?.linkedInAccessTokenExpiresAt
    ? new Date(selectedLinkedInConnection.linkedInAccessTokenExpiresAt).toLocaleDateString()
    : null;

  const linkedInDaysRemaining = selectedLinkedInConnection?.linkedInAccessTokenExpiresAt
    ? Math.max(0, Math.floor((Date.parse(selectedLinkedInConnection.linkedInAccessTokenExpiresAt) - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  const docsUsed = context.activePost?.docsUsed || [];
  const suggestedDocUpdates = context.activePost?.visualDocUpdates || [];
  const hasVisualDocUpdates = suggestedDocUpdates.length > 0;

  const docUpdatesResult = context.docUpdatesResult;
  const docUpdatesPlan = docUpdatesResult?.plan || null;
  const docUpdatesAppliedAt = docUpdatesResult?.appliedAt || null;
  const docUpdatesAppliedBy = docUpdatesResult?.appliedBy || null;
  const docUpdatesAppliedCount = docUpdatesResult?.appliedCount || 0;
  const docUpdatesSkippedCount = docUpdatesResult?.skippedCount || 0;

  const batchCaptureLimitSummary = `Presets selected: ${context.batchCapturePresetIds.length} (Limit: ${context.batchCapturePresetLimit})`;

  return {
    activeTab,
    setActiveTab,
    brainModelBadgeLabel,
    brainModelSelectOptions,
    visionModelBadgeLabel,
    visionModelSelectOptions,
    selectedPostTitle,
    hasUnsavedChanges,
    linkedInOptions,
    linkedinIntegration,
    selectedLinkedInConnection,
    linkedInExpiryStatus,
    linkedInExpiryLabel,
    linkedInDaysRemaining,
    docsUsed,
    suggestedDocUpdates,
    hasVisualDocUpdates,
    docUpdatesResult,
    docUpdatesPlan,
    docUpdatesAppliedAt,
    docUpdatesAppliedBy,
    docUpdatesAppliedCount,
    docUpdatesSkippedCount,
    batchCaptureLimitSummary,
  };
}
