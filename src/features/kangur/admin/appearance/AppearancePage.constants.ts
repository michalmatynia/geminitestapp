import {
  KANGUR_DEFAULT_DAILY_THEME,
  KANGUR_DEFAULT_DAWN_THEME,
  KANGUR_DEFAULT_SUNSET_THEME,
  KANGUR_DEFAULT_THEME,
  KANGUR_FACTORY_DAILY_THEME,
  KANGUR_FACTORY_DAWN_THEME,
  KANGUR_FACTORY_SUNSET_THEME,
  KANGUR_FACTORY_NIGHTLY_THEME,
  KANGUR_DAILY_CRYSTAL_THEME,
  KANGUR_NIGHTLY_CRYSTAL_THEME,
} from '@/features/kangur/theme-settings';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { SettingsPanelField } from '@/shared/ui/templates/SettingsPanelBuilder';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type AppearanceSlot = 'daily' | 'dawn' | 'sunset' | 'nightly';

export const SLOT_ORDER: AppearanceSlot[] = ['daily', 'dawn', 'sunset', 'nightly'];

export const FACTORY_DAILY_ID = 'factory_daily';
export const FACTORY_DAWN_ID = 'factory_dawn';
export const FACTORY_SUNSET_ID = 'factory_sunset';
export const FACTORY_NIGHTLY_ID = 'factory_nightly';

export const BUILTIN_DAILY_ID = 'builtin_daily';
export const BUILTIN_DAWN_ID = 'builtin_dawn';
export const BUILTIN_SUNSET_ID = 'builtin_sunset';
export const BUILTIN_NIGHTLY_ID = 'builtin_nightly';

export const PRESET_DAILY_CRYSTAL_ID = 'preset_daily_crystal';
export const PRESET_NIGHTLY_CRYSTAL_ID = 'preset_nightly_crystal';

export type ThemeSelectionId =
  | string
  | typeof FACTORY_DAILY_ID
  | typeof FACTORY_DAWN_ID
  | typeof FACTORY_SUNSET_ID
  | typeof FACTORY_NIGHTLY_ID
  | typeof BUILTIN_DAILY_ID
  | typeof BUILTIN_DAWN_ID
  | typeof BUILTIN_SUNSET_ID
  | typeof BUILTIN_NIGHTLY_ID;

export const SLOT_CONFIG: Record<
  AppearanceSlot,
  {
    label: string;
    factoryId: string;
    builtinId: string;
    defaultTheme: ThemeSettings;
    factoryTheme: ThemeSettings;
  }
> = {
  daily: {
    label: 'Dzień',
    factoryId: FACTORY_DAILY_ID,
    builtinId: BUILTIN_DAILY_ID,
    defaultTheme: KANGUR_DEFAULT_DAILY_THEME,
    factoryTheme: KANGUR_FACTORY_DAILY_THEME,
  },
  dawn: {
    label: 'Świt',
    factoryId: FACTORY_DAWN_ID,
    builtinId: BUILTIN_DAWN_ID,
    defaultTheme: KANGUR_DEFAULT_DAWN_THEME,
    factoryTheme: KANGUR_FACTORY_DAWN_THEME,
  },
  sunset: {
    label: 'Zmierzch',
    factoryId: FACTORY_SUNSET_ID,
    builtinId: BUILTIN_SUNSET_ID,
    defaultTheme: KANGUR_DEFAULT_SUNSET_THEME,
    factoryTheme: KANGUR_FACTORY_SUNSET_THEME,
  },
  nightly: {
    label: 'Noc',
    factoryId: FACTORY_NIGHTLY_ID,
    builtinId: BUILTIN_NIGHTLY_ID,
    defaultTheme: KANGUR_DEFAULT_THEME,
    factoryTheme: KANGUR_FACTORY_NIGHTLY_THEME,
  },
};

export const resolveFactoryTheme = (id: ThemeSelectionId): ThemeSettings => {
  switch (id) {
    case FACTORY_DAWN_ID:
      return KANGUR_FACTORY_DAWN_THEME;
    case FACTORY_SUNSET_ID:
      return KANGUR_FACTORY_SUNSET_THEME;
    case FACTORY_NIGHTLY_ID:
      return KANGUR_FACTORY_NIGHTLY_THEME;
    case PRESET_DAILY_CRYSTAL_ID:
      return KANGUR_DAILY_CRYSTAL_THEME;
    case PRESET_NIGHTLY_CRYSTAL_ID:
      return KANGUR_NIGHTLY_CRYSTAL_THEME;
    default:
      return KANGUR_FACTORY_DAILY_THEME;
  }
};

