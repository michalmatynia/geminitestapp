'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import type { SettingsFieldRenderProps } from '@/shared/contracts/ui/settings';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { Alert, Button, FormSection, Input, useToast } from '@/features/kangur/shared/ui';
import type { SettingsPanelField } from '@/features/kangur/shared/ui/templates/SettingsPanelBuilder';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  buildKangurThemeFontWeightOptions,
  buildKangurThemeHomeActionFields,
  getKangurThemeModeCopy,
  getKangurThemePanelCopy,
  getKangurThemeSectionCopy,
  localizeKangurThemeField,
  mapKangurThemeSectionToPreviewSection,
  resolveKangurThemeSettingsLocale,
  type KangurThemeMode as KangurThemeModeType,
  type KangurThemePreviewSectionId,
  type KangurThemeSectionId,
} from './kangur-theme-settings.copy';


export type KangurThemeMode = KangurThemeModeType;
type ThemeMode = KangurThemeMode;

const KANGUR_THEME_SECTIONS: Array<{
  id: KangurThemeSectionId;
  title: string;
  subtitle: string;
  fields: SettingsPanelField<ThemeSettings>[];
}> = [
  {
    id: 'corePalette',
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
    id: 'textOverrides',
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
    id: 'logoLoader',
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
    id: 'backgroundsSurfaces',
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
    id: 'buttons',
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
        options: [],
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
    id: 'buttonShadows',
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
    id: 'gelEffects',
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
    id: 'navigationPills',
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
    id: 'gradients',
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
    id: 'homeActions',
    title: 'Home Actions',
    subtitle:
      'Theme the four main home buttons (icons stay untouched). Leave a field empty to keep the default tone.',
    fields: [],
  },
  {
    id: 'progressBars',
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
    id: 'inputs',
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
    id: 'typographyLayout',
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
    id: 'shapeSpacing',
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
    id: 'shadowsDepth',
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
    storageKey: string;
    defaultTheme: ThemeSettings;
  }
> = {
  daily: {
    storageKey: KANGUR_DAILY_THEME_SETTINGS_KEY,
    defaultTheme: KANGUR_DEFAULT_DAILY_THEME,
  },
  dawn: {
    storageKey: KANGUR_DAWN_THEME_SETTINGS_KEY,
    defaultTheme: KANGUR_DEFAULT_DAWN_THEME,
  },
  sunset: {
    storageKey: KANGUR_SUNSET_THEME_SETTINGS_KEY,
    defaultTheme: KANGUR_DEFAULT_SUNSET_THEME,
  },
  nightly: {
    storageKey: KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
    defaultTheme: KANGUR_DEFAULT_THEME,
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
  const locale = resolveKangurThemeSettingsLocale(useLocale());
  const handleSectionChange = onSectionChange;
  const handleThemeChange = onThemeChange;
  const [mode, setMode] = useState<ThemeMode>('daily');
  const config = MODE_CONFIG[mode];
  const modeCopy = getKangurThemeModeCopy(locale, mode);

  useEffect((): void => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  return (
    <div className='space-y-4'>
      {/* Theme mode tab strip */}
      <div className='flex gap-2 rounded-2xl border border-border/60 bg-card/30 p-1.5'>
        {(Object.entries(MODE_CONFIG) as Array<[ThemeMode, (typeof MODE_CONFIG)[ThemeMode]]>).map(
          ([key]) => (
            <button
              key={key}
              type='button'
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              aria-label={getKangurThemeModeCopy(locale, key).label}
              className={[
                'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background',
                mode === key
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {getKangurThemeModeCopy(locale, key).label}
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
          locale={locale}
          mode={mode}
          storageKey={config.storageKey}
          defaultTheme={config.defaultTheme}
          resetLabel={modeCopy.resetLabel}
          onSectionChange={handleSectionChange}
          onThemeChange={handleThemeChange}
        />
      </ThemeSettingsProvider>
    </div>
  );
}

function KangurThemeSettingsEditor({
  locale,
  mode,
  storageKey,
  defaultTheme,
  resetLabel,
  onSectionChange,
  onThemeChange,
}: {
  locale: ReturnType<typeof resolveKangurThemeSettingsLocale>;
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
  const lastSectionRef = useRef<KangurThemePreviewSectionId | null>(null);
  const panelCopy = getKangurThemePanelCopy(locale);
  const modeCopy = getKangurThemeModeCopy(locale, mode);
  const fontWeightOptions = buildKangurThemeFontWeightOptions(locale);
  const localizedSections = useMemo(
    () =>
      KANGUR_THEME_SECTIONS.map((section) => {
        const localizedCopy = getKangurThemeSectionCopy(locale, section.id);
        const fields: SettingsPanelField<ThemeSettings>[] =
          section.id === 'homeActions'
            ? buildKangurThemeHomeActionFields(locale)
            : section.fields.map((field) => {
              const localizedField = localizeKangurThemeField(locale, field);
              if (field.key === 'btnFontWeight' && field.type === 'select') {
                return {
                  ...localizedField,
                  options: fontWeightOptions,
                };
              }
              if (
                section.id === 'progressBars' &&
                field.key === 'progressTrackColor' &&
                field.type === 'custom'
              ) {
                return {
                  ...localizedField,
                  render: ({ value, onChange, disabled }: SettingsFieldRenderProps) => {
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
                            aria-label={panelCopy.progressTrackColorPickerAria}
                          />
                        </div>
                        <Input
                          value={resolvedValue}
                          onChange={(event) => onChange(event.target.value)}
                          placeholder={panelCopy.auto}
                          disabled={disabled}
                          className='font-mono'
                          aria-label={panelCopy.progressTrackColorValueAria}
                          title={panelCopy.auto}
                        />
                        <Button
                          type='button'
                          size='xs'
                          variant={isAuto ? 'secondary' : 'outline'}
                          onClick={() => onChange('')}
                          disabled={disabled || isAuto}
                        >
                          {panelCopy.auto}
                        </Button>
                      </div>
                    );
                  },
                };
              }
              return localizedField;
            });

        return {
          ...section,
          title: localizedCopy.title,
          subtitle: localizedCopy.subtitle,
          fields,
        };
      }),
    [fontWeightOptions, locale, panelCopy.auto, panelCopy.progressTrackColorPickerAria, panelCopy.progressTrackColorValueAria]
  );

  useEffect((): void => {
    onThemeChange?.(theme);
  }, [onThemeChange, theme]);

  useEffect((): void => {
    if (!localizedSections[0]) return;
    onSectionChange?.(mapKangurThemeSectionToPreviewSection(localizedSections[0].id));
  }, [localizedSections, onSectionChange]);

  const handleSectionActivate = useCallback(
    (sectionId: KangurThemeSectionId): void => {
      const previewSectionId = mapKangurThemeSectionToPreviewSection(sectionId);
      if (lastSectionRef.current === previewSectionId) return;
      lastSectionRef.current = previewSectionId;
      onSectionChange?.(previewSectionId);
    },
    [onSectionChange]
  );

  const handleReset = useCallback(async (): Promise<void> => {
    setIsResetting(true);
    const didReset = await withKangurClientError(
      {
        source: 'kangur.admin.theme-settings',
        action: 'reset-theme',
        description: 'Resets a theme section to defaults.',
        context: { mode, storageKey },
      },
      async () => {
        await updateSetting.mutateAsync({
          key: storageKey,
          value: serializeSetting(defaultTheme),
        });
        return true;
      },
      {
        fallback: false,
        onError: (error) => {
          toast(error instanceof Error ? error.message : panelCopy.resetError, {
            variant: 'error',
          });
        },
      }
    );

    if (didReset) {
      toast(modeCopy.toastMessage, { variant: 'success' });
    }
    setIsResetting(false);
  }, [defaultTheme, mode, modeCopy.toastMessage, panelCopy.resetError, storageKey, toast, updateSetting]);

  return (
    <div className='space-y-4'>
      <Alert variant='info' title={panelCopy.autosaveTitle}>
        {panelCopy.autosaveDescription}
      </Alert>

      {/* Reset to default */}
      <div className='flex items-center justify-between rounded-xl border border-border/60 bg-card/30 px-4 py-3'>
        <div className='min-w-0'>
          <p className='text-sm font-medium text-foreground'>{resetLabel}</p>
          <p className='text-xs text-muted-foreground'>
            {modeCopy.resetDescription}
          </p>
        </div>
        <Button
          size='sm'
          variant='outline'
          disabled={isResetting}
          onClick={() => void handleReset()}
          className='ml-4 shrink-0'
        >
          {isResetting ? panelCopy.restoring : panelCopy.restoreDefaultButton}
        </Button>
      </div>

      <div className='space-y-4'>
        {localizedSections.map((section) => (
          <div
            key={section.id}
            onFocusCapture={() => handleSectionActivate(section.id)}
            onPointerEnter={() => handleSectionActivate(section.id)}
            onPointerDown={() => handleSectionActivate(section.id)}
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
