'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  FONT_OPTIONS,
  ThemeSettingsFieldsSection,
  ThemeSettingsProvider,
  useThemeSettingsValue,
} from '@/features/cms/public';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_DEFAULT_DAILY_THEME,
  KANGUR_DEFAULT_DAWN_THEME,
  KANGUR_DEFAULT_SUNSET_THEME,
  KANGUR_DEFAULT_THEME,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
} from '@/features/kangur/theme-settings';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { Alert, Button, FormSection, Input, useToast } from '@/shared/ui';
import type { SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';
import { serializeSetting } from '@/shared/utils/settings-json';

type ThemeMode = 'daily' | 'dawn' | 'sunset' | 'nightly';
export type KangurThemeMode = ThemeMode;

const FONT_WEIGHT_OPTIONS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extrabold (800)' },
];

const HOME_ACTION_FIELD_GROUPS = [
  { prefix: 'homeActionLessons', label: 'Lessons' },
  { prefix: 'homeActionPlay', label: 'Play' },
  { prefix: 'homeActionTraining', label: 'Training' },
  { prefix: 'homeActionKangur', label: 'Kangur' },
] as const;

const HOME_ACTION_FIELD_TOKENS = [
  { suffix: 'TextColor', label: 'Text Color' },
  { suffix: 'TextActiveColor', label: 'Active Text Color' },
  { suffix: 'LabelStart', label: 'Label Gradient Start' },
  { suffix: 'LabelMid', label: 'Label Gradient Mid' },
  { suffix: 'LabelEnd', label: 'Label Gradient End' },
  { suffix: 'LabelStartActive', label: 'Active Label Gradient Start' },
  { suffix: 'LabelMidActive', label: 'Active Label Gradient Mid' },
  { suffix: 'LabelEndActive', label: 'Active Label Gradient End' },
  { suffix: 'AccentStart', label: 'Accent Gradient Start' },
  { suffix: 'AccentMid', label: 'Accent Gradient Mid' },
  { suffix: 'AccentEnd', label: 'Accent Gradient End' },
  { suffix: 'UnderlayStart', label: 'Underlay Gradient Start' },
  { suffix: 'UnderlayMid', label: 'Underlay Gradient Mid' },
  { suffix: 'UnderlayEnd', label: 'Underlay Gradient End' },
  { suffix: 'UnderlayTintStart', label: 'Underlay Tint Start' },
  { suffix: 'UnderlayTintMid', label: 'Underlay Tint Mid' },
  { suffix: 'UnderlayTintEnd', label: 'Underlay Tint End' },
  { suffix: 'AccentShadowColor', label: 'Accent Shadow' },
  { suffix: 'UnderlayShadowColor', label: 'Underlay Shadow' },
  { suffix: 'SurfaceShadowColor', label: 'Surface Shadow' },
] as const;

