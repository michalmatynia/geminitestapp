import type { ColorSchemeColors } from '@/shared/contracts/cms';

export const THEME_SECTIONS = [
  'Logo',
  'Colors',
  'Typography',
  'Layout',
  'Animations',
  'Buttons',
  'Variant Pills',
  'Inputs',
  'Product Cards',
  'Collection Cards',
  'Blog Cards',
  'Content Containers',
  'Media',
  'Dropdowns and pop-ups',
  'Drawers',
  'Badges',
  'Brand Information',
  'Social Media',
  'Search Behaviour',
  'Currency Format',
  'Cart',
  'Custom CSS',
  'Theme Style',
];

export const toSectionId = (section: string): string =>
  `cms-theme-section-${section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Bebas Neue', value: '\'Bebas Neue\', sans-serif' },
  { label: 'Space Grotesk', value: '\'Space Grotesk\', sans-serif' },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif' },
  { label: 'Plus Jakarta Sans', value: '\'Plus Jakarta Sans\', sans-serif' },
  { label: 'DM Sans', value: '\'DM Sans\', sans-serif' },
  { label: 'Sora', value: 'Sora, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '\'Times New Roman\', serif' },
  { label: 'Courier New', value: '\'Courier New\', monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '\'Trebuchet MS\', sans-serif' },
  { label: 'Palatino', value: '\'Palatino Linotype\', serif' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
];

export const WEIGHT_OPTIONS = [
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

export const DEFAULT_SCHEME_COLORS: ColorSchemeColors = {
  background: '#0b1220',
  surface: '#111827',
  text: '#f3f4f6',
  accent: '#3b82f6',
  border: '#1f2937',
};

export const SAVED_THEME_PREFIX = 'saved:';
