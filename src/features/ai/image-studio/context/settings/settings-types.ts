'use client';

import type {
  ImageStudioSettings,
  ImageStudioSequenceOperation,
} from '@/features/ai/image-studio/utils/studio-settings';

export type StudioSettingsTab = 'prompt' | 'generation' | 'validation' | 'maintenance';

export type SelectOption = {
  value: string;
  label: string;
};

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

export interface ImageStudioSettingsContextValue {
  // State
  settingsLoaded: boolean;
  activeSettingsTab: StudioSettingsTab;
  setActiveSettingsTab: React.Dispatch<React.SetStateAction<StudioSettingsTab>>;
  studioSettings: ImageStudioSettings;
  setStudioSettings: React.Dispatch<React.SetStateAction<ImageStudioSettings>>;
  advancedOverridesText: string;
  advancedOverridesError: string | null;
  imageStudioApiKey: string;
  setImageStudioApiKey: React.Dispatch<React.SetStateAction<string>>;
  promptValidationEnabled: boolean;
  setPromptValidationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  promptValidationRulesText: string;
  promptValidationRulesError: string | null;
  backfillProjectId: string;
  setBackfillProjectId: React.Dispatch<React.SetStateAction<string>>;
  backfillDryRun: boolean;
  setBackfillDryRun: React.Dispatch<React.SetStateAction<boolean>>;
  backfillIncludeHeuristicGenerationLinks: boolean;
  setBackfillIncludeHeuristicGenerationLinks: React.Dispatch<React.SetStateAction<boolean>>;
  backfillRunning: boolean;
  backfillResultText: string;

  // Derived
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

  // Queries/Stores
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

  // Actions
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