export const KANGUR_SLOT_ASSIGNMENTS_KEY = 'kangur_slot_assignments';

export type SlotAssignments = Record<AppearanceSlot, { id: string; name: string } | null>;

const parseSlotAssignmentEntry = (
  value: unknown
): { id: string; name: string } | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record['id'] === 'string' ? record['id'] : null;
  const name = typeof record['name'] === 'string' ? record['name'] : null;
  if (!id || !name) {
    return null;
  }
  return { id, name };
};

export const parseSlotAssignments = (raw: string | null | undefined): SlotAssignments => {
  const fallback: SlotAssignments = { daily: null, dawn: null, sunset: null, nightly: null };
  if (!raw?.trim()) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }
    const record = parsed as Record<string, unknown>;
    return {
      daily: parseSlotAssignmentEntry(record['daily']),
      dawn: parseSlotAssignmentEntry(record['dawn']),
      sunset: parseSlotAssignmentEntry(record['sunset']),
      nightly: parseSlotAssignmentEntry(record['nightly']),
    };
  } catch (error) {
    logClientError(error);
    return fallback;
  }
};

export const FONT_WEIGHT_OPTIONS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extrabold (800)' },
];

export const SHADOW_SIZE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

export const HOVER_EFFECT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'vertical-lift', label: 'Vertical lift' },
  { value: 'scale', label: 'Scale up' },
  { value: 'glow', label: 'Glow' },
  { value: 'border', label: 'Border highlight' },
];

export const ANIMATION_EASING_OPTIONS = [
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'linear', label: 'Linear' },
];

export const DRAWER_POSITION_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export const HOME_ACTION_FIELD_GROUPS = [
  { prefix: 'homeActionLessons', label: 'Lessons' },
  { prefix: 'homeActionPlay', label: 'Play' },
  { prefix: 'homeActionTraining', label: 'Training' },
  { prefix: 'homeActionKangur', label: 'Kangur' },
] as const;

