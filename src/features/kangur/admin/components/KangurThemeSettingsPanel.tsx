'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import {
  ThemeSettingsFieldsSection,
  ThemeSettingsProvider,
  useThemeSettingsValue,
} from '@/features/cms/public';
import {
  KANGUR_DEFAULT_DAILY_THEME,
  KANGUR_DEFAULT_DAWN_THEME,
  KANGUR_DEFAULT_SUNSET_THEME,
  KANGUR_DEFAULT_THEME,
  type KangurThemeMode,
} from '@/features/kangur/theme-settings';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { Alert, Button, FormSection, Input } from '@/features/kangur/shared/ui';
import {
  buildKangurThemeFontWeightOptions,
  buildKangurThemeHomeActionFields,
  getKangurThemeModeCopy,
  getKangurThemeSectionCopy,
  localizeKangurThemeField,
} from './kangur-theme-settings.copy';
import { ThemePreviewPanel } from '../appearance/ThemePreviewPanel';

import { KANGUR_THEME_SECTIONS } from './theme-settings/KangurThemeSettings.constants';
import { useKangurThemeSettingsState } from './theme-settings/KangurThemeSettings.hooks';

export function KangurThemeSettingsPanel(): React.JSX.Element {
  const daily = useThemeSettingsValue('daily', KANGUR_DEFAULT_DAILY_THEME);
  const nightly = useThemeSettingsValue('nightly', KANGUR_DEFAULT_THEME);
  const dawn = useThemeSettingsValue('dawn', KANGUR_DEFAULT_DAWN_THEME);
  const sunset = useThemeSettingsValue('sunset', KANGUR_DEFAULT_SUNSET_THEME);

  return (
    <ThemeSettingsProvider value={daily}>
      <KangurThemeSettingsPanelContent
        initialDaily={daily}
        initialNightly={nightly}
        initialDawn={dawn}
        initialSunset={sunset}
      />
    </ThemeSettingsProvider>
  );
}

function KangurThemeSettingsPanelContent({
  initialDaily,
  initialNightly,
  initialDawn,
  initialSunset,
}: {
  initialDaily: ThemeSettings;
  initialNightly: ThemeSettings;
  initialDawn: ThemeSettings;
  initialSunset: ThemeSettings;
}): React.JSX.Element {
  const state = useKangurThemeSettingsState(initialDaily, initialNightly, initialDawn, initialSunset);
  const {
    copy,
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

  const modeOptions = useMemo(
    () =>
      (['daily', 'nightly', 'dawn', 'sunset'] as KangurThemeMode[]).map((m) => ({
        id: m,
        label: getKangurThemeModeCopy(m, copy.locale),
      })),
    [copy.locale]
  );

  const sections = useMemo(
    () =>
      KANGUR_THEME_SECTIONS.map((section) => {
        const sectionCopy = getKangurThemeSectionCopy(section.id, copy.locale);
        let fields = section.fields.map((f) => localizeKangurThemeField(f, copy.locale));

        if (section.id === 'buttons') {
          fields = fields.map((f) =>
            f.key === 'btnFontWeight' ? { ...f, options: buildKangurThemeFontWeightOptions(copy.locale) } : f
          );
        }

        if (section.id === 'homeActions') {
          fields = buildKangurThemeHomeActionFields(copy.locale);
        }

        return { ...section, title: sectionCopy.title, subtitle: sectionCopy.subtitle, fields };
      }),
    [copy.locale]
  );

  return (
    <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
      <div className='space-y-6'>
        <FormSection title={copy.modeTitle} subtitle={copy.modeSubtitle}>
          <div className='flex flex-wrap gap-2'>
            {modeOptions.map((opt) => (
              <Button
                key={opt.id}
                type='button'
                variant={mode === opt.id ? 'primary' : 'outline'}
                size='sm'
                onClick={() => setMode(opt.id)}
              >
                {opt.label}
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
              <Button type='button' variant='primary' size='sm' onClick={saveTheme} loading={isSaving} disabled={!hasUnsavedChanges}>
                {copy.saveAction}
              </Button>
              <Button type='button' variant='outline' size='sm' onClick={resetTheme} disabled={!hasUnsavedChanges || isSaving}>
                {copy.resetAction}
              </Button>
            </div>
            {hasUnsavedChanges && <p className='text-xs font-semibold text-amber-600 animate-pulse'>{copy.unsavedChanges}</p>}
          </div>
        </div>
      </div>

      <div className='relative'>
        <div className='sticky top-20 space-y-6'>
          <h3 className='text-sm font-black uppercase tracking-widest text-muted-foreground'>{copy.previewTitle}</h3>
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
          <Alert variant='info' title={copy.previewInfoTitle} description={copy.previewInfoText} />
        </div>
      </div>
    </div>
  );
}

export default KangurThemeSettingsPanel;
