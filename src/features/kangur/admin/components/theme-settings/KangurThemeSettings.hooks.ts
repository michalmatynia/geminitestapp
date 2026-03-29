'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/features/kangur/shared/ui';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  type KangurThemeMode,
} from '@/features/kangur/theme-settings';
import {
  getKangurThemePanelCopy,
  resolveKangurThemeSettingsLocale,
} from '../kangur-theme-settings.copy';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { withKangurClientError } from '@/features/kangur/observability/client';

export function useKangurThemeSettingsState(
  initialDaily: ThemeSettings,
  initialNightly: ThemeSettings,
  initialDawn: ThemeSettings,
  initialSunset: ThemeSettings
) {
  const locale = useLocale();
  const normalizedLocale = resolveKangurThemeSettingsLocale(locale);
  const copy = getKangurThemePanelCopy(normalizedLocale);
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();

  const [mode, setMode] = useState<KangurThemeMode>('daily');
  const [drafts, setDrafts] = useState<Record<KangurThemeMode, ThemeSettings>>({
    daily: initialDaily,
    nightly: initialNightly,
    dawn: initialDawn,
    sunset: initialSunset,
  });
  const [isSaving, setIsSaving] = useState(false);

  const currentDraft = drafts[mode];
  const initialThemes = useMemo(() => ({
    daily: initialDaily,
    nightly: initialNightly,
    dawn: initialDawn,
    sunset: initialSunset,
  }), [initialDaily, initialNightly, initialDawn, initialSunset]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(drafts[mode]) !== JSON.stringify(initialThemes[mode]),
    [drafts, initialThemes, mode]
  );

  const updateDraft = useCallback((next: ThemeSettings) => {
    setDrafts((prev) => ({ ...prev, [mode]: next }));
  }, [mode]);

  const saveTheme = useCallback(async () => {
    setIsSaving(true);
    const settingKey =
      mode === 'daily'
        ? KANGUR_DAILY_THEME_SETTINGS_KEY
        : mode === 'nightly'
          ? KANGUR_NIGHTLY_THEME_SETTINGS_KEY
          : mode === 'dawn'
            ? KANGUR_DAWN_THEME_SETTINGS_KEY
            : KANGUR_SUNSET_THEME_SETTINGS_KEY;

    try {
      await withKangurClientError(
        {
          source: 'admin.theme-settings',
          action: 'save-theme',
          description: `Saving ${mode} theme settings.`,
        },
        async () => await updateSetting.mutateAsync({
          key: settingKey,
          value: serializeSetting(drafts[mode]),
        })
      );
      toast(copy.saveSuccess, { variant: 'success' });
    } catch (err) {
      toast(copy.saveError, { variant: 'error', error: err });
    } finally {
      setIsSaving(false);
    }
  }, [copy.saveError, copy.saveSuccess, drafts, mode, toast, updateSetting]);

  const resetTheme = useCallback(() => {
    setDrafts((prev) => ({ ...prev, [mode]: initialThemes[mode] }));
  }, [initialThemes, mode]);

  return {
    copy,
    locale: normalizedLocale,
    mode,
    setMode,
    currentDraft,
    updateDraft,
    isSaving,
    saveTheme,
    resetTheme,
    hasUnsavedChanges,
    drafts,
  };
}
