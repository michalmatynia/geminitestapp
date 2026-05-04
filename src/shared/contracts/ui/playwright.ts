/**
 * UI Playwright Contracts
 * 
 * Type definitions for Playwright UI components and context.
 * Provides:
 * - Playwright settings context types
 * - Settings provider props
 * - State management types
 * - Playwright configuration UI
 * - Browser automation settings
 */

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import type { PlaywrightSettings } from '../playwright';

export type PlaywrightSettingsContextTypeDto = {
  settings: PlaywrightSettings;
  setSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
};
export type PlaywrightSettingsContextType = PlaywrightSettingsContextTypeDto;

export type PlaywrightSettingsProviderPropsDto = {
  settings: PlaywrightSettings;
  setSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
  children: ReactNode;
};
export type PlaywrightSettingsProviderProps = PlaywrightSettingsProviderPropsDto;

export type PlaywrightSettingsFormPropsDto = {
  settings: PlaywrightSettings;
  setSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
  onSave?: () => void;
  saveLabel?: string;
  showSave?: boolean;
  title?: string;
  description?: string;
};
export type PlaywrightSettingsFormProps = PlaywrightSettingsFormPropsDto;
