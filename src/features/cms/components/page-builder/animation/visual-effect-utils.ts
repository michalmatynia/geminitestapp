import type { LabeledOptionDto } from '@/shared/contracts/base';

export type VisualFilterType =
  | 'none'
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturate'
  | 'hue'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'opacity';

export type VisualClipType =
  | 'none'
  | 'wipe-top'
  | 'wipe-right'
  | 'wipe-bottom'
  | 'wipe-left'
  | 'inset';

export interface VisualShadowValues {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

export const FILTER_OPTIONS: Array<LabeledOptionDto<VisualFilterType>> = [
  { label: 'None', value: 'none' },
  { label: 'Blur', value: 'blur' },
  { label: 'Brightness', value: 'brightness' },
  { label: 'Contrast', value: 'contrast' },
  { label: 'Saturation', value: 'saturate' },
  { label: 'Hue', value: 'hue' },
  { label: 'Grayscale', value: 'grayscale' },
  { label: 'Sepia', value: 'sepia' },
  { label: 'Invert', value: 'invert' },
  { label: 'Opacity', value: 'opacity' },
];

export const FILTER_META: Record<
  VisualFilterType,
  { unit: string; min: number; max: number; step: number; defaultFrom: number; defaultTo: number }
> = {
  none: { unit: '', min: 0, max: 100, step: 1, defaultFrom: 0, defaultTo: 0 },
  blur: { unit: 'px', min: 0, max: 30, step: 1, defaultFrom: 0, defaultTo: 10 },
  brightness: { unit: '%', min: 0, max: 200, step: 5, defaultFrom: 60, defaultTo: 100 },
  contrast: { unit: '%', min: 0, max: 200, step: 5, defaultFrom: 60, defaultTo: 100 },
  saturate: { unit: '%', min: 0, max: 200, step: 5, defaultFrom: 0, defaultTo: 100 },
  hue: { unit: 'deg', min: 0, max: 360, step: 5, defaultFrom: 0, defaultTo: 90 },
  grayscale: { unit: '%', min: 0, max: 100, step: 5, defaultFrom: 100, defaultTo: 0 },
  sepia: { unit: '%', min: 0, max: 100, step: 5, defaultFrom: 100, defaultTo: 0 },
  invert: { unit: '%', min: 0, max: 100, step: 5, defaultFrom: 100, defaultTo: 0 },
  opacity: { unit: '%', min: 0, max: 100, step: 5, defaultFrom: 0, defaultTo: 100 },
};

export const CLIP_OPTIONS: Array<LabeledOptionDto<VisualClipType>> = [
  { label: 'None', value: 'none' },
  { label: 'Wipe Top', value: 'wipe-top' },
  { label: 'Wipe Right', value: 'wipe-right' },
  { label: 'Wipe Bottom', value: 'wipe-bottom' },
  { label: 'Wipe Left', value: 'wipe-left' },
  { label: 'Inset (Uniform)', value: 'inset' },
];

export const DEFAULT_SHADOW: VisualShadowValues = {
  x: 0,
  y: 16,
  blur: 32,
  spread: 0,
  color: '#000000',
  opacity: 35,
};

export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const parseNumber = (value: string, fallback: number): number => {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return fallback;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseFilterString = (
  value: string
): { type: VisualFilterType; amount: number } | null => {
  const match = value.match(
    /(blur|brightness|contrast|saturate|hue-rotate|grayscale|sepia|invert|opacity)\(([-\d.]+)(deg|px|%)?\)/i
  );
  if (!match?.[1] || !match[2]) return null;
  const rawType = match[1].toLowerCase();
  const type: VisualFilterType = rawType === 'hue-rotate' ? 'hue' : (rawType as VisualFilterType);
  const amount = Number.parseFloat(match[2]);
  if (!Number.isFinite(amount)) return null;
  return { type, amount };
};

export const buildFilterString = (type: VisualFilterType, amount: number): string => {
  if (type === 'none') return '';
  const meta = FILTER_META[type];
  const func = type === 'hue' ? 'hue-rotate' : type;
  const value = clampNumber(amount, meta.min, meta.max);
  return `${func}(${value}${meta.unit})`;
};

export const parseClipString = (value: string): { type: VisualClipType; amount: number } | null => {
  const match = value.match(/inset\(([-\d.]+)%\s+([-\d.]+)%\s+([-\d.]+)%\s+([-\d.]+)%\)/i);
  if (!match?.[1] || !match[2] || !match[3] || !match[4]) return null;
  const top = Number.parseFloat(match[1]);
  const right = Number.parseFloat(match[2]);
  const bottom = Number.parseFloat(match[3]);
  const left = Number.parseFloat(match[4]);
  if ([top, right, bottom, left].some((val: number) => !Number.isFinite(val))) return null;
  if (right === 0 && bottom === 0 && left === 0) return { type: 'wipe-top', amount: top };
  if (top === 0 && bottom === 0 && left === 0) return { type: 'wipe-right', amount: right };
  if (top === 0 && right === 0 && left === 0) return { type: 'wipe-bottom', amount: bottom };
  if (top === 0 && right === 0 && bottom === 0) return { type: 'wipe-left', amount: left };
  if (top === right && right === bottom && bottom === left) {
    return { type: 'inset', amount: top };
  }
  return null;
};

export const buildClipString = (type: VisualClipType, amount: number): string => {
  if (type === 'none') return '';
  const value = clampNumber(amount, 0, 100);
  switch (type) {
    case 'wipe-top':
      return `inset(${value}% 0% 0% 0%)`;
    case 'wipe-right':
      return `inset(0% ${value}% 0% 0%)`;
    case 'wipe-bottom':
      return `inset(0% 0% ${value}% 0%)`;
    case 'wipe-left':
      return `inset(0% 0% 0% ${value}%)`;
    case 'inset':
      return `inset(${value}% ${value}% ${value}% ${value}%)`;
    default:
      return '';
  }
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = hex.replace('#', '').trim();
  if (![3, 6].includes(normalized.length)) return null;
  const expanded =
    normalized.length === 3
      ? normalized
        .split('')
        .map((c: string) => c + c)
        .join('')
      : normalized;
  const int = Number.parseInt(expanded, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

export const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((val: number) => clampNumber(Math.round(val), 0, 255).toString(16).padStart(2, '0')).join('')}`;

export const parseColor = (value: string): { color: string; opacity: number } => {
  if (!value) return { color: DEFAULT_SHADOW.color, opacity: DEFAULT_SHADOW.opacity };
  const rgbaMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch?.[1]) {
    const parts = rgbaMatch[1].split(',').map((part: string) => part.trim());
    const r = Number.parseFloat(parts[0] ?? '0');
    const g = Number.parseFloat(parts[1] ?? '0');
    const b = Number.parseFloat(parts[2] ?? '0');
    const a = parts[3] !== undefined ? Number.parseFloat(parts[3]) : 1;
    if ([r, g, b].every(Number.isFinite)) {
      return {
        color: rgbToHex(r, g, b),
        opacity: clampNumber(Number.isFinite(a) ? a * 100 : 100, 0, 100),
      };
    }
  }
  const hexMatch = value.match(/#([0-9a-f]{3,8})/i);
  if (hexMatch?.[1]) {
    return { color: `#${hexMatch[1].slice(0, 6)}`, opacity: 100 };
  }
  return { color: DEFAULT_SHADOW.color, opacity: DEFAULT_SHADOW.opacity };
};

export const parseShadow = (value: string): VisualShadowValues => {
  if (!value) return { ...DEFAULT_SHADOW };
  const match = value.match(
    /(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?\s+(.+)$/i
  );
  if (!match) return { ...DEFAULT_SHADOW };
  const x = Number.parseFloat(match[1] ?? '0');
  const y = Number.parseFloat(match[2] ?? '0');
  const blur = Number.parseFloat(match[3] ?? '0');
  const spread = match[4] !== undefined ? Number.parseFloat(match[4]) : 0;
  const { color, opacity } = parseColor(match[5] ?? '');
  return {
    x: Number.isFinite(x) ? x : DEFAULT_SHADOW.x,
    y: Number.isFinite(y) ? y : DEFAULT_SHADOW.y,
    blur: Number.isFinite(blur) ? blur : DEFAULT_SHADOW.blur,
    spread: Number.isFinite(spread) ? spread : DEFAULT_SHADOW.spread,
    color,
    opacity,
  };
};

export const buildShadow = (values: VisualShadowValues): string => {
  const rgb = hexToRgb(values.color) ?? hexToRgb(DEFAULT_SHADOW.color) ?? { r: 0, g: 0, b: 0 };
  const alpha = clampNumber(values.opacity, 0, 100) / 100;
  return `${values.x}px ${values.y}px ${values.blur}px ${values.spread}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};
