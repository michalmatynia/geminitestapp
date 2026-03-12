'use client';

import { ThemeSettingsProvider } from '@/features/cms/components/page-builder/ThemeSettingsContext';
import { FONT_OPTIONS } from '@/features/cms/components/page-builder/theme/theme-constants';
import { ThemeSettingsFieldsSection } from '@/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection';
import {
  KANGUR_DEFAULT_THEME,
  KANGUR_THEME_SETTINGS_KEY,
} from '@/features/kangur/theme-settings';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { Alert, FormSection } from '@/shared/ui';
import type { SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

const KANGUR_THEME_SECTIONS: Array<{
  title: string;
  subtitle: string;
  fields: SettingsField<ThemeSettings>[];
}> = [
  {
    title: 'Core Palette',
    subtitle: 'Shared tones for highlights, text, and feedback states across Kangur.',
    fields: [
      { key: 'primaryColor', label: 'Primary Accent', type: 'color' },
      { key: 'secondaryColor', label: 'Secondary Accent', type: 'color' },
      { key: 'accentColor', label: 'Warning Accent', type: 'color' },
      { key: 'successColor', label: 'Success Accent', type: 'color' },
      { key: 'textColor', label: 'Primary Text', type: 'color' },
      { key: 'mutedTextColor', label: 'Muted Text', type: 'color' },
    ],
  },
  {
    title: 'Backgrounds and Surfaces',
    subtitle: 'Base page, panel, card, and chat shell colors.',
    fields: [
      { key: 'backgroundColor', label: 'Page Background', type: 'color' },
      { key: 'surfaceColor', label: 'Surface Background', type: 'color' },
      { key: 'cardBg', label: 'Card Background', type: 'color' },
      { key: 'containerBg', label: 'Container Background', type: 'color' },
      { key: 'borderColor', label: 'Base Border', type: 'color' },
      { key: 'containerBorderColor', label: 'Surface Border', type: 'color' },
    ],
  },
  {
    title: 'Buttons',
    subtitle: 'Primary and secondary CTA colors used by the live storefront.',
    fields: [
      { key: 'btnPrimaryBg', label: 'Primary Button Background', type: 'color' },
      { key: 'btnPrimaryText', label: 'Primary Button Text', type: 'color' },
      { key: 'btnSecondaryBg', label: 'Secondary Button Background', type: 'color' },
      { key: 'btnSecondaryText', label: 'Secondary Button Text', type: 'color' },
      { key: 'btnPaddingX', label: 'Button Padding X', type: 'number', min: 8, max: 40, suffix: 'px' },
      { key: 'btnPaddingY', label: 'Button Padding Y', type: 'number', min: 6, max: 24, suffix: 'px' },
      { key: 'btnFontSize', label: 'Button Font Size', type: 'number', min: 12, max: 20, suffix: 'px' },
    ],
  },
  {
    title: 'Navigation Pills',
    subtitle: 'Sidebar and tab pill styling for default and active states.',
    fields: [
      { key: 'pillBg', label: 'Pill Background', type: 'color' },
      { key: 'pillText', label: 'Pill Text', type: 'color' },
      { key: 'pillActiveBg', label: 'Active Pill Background', type: 'color' },
      { key: 'pillActiveText', label: 'Active Pill Text', type: 'color' },
      { key: 'pillPaddingX', label: 'Pill Padding X', type: 'number', min: 6, max: 32, suffix: 'px' },
      { key: 'pillPaddingY', label: 'Pill Padding Y', type: 'number', min: 4, max: 24, suffix: 'px' },
      { key: 'pillFontSize', label: 'Pill Font Size', type: 'number', min: 11, max: 18, suffix: 'px' },
    ],
  },
  {
    title: 'Inputs',
    subtitle: 'Search, answer, and tutor prompt field colors.',
    fields: [
      { key: 'inputBg', label: 'Input Background', type: 'color' },
      { key: 'inputText', label: 'Input Text', type: 'color' },
      { key: 'inputBorderColor', label: 'Input Border', type: 'color' },
      { key: 'inputPlaceholder', label: 'Input Placeholder', type: 'color' },
      { key: 'inputHeight', label: 'Input Height', type: 'number', min: 36, max: 72, suffix: 'px' },
      { key: 'inputFontSize', label: 'Input Font Size', type: 'number', min: 12, max: 20, suffix: 'px' },
    ],
  },
  {
    title: 'Typography and Layout',
    subtitle: 'Fonts, base text rhythm, and page width used by the live Kangur shell.',
    fields: [
      {
        key: 'headingFont',
        label: 'Heading Font',
        type: 'select',
        options: FONT_OPTIONS,
      },
      {
        key: 'bodyFont',
        label: 'Body Font',
        type: 'select',
        options: FONT_OPTIONS,
      },
      {
        key: 'baseSize',
        label: 'Base Font Size',
        type: 'number',
        min: 14,
        max: 20,
        suffix: 'px',
      },
      {
        key: 'lineHeight',
        label: 'Body Line Height',
        type: 'range',
        min: 1.2,
        max: 2,
        step: 0.05,
      },
      {
        key: 'maxContentWidth',
        label: 'Page Width',
        type: 'range',
        min: 960,
        max: 1680,
        step: 10,
        suffix: 'px',
      },
      {
        key: 'gridGutter',
        label: 'Shared Gap Scale',
        type: 'number',
        min: 8,
        max: 48,
        suffix: 'px',
      },
      {
        key: 'pagePaddingTop',
        label: 'Page Padding Top',
        type: 'number',
        min: 0,
        max: 160,
        suffix: 'px',
      },
      {
        key: 'pagePaddingRight',
        label: 'Page Padding Right',
        type: 'number',
        min: 0,
        max: 120,
        suffix: 'px',
      },
      {
        key: 'pagePaddingBottom',
        label: 'Page Padding Bottom',
        type: 'number',
        min: 0,
        max: 200,
        suffix: 'px',
      },
      {
        key: 'pagePaddingLeft',
        label: 'Page Padding Left',
        type: 'number',
        min: 0,
        max: 120,
        suffix: 'px',
      },
    ],
  },
  {
    title: 'Shape and Spacing',
    subtitle: 'Shared radius controls for panels, navigation, buttons, and inputs.',
    fields: [
      {
        key: 'containerRadius',
        label: 'Panel Radius',
        type: 'number',
        min: 0,
        max: 48,
        suffix: 'px',
      },
      {
        key: 'cardRadius',
        label: 'Card Radius',
        type: 'number',
        min: 0,
        max: 48,
        suffix: 'px',
      },
      {
        key: 'containerPaddingInner',
        label: 'Panel Inner Padding',
        type: 'number',
        min: 8,
        max: 48,
        suffix: 'px',
      },
      {
        key: 'pillRadius',
        label: 'Navigation Pill Radius',
        type: 'number',
        min: 0,
        max: 999,
        suffix: 'px',
      },
      {
        key: 'btnRadius',
        label: 'Button Radius',
        type: 'number',
        min: 0,
        max: 999,
        suffix: 'px',
      },
      {
        key: 'inputRadius',
        label: 'Input Radius',
        type: 'number',
        min: 0,
        max: 999,
        suffix: 'px',
      },
    ],
  },
];

export function KangurThemeSettingsPanel(): React.JSX.Element {
  return (
    <ThemeSettingsProvider storageKey={KANGUR_THEME_SETTINGS_KEY} defaultTheme={KANGUR_DEFAULT_THEME}>
      <KangurThemeSettingsEditor />
    </ThemeSettingsProvider>
  );
}

export function KangurThemeSettingsEditor(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <Alert variant='info' title='Autosave'>
        Changes in this editor save to Mongo automatically and feed the live Kangur storefront
        theme. This panel only shows tokens that the public Kangur runtime maps today, so every
        field here has a live storefront effect.
      </Alert>
      <div className='space-y-4'>
        {KANGUR_THEME_SECTIONS.map((section) => (
          <FormSection
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
            variant='subtle'
            className='border border-border/60 bg-card/20'
          >
            <ThemeSettingsFieldsSection fields={section.fields} />
          </FormSection>
        ))}
      </div>
    </div>
  );
}
