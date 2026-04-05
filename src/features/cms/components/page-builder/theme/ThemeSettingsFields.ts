import React from 'react';

import type { ThemeSettings, ColorScheme } from '@/shared/contracts/cms-theme';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

const THEME_ANIMATION_EASING_OPTIONS = [
  { label: 'Ease out', value: 'ease-out' },
  { label: 'Ease in-out', value: 'ease-in-out' },
  { label: 'Ease in', value: 'ease-in' },
  { label: 'Linear', value: 'linear' },
  { label: 'Spring', value: 'cubic-bezier(.68,-0.55,.27,1.55)' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_HOVER_EFFECT_OPTIONS = [
  { label: 'Vertical lift', value: 'vertical-lift' },
  { label: '3D lift', value: 'lift-3d' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_SHADOW_PRESET_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_VIDEO_RATIO_OPTIONS = [
  { label: '16:9', value: '16:9' },
  { label: '4:3', value: '4:3' },
  { label: '1:1', value: '1:1' },
  { label: '9:16 Vertical', value: '9:16' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_DRAWER_POSITION_OPTIONS = [
  { label: 'Right', value: 'right' },
  { label: 'Left', value: 'left' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_BADGE_POSITION_OPTIONS = [
  { label: 'Top left', value: 'top-left' },
  { label: 'Top right', value: 'top-right' },
  { label: 'Bottom left', value: 'bottom-left' },
  { label: 'Bottom right', value: 'bottom-right' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_CURRENCY_OPTIONS = [
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'CAD (C$)', value: 'CAD' },
  { label: 'AUD (A$)', value: 'AUD' },
  { label: 'JPY (¥)', value: 'JPY' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_CURRENCY_POSITION_OPTIONS = [
  { label: 'Before ($10)', value: 'before' },
  { label: 'After (10$)', value: 'after' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_CART_STYLE_OPTIONS = [
  { label: 'Drawer', value: 'drawer' },
  { label: 'Page', value: 'page' },
  { label: 'Popup notification', value: 'dropdown' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_CART_ICON_STYLE_OPTIONS = [
  { label: 'Bag', value: 'bag' },
  { label: 'Cart', value: 'cart' },
  { label: 'Basket', value: 'basket' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const THEME_STOREFRONT_APPEARANCE_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Dark', value: 'dark' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const getFieldsForSection = (
  section: string,
  theme: ThemeSettings,
  themePresetOptions: Array<LabeledOptionDto<string>>
): SettingsPanelField<ThemeSettings>[] => {
  switch (section) {
    case 'Global Settings':
      return [
        {
          key: 'maxContentWidth',
          label: 'Page width',
          type: 'range',
          min: 800,
          max: 1600,
          suffix: 'px',
        },
        { key: 'enableAnimations', label: 'Enable animations', type: 'checkbox' },
        ...(theme.enableAnimations
          ? ([
            {
              key: 'animationDuration',
              label: 'Duration',
              type: 'range',
              min: 100,
              max: 1000,
              suffix: 'ms',
            },
            {
              key: 'animationEasing',
              label: 'Easing',
              type: 'select',
              options: THEME_ANIMATION_EASING_OPTIONS,
            },
            { key: 'scrollReveal', label: 'Reveal sections on scroll', type: 'checkbox' },
            {
              key: 'hoverEffect',
              label: 'Hover effect',
              type: 'select',
              options: THEME_HOVER_EFFECT_OPTIONS,
            },
            {
              key: 'hoverScale',
              label: 'Hover scale',
              type: 'range',
              min: 1,
              max: 1.2,
              step: 0.01,
              suffix: 'x',
            },
          ] as SettingsPanelField<ThemeSettings>[])
          : []),
      ];

    case 'Variant Pills':
      return [
        {
          key: 'pillRadius',
          label: 'Corner radius',
          type: 'number',
          min: 0,
          max: 999,
          suffix: 'px',
        },
        {
          key: 'pillPaddingX',
          label: 'Padding X',
          type: 'number',
          min: 4,
          max: 32,
          suffix: 'px',
        },
        {
          key: 'pillPaddingY',
          label: 'Padding Y',
          type: 'number',
          min: 2,
          max: 16,
          suffix: 'px',
        },
        {
          key: 'pillFontSize',
          label: 'Font size',
          type: 'number',
          min: 10,
          max: 18,
          suffix: 'px',
        },
        { key: 'pillBg', label: 'Background Color', type: 'color' },
        { key: 'pillText', label: 'Text Color', type: 'color' },
        { key: 'pillActiveBg', label: 'Active Background', type: 'color' },
        { key: 'pillActiveText', label: 'Active Text', type: 'color' },
        { key: 'pillBorderColor', label: 'Border Color', type: 'color' },
        {
          key: 'pillBorderWidth',
          label: 'Border Thickness',
          type: 'number',
          min: 0,
          max: 8,
          suffix: 'px',
        },
        {
          key: 'pillBorderOpacity',
          label: 'Border Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'pillShadowOpacity',
          label: 'Shadow Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'pillShadowX',
          label: 'Shadow X',
          type: 'number',
          min: -20,
          max: 20,
          suffix: 'px',
        },
        {
          key: 'pillShadowY',
          label: 'Shadow Y',
          type: 'number',
          min: -20,
          max: 20,
          suffix: 'px',
        },
        {
          key: 'pillShadowBlur',
          label: 'Shadow Blur',
          type: 'number',
          min: 0,
          max: 40,
          suffix: 'px',
        },
      ];

    case 'Inputs':
      return [
        { key: 'inputHeight', label: 'Height', type: 'number', min: 28, max: 56, suffix: 'px' },
        {
          key: 'inputFontSize',
          label: 'Font size',
          type: 'number',
          min: 10,
          max: 20,
          suffix: 'px',
        },
        { key: 'inputBg', label: 'Background Color', type: 'color' },
        { key: 'inputText', label: 'Text Color', type: 'color' },
        { key: 'inputFocusBorder', label: 'Focus border', type: 'color' },
        { key: 'inputPlaceholder', label: 'Placeholder Color', type: 'color' },
        { key: 'inputBorderColor', label: 'Border Color', type: 'color' },
        {
          key: 'inputBorderWidth',
          label: 'Border Thickness',
          type: 'number',
          min: 0,
          max: 8,
          suffix: 'px',
        },
        {
          key: 'inputBorderOpacity',
          label: 'Border Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'inputRadius',
          label: 'Corner radius',
          type: 'number',
          min: 0,
          max: 24,
          suffix: 'px',
        },
        {
          key: 'inputShadowOpacity',
          label: 'Shadow Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'inputShadowX',
          label: 'Shadow X',
          type: 'number',
          min: -20,
          max: 20,
          suffix: 'px',
        },
        {
          key: 'inputShadowY',
          label: 'Shadow Y',
          type: 'number',
          min: -20,
          max: 20,
          suffix: 'px',
        },
        {
          key: 'inputShadowBlur',
          label: 'Shadow Blur',
          type: 'number',
          min: 0,
          max: 40,
          suffix: 'px',
        },
      ];

    case 'Content Containers':
      return [
        { key: 'containerBg', label: 'Background Color', type: 'color' },
        { key: 'containerBorderColor', label: 'Border color', type: 'color' },
        {
          key: 'containerRadius',
          label: 'Radius',
          type: 'number',
          min: 0,
          max: 24,
          suffix: 'px',
        },
        {
          key: 'containerPaddingInner',
          label: 'Inner padding',
          type: 'number',
          min: 8,
          max: 64,
          suffix: 'px',
        },
        {
          key: 'containerShadow',
          label: 'Shadow',
          type: 'select',
          options: THEME_SHADOW_PRESET_OPTIONS,
        },
        {
          key: 'containerBorderWidth',
          label: 'Border Thickness',
          type: 'number',
          min: 0,
          max: 8,
          suffix: 'px',
        },
        {
          key: 'containerBorderOpacity',
          label: 'Border Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'containerBorderRadius',
          label: 'Border Corner radius',
          type: 'number',
          min: 0,
          max: 48,
          suffix: 'px',
        },
        {
          key: 'containerShadowOpacity',
          label: 'Shadow Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'containerShadowX',
          label: 'Shadow X',
          type: 'number',
          min: -20,
          max: 20,
          suffix: 'px',
        },
        {
          key: 'containerShadowY',
          label: 'Shadow Y',
          type: 'number',
          min: -20,
          max: 20,
          suffix: 'px',
        },
        {
          key: 'containerShadowBlur',
          label: 'Shadow Blur',
          type: 'number',
          min: 0,
          max: 40,
          suffix: 'px',
        },
      ];

    case 'Media':
      return [
        { key: 'imagePlaceholderBg', label: 'Placeholder bg', type: 'color' },
        {
          key: 'videoRatio',
          label: 'Video ratio',
          type: 'select',
          options: THEME_VIDEO_RATIO_OPTIONS,
        },
        { key: 'imageBorderColor', label: 'Border color', type: 'color' },
        {
          key: 'imageBorderWidth',
          label: 'Border Thickness',
          type: 'number',
          min: 0,
          max: 8,
          suffix: 'px',
        },
        {
          key: 'imageBorderOpacity',
          label: 'Border Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'imageRadius',
          label: 'Corner radius',
          type: 'number',
          min: 0,
          max: 48,
          suffix: 'px',
        },
        {
          key: 'imageShadowOpacity',
          label: 'Shadow Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'imageShadowX',
          label: 'Shadow X',
          type: 'number',
          min: -20,
          max: 20,
          suffix: 'px',
        },
        {
          key: 'imageShadowY',
          label: 'Shadow Y',
          type: 'number',
          min: -20,
          max: 20,
          suffix: 'px',
        },
        {
          key: 'imageShadowBlur',
          label: 'Shadow Blur',
          type: 'number',
          min: 0,
          max: 40,
          suffix: 'px',
        },
      ];

    case 'Dropdowns and pop-ups':
      return [
        { key: 'dropdownBg', label: 'Dropdown bg', type: 'color' },
        { key: 'popupOverlayColor', label: 'Popup overlay', type: 'color' },
        { key: 'dropdownBorder', label: 'Border color', type: 'color' },
        {
          key: 'dropdownBorderWidth',
          label: 'Border Thickness',
          type: 'number',
          min: 0,
          max: 8,
          suffix: 'px',
        },
        {
          key: 'dropdownBorderOpacity',
          label: 'Border Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'dropdownRadius',
          label: 'Dropdown radius',
          type: 'number',
          min: 0,
          max: 24,
          suffix: 'px',
        },
        {
          key: 'popupRadius',
          label: 'Popup radius',
          type: 'number',
          min: 0,
          max: 32,
          suffix: 'px',
        },
        {
          key: 'dropdownShadow',
          label: 'Shadow Preset',
          type: 'select',
          options: THEME_SHADOW_PRESET_OPTIONS,
        },
        {
          key: 'dropdownShadowOpacity',
          label: 'Shadow Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'dropdownShadowX',
          label: 'Shadow X',
          type: 'number',
          min: -30,
          max: 30,
          suffix: 'px',
        },
        {
          key: 'dropdownShadowY',
          label: 'Shadow Y',
          type: 'number',
          min: -30,
          max: 30,
          suffix: 'px',
        },
        {
          key: 'dropdownShadowBlur',
          label: 'Shadow Blur',
          type: 'number',
          min: 0,
          max: 60,
          suffix: 'px',
        },
      ];

    case 'Drawers':
      return [
        { key: 'drawerWidth', label: 'Width', type: 'range', min: 280, max: 600, suffix: 'px' },
        { key: 'drawerBg', label: 'Background Color', type: 'color' },
        { key: 'drawerOverlayColor', label: 'Overlay Color', type: 'color' },
        {
          key: 'drawerPosition',
          label: 'Position',
          type: 'select',
          options: THEME_DRAWER_POSITION_OPTIONS,
        },
        { key: 'drawerBorderColor', label: 'Border color', type: 'color' },
        {
          key: 'drawerBorderWidth',
          label: 'Border Thickness',
          type: 'number',
          min: 0,
          max: 8,
          suffix: 'px',
        },
        {
          key: 'drawerBorderOpacity',
          label: 'Border Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'drawerRadius',
          label: 'Corner radius',
          type: 'number',
          min: 0,
          max: 32,
          suffix: 'px',
        },
        {
          key: 'drawerShadowOpacity',
          label: 'Shadow Opacity',
          type: 'range',
          min: 0,
          max: 100,
          suffix: '%',
        },
        {
          key: 'drawerShadowX',
          label: 'Shadow X',
          type: 'number',
          min: -30,
          max: 30,
          suffix: 'px',
        },
        {
          key: 'drawerShadowY',
          label: 'Shadow Y',
          type: 'number',
          min: -30,
          max: 30,
          suffix: 'px',
        },
        {
          key: 'drawerShadowBlur',
          label: 'Shadow Blur',
          type: 'number',
          min: 0,
          max: 60,
          suffix: 'px',
        },
      ];

    case 'Badges':
      return [
        {
          key: 'badgePosition',
          label: 'Position on cards',
          type: 'select',
          options: THEME_BADGE_POSITION_OPTIONS,
        },
        {
          key: 'badgeRadius',
          label: 'Corner radius',
          type: 'range',
          min: 0,
          max: 40,
          suffix: 'px',
        },
        {
          key: 'badgeFontSize',
          label: 'Font size',
          type: 'number',
          min: 8,
          max: 16,
          suffix: 'px',
        },
        {
          key: 'badgePaddingX',
          label: 'Padding X',
          type: 'number',
          min: 2,
          max: 16,
          suffix: 'px',
        },
        {
          key: 'badgePaddingY',
          label: 'Padding Y',
          type: 'number',
          min: 0,
          max: 8,
          suffix: 'px',
        },
        {
          key: 'badgeSaleColorScheme',
          label: 'Sale color scheme',
          type: 'select',
          options: theme.colorSchemes.map((scheme: ColorScheme) => ({
            label: scheme.name,
            value: scheme.id,
          })),
        },
        {
          key: 'badgeSoldOutColorScheme',
          label: 'Sold out color scheme',
          type: 'select',
          options: theme.colorSchemes.map((scheme: ColorScheme) => ({
            label: scheme.name,
            value: scheme.id,
          })),
        },
        { key: 'badgeDefaultBg', label: 'Default Background', type: 'color' },
        { key: 'badgeDefaultText', label: 'Default Text', type: 'color' },
        { key: 'badgeSaleBg', label: 'Sale Background', type: 'color' },
        { key: 'badgeSaleText', label: 'Sale Text', type: 'color' },
      ];

    case 'Search Behaviour':
      return [
        { key: 'searchPlaceholder', label: 'Placeholder text', type: 'text' },
        { key: 'searchMinChars', label: 'Min characters', type: 'number', min: 1, max: 5 },
        { key: 'searchShowSuggestions', label: 'Enable search suggestions', type: 'checkbox' },
        ...(theme.searchShowSuggestions
          ? ([
            { key: 'searchShowVendor', label: 'Show product vendor', type: 'checkbox' },
            { key: 'searchShowPrice', label: 'Show product price', type: 'checkbox' },
          ] as SettingsPanelField<ThemeSettings>[])
          : []),
        { key: 'searchMaxResults', label: 'Max results', type: 'number', min: 3, max: 20 },
      ];

    case 'Currency Format':
      return [
        {
          key: 'currencyCode',
          label: 'Currency',
          type: 'select',
          options: THEME_CURRENCY_OPTIONS,
        },
        { key: 'currencySymbol', label: 'Symbol', type: 'text' },
        {
          key: 'currencyPosition',
          label: 'Symbol position',
          type: 'select',
          options: THEME_CURRENCY_POSITION_OPTIONS,
        },
        { key: 'currencyShowCode', label: 'Show currency codes', type: 'checkbox' },
        { key: 'thousandsSeparator', label: 'Thousands separator', type: 'text' },
        { key: 'decimalSeparator', label: 'Decimal separator', type: 'text' },
        { key: 'decimalPlaces', label: 'Decimal places', type: 'number', min: 0, max: 4 },
      ];

    case 'Cart':
      return [
        {
          key: 'cartStyle',
          label: 'Cart type',
          type: 'select',
          options: THEME_CART_STYLE_OPTIONS,
        },
        {
          key: 'cartIconStyle',
          label: 'Icon style',
          type: 'select',
          options: THEME_CART_ICON_STYLE_OPTIONS,
        },
        { key: 'showCartCount', label: 'Show item count', type: 'checkbox' },
        { key: 'cartShowVendor', label: 'Show vendor', type: 'checkbox' },
        { key: 'cartEnableNote', label: 'Enable cart note', type: 'checkbox' },
        { key: 'cartEmptyText', label: 'Empty cart text', type: 'text' },
        ...(theme.cartStyle === 'drawer'
          ? ([
            {
              key: 'cartDrawerShowWhenEmpty',
              label: 'Visible when cart drawer is empty',
              type: 'checkbox',
            },
            {
              key: 'cartDrawerColorScheme',
              label: 'Color scheme',
              type: 'select',
              options: theme.colorSchemes.map((scheme: ColorScheme) => ({
                label: scheme.name,
                value: scheme.id,
              })),
            },
          ] as SettingsPanelField<ThemeSettings>[])
          : []),
      ];

    case 'Theme Style':
      return [
        { key: 'themePreset', label: 'Preset', type: 'select', options: themePresetOptions },
        {
          key: 'darkMode',
          label: 'Storefront appearance',
          type: 'custom',
          helperText:
            'Default uses the darker public palette. Dark applies the global dark storefront palette.',
          render: ({ value, onChange, disabled }: { value: any; onChange: any; disabled?: boolean }) =>
            React.createElement(SelectSimple, {
              value: value === true ? 'dark' : 'default',
              onValueChange: (nextValue: string) => onChange(nextValue === 'dark'),
              disabled,
              options: THEME_STOREFRONT_APPEARANCE_OPTIONS,
              placeholder: 'Choose storefront appearance',
              ariaLabel: 'Storefront appearance',
              variant: 'subtle',
            }),
        },
      ];

    default:
      return [];
  }
};
