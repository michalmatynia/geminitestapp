import type { SettingsFieldOption } from '@/shared/contracts/cms';

export const FONT_FAMILY_OPTIONS: SettingsFieldOption[] = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif' },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'DM Sans', value: "'DM Sans', sans-serif" },
  { label: 'Sora', value: 'Sora, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Palatino', value: "'Palatino Linotype', serif" },
  { label: 'System UI', value: 'system-ui, sans-serif' },
];

export const FONT_WEIGHT_OPTIONS: SettingsFieldOption[] = [
  { label: '100 – Thin', value: '100' },
  { label: '200 – Extra Light', value: '200' },
  { label: '300 – Light', value: '300' },
  { label: '400 – Normal', value: '400' },
  { label: '500 – Medium', value: '500' },
  { label: '600 – Semi Bold', value: '600' },
  { label: '700 – Bold', value: '700' },
  { label: '800 – Extra Bold', value: '800' },
  { label: '900 – Black', value: '900' },
];

export const BORDER_STYLE_OPTIONS: SettingsFieldOption[] = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'None', value: 'none' },
];

export const BG_TYPE_OPTIONS: SettingsFieldOption[] = [
  { label: 'None', value: 'none' },
  { label: 'Solid', value: 'solid' },
  { label: 'Gradient', value: 'gradient' },
  { label: 'Image', value: 'image' },
];

export const GRADIENT_DIRECTION_OPTIONS: SettingsFieldOption[] = [
  { label: 'Top → Bottom', value: '180' },
  { label: 'Bottom → Top', value: '0' },
  { label: 'Left → Right', value: '90' },
  { label: 'Right → Left', value: '270' },
  { label: 'Top Left → Bottom Right', value: '135' },
  { label: 'Bottom Right → Top Left', value: '315' },
  { label: 'Top Right → Bottom Left', value: '225' },
  { label: 'Bottom Left → Top Right', value: '45' },
  { label: 'Custom angle…', value: 'custom' },
];

export const COLOR_SCHEME_OPTIONS: SettingsFieldOption[] = [
  { label: 'Scheme 1', value: 'scheme-1' },
  { label: 'Scheme 2', value: 'scheme-2' },
  { label: 'Scheme 3', value: 'scheme-3' },
  { label: 'Scheme 4', value: 'scheme-4' },
  { label: 'Scheme 5', value: 'scheme-5' },
];