const HOME_ACTION_FIELDS: SettingsField<ThemeSettings>[] = HOME_ACTION_FIELD_GROUPS.flatMap(
  (group) =>
    HOME_ACTION_FIELD_TOKENS.map((token) => ({
      key: `${group.prefix}${token.suffix}` as keyof ThemeSettings,
      label: `${group.label} ${token.label}`,
      type: 'color',
    }))
);

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
    title: 'Text Overrides',
    subtitle: 'Optional overrides for page, cards, and navigation text colors.',
    fields: [
      {
        key: 'pageTextColor',
        label: 'Page Text Override',
        type: 'background',
        placeholder: 'Auto',
        helperText: 'Leave empty to use the Primary Text color.',
      },
      {
        key: 'pageMutedTextColor',
        label: 'Page Muted Text Override',
        type: 'background',
        placeholder: 'Auto',
        helperText: 'Leave empty to use the Muted Text color.',
      },
      {
        key: 'cardTextColor',
        label: 'Card Text Override',
        type: 'background',
        placeholder: 'Auto',
        helperText: 'Controls text color inside soft cards.',
      },
      {
        key: 'navTextColor',
        label: 'Navigation Text Override',
        type: 'background',
        placeholder: 'Auto',
        helperText: 'Overrides the top navigation text color.',
      },
      {
        key: 'navActiveTextColor',
        label: 'Navigation Active Text Override',
        type: 'background',
        placeholder: 'Auto',
        helperText: 'Overrides the active navigation text color.',
      },
      {
        key: 'navHoverTextColor',
        label: 'Navigation Hover Text Override',
        type: 'background',
        placeholder: 'Auto',
        helperText: 'Overrides the hover navigation text color.',
      },
    ],
  },
  {
    title: 'Logo & Loader',
    subtitle: 'Tune the Kangur logo gradients used on the boot loader and navigation.',
    fields: [
      {
        key: 'logoWordStart',
        label: 'Wordmark Start',
        type: 'background',
        placeholder: 'Auto',
        helperText: 'Leave empty to derive from the active palette.',
      },
      { key: 'logoWordMid', label: 'Wordmark Mid', type: 'background', placeholder: 'Auto' },
      { key: 'logoWordEnd', label: 'Wordmark End', type: 'background', placeholder: 'Auto' },
      { key: 'logoRingStart', label: 'Ring Start', type: 'background', placeholder: 'Auto' },
      { key: 'logoRingEnd', label: 'Ring End', type: 'background', placeholder: 'Auto' },
      { key: 'logoAccentStart', label: 'Accent Start', type: 'background', placeholder: 'Auto' },
      { key: 'logoAccentEnd', label: 'Accent End', type: 'background', placeholder: 'Auto' },
      { key: 'logoInnerStart', label: 'Inner Glow Start', type: 'background', placeholder: 'Auto' },
      { key: 'logoInnerEnd', label: 'Inner Glow End', type: 'background', placeholder: 'Auto' },
      { key: 'logoShadow', label: 'Logo Shadow', type: 'background', placeholder: 'Auto' },
      { key: 'logoGlint', label: 'Logo Glint', type: 'background', placeholder: 'Auto' },
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
      { key: 'panelGradientStart', label: 'Panel Gradient Start', type: 'color' },
      { key: 'panelGradientEnd', label: 'Panel Gradient End', type: 'color' },
      {
        key: 'panelTransparency',
        label: 'Panel Transparency',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
      { key: 'borderColor', label: 'Base Border', type: 'color' },
      { key: 'containerBorderColor', label: 'Surface Border', type: 'color' },
    ],
  },
  {
    title: 'Buttons',
    subtitle: 'Primary and secondary CTA colors used by the live storefront.',
    fields: [
      {
        key: 'btnPrimaryBg',
        label: 'Primary Button Background',
        type: 'background',
        helperText: 'CSS color or gradient (e.g. #ff8a3d or linear-gradient(...)).',
      },
      { key: 'btnPrimaryText', label: 'Primary Button Text', type: 'color' },
      {
        key: 'btnSecondaryBg',
        label: 'Secondary Button Background',
        type: 'background',
        helperText: 'CSS color or gradient (e.g. #ffffff or linear-gradient(...)).',
      },
      { key: 'btnSecondaryText', label: 'Secondary Button Text', type: 'color' },
      { key: 'btnOutlineBorder', label: 'Outline Border', type: 'color' },
      { key: 'btnPaddingX', label: 'Button Padding X', type: 'number', min: 8, max: 40, suffix: 'px' },
      { key: 'btnPaddingY', label: 'Button Padding Y', type: 'number', min: 6, max: 24, suffix: 'px' },
      { key: 'btnFontSize', label: 'Button Font Size', type: 'number', min: 12, max: 20, suffix: 'px' },
      {
        key: 'btnFontWeight',
        label: 'Button Font Weight',
        type: 'select',
        options: FONT_WEIGHT_OPTIONS,
      },
      { key: 'btnBorderWidth', label: 'Button Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      {
        key: 'btnBorderOpacity',
        label: 'Button Border Opacity',
        type: 'range',
        min: 0,
        max: 100,
        step: 5,
      },
    ],
  },
  {
    title: 'Button Shadows',
    subtitle: 'Drop shadows for the primary and secondary button shell.',
    fields: [
      {
        key: 'btnShadowOpacity',
        label: 'Shadow Opacity',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
      { key: 'btnShadowX', label: 'Shadow X', type: 'number', min: -20, max: 20, suffix: 'px' },
      { key: 'btnShadowY', label: 'Shadow Y', type: 'number', min: -20, max: 30, suffix: 'px' },
      { key: 'btnShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
    ],
  },
  {
    title: 'Gel Effects',
    subtitle: 'Gloss overlay, inner shadows, text shadow, and outer glow for gel-style buttons.',
    fields: [
      {
        key: 'btnGlossOpacity',
        label: 'Gloss Opacity',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
        helperText: 'White-to-transparent gloss overlay covering the top portion of the button.',
      },
      { key: 'btnGlossHeight', label: 'Gloss Height', type: 'number', min: 20, max: 80, suffix: '%' },
      { key: 'btnGlossAngle', label: 'Gloss Angle', type: 'number', min: 0, max: 360, suffix: 'deg' },
      {
        key: 'btnInsetHighlightOpacity',
        label: 'Top Highlight',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
        helperText: 'Bright inset line along the top edge of the button.',
      },
      {
        key: 'btnInsetShadowOpacity',
        label: 'Inner Shadow Opacity',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
        helperText: 'Dark inset shadow at the bottom edge for depth.',
      },
      { key: 'btnInsetShadowBlur', label: 'Inner Shadow Blur', type: 'number', min: 0, max: 20, suffix: 'px' },
      { key: 'btnInsetShadowY', label: 'Inner Shadow Y', type: 'number', min: 0, max: 10, suffix: 'px' },
      {
        key: 'btnTextShadowOpacity',
        label: 'Text Shadow Opacity',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
        helperText: 'Raised or embossed text effect.',
      },
      { key: 'btnTextShadowY', label: 'Text Shadow Y', type: 'number', min: -3, max: 3, suffix: 'px' },
      { key: 'btnTextShadowBlur', label: 'Text Shadow Blur', type: 'number', min: 0, max: 4, suffix: 'px' },
      {
        key: 'btnGlowOpacity',
        label: 'Outer Glow Opacity',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
        helperText: 'Colored halo around the button. Distinct from drop shadow.',
      },
      { key: 'btnGlowSpread', label: 'Outer Glow Spread', type: 'number', min: 2, max: 30, suffix: 'px' },
    ],
  },
  {
    title: 'Navigation Pills',
    subtitle: 'Sidebar and tab pill styling for default and active states.',
    fields: [
      { key: 'navGradientStart', label: 'Navbar Gradient Start', type: 'color' },
      { key: 'navGradientEnd', label: 'Navbar Gradient End', type: 'color' },
      {
        key: 'navTransparency',
        label: 'Navbar Transparency',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
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
    title: 'Gradients',
    subtitle: 'Accent gradients used by lesson tiles, badges, and decorative highlights.',
    fields: [
      { key: 'gradientIndigoStart', label: 'Indigo Gradient Start', type: 'color' },
      { key: 'gradientIndigoEnd', label: 'Indigo Gradient End', type: 'color' },
      { key: 'gradientVioletStart', label: 'Violet Gradient Start', type: 'color' },
      { key: 'gradientVioletEnd', label: 'Violet Gradient End', type: 'color' },
      { key: 'gradientEmeraldStart', label: 'Emerald Gradient Start', type: 'color' },
      { key: 'gradientEmeraldEnd', label: 'Emerald Gradient End', type: 'color' },
      { key: 'gradientSkyStart', label: 'Sky Gradient Start', type: 'color' },
      { key: 'gradientSkyEnd', label: 'Sky Gradient End', type: 'color' },
      { key: 'gradientAmberStart', label: 'Amber Gradient Start', type: 'color' },
      { key: 'gradientAmberEnd', label: 'Amber Gradient End', type: 'color' },
      { key: 'gradientRoseStart', label: 'Rose Gradient Start', type: 'color' },
      { key: 'gradientRoseEnd', label: 'Rose Gradient End', type: 'color' },
      { key: 'gradientTealStart', label: 'Teal Gradient Start', type: 'color' },
      { key: 'gradientTealEnd', label: 'Teal Gradient End', type: 'color' },
      { key: 'gradientSlateStart', label: 'Slate Gradient Start', type: 'color' },
      { key: 'gradientSlateEnd', label: 'Slate Gradient End', type: 'color' },
    ],
  },
  {
    title: 'Home Actions',
    subtitle:
      'Theme the four main home buttons (icons stay untouched). Leave a field empty to keep the default tone.',
    fields: HOME_ACTION_FIELDS,
  },
  {
    title: 'Progress Bars',
    subtitle: 'Track colors for progress indicators across Kangur.',
    fields: [
      {
        key: 'progressTrackColor',
        label: 'Progress Track',
        type: 'custom',
        helperText: 'Leave empty to let Kangur pick a track color based on the current mode.',
        render: ({ value, onChange, disabled }) => {
          const resolvedValue = typeof value === 'string' ? value : '';
          const trimmedValue = resolvedValue.trim();
          const isAuto = trimmedValue.length === 0;

          return (
            <div className='flex items-center gap-2'>
              <div
                className={`size-8 rounded border border-border shrink-0 overflow-hidden ${
                  isAuto ? 'bg-muted/40' : ''
                }`}
                style={isAuto ? undefined : { backgroundColor: trimmedValue }}
              >
                <input
                  type='color'
                  value={trimmedValue || '#000000'}
                  onChange={(event) => onChange(event.target.value)}
                  className='opacity-0 size-full cursor-pointer'
                  disabled={disabled}
                  aria-label='Progress track color picker'
                />
              </div>
              <Input
                value={resolvedValue}
                onChange={(event) => onChange(event.target.value)}
                placeholder='Auto'
                disabled={disabled}
                className='font-mono'
                aria-label='Progress track color value'
               title='Auto'/>
              <Button
                type='button'
                size='xs'
                variant={isAuto ? 'secondary' : 'outline'}
                onClick={() => onChange('')}
                disabled={disabled || isAuto}
              >
                Auto
              </Button>
            </div>
          );
        },
      },
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
        key: 'headingLineHeight',
        label: 'Heading Line Height',
        type: 'range',
        min: 1,
        max: 1.6,
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
        key: 'btnBorderRadius',
        label: 'Button Border Radius',
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
  {
    title: 'Shadows and Depth',
    subtitle: 'Fine-tune glass panel and card shadow softness.',
    fields: [
      {
        key: 'containerShadowOpacity',
        label: 'Panel Shadow Opacity',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        key: 'containerShadowBlur',
        label: 'Panel Shadow Blur',
        type: 'number',
        min: 0,
        max: 80,
        suffix: 'px',
      },
      {
        key: 'containerShadowY',
        label: 'Panel Shadow Y',
        type: 'number',
        min: -20,
        max: 60,
        suffix: 'px',
      },
      {
        key: 'containerShadowX',
        label: 'Panel Shadow X',
        type: 'number',
        min: -20,
        max: 20,
        suffix: 'px',
      },
      {
        key: 'cardShadowOpacity',
        label: 'Card Shadow Opacity',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        key: 'cardShadowBlur',
        label: 'Card Shadow Blur',
        type: 'number',
        min: 0,
        max: 80,
        suffix: 'px',
      },
      {
        key: 'cardShadowY',
        label: 'Card Shadow Y',
        type: 'number',
        min: -20,
        max: 60,
        suffix: 'px',
      },
      {
        key: 'cardShadowX',
        label: 'Card Shadow X',
        type: 'number',
        min: -20,
        max: 20,
        suffix: 'px',
      },
    ],
  },
];

const MODE_CONFIG: Record<
  ThemeMode,
  {
    label: string;
    storageKey: string;
    defaultTheme: ThemeSettings;
    resetLabel: string;
    resetDescription: string;
    toastMessage: string;
  }
> = {
  daily: {
    label: 'Motyw dzienny',
    storageKey: KANGUR_DAILY_THEME_SETTINGS_KEY,
    defaultTheme: KANGUR_DEFAULT_DAILY_THEME,
    resetLabel: 'Przywróć motyw dzienny',
    resetDescription: 'Nadpisuje ten motyw pięknym, ciepłym wzorcem dziennym.',
    toastMessage: 'Motyw dzienny przywrócony do domyślnych ustawień.',
  },
  dawn: {
    label: 'Motyw świtowy',
    storageKey: KANGUR_DAWN_THEME_SETTINGS_KEY,
    defaultTheme: KANGUR_DEFAULT_DAWN_THEME,
    resetLabel: 'Przywróć motyw świtowy',
    resetDescription: 'Nadpisuje ten motyw jasnym, porannym wzorcem świtu.',
    toastMessage: 'Motyw świtowy przywrócony do domyślnych ustawień.',
  },
  sunset: {
    label: 'Motyw zachodu',
    storageKey: KANGUR_SUNSET_THEME_SETTINGS_KEY,
    defaultTheme: KANGUR_DEFAULT_SUNSET_THEME,
    resetLabel: 'Przywróć motyw zachodu',
    resetDescription: 'Nadpisuje ten motyw ciepłym wzorcem zachodu.',
    toastMessage: 'Motyw zachodu przywrócony do domyślnych ustawień.',
  },
  nightly: {
    label: 'Motyw nocny',
    storageKey: KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
    defaultTheme: KANGUR_DEFAULT_THEME,
    resetLabel: 'Przywróć motyw nocny',
    resetDescription: 'Nadpisuje ten motyw ciemnym wzorcem nocnym.',
    toastMessage: 'Motyw nocny przywrócony do domyślnych ustawień.',
  },
};

type KangurThemeSettingsPanelProps = {
  onSectionChange?: (section: string) => void;
  onThemeChange?: (theme: ThemeSettings) => void;
  onModeChange?: (mode: ThemeMode) => void;
};

export function KangurThemeSettingsPanel({
  onSectionChange,
  onThemeChange,
  onModeChange,
}: KangurThemeSettingsPanelProps): React.JSX.Element {
  const [mode, setMode] = useState<ThemeMode>('daily');
  const config = MODE_CONFIG[mode];

  useEffect((): void => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  return (
    <div className='space-y-4'>
      {/* Theme mode tab strip */}
      <div className='flex gap-2 rounded-2xl border border-border/60 bg-card/30 p-1.5'>
        {(Object.entries(MODE_CONFIG) as Array<[ThemeMode, (typeof MODE_CONFIG)[ThemeMode]]>).map(
          ([key, cfg]) => (
            <button
              key={key}
              type='button'
              onClick={() => setMode(key)}
              className={[
                'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                mode === key
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {cfg.label}
            </button>
          )
        )}
      </div>

      {/* Re-mount provider when mode changes so the editor reads the correct key */}
      <ThemeSettingsProvider
        key={config.storageKey}
        storageKey={config.storageKey}
        defaultTheme={config.defaultTheme}
      >
        <KangurThemeSettingsEditor
          mode={mode}
          storageKey={config.storageKey}
          defaultTheme={config.defaultTheme}
          resetLabel={config.resetLabel}
          onSectionChange={onSectionChange}
          onThemeChange={onThemeChange}
        />
      </ThemeSettingsProvider>
    </div>
  );
}

function KangurThemeSettingsEditor({
  mode,
  storageKey,
  defaultTheme,
  resetLabel,
  onSectionChange,
  onThemeChange,
}: {
  mode: ThemeMode;
  storageKey: string;
  defaultTheme: ThemeSettings;
  resetLabel: string;
  onSectionChange?: (section: string) => void;
  onThemeChange?: (theme: ThemeSettings) => void;
}): React.JSX.Element {
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const theme = useThemeSettingsValue();
  const lastSectionRef = useRef<string | null>(null);

  useEffect((): void => {
    onThemeChange?.(theme);
  }, [onThemeChange, theme]);

  useEffect((): void => {
    if (!KANGUR_THEME_SECTIONS[0]) return;
    onSectionChange?.(KANGUR_THEME_SECTIONS[0].title);
  }, [onSectionChange]);

  const handleSectionActivate = useCallback(
    (title: string): void => {
      if (lastSectionRef.current === title) return;
      lastSectionRef.current = title;
      onSectionChange?.(title);
    },
    [onSectionChange]
  );

  const handleReset = async (): Promise<void> => {
    setIsResetting(true);
    try {
      await updateSetting.mutateAsync({
        key: storageKey,
        value: serializeSetting(defaultTheme),
      });
      toast(MODE_CONFIG[mode].toastMessage, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Nie udało się przywrócić motywu.', {
        variant: 'error',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className='space-y-4'>
      <Alert variant='info' title='Autosave'>
        Changes in this editor save to Mongo automatically and feed the live Kangur storefront
        theme. This panel only shows tokens that the public Kangur runtime maps today, so every
        field here has a live storefront effect.
      </Alert>

      {/* Reset to default */}
      <div className='flex items-center justify-between rounded-xl border border-border/60 bg-card/30 px-4 py-3'>
        <div className='min-w-0'>
          <p className='text-sm font-medium text-foreground'>{resetLabel}</p>
          <p className='text-xs text-muted-foreground'>
            {MODE_CONFIG[mode].resetDescription}
          </p>
        </div>
        <Button
          size='sm'
          variant='outline'
          disabled={isResetting}
          onClick={() => void handleReset()}
          className='ml-4 shrink-0'
        >
          {isResetting ? 'Przywracam...' : 'Przywróć domyślne'}
        </Button>
      </div>

      <div className='space-y-4'>
        {KANGUR_THEME_SECTIONS.map((section) => (
          <div
            key={section.title}
            onFocusCapture={() => handleSectionActivate(section.title)}
            onPointerEnter={() => handleSectionActivate(section.title)}
            onPointerDown={() => handleSectionActivate(section.title)}
          >
            <FormSection
              title={section.title}
              subtitle={section.subtitle}
              variant='subtle'
              className='border border-border/60 bg-card/20'
            >
              <ThemeSettingsFieldsSection fields={section.fields} />
            </FormSection>
          </div>
        ))}
      </div>
    </div>
  );
}
