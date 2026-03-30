import type { useSocialEditorSync } from './hooks/useSocialEditorSync';
import type { useSocialPostCrud } from './hooks/useSocialPostCrud';
import type { useSocialImageAddons } from './hooks/useSocialImageAddons';
import type { useSocialSettings } from './hooks/useSocialSettings';
import type { useSocialPipelineRunner } from './hooks/useSocialPipelineRunner';

export interface UseSocialMissingImageAddonsProps {
  editor: ReturnType<typeof useSocialEditorSync>;
  crud: ReturnType<typeof useSocialPostCrud>;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
}

export interface UseSocialCaptureFlowsProps {
  editor: ReturnType<typeof useSocialEditorSync>;
  crud: ReturnType<typeof useSocialPostCrud>;
  imageAddons: ReturnType<typeof useSocialImageAddons>;
  settings: ReturnType<typeof useSocialSettings>;
  pipeline: ReturnType<typeof useSocialPipelineRunner>;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  canGenerateSocialDraft: boolean;
  socialDraftBlockedReason: string | null;
  hasBatchCaptureConfig: boolean;
  socialBatchCaptureBlockedReason: string | null;
  effectiveBatchCapturePresetCount: number;
}

export interface UseSocialModelTelemetryProps {
  settings: ReturnType<typeof useSocialSettings>;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
}
