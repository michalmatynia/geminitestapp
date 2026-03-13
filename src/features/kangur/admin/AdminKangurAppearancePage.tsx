'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FONT_OPTIONS, resolveKangurStorefrontAppearance } from '@/features/cms/public';
import {
  getKangurThemeSettingsKeyForAppearanceMode,
  KANGUR_FACTORY_DAILY_THEME,
  KANGUR_FACTORY_NIGHTLY_THEME,
  KANGUR_DEFAULT_DAILY_THEME,
  KANGUR_DEFAULT_THEME,
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_THEME_CATALOG_KEY,
  parseKangurThemeCatalog,
  parseKangurThemeSettings,
  type KangurThemeCatalogEntry,
} from '@/features/kangur/theme-settings';
import { normalizeThemeSettings, type ThemeSettings } from '@/shared/contracts/cms-theme';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Alert,
  Button,
  Card,
  FormField,
  FormModal,
  FormSection,
  Input,
  SelectSimple,
  useToast,
} from '@/shared/ui';
import { SettingsFieldsRenderer, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';
import { serializeSetting } from '@/shared/utils/settings-json';

import { KangurAdminContentShell } from './components/KangurAdminContentShell';

// ─── Section config (fields rendered via SettingsFieldsRenderer) ───────────

const FONT_WEIGHT_OPTIONS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extrabold (800)' },
];

const SHADOW_SIZE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const HOVER_EFFECT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'vertical-lift', label: 'Vertical lift' },
  { value: 'scale', label: 'Scale up' },
  { value: 'glow', label: 'Glow' },
  { value: 'border', label: 'Border highlight' },
];

const ANIMATION_EASING_OPTIONS = [
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'linear', label: 'Linear' },
];

const DRAWER_POSITION_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

