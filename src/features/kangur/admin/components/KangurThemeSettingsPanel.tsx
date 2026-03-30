'use client';

import React, { useEffect, useMemo } from 'react';

import { ThemeSettingsFieldsSection } from '@/features/cms/public';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  resolveKangurStoredThemeSnapshot,
  type KangurThemeMode,
} from '@/features/kangur/appearance/theme-settings';
import { Alert, Button, FormSection } from '@/features/kangur/shared/ui';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { ThemePreviewPanel } from '@/features/kangur/appearance/admin/workspace/ThemePreviewPanel';
import {
  buildKangurThemeFontWeightOptions,
  buildKangurThemeHomeActionFields,
  getKangurThemeModeCopy,
  getKangurThemeSectionCopy,
  localizeKangurThemeField,
} from './kangur-theme-settings.copy';
import { KANGUR_THEME_SECTIONS } from './theme-settings/KangurThemeSettings.constants';
import { useKangurThemeSettingsState } from './theme-settings/KangurThemeSettings.hooks';

type KangurThemeSettingsPanelProps = {
  onSectionChange?: (section: string) => void;
  onThemeChange?: (theme: ThemeSettings) => void;
  onModeChange?: (mode: KangurThemeMode) => void;
};

export function KangurThemeSettingsPanel({
  onSectionChange,
  onThemeChange,
  onModeChange,
}: KangurThemeSettingsPanelProps = {}): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const dailyThemeRaw = settingsStore.get(KANGUR_DAILY_THEME_SETTINGS_KEY);
  const nightlyThemeRaw = settingsStore.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY);
  const dawnThemeRaw = settingsStore.get(KANGUR_DAWN_THEME_SETTINGS_KEY);
  const sunsetThemeRaw = settingsStore.get(KANGUR_SUNSET_THEME_SETTINGS_KEY);
  const storedThemes = useMemo(
    () =>
      resolveKangurStoredThemeSnapshot({
        dailyThemeRaw,
        dawnThemeRaw,
        sunsetThemeRaw,
        nightlyThemeRaw,
      }),
    [dailyThemeRaw, dawnThemeRaw, nightlyThemeRaw, sunsetThemeRaw]
  );

  const initialDaily = useMemo(
    (): ThemeSettings => storedThemes.daily,
    [storedThemes.daily]
  );
  const initialNightly = useMemo(
    (): ThemeSettings => storedThemes.nightly,
    [storedThemes.nightly]
  );
  const initialDawn = useMemo(
    (): ThemeSettings => storedThemes.dawn,
    [storedThemes.dawn]
  );
  const initialSunset = useMemo(
    (): ThemeSettings => storedThemes.sunset,
    [storedThemes.sunset]
  );

  const resetKey = [
    dailyThemeRaw ?? '',
    nightlyThemeRaw ?? '',
    dawnThemeRaw ?? '',
    sunsetThemeRaw ?? '',
  ].join('|');

  return (
    <KangurThemeSettingsPanelContent
      key={resetKey}
      initialDaily={initialDaily}
      initialNightly={initialNightly}
      initialDawn={initialDawn}
      initialSunset={initialSunset}
      onSectionChange={onSectionChange}
      onThemeChange={onThemeChange}
      onModeChange={onModeChange}
    />
  );
}

function KangurThemeSettingsPanelContent({
  initialDaily,
  initialNightly,
  initialDawn,
  initialSunset,
  onSectionChange,
  onThemeChange,
  onModeChange,
}: {
  initialDaily: ThemeSettings;
  initialNightly: ThemeSettings;
  initialDawn: ThemeSettings;
  initialSunset: ThemeSettings;
  onSectionChange?: (section: string) => void;
  onThemeChange?: (theme: ThemeSettings) => void;
  onModeChange?: (mode: KangurThemeMode) => void;
}): React.JSX.Element {
  const state = useKangurThemeSettingsState(
    initialDaily,
    initialNightly,
    initialDawn,
    initialSunset
  );
  const {
    copy,
    locale,
    mode,
    setMode,
    currentDraft,
    updateDraft,
    isSaving,
    saveTheme,
    resetTheme,
    hasUnsavedChanges,
    drafts,
  } = state;

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  useEffect(() => {
    onThemeChange?.(currentDraft);
  }, [currentDraft, onThemeChange]);

  useEffect(() => {
    onSectionChange?.(KANGUR_THEME_SECTIONS[0]?.id ?? 'corePalette');
  }, [onSectionChange]);

  const modeOptions = useMemo(
    () =>
      (['daily', 'nightly', 'dawn', 'sunset'] as KangurThemeMode[]).map((themeMode) => ({
        id: themeMode,
        label: getKangurThemeModeCopy(locale, themeMode).label,
      })),
    [locale]
  );

  const sections = useMemo(
    () =>
      KANGUR_THEME_SECTIONS.map((section) => {
        const sectionCopy = getKangurThemeSectionCopy(locale, section.id);
        let fields = section.fields.map((field) => localizeKangurThemeField(locale, field));

        if (section.id === 'buttons') {
          fields = fields.map((field) =>
            field.key === 'btnFontWeight'
              ? { ...field, options: buildKangurThemeFontWeightOptions(locale) }
              : field
          );
        }

        if (section.id === 'homeActions') {
          fields = buildKangurThemeHomeActionFields(locale);
        }

        return {
          ...section,
          title: sectionCopy.title,
          subtitle: sectionCopy.subtitle,
          fields,
        };
      }),
    [locale]
  );

  return (
    <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
      <div className='space-y-6'>
        <FormSection title={copy.modeTitle} subtitle={copy.modeSubtitle}>
          <div className='flex flex-wrap gap-2'>
            {modeOptions.map((option) => (
              <Button
                key={option.id}
                type='button'
                variant={mode === option.id ? 'primary' : 'outline'}
                size='sm'
                onClick={() => setMode(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </FormSection>

        <div className='space-y-8'>
          {sections.map((section) => (
            <ThemeSettingsFieldsSection
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              fields={section.fields}
              values={currentDraft}
              onChange={updateDraft}
              disabled={isSaving}
            />
          ))}
        </div>

        <div className='sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/80 p-4 backdrop-blur-md'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='primary'
                size='sm'
                onClick={() => {
                  void saveTheme();
                }}
                loading={isSaving}
                disabled={!hasUnsavedChanges}
              >
                {copy.saveAction}
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={resetTheme}
                disabled={!hasUnsavedChanges || isSaving}
              >
                {copy.resetAction}
              </Button>
            </div>
            {hasUnsavedChanges ? (
              <p className='text-xs font-semibold text-amber-600 animate-pulse'>
                {copy.unsavedChanges}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className='relative'>
        <div className='sticky top-20 space-y-6'>
          <h3 className='text-sm font-black uppercase tracking-widest text-muted-foreground'>
            {copy.previewTitle}
          </h3>
          <ThemePreviewPanel
            draft={currentDraft}
            selectedId='custom'
            slotAssignments={{
              daily: { id: 'custom', name: 'Custom' },
              nightly: { id: 'custom', name: 'Custom' },
              dawn: { id: 'custom', name: 'Custom' },
              sunset: { id: 'custom', name: 'Custom' },
            }}
            slotThemes={drafts}
          />
          <Alert
            variant='info'
            title={copy.previewInfoTitle}
            description={copy.previewInfoText}
          />
        </div>
      </div>
    </div>
  );
}

export default KangurThemeSettingsPanel;
