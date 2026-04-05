'use client';

import { useState } from 'react';
import { BRAIN_MODEL_DEFAULT_VALUE } from '../AdminKangurSocialPage.Constants';
import { useSocialPostContext } from '../SocialPostContext';

export type SocialSettingsTab = 'models' | 'project' | 'documentation' | 'publishing' | 'capture' | 'content-browser';
export type SocialPostContextValue = ReturnType<typeof useSocialPostContext>;

function buildModelSelectOptions(
  models: string[],
  selectedModelId: string | null,
  effectiveModelId: string
) {
  const knownModels = new Set(models);
  const selectedModelMissing =
    typeof selectedModelId === 'string' && !knownModels.has(selectedModelId);

  return [
    { value: BRAIN_MODEL_DEFAULT_VALUE, label: 'Use Brain routing' },
    ...models.map((modelId) => ({
      value: modelId,
      label: modelId,
    })),
    ...(selectedModelMissing
      ? [
          {
            value: selectedModelId,
            label: `${selectedModelId} (not currently in Brain catalog)`,
          },
        ]
      : []),
    ...(!selectedModelId && effectiveModelId && !knownModels.has(effectiveModelId)
      ? [
          {
            value: effectiveModelId,
            label: `${effectiveModelId} (current Brain default)`,
          },
        ]
      : []),
  ];
}

function resolveModelBadgeLabel(selectedModelId: string | null, effectiveModelId: string): string {
  if (selectedModelId?.trim()) {
    return selectedModelId;
  }

  const resolvedEffectiveModelId = effectiveModelId.trim();
  return resolvedEffectiveModelId || 'Not configured';
}

export function useSocialSettingsModalState(context: SocialPostContextValue) {
  const [activeTab, setActiveTab] = useState<SocialSettingsTab>('models');

  const brainModelOptions = context.brainModelOptions.models ?? [];
  const visionModelOptions = context.visionModelOptions.models ?? [];
  const brainEffectiveModelId = context.brainModelOptions.effectiveModelId ?? '';
  const visionEffectiveModelId = context.visionModelOptions.effectiveModelId ?? '';

  const brainModelSelectOptions = buildModelSelectOptions(
    brainModelOptions,
    context.brainModelId,
    brainEffectiveModelId
  );
  const visionModelSelectOptions = buildModelSelectOptions(
    visionModelOptions,
    context.visionModelId,
    visionEffectiveModelId
  );

  const brainModelBadgeLabel = resolveModelBadgeLabel(
    context.brainModelId,
    brainEffectiveModelId
  );
  const visionModelBadgeLabel = resolveModelBadgeLabel(
    context.visionModelId,
    visionEffectiveModelId
  );

  const selectedPostTitle =
    context.activePost?.titlePl?.trim() ||
    context.activePost?.titleEn?.trim() ||
    'selected post';

  const linkedinIntegration = context.linkedinIntegration;
  const linkedInConnections = context.linkedinConnections ?? [];
  const linkedInOptions = linkedInConnections.map((connection) => ({
    value: connection.id,
    label: connection.name,
    description: connection.username || linkedinIntegration?.name,
    disabled: !connection.hasLinkedInAccessToken,
  }));

  const selectedLinkedInConnection =
    linkedInConnections.find((connection) => connection.id === context.linkedinConnectionId) ??
    null;
  const linkedInExpiresAt = selectedLinkedInConnection?.linkedinExpiresAt ?? null;

  const linkedInExpiryStatus: 'expired' | 'warning' | 'ok' | null = linkedInExpiresAt
    ? Date.parse(linkedInExpiresAt) < Date.now()
      ? 'expired'
      : Date.parse(linkedInExpiresAt) < Date.now() + 7 * 24 * 60 * 60 * 1000
        ? 'warning'
        : 'ok'
    : null;

  const linkedInExpiryLabel = linkedInExpiresAt
    ? new Date(linkedInExpiresAt).toLocaleDateString()
    : null;

  const linkedInDaysRemaining = linkedInExpiresAt
    ? Math.max(
        0,
        Math.floor((Date.parse(linkedInExpiresAt) - Date.now()) / (24 * 60 * 60 * 1000))
      )
    : null;

  const docsUsed = context.resolveDocReferences?.() ?? context.activePost?.docReferences ?? [];
  const batchCaptureLimitSummary =
    context.batchCapturePresetLimit == null
      ? `Presets selected: ${context.batchCapturePresetIds.length} (No limit)`
      : `Presets selected: ${context.batchCapturePresetIds.length} (Limit: ${context.batchCapturePresetLimit})`;

  return {
    activeTab,
    setActiveTab,
    brainModelBadgeLabel,
    brainModelSelectOptions,
    visionModelBadgeLabel,
    visionModelSelectOptions,
    selectedPostTitle,
    linkedInOptions,
    linkedinIntegration,
    selectedLinkedInConnection,
    linkedInExpiryStatus,
    linkedInExpiryLabel,
    linkedInDaysRemaining,
    docsUsed,
    batchCaptureLimitSummary,
  };
}
