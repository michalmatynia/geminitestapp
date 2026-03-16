import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CmsSettingsField } from '@/features/cms/types/page-builder';

// ---------------------------------------------------------------------------
// Shared field helpers
// ---------------------------------------------------------------------------

export const COLOR_SCHEME_OPTIONS: LabeledOptionDto<string>[] = [
  { label: 'Scheme 1', value: 'scheme-1' },
  { label: 'Scheme 2', value: 'scheme-2' },
  { label: 'Scheme 3', value: 'scheme-3' },
  { label: 'Scheme 4', value: 'scheme-4' },
  { label: 'Scheme 5', value: 'scheme-5' },
];

export const NONE_OPTION: LabeledOptionDto<string> = { label: 'None', value: 'none' };
export const NONE_OPTIONS: LabeledOptionDto<string>[] = [NONE_OPTION];

export const OVERFLOW_OPTIONS: LabeledOptionDto<string>[] = [
  { label: 'Visible', value: 'visible' },
  { label: 'Hidden', value: 'hidden' },
  { label: 'Auto', value: 'auto' },
  { label: 'Scroll', value: 'scroll' },
  { label: 'Clip', value: 'clip' },
];

export const JUSTIFY_OPTIONS: LabeledOptionDto<string>[] = [
  { label: 'Start', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'end' },
  { label: 'Space between', value: 'space-between' },
  { label: 'Space around', value: 'space-around' },
  { label: 'Space evenly', value: 'space-evenly' },
];

export const ALIGN_OPTIONS: LabeledOptionDto<string>[] = [
  { label: 'Start', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'end' },
  { label: 'Stretch', value: 'stretch' },
];

export const WRAP_OPTIONS: LabeledOptionDto<string>[] = [
  { label: 'Wrap', value: 'wrap' },
  { label: 'No wrap', value: 'nowrap' },
];

export function colorSchemeField(
  key: string,
  label: string,
  defaultValue: string = 'scheme-1'
): CmsSettingsField {
  return { key, label, type: 'color-scheme', options: COLOR_SCHEME_OPTIONS, defaultValue };
}

export function colorSchemeFieldWithNone(
  key: string,
  label: string,
  defaultValue: string = 'none'
): CmsSettingsField {
  return {
    key,
    label,
    type: 'color-scheme',
    options: NONE_OPTIONS,
    defaultValue,
  };
}

export function paddingFields(): CmsSettingsField[] {
  return [
    { key: 'paddingTop', label: 'Top padding', type: 'number', defaultValue: 36 },
    { key: 'paddingRight', label: 'Right padding', type: 'number', defaultValue: 24 },
    { key: 'paddingBottom', label: 'Bottom padding', type: 'number', defaultValue: 36 },
    { key: 'paddingLeft', label: 'Left padding', type: 'number', defaultValue: 24 },
  ];
}

export function marginFields(): CmsSettingsField[] {
  return [
    { key: 'marginTop', label: 'Top margin', type: 'number', defaultValue: 0 },
    { key: 'marginRight', label: 'Right margin', type: 'number', defaultValue: 0 },
    { key: 'marginBottom', label: 'Bottom margin', type: 'number', defaultValue: 0 },
    { key: 'marginLeft', label: 'Left margin', type: 'number', defaultValue: 0 },
  ];
}

export function layoutFields(): CmsSettingsField[] {
  return [
    { key: 'minHeight', label: 'Min height (px)', type: 'number', defaultValue: 0 },
    { key: 'maxWidth', label: 'Max width (px)', type: 'number', defaultValue: 0 },
    {
      key: 'overflow',
      label: 'Overflow',
      type: 'select',
      options: OVERFLOW_OPTIONS,
      defaultValue: 'visible',
    },
    { key: 'opacity', label: 'Opacity', type: 'range', defaultValue: 100, min: 0, max: 100 },
    { key: 'zIndex', label: 'Z-index', type: 'number', defaultValue: 0 },
  ];
}

export function sectionStyleFields(): CmsSettingsField[] {
  return [
    { key: 'background', label: 'Background', type: 'background', defaultValue: { type: 'none' } },
    {
      key: 'sectionBorder',
      label: 'Border',
      type: 'border',
      defaultValue: { width: 0, style: 'none', color: '#4b5563', radius: 0 },
    },
    {
      key: 'sectionShadow',
      label: 'Shadow',
      type: 'shadow',
      defaultValue: { x: 0, y: 0, blur: 0, spread: 0, color: '#00000000' },
    },
  ];
}