export const HOME_ACTION_FIELD_TOKENS = [
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

export const HOME_ACTION_FIELDS: SettingsPanelField<ThemeSettings>[] = HOME_ACTION_FIELD_GROUPS.flatMap(
  (group) =>
    HOME_ACTION_FIELD_TOKENS.map((token) => ({
      key: `${group.prefix}${token.suffix}` as keyof ThemeSettings,
      label: `${group.label} ${token.label}`,
      type: 'color',
    }))
);

export const THEME_SECTIONS: Array<{
  title: string;
  subtitle: string;
  fields: SettingsPanelField<ThemeSettings>[];
}> = [
  // ── Colors ──────────────────────────────────────────────────────────────────
  {
    title: 'Core Palette',
    subtitle: 'Brand colors, text tones, and feedback states across Kangur.',
    fields: [
      { key: 'primaryColor', label: 'Primary Accent', type: 'color' },
      { key: 'secondaryColor', label: 'Secondary Accent', type: 'color' },
      { key: 'accentColor', label: 'Warning Accent', type: 'color' },
      { key: 'successColor', label: 'Success', type: 'color' },
      { key: 'errorColor', label: 'Error / Destructive', type: 'color' },
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
    subtitle: 'Fine-tune the Kangur logo gradients used on the loader and navigation.',
    fields: [
      { key: 'logoWordStart', label: 'Wordmark Start', type: 'color' },
      { key: 'logoWordMid', label: 'Wordmark Mid', type: 'color' },
      { key: 'logoWordEnd', label: 'Wordmark End', type: 'color' },
      { key: 'logoRingStart', label: 'Ring Start', type: 'color' },
      { key: 'logoRingEnd', label: 'Ring End', type: 'color' },
      { key: 'logoAccentStart', label: 'Accent Start', type: 'color' },
      { key: 'logoAccentEnd', label: 'Accent End', type: 'color' },
      { key: 'logoInnerStart', label: 'Logo Inner Start', type: 'color' },
      { key: 'logoInnerEnd', label: 'Logo Inner End', type: 'color' },
      { key: 'logoShadow', label: 'Logo Shadow', type: 'color' },
      { key: 'logoGlint', label: 'Logo Glint', type: 'color' },
    ],
  },
  // ── Layout & Surfaces ───────────────────────────────────────────────────────
  {
    title: 'Layout & Radii',
    subtitle: 'Page spacing, corner rounding, and panel alignment.',
    fields: [
      { key: 'pagePadding', label: 'Default Page Padding', type: 'number', step: 4 },
      { key: 'pagePaddingTop', label: 'Page Padding Top', type: 'number', step: 4, placeholder: 'Auto' },
      { key: 'pagePaddingBottom', label: 'Page Padding Bottom', type: 'number', step: 4, placeholder: 'Auto' },
      { key: 'gridGutter', label: 'Grid Gutter', type: 'number', step: 4 },
      { key: 'cardRadius', label: 'Card Corner Radius', type: 'number', step: 2 },
      { key: 'containerPaddingInner', label: 'Inner Container Padding', type: 'number', step: 4 },
    ],
  },
  {
    title: 'Gradients & Transparency',
    subtitle: 'Fine-tune panel backgrounds and navigation transparency.',
    fields: [
      {
        key: 'panelGradientStart',
        label: 'Panel Gradient Start',
        type: 'background',
        placeholder: 'Auto',
      },
      {
        key: 'panelGradientEnd',
        label: 'Panel Gradient End',
        type: 'background',
        placeholder: 'Auto',
      },
      {
        key: 'panelTransparency',
        label: 'Panel Opacity (0-1)',
        type: 'number',
        step: 0.05,
        min: 0,
        max: 1,
      },
      {
        key: 'navGradientStart',
        label: 'Nav Gradient Start',
        type: 'background',
        placeholder: 'Auto',
      },
      {
        key: 'navGradientEnd',
        label: 'Nav Gradient End',
        type: 'background',
        placeholder: 'Auto',
      },
      {
        key: 'navTransparency',
        label: 'Nav Opacity (0-1)',
        type: 'number',
        step: 0.05,
        min: 0,
        max: 1,
      },
    ],
  },
  // ── Typography ─────────────────────────────────────────────────────────────
  {
    title: 'Typography',
    subtitle: 'Fonts used for headings and body text.',
    fields: [
      {
        key: 'headingFont',
        label: 'Heading Font',
        type: 'select',
        options: [
          { value: 'inherit', label: 'Inherit' },
          { value: 'Geist', label: 'Geist (Sans)' },
          { value: 'GeistMono', label: 'Geist Mono' },
          { value: 'Inter', label: 'Inter' },
          { value: 'system-ui', label: 'System UI' },
        ],
      },
      {
        key: 'bodyFont',
        label: 'Body Font',
        type: 'select',
        options: [
          { value: 'inherit', label: 'Inherit' },
          { value: 'Geist', label: 'Geist (Sans)' },
          { value: 'GeistMono', label: 'Geist Mono' },
          { value: 'Inter', label: 'Inter' },
          { value: 'system-ui', label: 'System UI' },
        ],
      },
      {
        key: 'baseSize',
        label: 'Base Font Size',
        type: 'number',
        min: 12,
        max: 24,
        suffix: 'px',
      },
      {
        key: 'headingWeight',
        label: 'Heading Weight',
        type: 'select',
        options: FONT_WEIGHT_OPTIONS,
      },
      {
        key: 'bodyWeight',
        label: 'Body Weight',
        type: 'select',
        options: FONT_WEIGHT_OPTIONS,
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
    ],
  },
  // ── Components ─────────────────────────────────────────────────────────────
  {
    title: 'Buttons (Global)',
    subtitle: 'Shared settings for primary and secondary buttons.',
    fields: [
      {
        key: 'btnPrimaryBg',
        label: 'Primary Button Background',
        type: 'background',
        placeholder: 'Auto',
      },
      { key: 'btnPrimaryText', label: 'Primary Button Text', type: 'color' },
      {
        key: 'btnSecondaryBg',
        label: 'Secondary Button Background',
        type: 'background',
        placeholder: 'Auto',
      },
      { key: 'btnSecondaryText', label: 'Secondary Button Text', type: 'color' },
      { key: 'btnOutlineBorder', label: 'Outline Border Color', type: 'color' },
      { key: 'btnRadius', label: 'Button Corner Radius', type: 'number', step: 2 },
      { key: 'btnBorderRadius', label: 'Button Border Radius', type: 'number', step: 2 },
      { key: 'btnFontSize', label: 'Button Font Size', type: 'number' },
      { key: 'btnFontWeight', label: 'Button Font Weight', type: 'select', options: FONT_WEIGHT_OPTIONS },
      { key: 'btnPaddingX', label: 'Button Padding X', type: 'number' },
      { key: 'btnPaddingY', label: 'Button Padding Y', type: 'number' },
      { key: 'btnBorderWidth', label: 'Button Border Width', type: 'number', step: 0.5 },
      { key: 'btnBorderOpacity', label: 'Button Border Opacity (0-100)', type: 'number', step: 5, min: 0, max: 100 },
    ],
  },
  {
    title: 'Button Shadows',
    subtitle: 'Drop shadows for primary and secondary buttons.',
    fields: [
      { key: 'btnShadowX', label: 'Button Shadow X', type: 'number', step: 1 },
      { key: 'btnShadowY', label: 'Button Shadow Y', type: 'number', step: 1 },
      { key: 'btnShadowBlur', label: 'Button Shadow Blur', type: 'number', step: 1 },
      { key: 'btnShadowOpacity', label: 'Button Shadow Opacity (0-1)', type: 'number', step: 0.05, min: 0, max: 1 },
    ],
  },
  {
    title: 'Gel & Glass Effects',
    subtitle: 'Settings for modern glass and gel styles.',
    fields: [
      { key: 'btnGlossOpacity', label: 'Gloss Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { key: 'btnGlossHeight', label: 'Gloss Height (%)', type: 'number', step: 1, min: 0, max: 100 },
      { key: 'btnGlossAngle', label: 'Gloss Angle (deg)', type: 'number', step: 1, min: 0, max: 360 },
      { key: 'btnGlossColor', label: 'Gloss Tint Color', type: 'background', placeholder: '#ffffff' },
      { key: 'btnInsetHighlightOpacity', label: 'Inset Highlight Opacity', type: 'number', step: 0.05 },
      { key: 'btnInsetShadowOpacity', label: 'Inset Shadow Opacity', type: 'number', step: 0.05 },
      { key: 'btnInsetShadowBlur', label: 'Inset Shadow Blur', type: 'number', step: 1 },
      { key: 'btnInsetShadowY', label: 'Inset Shadow Y', type: 'number', step: 1 },
      { key: 'btnTextShadowOpacity', label: 'Text Shadow Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { key: 'btnTextShadowY', label: 'Text Shadow Y', type: 'number', step: 1 },
      { key: 'btnTextShadowBlur', label: 'Text Shadow Blur', type: 'number', step: 1 },
      { key: 'btnGlowOpacity', label: 'Button Glow Opacity', type: 'number', step: 0.05 },
      { key: 'btnGlowSpread', label: 'Button Glow Spread', type: 'number' },
      { key: 'btnGlowColor', label: 'Glow Color Override', type: 'background', placeholder: 'Auto (button bg)' },
    ],
  },
  {
    title: 'Home Action Buttons',
    subtitle: 'Highly specialized overrides for the main game-home action cards.',
    fields: HOME_ACTION_FIELDS,
  },
  // ── Shadows ────────────────────────────────────────────────────────────────
  {
    title: 'Drop Shadows',
    subtitle: 'Shared shadow configurations for containers and cards.',
    fields: [
      { key: 'containerShadowX', label: 'Panel Shadow X', type: 'number' },
      { key: 'containerShadowY', label: 'Panel Shadow Y', type: 'number' },
      { key: 'containerShadowBlur', label: 'Panel Shadow Blur', type: 'number' },
      { key: 'containerShadowOpacity', label: 'Panel Shadow Opacity', type: 'number', step: 0.05 },
      { key: 'cardShadowX', label: 'Card Shadow X', type: 'number' },
      { key: 'cardShadowY', label: 'Card Shadow Y', type: 'number' },
      { key: 'cardShadowBlur', label: 'Card Shadow Blur', type: 'number' },
      { key: 'cardShadowOpacity', label: 'Card Shadow Opacity', type: 'number', step: 0.05 },
    ],
  },
];
