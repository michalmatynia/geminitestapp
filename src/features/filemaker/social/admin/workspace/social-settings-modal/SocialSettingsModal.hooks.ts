'use client';

import { type Dispatch, type SetStateAction, useState } from 'react';

import { BRAIN_MODEL_DEFAULT_VALUE } from '../SocialPublishingPage.Constants';
import { type useSocialPostContext } from '../SocialPostContext';

export type SocialSettingsTab =
  | 'models'
  | 'project'
  | 'documentation'
  | 'publishing'
  | 'capture'
  | 'content-browser';
export type SocialPostContextValue = ReturnType<typeof useSocialPostContext>;

type SocialSettingsSelectOption = {
  value: string;
  label: string;
  description?: string | null;
  disabled?: boolean;
};

type SocialSettingsModelState = {
  brainModelBadgeLabel: string;
  brainModelSelectOptions: SocialSettingsSelectOption[];
  visionModelBadgeLabel: string;
  visionModelSelectOptions: SocialSettingsSelectOption[];
};

type SocialSettingsLinkedInState = {
  linkedInOptions: SocialSettingsSelectOption[];
  linkedinIntegration: SocialPostContextValue['linkedinIntegration'];
  selectedLinkedInConnection: SocialPostContextValue['linkedinConnections'][number] | null;
  linkedInExpiryStatus: 'expired' | 'warning' | 'ok' | null;
  linkedInExpiryLabel: string | null;
  linkedInDaysRemaining: number | null;
};

export type SocialSettingsModalState = SocialSettingsModelState &
  SocialSettingsLinkedInState & {
    activeTab: SocialSettingsTab;
    setActiveTab: Dispatch<SetStateAction<SocialSettingsTab>>;
    selectedPostTitle: string;
    docsUsed: string[];
    batchCaptureLimitSummary: string;
  };

const buildModelSelectOptions = (
  models: string[],
  selectedModelId: string | null,
  effectiveModelId: string
): SocialSettingsSelectOption[] => {
  const knownModels = new Set(models);
  const selectedModelMissing =
    selectedModelId !== null && !knownModels.has(selectedModelId);
  const effectiveModelMissing =
    selectedModelId === null &&
    effectiveModelId.length > 0 &&
    !knownModels.has(effectiveModelId);

  return [
    { value: BRAIN_MODEL_DEFAULT_VALUE, label: 'Use Brain routing' },
    ...models.map((modelId) => ({ value: modelId, label: modelId })),
    ...(selectedModelMissing
      ? [{ value: selectedModelId, label: `${selectedModelId} (not currently in Brain catalog)` }]
      : []),
    ...(effectiveModelMissing
      ? [{ value: effectiveModelId, label: `${effectiveModelId} (current Brain default)` }]
      : []),
  ];
};

const normalizeModelId = (value: unknown): string => (typeof value === 'string' ? value : '');

const resolveModelBadgeLabel = (selectedModelId: string | null, effectiveModelId: string): string => {
  const selected = selectedModelId?.trim() ?? '';
  if (selected.length > 0) {
    return selected;
  }

  const resolvedEffectiveModelId = effectiveModelId.trim();
  return resolvedEffectiveModelId.length > 0 ? resolvedEffectiveModelId : 'Not configured';
};

const resolveModelState = (context: SocialPostContextValue): SocialSettingsModelState => {
  const brainEffectiveModelId = normalizeModelId(context.brainModelOptions.effectiveModelId);
  const visionEffectiveModelId = normalizeModelId(context.visionModelOptions.effectiveModelId);

  return {
    brainModelBadgeLabel: resolveModelBadgeLabel(context.brainModelId, brainEffectiveModelId),
    brainModelSelectOptions: buildModelSelectOptions(
      context.brainModelOptions.models,
      context.brainModelId,
      brainEffectiveModelId
    ),
    visionModelBadgeLabel: resolveModelBadgeLabel(context.visionModelId, visionEffectiveModelId),
    visionModelSelectOptions: buildModelSelectOptions(
      context.visionModelOptions.models,
      context.visionModelId,
      visionEffectiveModelId
    ),
  };
};

const resolveSelectedPostTitle = (context: SocialPostContextValue): string => {
  const activePost = context.activePost;
  if (activePost === null) {
    return 'selected post';
  }

  const titlePl = activePost.titlePl.trim();
  if (titlePl.length > 0) {
    return titlePl;
  }

  const titleEn = activePost.titleEn.trim();
  return titleEn.length > 0 ? titleEn : 'selected post';
};

const resolveLinkedInExpiryStatus = (
  linkedInExpiresAt: string | null
): 'expired' | 'warning' | 'ok' | null => {
  if (linkedInExpiresAt === null) {
    return null;
  }

  const expiresAtTime = Date.parse(linkedInExpiresAt);
  if (expiresAtTime < Date.now()) {
    return 'expired';
  }
  if (expiresAtTime < Date.now() + 7 * 24 * 60 * 60 * 1000) {
    return 'warning';
  }

  return 'ok';
};

const resolveLinkedInDaysRemaining = (linkedInExpiresAt: string | null): number | null => {
  if (linkedInExpiresAt === null) {
    return null;
  }

  return Math.max(
    0,
    Math.floor((Date.parse(linkedInExpiresAt) - Date.now()) / (24 * 60 * 60 * 1000))
  );
};

const resolveLinkedInState = (context: SocialPostContextValue): SocialSettingsLinkedInState => {
  const linkedinIntegration = context.linkedinIntegration;
  const linkedInConnections = context.linkedinConnections;
  const selectedLinkedInConnection =
    linkedInConnections.find((connection) => connection.id === context.publishingConnectionId) ??
    null;
  const linkedInExpiresAt = selectedLinkedInConnection?.linkedinExpiresAt ?? null;

  return {
    linkedInOptions: linkedInConnections.map((connection) => ({
      value: connection.id,
      label: connection.name,
      description: connection.username ?? linkedinIntegration?.name ?? null,
      disabled: connection.hasLinkedInAccessToken !== true,
    })),
    linkedinIntegration,
    selectedLinkedInConnection,
    linkedInExpiryStatus: resolveLinkedInExpiryStatus(linkedInExpiresAt),
    linkedInExpiryLabel:
      linkedInExpiresAt !== null ? new Date(linkedInExpiresAt).toLocaleDateString() : null,
    linkedInDaysRemaining: resolveLinkedInDaysRemaining(linkedInExpiresAt),
  };
};

const resolveBatchCaptureLimitSummary = (context: SocialPostContextValue): string => {
  if (context.batchCapturePresetLimit === null) {
    return `Presets selected: ${context.batchCapturePresetIds.length} (No limit)`;
  }

  return `Presets selected: ${context.batchCapturePresetIds.length} (Limit: ${context.batchCapturePresetLimit})`;
};

export function useSocialSettingsModalState(
  context: SocialPostContextValue
): SocialSettingsModalState {
  const [activeTab, setActiveTab] = useState<SocialSettingsTab>('models');

  return {
    activeTab,
    setActiveTab,
    ...resolveModelState(context),
    selectedPostTitle: resolveSelectedPostTitle(context),
    ...resolveLinkedInState(context),
    docsUsed: context.resolveDocReferences(),
    batchCaptureLimitSummary: resolveBatchCaptureLimitSummary(context),
  };
}