const THEME_SECTIONS: Array<{
  title: string;
  subtitle: string;
  fields: SettingsField<ThemeSettings>[];
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
    title: 'Backgrounds and Surfaces',
    subtitle: 'Base page, panel, card, and chat shell colors.',
    fields: [
      { key: 'backgroundColor', label: 'Page Background', type: 'color' },
      { key: 'surfaceColor', label: 'Surface Background', type: 'color' },
      { key: 'cardBg', label: 'Card Background', type: 'color' },
      { key: 'containerBg', label: 'Container Background', type: 'color' },
      { key: 'borderColor', label: 'Base Border', type: 'color' },
      { key: 'containerBorderColor', label: 'Surface Border', type: 'color' },
      { key: 'imagePlaceholderBg', label: 'Image Placeholder', type: 'color' },
    ],
  },
  // ── Component tokens ────────────────────────────────────────────────────────
  {
    title: 'Buttons',
    subtitle: 'Primary and secondary CTA colors, sizing, weight, border, and shadow.',
    fields: [
      { key: 'btnPrimaryBg', label: 'Primary Background', type: 'color' },
      { key: 'btnPrimaryText', label: 'Primary Text', type: 'color' },
      { key: 'btnSecondaryBg', label: 'Secondary Background', type: 'color' },
      { key: 'btnSecondaryText', label: 'Secondary Text', type: 'color' },
      { key: 'btnOutlineBorder', label: 'Outline Border Color', type: 'color' },
      { key: 'btnPaddingX', label: 'Padding X', type: 'number', min: 8, max: 40, suffix: 'px' },
      { key: 'btnPaddingY', label: 'Padding Y', type: 'number', min: 6, max: 24, suffix: 'px' },
      { key: 'btnFontSize', label: 'Font Size', type: 'number', min: 12, max: 20, suffix: 'px' },
      { key: 'btnFontWeight', label: 'Font Weight', type: 'select', options: FONT_WEIGHT_OPTIONS },
      { key: 'btnBorderWidth', label: 'Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'btnBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, step: 5 },
      { key: 'btnShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'btnShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
      { key: 'btnShadowX', label: 'Shadow Offset X', type: 'number', min: -20, max: 20, suffix: 'px' },
      { key: 'btnShadowY', label: 'Shadow Offset Y', type: 'number', min: -20, max: 40, suffix: 'px' },
    ],
  },
  {
    title: 'Navigation Pills',
    subtitle: 'Sidebar and tab pill styling for default, hover, and active states.',
    fields: [
      { key: 'pillBg', label: 'Background', type: 'color' },
      { key: 'pillText', label: 'Text', type: 'color' },
      { key: 'pillActiveBg', label: 'Active Background', type: 'color' },
      { key: 'pillActiveText', label: 'Active Text', type: 'color' },
      { key: 'pillBorderColor', label: 'Border Color', type: 'color' },
      { key: 'pillPaddingX', label: 'Padding X', type: 'number', min: 6, max: 32, suffix: 'px' },
      { key: 'pillPaddingY', label: 'Padding Y', type: 'number', min: 4, max: 24, suffix: 'px' },
      { key: 'pillFontSize', label: 'Font Size', type: 'number', min: 11, max: 18, suffix: 'px' },
      { key: 'pillBorderWidth', label: 'Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'pillBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, step: 5 },
      { key: 'pillShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'pillShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 40, suffix: 'px' },
      { key: 'pillShadowX', label: 'Shadow Offset X', type: 'number', min: -20, max: 20, suffix: 'px' },
      { key: 'pillShadowY', label: 'Shadow Offset Y', type: 'number', min: -20, max: 20, suffix: 'px' },
    ],
  },
  {
    title: 'Inputs',
    subtitle: 'Search, answer, and tutor prompt field colors, dimensions, and shadow.',
    fields: [
      { key: 'inputBg', label: 'Background', type: 'color' },
      { key: 'inputText', label: 'Text', type: 'color' },
      { key: 'inputBorderColor', label: 'Border', type: 'color' },
      { key: 'inputFocusBorder', label: 'Focus Ring', type: 'color' },
      { key: 'inputPlaceholder', label: 'Placeholder', type: 'color' },
      { key: 'inputHeight', label: 'Height', type: 'number', min: 36, max: 72, suffix: 'px' },
      { key: 'inputFontSize', label: 'Font Size', type: 'number', min: 12, max: 20, suffix: 'px' },
      { key: 'inputBorderWidth', label: 'Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'inputBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, step: 5 },
      { key: 'inputShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'inputShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 40, suffix: 'px' },
      { key: 'inputShadowX', label: 'Shadow Offset X', type: 'number', min: -20, max: 20, suffix: 'px' },
      { key: 'inputShadowY', label: 'Shadow Offset Y', type: 'number', min: -20, max: 20, suffix: 'px' },
    ],
  },
  {
    title: 'Cards and Panels',
    subtitle: 'Card surface, border, shadow depth, and hover shadow for content panels.',
    fields: [
      { key: 'cardShadow', label: 'Resting Shadow', type: 'select', options: SHADOW_SIZE_OPTIONS },
      { key: 'cardHoverShadow', label: 'Hover Shadow', type: 'select', options: SHADOW_SIZE_OPTIONS },
      { key: 'cardBorderWidth', label: 'Card Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'cardBorderOpacity', label: 'Card Border Opacity', type: 'range', min: 0, max: 100, step: 5 },
      { key: 'cardShadowOpacity', label: 'Card Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'cardShadowBlur', label: 'Card Shadow Blur', type: 'number', min: 0, max: 80, suffix: 'px' },
      { key: 'cardShadowX', label: 'Card Shadow X', type: 'number', min: -20, max: 20, suffix: 'px' },
      { key: 'cardShadowY', label: 'Card Shadow Y', type: 'number', min: -20, max: 60, suffix: 'px' },
      { key: 'containerBorderWidth', label: 'Container Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'containerBorderOpacity', label: 'Container Border Opacity', type: 'range', min: 0, max: 100, step: 5 },
      { key: 'containerShadowOpacity', label: 'Container Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'containerShadowBlur', label: 'Container Shadow Blur', type: 'number', min: 0, max: 80, suffix: 'px' },
      { key: 'containerShadowX', label: 'Container Shadow X', type: 'number', min: -20, max: 20, suffix: 'px' },
      { key: 'containerShadowY', label: 'Container Shadow Y', type: 'number', min: -20, max: 60, suffix: 'px' },
    ],
  },
  {
    title: 'Images and Media',
    subtitle: 'Image border, shadow, and placeholder background.',
    fields: [
      { key: 'imageBorderColor', label: 'Border Color', type: 'color' },
      { key: 'imageBorderWidth', label: 'Border Width', type: 'number', min: 0, max: 8, suffix: 'px' },
      { key: 'imageBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, step: 5 },
      { key: 'imageShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'imageShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
      { key: 'imageShadowX', label: 'Shadow Offset X', type: 'number', min: -20, max: 20, suffix: 'px' },
      { key: 'imageShadowY', label: 'Shadow Offset Y', type: 'number', min: -20, max: 40, suffix: 'px' },
    ],
  },
  {
    title: 'Badges',
    subtitle: 'Label badges for notifications, scores, and status indicators.',
    fields: [
      { key: 'badgeDefaultBg', label: 'Default Background', type: 'color' },
      { key: 'badgeDefaultText', label: 'Default Text', type: 'color' },
      { key: 'badgeSaleBg', label: 'Highlight Background', type: 'color' },
      { key: 'badgeSaleText', label: 'Highlight Text', type: 'color' },
      { key: 'badgeFontSize', label: 'Font Size', type: 'number', min: 9, max: 14, suffix: 'px' },
      { key: 'badgeRadius', label: 'Radius', type: 'number', min: 0, max: 999, suffix: 'px' },
      { key: 'badgePaddingX', label: 'Padding X', type: 'number', min: 4, max: 20, suffix: 'px' },
      { key: 'badgePaddingY', label: 'Padding Y', type: 'number', min: 1, max: 10, suffix: 'px' },
    ],
  },
  // ── Typography & Layout ──────────────────────────────────────────────────────
  {
    title: 'Typography',
    subtitle: 'Fonts, weights, text rhythm, and size scale.',
    fields: [
      { key: 'headingFont', label: 'Heading Font', type: 'select', options: FONT_OPTIONS },
      { key: 'bodyFont', label: 'Body Font', type: 'select', options: FONT_OPTIONS },
      { key: 'headingWeight', label: 'Heading Weight', type: 'select', options: FONT_WEIGHT_OPTIONS },
      { key: 'bodyWeight', label: 'Body Weight', type: 'select', options: FONT_WEIGHT_OPTIONS },
      { key: 'baseSize', label: 'Base Font Size', type: 'number', min: 14, max: 20, suffix: 'px' },
      { key: 'lineHeight', label: 'Body Line Height', type: 'range', min: 1.2, max: 2, step: 0.05 },
      { key: 'headingLineHeight', label: 'Heading Line Height', type: 'range', min: 1.0, max: 1.8, step: 0.05 },
      {
        key: 'headingSizeScale',
        label: 'Heading Size Scale',
        type: 'range',
        min: 1.1,
        max: 1.8,
        step: 0.05,
        helperText: 'Multiplier per heading level (h1→h6).',
      },
      {
        key: 'bodySizeScale',
        label: 'Body Size Scale',
        type: 'range',
        min: 0.85,
        max: 1.2,
        step: 0.05,
        helperText: 'Global multiplier for body text sizes.',
      },
    ],
  },
  {
    title: 'Layout',
    subtitle: 'Page width, padding, margins, grid gutter, and section spacing.',
    fields: [
      { key: 'maxContentWidth', label: 'Max Page Width', type: 'range', min: 960, max: 1680, step: 10, suffix: 'px' },
      { key: 'fullWidth', label: 'Full Width Layout', type: 'switch', helperText: 'Stretches content to the full viewport width.' },
      { key: 'gridGutter', label: 'Grid Gutter', type: 'number', min: 8, max: 48, suffix: 'px' },
      { key: 'sectionSpacing', label: 'Section Spacing', type: 'number', min: 16, max: 120, suffix: 'px' },
      { key: 'containerPadding', label: 'Outer Container Padding', type: 'number', min: 0, max: 64, suffix: 'px' },
      { key: 'pagePaddingTop', label: 'Page Padding Top', type: 'number', min: 0, max: 160, suffix: 'px' },
      { key: 'pagePaddingRight', label: 'Page Padding Right', type: 'number', min: 0, max: 120, suffix: 'px' },
      { key: 'pagePaddingBottom', label: 'Page Padding Bottom', type: 'number', min: 0, max: 200, suffix: 'px' },
      { key: 'pagePaddingLeft', label: 'Page Padding Left', type: 'number', min: 0, max: 120, suffix: 'px' },
      { key: 'pageMarginTop', label: 'Page Margin Top', type: 'number', min: 0, max: 120, suffix: 'px' },
      { key: 'pageMarginRight', label: 'Page Margin Right', type: 'number', min: 0, max: 80, suffix: 'px' },
      { key: 'pageMarginBottom', label: 'Page Margin Bottom', type: 'number', min: 0, max: 120, suffix: 'px' },
      { key: 'pageMarginLeft', label: 'Page Margin Left', type: 'number', min: 0, max: 80, suffix: 'px' },
    ],
  },
  // ── Shape ────────────────────────────────────────────────────────────────────
  {
    title: 'Shape and Radii',
    subtitle: 'Border radii for panels, cards, navigation, buttons, inputs, images, and dropdowns.',
    fields: [
      { key: 'containerRadius', label: 'Panel Radius', type: 'number', min: 0, max: 48, suffix: 'px' },
      { key: 'cardRadius', label: 'Card Radius', type: 'number', min: 0, max: 48, suffix: 'px' },
      { key: 'containerPaddingInner', label: 'Panel Inner Padding', type: 'number', min: 8, max: 48, suffix: 'px' },
      { key: 'pillRadius', label: 'Navigation Pill Radius', type: 'number', min: 0, max: 999, suffix: 'px' },
      { key: 'btnRadius', label: 'Button Radius', type: 'number', min: 0, max: 999, suffix: 'px' },
      { key: 'inputRadius', label: 'Input Radius', type: 'number', min: 0, max: 999, suffix: 'px' },
      { key: 'imageRadius', label: 'Image Radius', type: 'number', min: 0, max: 48, suffix: 'px' },
      { key: 'dropdownRadius', label: 'Dropdown Radius', type: 'number', min: 0, max: 32, suffix: 'px' },
      { key: 'drawerRadius', label: 'Drawer Radius', type: 'number', min: 0, max: 32, suffix: 'px' },
      { key: 'borderRadius', label: 'Global Border Radius', type: 'number', min: 0, max: 32, suffix: 'px', helperText: 'Fallback radius for components without a specific override.' },
    ],
  },
  // ── Overlays ────────────────────────────────────────────────────────────────
  {
    title: 'Overlays, Drawers & Dropdowns',
    subtitle: 'Sidebar drawer, dropdown menus, modal overlays, shadows, and position.',
    fields: [
      { key: 'dropdownBg', label: 'Dropdown Background', type: 'color' },
      { key: 'dropdownBorder', label: 'Dropdown Border Color', type: 'color' },
      { key: 'dropdownBorderWidth', label: 'Dropdown Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'dropdownShadowOpacity', label: 'Dropdown Shadow Opacity', type: 'range', min: 0, max: 100, step: 5 },
      { key: 'dropdownShadowBlur', label: 'Dropdown Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
      { key: 'dropdownShadowY', label: 'Dropdown Shadow Y', type: 'number', min: 0, max: 40, suffix: 'px' },
      { key: 'drawerBg', label: 'Drawer Background', type: 'color' },
      { key: 'drawerBorderColor', label: 'Drawer Border Color', type: 'color' },
      { key: 'drawerBorderWidth', label: 'Drawer Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'drawerOverlayColor', label: 'Drawer Overlay', type: 'color' },
      { key: 'drawerWidth', label: 'Drawer Width', type: 'number', min: 240, max: 600, suffix: 'px' },
      { key: 'drawerPosition', label: 'Drawer Position', type: 'select', options: DRAWER_POSITION_OPTIONS },
      { key: 'drawerShadowOpacity', label: 'Drawer Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'drawerShadowBlur', label: 'Drawer Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
      { key: 'popupOverlayColor', label: 'Modal Overlay', type: 'color' },
      { key: 'popupRadius', label: 'Popup Radius', type: 'number', min: 0, max: 32, suffix: 'px' },
    ],
  },
  // ── Motion ──────────────────────────────────────────────────────────────────
  {
    title: 'Motion and Hover',
    subtitle: 'Transition speed, easing, scroll reveal, and hover interaction style.',
    fields: [
      { key: 'enableAnimations', label: 'Enable Animations', type: 'switch', helperText: 'Disabling removes all CSS transitions and motion effects.' },
      { key: 'animationDuration', label: 'Transition Duration', type: 'range', min: 80, max: 600, step: 20, suffix: 'ms' },
      { key: 'animationEasing', label: 'Easing Curve', type: 'select', options: ANIMATION_EASING_OPTIONS },
      { key: 'scrollReveal', label: 'Scroll Reveal', type: 'switch', helperText: 'Animate elements into view as the user scrolls down.' },
      { key: 'hoverEffect', label: 'Hover Effect', type: 'select', options: HOVER_EFFECT_OPTIONS },
      { key: 'hoverScale', label: 'Hover Scale', type: 'range', min: 1.0, max: 1.08, step: 0.005, helperText: 'Scale factor applied on hover (only when Hover Effect = Scale up).' },
    ],
  },
  // ── Content cards ────────────────────────────────────────────────────────────
  {
    title: 'Card Layout',
    subtitle: 'Content card style presets, image ratio, text alignment, and visibility toggles.',
    fields: [
      {
        key: 'cardStyle',
        label: 'Card Style',
        type: 'select',
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'clean', label: 'Clean (no border)' },
          { value: 'elevated', label: 'Elevated (shadow)' },
          { value: 'outlined', label: 'Outlined' },
          { value: 'ghost', label: 'Ghost (transparent)' },
        ],
      },
      {
        key: 'cardTextAlignment',
        label: 'Text Alignment',
        type: 'select',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
      },
      {
        key: 'cardImageRatio',
        label: 'Image Ratio',
        type: 'select',
        options: [
          { value: '1:1', label: '1:1 Square' },
          { value: '4:3', label: '4:3 Classic' },
          { value: '16:9', label: '16:9 Wide' },
          { value: '3:4', label: '3:4 Portrait' },
          { value: '2:3', label: '2:3 Tall portrait' },
        ],
      },
      { key: 'cardImagePadding', label: 'Image Padding', type: 'number', min: 0, max: 32, suffix: 'px' },
      { key: 'showBadge', label: 'Show Badges', type: 'switch', helperText: 'Display status/score badges on cards.' },
      { key: 'showQuickAdd', label: 'Show Quick-Add Button', type: 'switch', helperText: 'Show a quick-enroll or quick-add button on hover.' },
    ],
  },
  {
    title: 'Collection Cards',
    subtitle: 'Appearance of collection/category grid tiles.',
    fields: [
      {
        key: 'collectionStyle',
        label: 'Collection Style',
        type: 'select',
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'overlay', label: 'Overlay text' },
          { value: 'minimal', label: 'Minimal' },
        ],
      },
      {
        key: 'collectionRatio',
        label: 'Image Ratio',
        type: 'select',
        options: [
          { value: '1:1', label: '1:1 Square' },
          { value: '4:3', label: '4:3 Classic' },
          { value: '16:9', label: '16:9 Wide' },
          { value: '3:4', label: '3:4 Portrait' },
        ],
      },
      {
        key: 'collectionTextAlign',
        label: 'Text Alignment',
        type: 'select',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
      },
      { key: 'collectionImagePadding', label: 'Image Padding', type: 'number', min: 0, max: 32, suffix: 'px' },
      { key: 'collectionOverlay', label: 'Image Overlay', type: 'switch', helperText: 'Apply a colour overlay on top of collection images.' },
      { key: 'collectionOverlayColor', label: 'Overlay Colour', type: 'color' },
      { key: 'collectionRadius', label: 'Corner Radius', type: 'number', min: 0, max: 48, suffix: 'px' },
      { key: 'collectionBorderWidth', label: 'Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'collectionShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'collectionShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
    ],
  },
  {
    title: 'Blog / News Cards',
    subtitle: 'Style settings for blog posts and news article cards.',
    fields: [
      {
        key: 'blogStyle',
        label: 'Card Style',
        type: 'select',
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'horizontal', label: 'Horizontal' },
          { value: 'minimal', label: 'Minimal' },
        ],
      },
      {
        key: 'blogRatio',
        label: 'Image Ratio',
        type: 'select',
        options: [
          { value: '16:9', label: '16:9 Wide' },
          { value: '4:3', label: '4:3 Classic' },
          { value: '1:1', label: '1:1 Square' },
          { value: '3:2', label: '3:2 Photo' },
        ],
      },
      {
        key: 'blogTextAlignment',
        label: 'Text Alignment',
        type: 'select',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
        ],
      },
      { key: 'blogRadius', label: 'Corner Radius', type: 'number', min: 0, max: 48, suffix: 'px' },
      { key: 'blogShowDate', label: 'Show Date', type: 'switch' },
      { key: 'blogShowExcerpt', label: 'Show Excerpt', type: 'switch' },
      { key: 'blogExcerptLines', label: 'Excerpt Lines', type: 'number', min: 1, max: 6 },
      { key: 'blogImagePadding', label: 'Image Padding', type: 'number', min: 0, max: 32, suffix: 'px' },
      { key: 'blogBorderWidth', label: 'Border Width', type: 'number', min: 0, max: 4, suffix: 'px' },
      { key: 'blogShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'blogShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
    ],
  },
  // ── Media ────────────────────────────────────────────────────────────────────
  {
    title: 'Video',
    subtitle: 'Default aspect ratio for embedded video players.',
    fields: [
      {
        key: 'videoRatio',
        label: 'Video Aspect Ratio',
        type: 'select',
        options: [
          { value: '16:9', label: '16:9 Widescreen' },
          { value: '4:3', label: '4:3 Classic' },
          { value: '1:1', label: '1:1 Square' },
          { value: '9:16', label: '9:16 Vertical (mobile)' },
          { value: '21:9', label: '21:9 Cinematic' },
        ],
      },
    ],
  },
  // ── Search ───────────────────────────────────────────────────────────────────
  {
    title: 'Search',
    subtitle: 'Search input behaviour — placeholder text, trigger mode, and result limits.',
    fields: [
      { key: 'searchPlaceholder', label: 'Placeholder Text', type: 'text', placeholder: 'Search...' },
      {
        key: 'searchType',
        label: 'Trigger Mode',
        type: 'select',
        options: [
          { value: 'instant', label: 'Instant (as you type)' },
          { value: 'submit', label: 'On submit' },
        ],
      },
      { key: 'searchMinChars', label: 'Min Characters', type: 'number', min: 1, max: 5, helperText: 'Minimum characters before search fires.' },
      { key: 'searchMaxResults', label: 'Max Results', type: 'number', min: 3, max: 20 },
      { key: 'searchShowSuggestions', label: 'Show Suggestions', type: 'switch' },
      { key: 'searchShowVendor', label: 'Show Author / Vendor', type: 'switch' },
      { key: 'searchShowPrice', label: 'Show Price', type: 'switch' },
    ],
  },
  // ── Brand ────────────────────────────────────────────────────────────────────
  {
    title: 'Brand Identity',
    subtitle: 'Brand name and tagline displayed in the storefront shell.',
    fields: [
      { key: 'brandName', label: 'Brand Name', type: 'text', placeholder: 'Kangur' },
      { key: 'brandTagline', label: 'Tagline', type: 'text', placeholder: 'Learn smarter.' },
      { key: 'brandEmail', label: 'Contact Email', type: 'email', placeholder: 'hello@kangur.app' },
      { key: 'brandFooterHeadline', label: 'Footer Headline', type: 'text' },
      { key: 'brandFooterDescription', label: 'Footer Description', type: 'textarea', placeholder: 'Short footer blurb shown to learners.' },
    ],
  },
  // ── Custom ──────────────────────────────────────────────────────────────────
  {
    title: 'Custom CSS',
    subtitle: 'Inject scoped CSS that applies only within the Kangur storefront shell.',
    fields: [
      {
        key: 'customCss',
        label: 'Custom CSS',
        type: 'textarea',
        placeholder: '/* e.g. .kangur-page { ... } */',
        helperText: 'Use standard CSS selectors. Changes apply after Save.',
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BUILTIN_DAILY_ID = '__daily__';
const BUILTIN_NIGHTLY_ID = '__nightly__';
const FACTORY_DAILY_ID = '__factory_daily__';
const FACTORY_NIGHTLY_ID = '__factory_nightly__';

const SECTION_CARD_CLASS = 'rounded-2xl border-border/60 bg-card/40 shadow-sm';

type ThemeSelectionId = string; // '__daily__' | '__nightly__' | '__factory_*' | catalog-entry-id

// ─── Slot assignment tracking ────────────────────────────────────────────────
// Stores which named catalog theme is currently assigned to each slot.
// Null / missing means the slot is using the factory/builtin settings.

const KANGUR_SLOT_ASSIGNMENTS_KEY = 'kangur_cms_slot_assignments_v1';

type SlotAssignment = { id: string; name: string };
type SlotAssignments = {
  daily?: SlotAssignment | null;
  nightly?: SlotAssignment | null;
};

const parseSlotAssignments = (raw: string | null | undefined): SlotAssignments => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as SlotAssignments;
    }
  } catch {
    // ignore malformed
  }
  return {};
};

// ─── Live preview panel ───────────────────────────────────────────────────────

type PreviewMode = 'default' | 'dark';

function KangurThemePreviewPanel({
  draft,
  previewMode,
  onModeChange,
}: {
  draft: ThemeSettings;
  previewMode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
}): React.JSX.Element {
  const appearance = useMemo(
    () => resolveKangurStorefrontAppearance(previewMode, draft),
    [previewMode, draft]
  );

  const sceneStyle: React.CSSProperties = {
    ...(appearance.vars as React.CSSProperties),
    background: appearance.background,
  };

  const navStyle: React.CSSProperties = {
    background: 'var(--kangur-nav-group-background)',
    border: '1px solid var(--kangur-nav-group-border)',
    borderRadius: 'var(--kangur-nav-group-radius)',
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const pillBase: React.CSSProperties = {
    borderRadius: 'var(--kangur-nav-item-radius)',
    paddingTop: 'var(--kangur-pill-padding-y)',
    paddingBottom: 'var(--kangur-pill-padding-y)',
    paddingLeft: 'var(--kangur-pill-padding-x)',
    paddingRight: 'var(--kangur-pill-padding-x)',
    fontSize: 'var(--kangur-pill-font-size)',
    cursor: 'default',
    whiteSpace: 'nowrap' as const,
  };

  const pillActive: React.CSSProperties = {
    ...pillBase,
    background: 'var(--kangur-nav-item-active-background)',
    color: 'var(--kangur-nav-item-active-text)',
  };

  const pillInactive: React.CSSProperties = {
    ...pillBase,
    background: 'transparent',
    color: 'var(--kangur-nav-item-text)',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--kangur-soft-card-background)',
    border: '1px solid var(--kangur-soft-card-border)',
    borderRadius: 'var(--kangur-card-radius)',
    padding: 'var(--kangur-card-padding-md)',
    boxShadow: 'var(--kangur-soft-card-shadow)',
  };

  const btnPrimary: React.CSSProperties = {
    background: 'var(--kangur-button-primary-background)',
    color: draft.btnPrimaryText,
    borderRadius: 'var(--kangur-button-radius)',
    paddingTop: 'var(--kangur-button-padding-y)',
    paddingBottom: 'var(--kangur-button-padding-y)',
    paddingLeft: 'var(--kangur-button-padding-x)',
    paddingRight: 'var(--kangur-button-padding-x)',
    fontSize: 'var(--kangur-button-font-size)',
    border: 'none',
    cursor: 'default',
    display: 'inline-block',
    whiteSpace: 'nowrap' as const,
  };

  const btnSecondary: React.CSSProperties = {
    background: 'var(--kangur-button-secondary-background)',
    color: 'var(--kangur-button-secondary-text)',
    borderRadius: 'var(--kangur-button-radius)',
    paddingTop: 'var(--kangur-button-padding-y)',
    paddingBottom: 'var(--kangur-button-padding-y)',
    paddingLeft: 'var(--kangur-button-padding-x)',
    paddingRight: 'var(--kangur-button-padding-x)',
    fontSize: 'var(--kangur-button-font-size)',
    border: 'none',
    cursor: 'default',
    display: 'inline-block',
    whiteSpace: 'nowrap' as const,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--kangur-text-field-background)',
    border: '1px solid var(--kangur-text-field-border)',
    borderRadius: 'var(--kangur-input-radius)',
    height: 'var(--kangur-input-height)',
    fontSize: 'var(--kangur-input-font-size)',
    color: 'var(--kangur-text-field-placeholder)',
    padding: '0 16px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div className='overflow-hidden rounded-2xl border border-border/60 shadow-md'>
      {/* mode toggle header */}
      <div className='flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2'>
        <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Live Preview
        </span>
        <div className='flex rounded-full border border-border/60 bg-background/60 p-0.5'>
          {(['default', 'dark'] as PreviewMode[]).map((m) => (
            <button
              key={m}
              type='button'
              onClick={() => onModeChange(m)}
              className={[
                'rounded-full px-3 py-0.5 text-xs font-medium transition-colors',
                previewMode === m
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {m === 'default' ? 'Daily' : 'Nightly'}
            </button>
          ))}
        </div>
      </div>

      {/* preview scene */}
      <div style={sceneStyle} className='space-y-3 p-4' role='img' aria-label='Theme preview'>
        {/* nav bar */}
        <div style={navStyle}>
          <span
            style={{
              color: 'var(--kangur-page-text)',
              fontWeight: 700,
              fontSize: 14,
              marginRight: 6,
              whiteSpace: 'nowrap',
            }}
          >
            Kangur
          </span>
          {['Kursy', 'Testy', 'Wyniki'].map((label, i) => (
            <span key={label} style={i === 0 ? pillActive : pillInactive}>
              {label}
            </span>
          ))}
        </div>

        {/* card */}
        <div style={cardStyle}>
          <h3
            style={{
              color: 'var(--kangur-soft-card-text)',
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 6,
            }}
          >
            Matematyka — klasa 4
          </h3>
          <p
            style={{
              color: 'var(--kangur-page-muted-text)',
              fontSize: 13,
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Ułamki i działania na ułamkach.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={btnPrimary}>Zacznij naukę</span>
            <span style={btnSecondary}>Wyniki</span>
          </div>
        </div>

        {/* input */}
        <input
          readOnly
          tabIndex={-1}
          placeholder='Wyszukaj ćwiczenie…'
          style={inputStyle}
          aria-label='preview input'
        />

        {/* second card – lighter content card */}
        <div
          style={{
            ...cardStyle,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--kangur-button-primary-background)',
              flexShrink: 0,
            }}
          />
          <div>
            <p
              style={{
                color: 'var(--kangur-soft-card-text)',
                fontSize: 13,
                fontWeight: 600,
                margin: 0,
              }}
            >
              Anna Kowalska
            </p>
            <p
              style={{
                color: 'var(--kangur-page-muted-text)',
                fontSize: 11,
                margin: 0,
              }}
            >
              Postęp: 74%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const resolveDefaultForBuiltin = (id: ThemeSelectionId): ThemeSettings =>
  id === BUILTIN_NIGHTLY_ID ? KANGUR_DEFAULT_THEME : KANGUR_DEFAULT_DAILY_THEME;

const resolveFactoryTheme = (id: ThemeSelectionId): ThemeSettings =>
  id === FACTORY_NIGHTLY_ID ? KANGUR_FACTORY_NIGHTLY_THEME : KANGUR_FACTORY_DAILY_THEME;

// ─── Slot status badge ────────────────────────────────────────────────────────

function SlotStatusBadge({
  slotLabel,
  themeLabel,
  isActive,
}: {
  slotLabel: string;
  themeLabel: string;
  isActive: boolean;
}): React.JSX.Element {
  return (
    <span className='flex items-center gap-1.5 text-xs'>
      <span className='text-muted-foreground'>{slotLabel}:</span>
      <span
        className={[
          'rounded-full px-2 py-0.5 font-medium',
          isActive
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : themeLabel === 'Fabryczny'
              ? 'bg-muted/60 text-muted-foreground'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        ].join(' ')}
      >
        {themeLabel}{isActive ? ' \u2713' : ''}
      </span>
    </span>
  );
}

// ─── Create Theme Dialog ─────────────────────────────────────────────────────

type StartFrom = 'daily' | 'nightly' | 'current';

const START_FROM_OPTIONS: Array<{ value: StartFrom; label: string }> = [
  { value: 'current', label: 'Current draft settings' },
  { value: 'daily', label: 'Daily factory default' },
  { value: 'nightly', label: 'Nightly factory default' },
];

function CreateThemeDialog({
  open,
  currentDraft,
  isSaving,
  onClose,
  onCreate,
}: {
  open: boolean;
  currentDraft: ThemeSettings;
  isSaving: boolean;
  onClose: () => void;
  onCreate: (name: string, baseSettings: ThemeSettings) => void;
}): React.JSX.Element {
  const [name, setName] = useState('');
  const [startFrom, setStartFrom] = useState<StartFrom>('current');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setStartFrom('current');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleCreate = (): void => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const base =
      startFrom === 'daily'
        ? KANGUR_DEFAULT_DAILY_THEME
        : startFrom === 'nightly'
          ? KANGUR_DEFAULT_THEME
          : currentDraft;
    onCreate(trimmed, base);
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title='New theme'
      subtitle='Create a named theme you can apply as daily or nightly.'
      onSave={handleCreate}
      isSaving={isSaving}
      isSaveDisabled={!name.trim()}
      saveText='Create theme'
      size='sm'
    >
      <div className='space-y-4'>
        <FormField label='Theme name' description='A short, recognisable label for this theme.'>
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. Summer campaign'
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) handleCreate();
            }}
          />
        </FormField>
        <FormField label='Start from' description='Choose which base theme to copy settings from.'>
          <SelectSimple
            value={startFrom}
            onValueChange={(v) => setStartFrom(v as StartFrom)}
            options={START_FROM_OPTIONS}
            ariaLabel='Start theme from'
            variant='subtle'
          />
        </FormField>
      </div>
    </FormModal>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function AdminKangurAppearancePage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  // ── catalog ──────────────────────────────────────────────────────────────
  const catalog = useMemo(
    () => parseKangurThemeCatalog(settingsStore.get(KANGUR_THEME_CATALOG_KEY)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settingsStore.get(KANGUR_THEME_CATALOG_KEY)]
  );

  // ── slot assignments ──────────────────────────────────────────────────────
  const slotAssignments = useMemo(
    () => parseSlotAssignments(settingsStore.get(KANGUR_SLOT_ASSIGNMENTS_KEY)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settingsStore.get(KANGUR_SLOT_ASSIGNMENTS_KEY)]
  );

  const dailySlotLabel = useMemo(() => {
    const raw = settingsStore.get(KANGUR_DAILY_THEME_SETTINGS_KEY);
    if (!raw?.trim() || !slotAssignments.daily) return 'Fabryczny';
    return slotAssignments.daily.name;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotAssignments, settingsStore.get(KANGUR_DAILY_THEME_SETTINGS_KEY)]);

  const nightlySlotLabel = useMemo(() => {
    const raw = settingsStore.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY);
    if (!raw?.trim() || !slotAssignments.nightly) return 'Fabryczny';
    return slotAssignments.nightly.name;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotAssignments, settingsStore.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY)]);

  // ── selected theme ────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<ThemeSelectionId>(BUILTIN_DAILY_ID);

  const isFactory = selectedId === FACTORY_DAILY_ID || selectedId === FACTORY_NIGHTLY_ID;
  const isBuiltin = selectedId === BUILTIN_DAILY_ID || selectedId === BUILTIN_NIGHTLY_ID;

  const loadTheme = useCallback(
    (id: ThemeSelectionId): ThemeSettings => {
      if (id === FACTORY_DAILY_ID || id === FACTORY_NIGHTLY_ID) {
        return resolveFactoryTheme(id);
      }
      if (id === BUILTIN_DAILY_ID) {
        return (
          parseKangurThemeSettings(settingsStore.get(KANGUR_DAILY_THEME_SETTINGS_KEY)) ??
          KANGUR_DEFAULT_DAILY_THEME
        );
      }
      if (id === BUILTIN_NIGHTLY_ID) {
        return (
          parseKangurThemeSettings(settingsStore.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY)) ??
          KANGUR_DEFAULT_THEME
        );
      }
      const entry = catalog.find((e) => e.id === id);
      return entry
        ? normalizeThemeSettings(entry.settings, KANGUR_DEFAULT_DAILY_THEME)
        : KANGUR_DEFAULT_DAILY_THEME;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      catalog,
      settingsStore.get(KANGUR_DAILY_THEME_SETTINGS_KEY),
      settingsStore.get(KANGUR_NIGHTLY_THEME_SETTINGS_KEY),
    ]
  );

  // ── draft state ───────────────────────────────────────────────────────────
  const [draft, setDraft] = useState<ThemeSettings>(() => loadTheme(BUILTIN_DAILY_ID));
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── preview mode ──────────────────────────────────────────────────────────
  const [previewMode, setPreviewMode] = useState<PreviewMode>(
    selectedId === BUILTIN_NIGHTLY_ID || selectedId === FACTORY_NIGHTLY_ID ? 'dark' : 'default'
  );

  // Reload draft when selection changes (and confirm unsaved changes if dirty)
  const switchSelection = useCallback(
    (nextId: ThemeSelectionId): void => {
      setSelectedId(nextId);
      setDraft(loadTheme(nextId));
      setIsDirty(false);
    },
    [loadTheme]
  );

  // ── field update ──────────────────────────────────────────────────────────
  const handleFieldChange = useCallback((values: Partial<ThemeSettings>): void => {
    setDraft((prev) => ({ ...prev, ...values }));
    setIsDirty(true);
  }, []);

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (): Promise<void> => {
    if (isFactory) {
      toast('Motyw fabryczny jest tylko do odczytu.', { variant: 'info' });
      return;
    }
    setIsSaving(true);
    try {
      if (selectedId === BUILTIN_DAILY_ID) {
        await updateSetting.mutateAsync({
          key: KANGUR_DAILY_THEME_SETTINGS_KEY,
          value: serializeSetting(draft),
        });
        // Clear daily slot assignment — the slot is now the directly-edited builtin theme
        if (slotAssignments.daily) {
          await updateSetting.mutateAsync({
            key: KANGUR_SLOT_ASSIGNMENTS_KEY,
            value: serializeSetting({ ...slotAssignments, daily: null }),
          });
        }
        toast('Motyw dzienny zapisany.', { variant: 'success' });
      } else if (selectedId === BUILTIN_NIGHTLY_ID) {
        await updateSetting.mutateAsync({
          key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
          value: serializeSetting(draft),
        });
        // Clear nightly slot assignment
        if (slotAssignments.nightly) {
          await updateSetting.mutateAsync({
            key: KANGUR_SLOT_ASSIGNMENTS_KEY,
            value: serializeSetting({ ...slotAssignments, nightly: null }),
          });
        }
        toast('Motyw nocny zapisany.', { variant: 'success' });
      } else {
        // Catalog theme: update the entry in the array
        const updatedCatalog = catalog.map((e) =>
          e.id === selectedId
            ? { ...e, settings: draft, updatedAt: new Date().toISOString() }
            : e
        );
        await updateSetting.mutateAsync({
          key: KANGUR_THEME_CATALOG_KEY,
          value: serializeSetting(updatedCatalog),
        });
        toast('Motyw zapisany.', { variant: 'success' });
      }
      setIsDirty(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Nie udało się zapisać motywu.', {
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [catalog, draft, isFactory, selectedId, slotAssignments, toast, updateSetting]);

  // ── assign as daily/nightly ───────────────────────────────────────────────
  const handleAssign = useCallback(
    async (slot: 'daily' | 'nightly'): Promise<void> => {
      setIsSaving(true);
      try {
        await updateSetting.mutateAsync({
          key: getKangurThemeSettingsKeyForAppearanceMode(slot === 'daily' ? 'default' : 'dark'),
          value: serializeSetting(draft),
        });
        // Record which named theme is now assigned to this slot
        const assignedEntry = catalog.find((e) => e.id === selectedId);
        const assignmentName = assignedEntry?.name ?? selectedId;
        await updateSetting.mutateAsync({
          key: KANGUR_SLOT_ASSIGNMENTS_KEY,
          value: serializeSetting({
            ...slotAssignments,
            [slot]: { id: selectedId, name: assignmentName },
          }),
        });
        toast(
          slot === 'daily'
            ? 'Motyw ustawiony jako dzienny.'
            : 'Motyw ustawiony jako nocny.',
          { variant: 'success' }
        );
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Nie udało się przypisać motywu.', {
          variant: 'error',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [catalog, draft, selectedId, slotAssignments, toast, updateSetting]
  );

  // ── reset to defaults ─────────────────────────────────────────────────────
  const handleReset = useCallback((): void => {
    if (isFactory) {
      setDraft(resolveFactoryTheme(selectedId));
      setIsDirty(false);
      return;
    }
    const defaults = isBuiltin
      ? resolveDefaultForBuiltin(selectedId)
      : KANGUR_DEFAULT_DAILY_THEME;
    setDraft(defaults);
    setIsDirty(true);
  }, [isBuiltin, isFactory, selectedId]);

  // ── create new theme ──────────────────────────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = useCallback(
    async (name: string, baseSettings: ThemeSettings): Promise<void> => {
      setIsCreating(true);
      try {
        const now = new Date().toISOString();
        const newEntry: KangurThemeCatalogEntry = {
          id: crypto.randomUUID(),
          name,
          settings: baseSettings,
          createdAt: now,
          updatedAt: now,
        };
        const updatedCatalog = [...catalog, newEntry];
        await updateSetting.mutateAsync({
          key: KANGUR_THEME_CATALOG_KEY,
          value: serializeSetting(updatedCatalog),
        });
        setCreateDialogOpen(false);
        switchSelection(newEntry.id);
        toast(`Motyw "${name}" utworzony.`, { variant: 'success' });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Nie udało się utworzyć motywu.', {
          variant: 'error',
        });
      } finally {
        setIsCreating(false);
      }
    },
    [catalog, switchSelection, toast, updateSetting]
  );

  // ── delete catalog theme ──────────────────────────────────────────────────
  const handleDelete = useCallback(async (): Promise<void> => {
    if (isBuiltin || isFactory) return;
    setIsSaving(true);
    try {
      const updatedCatalog = catalog.filter((e) => e.id !== selectedId);
      await updateSetting.mutateAsync({
        key: KANGUR_THEME_CATALOG_KEY,
        value: serializeSetting(updatedCatalog),
      });
      switchSelection(BUILTIN_DAILY_ID);
      toast('Motyw usunięty.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Nie udało się usunąć motywu.', {
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [catalog, isBuiltin, isFactory, selectedId, switchSelection, toast, updateSetting]);

  // ── selector options ──────────────────────────────────────────────────────
  const selectorOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [
      { value: FACTORY_DAILY_ID, label: 'Motyw dzienny (fabryczny)' },
      { value: FACTORY_NIGHTLY_ID, label: 'Motyw nocny (fabryczny)' },
      { value: BUILTIN_DAILY_ID, label: 'Motyw dzienny (wbudowany)' },
      { value: BUILTIN_NIGHTLY_ID, label: 'Motyw nocny (wbudowany)' },
    ];
    if (catalog.length > 0) {
      catalog.forEach((e) => opts.push({ value: e.id, label: e.name }));
    }
    return opts;
  }, [catalog]);

  const selectedLabel = selectorOptions.find((o) => o.value === selectedId)?.label ?? '';

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <KangurAdminContentShell
        title='Kangur Appearance'
        description='Theme editor and catalog for daily and nightly defaults.'
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Kangur', href: '/admin/kangur' },
          { label: 'Settings', href: '/admin/kangur/settings' },
          { label: 'Appearance' },
        ]}
        headerActions={
          <>
            <Button asChild variant='outline' size='sm'>
              <Link href='/admin/kangur/settings'>Back to Settings</Link>
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!isDirty || isSaving || isFactory}
              size='sm'
            >
              {isSaving ? 'Zapisuję...' : 'Zapisz motyw'}
            </Button>
          </>
        }
      >
        <div className='xl:grid xl:grid-cols-[1fr_340px] xl:gap-6'>
          {/* ── Left column: editor ── */}
          <div className='space-y-6'>
          {/* ── Theme selector bar ── */}
          <Card variant='subtle' padding='md' className={SECTION_CARD_CLASS}>
            <div className='flex flex-wrap items-end gap-3'>
              <div className='flex-1 min-w-[220px]'>
                <div className='mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  Wybrany motyw
                </div>
                <SelectSimple
                  value={selectedId}
                  onValueChange={(v) => {
                    if (v !== selectedId) switchSelection(v);
                  }}
                  options={selectorOptions}
                  ariaLabel='Wybrany motyw'
                  variant='subtle'
                  className='w-full'
                />
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setCreateDialogOpen(true)}
                disabled={isSaving}
              >
                + Nowy motyw
              </Button>
              {isDirty && (
                <span className='rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400'>
                  Niezapisane zmiany
                </span>
              )}
            </div>
          </Card>

          {/* ── Assign bar (shown for catalog themes) ── */}
          {!isBuiltin && (
            <Card variant='subtle' padding='md' className={SECTION_CARD_CLASS}>
              <div className='flex flex-wrap items-center gap-3'>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-foreground'>
                    Przypisz motyw <span className='text-muted-foreground'>„{selectedLabel}"</span>
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Zastosuj bieżące ustawienia tego motywu jako domyślny motyw dzienny lub nocny.
                  </p>
                  <div className='mt-2.5 flex flex-wrap gap-3'>
                    <SlotStatusBadge
                      slotLabel='Dzienny'
                      themeLabel={dailySlotLabel}
                      isActive={slotAssignments.daily?.id === selectedId}
                    />
                    <SlotStatusBadge
                      slotLabel='Nocny'
                      themeLabel={nightlySlotLabel}
                      isActive={slotAssignments.nightly?.id === selectedId}
                    />
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={isSaving}
                    onClick={() => void handleAssign('daily')}
                  >
                    Ustaw dzienny
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={isSaving}
                    onClick={() => void handleAssign('nightly')}
                  >
                    Ustaw nocny
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={isSaving}
                    onClick={() => void handleDelete()}
                    className='text-destructive hover:text-destructive'
                  >
                    Usuń
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ── Info for built-in themes ── */}
          {isBuiltin && (
            <Alert variant='info'>
              {selectedId === BUILTIN_DAILY_ID
                ? 'Edytujesz motyw dzienny — jest on aktywny dla użytkowników w trybie dziennym. Kliknij „Zapisz motyw" aby zapisać zmiany.'
                : 'Edytujesz motyw nocny — jest on aktywny dla użytkowników w trybie nocnym. Kliknij „Zapisz motyw" aby zapisać zmiany.'}
            </Alert>
          )}
          {isFactory && (
            <Alert variant='info'>
              To fabryczny motyw Kangura (commit d932510...). Jest tylko do odczytu — użyj „Nowy motyw”
              aby skopiować ustawienia lub przypisz go jako dzienny/nocny.
            </Alert>
          )}

          {/* ── Theme field sections ── */}
          {THEME_SECTIONS.map((section) => (
            <FormSection
              key={section.title}
              title={section.title}
              subtitle={section.subtitle}
              variant='subtle'
              className='border border-border/60 bg-card/20'
            >
              <SettingsFieldsRenderer
                fields={section.fields}
                values={draft}
                onChange={handleFieldChange}
                disabled={isSaving || isFactory}
              />
            </FormSection>
          ))}

          {/* ── Bottom action bar ── */}
          <Card variant='subtle' padding='md' className={SECTION_CARD_CLASS}>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <Button
                variant='ghost'
                size='sm'
                disabled={isSaving || isFactory}
                onClick={handleReset}
              >
                Przywróć domyślne
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={!isDirty || isSaving || isFactory}
              >
                {isSaving ? 'Zapisuję...' : 'Zapisz motyw'}
              </Button>
            </div>
          </Card>
          </div>{/* end left column */}

          {/* ── Right column: live preview ── */}
          <div className='hidden xl:sticky xl:top-4 xl:block xl:self-start'>
            <KangurThemePreviewPanel
              draft={draft}
              previewMode={previewMode}
              onModeChange={setPreviewMode}
            />
          </div>
        </div>
      </KangurAdminContentShell>

      {/* ── Create theme dialog ── */}
      <CreateThemeDialog
        open={createDialogOpen}
        currentDraft={draft}
        isSaving={isCreating}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={(name, base) => void handleCreate(name, base)}
      />
    </>
  );
}
