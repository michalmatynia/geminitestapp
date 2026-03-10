import type {
  ImageStudioSettings,
  ImageStudioSequenceOperation,
} from '@/features/ai/image-studio/utils/studio-settings';
import type { LabelValueOptionDto as SelectOption } from '@/shared/contracts/ui';

import type * as React from 'react';

export type StudioSettingsTab = 'prompt' | 'generation' | 'validation' | 'maintenance';
export type { SelectOption };

export type ModelCapabilities = {
  supportsUser: boolean;
  supportsOutputFormat: boolean;
  supportsCount: boolean;
  supportsModeration: boolean;
  supportsOutputCompression: boolean;
  supportsPartialImages: boolean;
  supportsStream: boolean;
  sizeOptions: readonly string[];
  qualityOptions: readonly string[];
  backgroundOptions: readonly string[];
  formatOptions: readonly string[];
};

export interface ImageStudioSettingsStateContextValue {
  settingsLoaded: boolean;
  activeSettingsTab: StudioSettingsTab;
  studioSettings: ImageStudioSettings;
  advancedOverridesText: string;
  advancedOverridesError: string | null;
  promptValidationEnabled: boolean;
  promptValidationRulesText: string;
  promptValidationRulesError: string | null;
  backfillProjectId: string;
  backfillDryRun: boolean;
  backfillIncludeHeuristicGenerationLinks: boolean;
  backfillRunning: boolean;
  backfillResultText: string;
  settingsSource: string;
  isGpt52Model: boolean;
  modelCapabilities: ModelCapabilities;
  modelAwareSizeValue: string;
  modelAwareQualityValue: string;
  modelAwareBackgroundValue: string;
  modelAwareFormatValue: string;
  modelAwareSizeOptions: SelectOption[];
  modelAwareQualityOptions: SelectOption[];
  modelAwareBackgroundOptions: SelectOption[];
  modelAwareFormatOptions: SelectOption[];
  settingsStore: {
    isFetching: boolean;
    isLoading: boolean;
  };
  imageModelsQuery: {
    isFetching: boolean;
    refetch: () => Promise<unknown>;
  };
  updateSetting: {
    isPending: boolean;
  };
}

export interface ImageStudioSettingsActionsContextValue {
  setActiveSettingsTab: React.Dispatch<React.SetStateAction<StudioSettingsTab>>;
  setStudioSettings: React.Dispatch<React.SetStateAction<ImageStudioSettings>>;
  setPromptValidationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setBackfillProjectId: React.Dispatch<React.SetStateAction<string>>;
  setBackfillDryRun: React.Dispatch<React.SetStateAction<boolean>>;
  setBackfillIncludeHeuristicGenerationLinks: React.Dispatch<React.SetStateAction<boolean>>;
  handleRefresh: () => Promise<void>;
  handleAdvancedOverridesChange: (raw: string) => void;
  handlePromptValidationRulesChange: (raw: string) => void;
  saveStudioSettings: () => Promise<void>;
  resetStudioSettings: () => void;
  runCardBackfill: () => Promise<void>;
  toggleProjectSequencingOperation: (
    operation: ImageStudioSequenceOperation,
    checked: boolean
  ) => void;
  moveProjectSequencingOperation: (
    operation: ImageStudioSequenceOperation,
    direction: -1 | 1
  ) => void;
}

export type ImageStudioSettingsContextValue = ImageStudioSettingsStateContextValue &
  ImageStudioSettingsActionsContextValue;
