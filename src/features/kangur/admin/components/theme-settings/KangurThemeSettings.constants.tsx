'use client';

import React from 'react';
import { Button, Input } from '@/features/kangur/shared/ui';
import type { SettingsPanelField } from '@/features/kangur/shared/ui/templates/SettingsPanelBuilder';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { FONT_OPTIONS } from '@/features/cms/public';
import type { KangurThemeSectionId } from '../kangur-theme-settings.copy';

export const KANGUR_THEME_SECTIONS: Array<{
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
      { key: 'pageTextColor', label: 'Page Text Override', type: 'background', placeholder: 'Auto', helperText: 'Leave empty to use the Primary Text color.' },
      { key: 'pageMutedTextColor', label: 'Page Muted Text Override', type: 'background', placeholder: 'Auto', helperText: 'Leave empty to use the Muted Text color.' },
      { key: 'cardTextColor', label: 'Card Text Override', type: 'background', placeholder: 'Auto', helperText: 'Controls text color inside soft cards.' },
      { key: 'navTextColor', label: 'Navigation Text Override', type: 'background', placeholder: 'Auto', helperText: 'Overrides the top navigation text color.' },
      { key: 'navActiveTextColor', label: 'Navigation Active Text Override', type: 'background', placeholder: 'Auto', helperText: 'Overrides the active navigation text color.' },
      { key: 'navHoverTextColor', label: 'Navigation Hover Text Override', type: 'background', placeholder: 'Auto', helperText: 'Overrides the hover navigation text color.' },
    ],
  },
  {
    id: 'logoLoader',
    title: 'Logo & Loader',
    subtitle: 'Tune the Kangur logo gradients used on the boot loader and navigation.',
    fields: [
      { key: 'logoWordStart', label: 'Wordmark Start', type: 'background', placeholder: 'Auto' },
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
      { key: 'panelTransparency', label: 'Panel Transparency', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'borderColor', label: 'Base Border', type: 'color' },
      { key: 'containerBorderColor', label: 'Surface Border', type: 'color' },
    ],
  },
  {
    id: 'buttons',
    title: 'Buttons',
    subtitle: 'Primary and secondary CTA colors used by the live storefront.',
    fields: [
      { key: 'btnPrimaryBg', label: 'Primary Button Background', type: 'background' },
      { key: 'btnPrimaryText', label: 'Primary Button Text', type: 'color' },
      { key: 'btnSecondaryBg', label: 'Secondary Button Background', type: 'background' },
      { key: 'btnSecondaryText', label: 'Secondary Button Text', type: 'color' },
      { key: 'btnOutlineBorder', label: 'Outline Border', type: 'color' },
      { key: 'btnPaddingX', label: 'Button Padding X', type: 'number', min: 8, max: 40, suffix: 'px' },
      { key: 'btnPaddingY', label: 'Button Padding Y', type: 'number', min: 6, max: 24, suffix: 'px' },
      { key: 'btnFontSize', label: 'Button Font Size', type: 'number', min: 12, max: 20, suffix: 'px' },
      { key: 'btnFontWeight', label: 'Button Font Weight', type: 'select', options: [] },
      { key: 'btnBorderWidth', label: 'Button Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'btnBorderOpacity', label: 'Button Border Opacity', type: 'range', min: 0, max: 100, step: 5 },
    ],
  },
  {
    id: 'buttonShadows',
    title: 'Button Shadows',
    subtitle: 'Drop shadows for the primary and secondary button shell.',
    fields: [
      { key: 'btnShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
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
      { key: 'btnGlossOpacity', label: 'Gloss Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'btnGlossHeight', label: 'Gloss Height', type: 'number', min: 20, max: 80, suffix: '%' },
      { key: 'btnGlossAngle', label: 'Gloss Angle', type: 'number', min: 0, max: 360, suffix: 'deg' },
      { key: 'btnInsetHighlightOpacity', label: 'Top Highlight', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'btnInsetShadowOpacity', label: 'Inner Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'btnInsetShadowBlur', label: 'Inner Shadow Blur', type: 'number', min: 0, max: 20, suffix: 'px' },
      { key: 'btnInsetShadowY', label: 'Inner Shadow Y', type: 'number', min: 0, max: 10, suffix: 'px' },
      { key: 'btnTextShadowOpacity', label: 'Text Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'btnTextShadowY', label: 'Text Shadow Y', type: 'number', min: -3, max: 3, suffix: 'px' },
      { key: 'btnTextShadowBlur', label: 'Text Shadow Blur', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'btnGlowOpacity', label: 'Outer Glow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
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
      { key: 'navTransparency', label: 'Navbar Transparency', type: 'range', min: 0, max: 1, step: 0.05 },
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
  { id: 'homeActions', title: 'Home Actions', subtitle: 'Theme the four main home buttons.', fields: [] },
  {
    id: 'progressBars',
    title: 'Progress Bars',
    subtitle: 'Track colors for progress indicators across Kangur.',
    fields: [
      {
        key: 'progressTrackColor',
        label: 'Progress Track',
        type: 'custom',
        render: ({ value, onChange, disabled }) => {
          const resolvedValue = typeof value === 'string' ? value : '';
          const isAuto = resolvedValue.trim().length === 0;
          return (
            <div className='flex items-center gap-2'>
              <div className={`size-8 rounded border border-border shrink-0 overflow-hidden ${isAuto ? 'bg-muted/40' : ''}`} style={isAuto ? undefined : { backgroundColor: resolvedValue }}>
                <input type='color' value={resolvedValue || '#000000'} onChange={(e) => onChange(e.target.value)} className='opacity-0 size-full cursor-pointer' disabled={disabled} aria-label='Progress track color picker' />
              </div>
              <Input value={resolvedValue} onChange={(e) => onChange(e.target.value)} placeholder='Auto' disabled={disabled} className='font-mono' aria-label='Progress track color value' title='Auto'/>
              <Button type='button' size='xs' variant={isAuto ? 'secondary' : 'outline'} onClick={() => onChange('')} disabled={disabled || isAuto}>Auto</Button>
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
      { key: 'headingFont', label: 'Heading Font', type: 'select', options: FONT_OPTIONS },
      { key: 'bodyFont', label: 'Body Font', type: 'select', options: FONT_OPTIONS },
      { key: 'baseSize', label: 'Base Font Size', type: 'number', min: 14, max: 20, suffix: 'px' },
      { key: 'lineHeight', label: 'Body Line Height', type: 'range', min: 1.2, max: 2, step: 0.05 },
      { key: 'headingLineHeight', label: 'Heading Line Height', type: 'range', min: 1, max: 1.6, step: 0.05 },
      { key: 'maxContentWidth', label: 'Page Width', type: 'range', min: 960, max: 1680, step: 10, suffix: 'px' },
      { key: 'gridGutter', label: 'Shared Gap Scale', type: 'number', min: 8, max: 48, suffix: 'px' },
      { key: 'pagePaddingTop', label: 'Page Padding Top', type: 'number', min: 0, max: 160, suffix: 'px' },
      { key: 'pagePaddingRight', label: 'Page Padding Right', type: 'number', min: 0, max: 120, suffix: 'px' },
      { key: 'pagePaddingBottom', label: 'Page Padding Bottom', type: 'number', min: 0, max: 200, suffix: 'px' },
      { key: 'pagePaddingLeft', label: 'Page Padding Left', type: 'number', min: 0, max: 120, suffix: 'px' },
    ],
  },
  {
    id: 'shapeSpacing',
    title: 'Shape and Spacing',
    subtitle: 'Shared radius controls for panels, navigation, buttons, and inputs.',
    fields: [
      { key: 'containerRadius', label: 'Panel Radius', type: 'number', min: 0, max: 48, suffix: 'px' },
      { key: 'cardRadius', label: 'Card Radius', type: 'number', min: 0, max: 48, suffix: 'px' },
      { key: 'containerPaddingInner', label: 'Panel Inner Padding', type: 'number', min: 8, max: 48, suffix: 'px' },
      { key: 'pillRadius', label: 'Navigation Pill Radius', type: 'number', min: 0, max: 999, suffix: 'px' },
      { key: 'btnRadius', label: 'Button Radius', type: 'number', min: 0, max: 999, suffix: 'px' },
      { key: 'btnBorderRadius', label: 'Button Border Radius', type: 'number', min: 0, max: 999, suffix: 'px' },
      { key: 'inputRadius', label: 'Input Radius', type: 'number', min: 0, max: 999, suffix: 'px' },
    ],
  },
  {
    id: 'shadowsDepth',
    title: 'Shadows and Depth',
    subtitle: 'Fine-tune glass panel and card shadow softness.',
    fields: [
      { key: 'containerShadowOpacity', label: 'Panel Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'containerShadowBlur', label: 'Panel Shadow Blur', type: 'number', min: 0, max: 80, suffix: 'px' },
      { key: 'containerShadowY', label: 'Panel Shadow Y', type: 'number', min: -20, max: 60, suffix: 'px' },
      { key: 'containerShadowX', label: 'Panel Shadow X', type: 'number', min: -20, max: 20, suffix: 'px' },
      { key: 'cardShadowOpacity', label: 'Card Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'cardShadowBlur', label: 'Card Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
      { key: 'cardShadowY', label: 'Card Shadow Y', type: 'number', min: -20, max: 40, suffix: 'px' },
      { key: 'cardShadowX', label: 'Card Shadow X', type: 'number', min: -20, max: 20, suffix: 'px' },
    ],
  },
];
