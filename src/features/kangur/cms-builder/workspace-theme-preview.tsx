'use client';

import React from 'react';

import { ThemeSettingsProvider } from '@/features/cms/public';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  getKangurThemeSettingsKeyForAppearanceMode,
  type KangurThemeMode,
} from '@/features/kangur/appearance/theme-settings';

export const resolveThemePreviewFallback = (
  mode: KangurThemeMode,
  slotThemes: Record<KangurThemeMode, ThemeSettings>
): ThemeSettings => slotThemes[mode];

export const resolveThemePreviewStorageKey = (mode: KangurThemeMode): string => {
  if (mode === 'dawn') {
    return getKangurThemeSettingsKeyForAppearanceMode('dawn');
  }
  if (mode === 'sunset') {
    return getKangurThemeSettingsKeyForAppearanceMode('sunset');
  }
  if (mode === 'nightly') {
    return getKangurThemeSettingsKeyForAppearanceMode('dark');
  }
  return getKangurThemeSettingsKeyForAppearanceMode('default');
};

export const renderBuilderThemeSettingsProvider = (
  mode: KangurThemeMode,
  defaultTheme: ThemeSettings,
  children: React.ReactNode
): React.ReactElement => (
  <ThemeSettingsProvider
    storageKey={resolveThemePreviewStorageKey(mode)}
    defaultTheme={defaultTheme}
  >
    {children}
  </ThemeSettingsProvider>
);
