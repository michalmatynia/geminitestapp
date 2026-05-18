import { useCallback } from 'react';

import type { useSocialEditorSync } from './hooks/useSocialEditorSync';
import type { useSocialSettings } from './hooks/useSocialSettings';
import { parseDatetimeLocal } from './SocialPublishingPage.Constants';
import type { AdminSocialResolvedSettings } from './SocialPublishingPage.hooks.runtime';

type SocialEditorState = ReturnType<typeof useSocialEditorSync>;
type SocialSettingsState = ReturnType<typeof useSocialSettings>;

export type BuildSocialContext = (
  overrides?: Record<string, unknown>
) => Record<string, unknown>;

const hasNonEmptyText = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const nullableTrimmedText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveModelSource = (settings: SocialSettingsState): 'social_settings' | 'ai_brain' =>
  hasNonEmptyText(settings.brainModelId) || hasNonEmptyText(settings.visionModelId)
    ? 'social_settings'
    : 'ai_brain';

export const useAdminSocialContextBuilder = ({
  editor,
  resolved,
  settings,
}: {
  editor: SocialEditorState;
  resolved: AdminSocialResolvedSettings;
  settings: SocialSettingsState;
}): BuildSocialContext =>
  useCallback(
    (overrides?: Record<string, unknown>): Record<string, unknown> => ({
      postId: editor.activePost?.id ?? null,
      status: editor.activePost?.status ?? null,
      scheduledAt: parseDatetimeLocal(editor.scheduledAt),
      imageCount: editor.imageAssets.length,
      imageAddonCount: editor.imageAddonIds.length,
      docReferenceCount: editor.resolveDocReferences().length,
      notesLength: editor.generationNotes.trim().length,
      hasPublishingConnection: hasNonEmptyText(settings.publishingConnectionId),
      brainModelId: resolved.resolvedBrainModelId,
      visionModelId: resolved.resolvedVisionModelId,
      brainModelOverrideId: settings.brainModelId,
      visionModelOverrideId: settings.visionModelId,
      brainRoutingModelId: resolved.brainRoutingModelId,
      visionRoutingModelId: resolved.visionRoutingModelId,
      modelSource: resolveModelSource(settings),
      batchCapturePresetCount: settings.batchCapturePresetIds.length,
      batchCaptureEffectivePresetCount: resolved.effectiveBatchCapturePresetCount,
      batchCaptureBaseUrl: nullableTrimmedText(settings.batchCaptureBaseUrl),
      batchCapturePresetLimit: settings.batchCapturePresetLimit,
      ...overrides,
    }),
    [
      editor.activePost?.id,
      editor.activePost?.status,
      editor.generationNotes,
      editor.imageAddonIds.length,
      editor.imageAssets.length,
      editor.resolveDocReferences,
      editor.scheduledAt,
      resolved.brainRoutingModelId,
      resolved.effectiveBatchCapturePresetCount,
      resolved.resolvedBrainModelId,
      resolved.resolvedVisionModelId,
      resolved.visionRoutingModelId,
      settings.batchCaptureBaseUrl,
      settings.batchCapturePresetIds.length,
      settings.batchCapturePresetLimit,
      settings.brainModelId,
      settings.publishingConnectionId,
      settings.visionModelId,
    ]
  );
