import type { GsapAnimationConfig } from '@/features/gsap';
import type {
  CmsEventEffectsConfig,
  CssAnimationConfig,
  CustomCssAiConfig,
} from '@/shared/contracts/cms';

export interface ConnectionSettings {
  enabled: boolean;
  source: string;
  path: string;
  fallback: string;
}

export interface ComponentSettingsContextValue {
  hasSelection: boolean;
  selectedLabel: string;
  selectedTitle: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentAnimationConfig: GsapAnimationConfig;
  handleAnimationChange: (updates: Partial<GsapAnimationConfig>) => void;
  currentCssAnimationConfig: CssAnimationConfig | undefined;
  handleCssAnimationChange: (updates: Partial<CssAnimationConfig>) => void;
  customCssValue: string;
  handleCustomCssChange: (value: string) => void;
  customCssAiConfig: CustomCssAiConfig;
  handleCustomCssAiChange: (patch: Partial<CustomCssAiConfig>) => void;
  handleApplyAiSettings: (patch: Record<string, unknown>) => void;
  contentAiAllowedKeys: string[];
  connectionSettings: ConnectionSettings;
  updateConnectionSetting: (patch: Partial<ConnectionSettings>) => void;
  eventConfig: CmsEventEffectsConfig | null;
  handleEventSettingChange: (key: string, value: unknown) => void;
  handleBlockSettingChange: (key: string, value: unknown) => void;
  handleSectionSettingChange: (key: string, value: unknown) => void;
  handleColumnSettingChange: (key: string, value: unknown) => void;
}

export type ComponentSettingsStateContextValue = Omit<
  ComponentSettingsContextValue,
  | 'setActiveTab'
  | 'handleAnimationChange'
  | 'handleCssAnimationChange'
  | 'handleCustomCssChange'
  | 'handleCustomCssAiChange'
  | 'handleApplyAiSettings'
  | 'updateConnectionSetting'
  | 'handleEventSettingChange'
  | 'handleBlockSettingChange'
  | 'handleSectionSettingChange'
  | 'handleColumnSettingChange'
>;

export type ComponentSettingsActionsContextValue = Pick<
  ComponentSettingsContextValue,
  | 'setActiveTab'
  | 'handleAnimationChange'
  | 'handleCssAnimationChange'
  | 'handleCustomCssChange'
  | 'handleCustomCssAiChange'
  | 'handleApplyAiSettings'
  | 'updateConnectionSetting'
  | 'handleEventSettingChange'
  | 'handleBlockSettingChange'
  | 'handleSectionSettingChange'
  | 'handleColumnSettingChange'
>;
