'use client';

import React from 'react';

import type { ColorScheme, ThemeSettings } from '@/shared/contracts/cms-theme';
import type { SettingsPanelField } from '@/shared/ui/templates/SettingsPanelBuilder';

import { ThemeSettingsFieldsSection } from './ThemeSettingsFieldsSection';
import { useThemeSettingsValue } from '../ThemeSettingsContext';

export function ThemeProductCardsSection(): React.JSX.Element {
  const theme = useThemeSettingsValue();

  const fields: SettingsPanelField<ThemeSettings>[] = [
    {
      key: 'cardStyle',
      label: 'Style',
      type: 'select',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Card', value: 'card' },
      ],
    },
    {
      key: 'cardImageRatio',
      label: 'Image ratio',
      type: 'select',
      options: [
        { label: '1:1 Square', value: '1:1' },
        { label: '3:4 Portrait', value: '3:4' },
        { label: '4:3 Landscape', value: '4:3' },
        { label: '16:9 Wide', value: '16:9' },
      ],
    },
    {
      key: 'cardImagePadding',
      label: 'Image padding',
      type: 'range',
      min: 0,
      max: 20,
      suffix: 'px',
    },
    {
      key: 'cardTextAlignment',
      label: 'Text alignment',
      type: 'select',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    {
      key: 'cardColorScheme',
      label: 'Color scheme',
      type: 'select',
      options: theme.colorSchemes.map((scheme: ColorScheme) => ({
        label: scheme.name,
        value: scheme.id,
      })),
    },
    { key: 'cardRadius', label: 'Radius', type: 'number', min: 0, max: 24, suffix: 'px' },
    { key: 'cardBg', label: 'Background', type: 'color' },
    {
      key: 'cardShadow',
      label: 'Shadow',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
    },
    {
      key: 'cardHoverShadow',
      label: 'Hover shadow',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
    },
    { key: 'showBadge', label: 'Show badge', type: 'checkbox' },
    { key: 'showQuickAdd', label: 'Show quick-add button', type: 'checkbox' },
    {
      key: 'cardBorderWidth',
      label: 'Border Thickness',
      type: 'number',
      min: 0,
      max: 8,
      suffix: 'px',
    },
    {
      key: 'cardBorderOpacity',
      label: 'Border Opacity',
      type: 'range',
      min: 0,
      max: 100,
      suffix: '%',
    },
    {
      key: 'cardBorderRadius',
      label: 'Border Corner radius',
      type: 'number',
      min: 0,
      max: 48,
      suffix: 'px',
    },
    {
      key: 'cardShadowOpacity',
      label: 'Shadow Opacity',
      type: 'range',
      min: 0,
      max: 100,
      suffix: '%',
    },
    {
      key: 'cardShadowX',
      label: 'Shadow Horizontal',
      type: 'number',
      min: -20,
      max: 20,
      suffix: 'px',
    },
    {
      key: 'cardShadowY',
      label: 'Shadow Vertical',
      type: 'number',
      min: -20,
      max: 20,
      suffix: 'px',
    },
    { key: 'cardShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 40, suffix: 'px' },
  ];

  return <ThemeSettingsFieldsSection fields={fields} />;
}

export function ThemeCollectionCardsSection(): React.JSX.Element {
  const theme = useThemeSettingsValue();

  const fields: SettingsPanelField<ThemeSettings>[] = [
    {
      key: 'collectionStyle',
      label: 'Style',
      type: 'select',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Card', value: 'card' },
      ],
    },
    {
      key: 'collectionRatio',
      label: 'Image ratio',
      type: 'select',
      options: [
        { label: '1:1 Square', value: '1:1' },
        { label: '3:4 Portrait', value: '3:4' },
        { label: '4:3 Landscape', value: '4:3' },
        { label: '16:9 Wide', value: '16:9' },
      ],
    },
    {
      key: 'collectionImagePadding',
      label: 'Image padding',
      type: 'range',
      min: 0,
      max: 20,
      suffix: 'px',
    },
    {
      key: 'collectionTextAlign',
      label: 'Text alignment',
      type: 'select',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    {
      key: 'collectionColorScheme',
      label: 'Color scheme',
      type: 'select',
      options: theme.colorSchemes.map((scheme: ColorScheme) => ({
        label: scheme.name,
        value: scheme.id,
      })),
    },
    { key: 'collectionOverlay', label: 'Show overlay', type: 'checkbox' },
    ...(theme.collectionOverlay
      ? [
          {
            key: 'collectionOverlayColor',
            label: 'Overlay color',
            type: 'color',
          } as SettingsPanelField<ThemeSettings>,
      ]
      : []),
    {
      key: 'collectionBorderWidth',
      label: 'Border Thickness',
      type: 'number',
      min: 0,
      max: 8,
      suffix: 'px',
    },
    {
      key: 'collectionBorderOpacity',
      label: 'Border Opacity',
      type: 'range',
      min: 0,
      max: 100,
      suffix: '%',
    },
    {
      key: 'collectionRadius',
      label: 'Corner radius',
      type: 'number',
      min: 0,
      max: 24,
      suffix: 'px',
    },
    {
      key: 'collectionShadowOpacity',
      label: 'Shadow Opacity',
      type: 'range',
      min: 0,
      max: 100,
      suffix: '%',
    },
    {
      key: 'collectionShadowX',
      label: 'Shadow Horizontal',
      type: 'number',
      min: -20,
      max: 20,
      suffix: 'px',
    },
    {
      key: 'collectionShadowY',
      label: 'Shadow Vertical',
      type: 'number',
      min: -20,
      max: 20,
      suffix: 'px',
    },
    {
      key: 'collectionShadowBlur',
      label: 'Shadow Blur',
      type: 'number',
      min: 0,
      max: 40,
      suffix: 'px',
    },
  ];

  return <ThemeSettingsFieldsSection fields={fields} />;
}

export function ThemeBlogCardsSection(): React.JSX.Element {
  const theme = useThemeSettingsValue();

  const fields: SettingsPanelField<ThemeSettings>[] = [
    {
      key: 'blogStyle',
      label: 'Style',
      type: 'select',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Card', value: 'card' },
      ],
    },
    {
      key: 'blogRatio',
      label: 'Image ratio',
      type: 'select',
      options: [
        { label: '1:1 Square', value: '1:1' },
        { label: '3:4 Portrait', value: '3:4' },
        { label: '4:3 Landscape', value: '4:3' },
        { label: '16:9 Wide', value: '16:9' },
      ],
    },
    {
      key: 'blogImagePadding',
      label: 'Image padding',
      type: 'range',
      min: 0,
      max: 20,
      suffix: 'px',
    },
    {
      key: 'blogTextAlignment',
      label: 'Text alignment',
      type: 'select',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    {
      key: 'blogColorScheme',
      label: 'Color scheme',
      type: 'select',
      options: theme.colorSchemes.map((scheme: ColorScheme) => ({
        label: scheme.name,
        value: scheme.id,
      })),
    },
    { key: 'blogRadius', label: 'Radius', type: 'number', min: 0, max: 24, suffix: 'px' },
    { key: 'blogShowDate', label: 'Show date', type: 'checkbox' },
    { key: 'blogShowExcerpt', label: 'Show excerpt', type: 'checkbox' },
    ...(theme.blogShowExcerpt
      ? [
          {
            key: 'blogExcerptLines',
            label: 'Excerpt lines',
            type: 'number',
            min: 1,
            max: 5,
          } as SettingsPanelField<ThemeSettings>,
      ]
      : []),
    {
      key: 'blogBorderWidth',
      label: 'Border Thickness',
      type: 'number',
      min: 0,
      max: 8,
      suffix: 'px',
    },
    {
      key: 'blogBorderOpacity',
      label: 'Border Opacity',
      type: 'range',
      min: 0,
      max: 100,
      suffix: '%',
    },
    {
      key: 'blogBorderRadius',
      label: 'Border Corner radius',
      type: 'number',
      min: 0,
      max: 48,
      suffix: 'px',
    },
    {
      key: 'blogShadowOpacity',
      label: 'Shadow Opacity',
      type: 'range',
      min: 0,
      max: 100,
      suffix: '%',
    },
    {
      key: 'blogShadowX',
      label: 'Shadow Horizontal',
      type: 'number',
      min: -20,
      max: 20,
      suffix: 'px',
    },
    {
      key: 'blogShadowY',
      label: 'Shadow Vertical',
      type: 'number',
      min: -20,
      max: 20,
      suffix: 'px',
    },
    { key: 'blogShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 40, suffix: 'px' },
  ];

  return <ThemeSettingsFieldsSection fields={fields} />;
}
