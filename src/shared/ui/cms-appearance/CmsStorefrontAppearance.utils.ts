import { type CmsStorefrontAppearanceMode } from './CmsStorefrontAppearance.contracts';

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const isGradientValue = (value: string | null | undefined): value is string =>
  isNonEmptyString(value) && value.toLowerCase().includes('gradient(');

export const extractFirstColorStop = (value: string): string | null => {
  const hexMatch = value.match(/#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})/i);
  if (hexMatch) return hexMatch[0];
  const rgbMatch = value.match(/rgba?\([^)]+\)/i);
  if (rgbMatch) return rgbMatch[0];
  const hslMatch = value.match(/hsla?\([^)]+\)/i);
  if (hslMatch) return hslMatch[0];
  return null;
};

export const extractGradientStops = (value: string): string[] => {
  const matches = value.match(
    /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)|hsla?\([^)]+\)/gi
  );
  return matches ? matches.map((stop) => stop.trim()) : [];
};

export const resolveSolidColor = (value: string | undefined, fallback: string): string => {
  if (!isNonEmptyString(value)) return fallback;
  const trimmed = value.trim();
  if (!isGradientValue(trimmed)) return trimmed;
  return extractFirstColorStop(trimmed) ?? fallback;
};

export const resolveBackgroundValue = (value: string | undefined, fallback: string): string => {
  if (isGradientValue(value)) return value.trim();
  return fallback;
};

export const clampRgbChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

export const parseRgbTuple = (value: string): [number, number, number] | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('#')) {
    const normalized = trimmed.slice(1);
    if (normalized.length === 3 || normalized.length === 4) {
      const channels = normalized.split('').map((channel) => channel + channel);
      const [r, g, b] = channels;
      if (typeof r !== 'string' || typeof g !== 'string' || typeof b !== 'string') return null;
      return [
        clampRgbChannel(parseInt(r, 16)),
        clampRgbChannel(parseInt(g, 16)),
        clampRgbChannel(parseInt(b, 16)),
      ];
    }
    if (normalized.length === 6 || normalized.length === 8) {
      return [
        clampRgbChannel(parseInt(normalized.slice(0, 2), 16)),
        clampRgbChannel(parseInt(normalized.slice(2, 4), 16)),
        clampRgbChannel(parseInt(normalized.slice(4, 6), 16)),
      ];
    }
  }

  const tupleMatch = trimmed.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (tupleMatch) {
    return [
      clampRgbChannel(Number(tupleMatch[1])),
      clampRgbChannel(Number(tupleMatch[2])),
      clampRgbChannel(Number(tupleMatch[3])),
    ];
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const rawParts = rgbMatch[1];
    if (!rawParts) return null;
    const parts = rawParts
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      const channels = parts.slice(0, 3).map((part) => {
        if (part.endsWith('%')) {
          const percent = Number(part.replace('%', ''));
          if (Number.isNaN(percent)) return null;
          return clampRgbChannel((percent / 100) * 255);
        }
        const value = Number(part);
        if (Number.isNaN(value)) return null;
        return clampRgbChannel(value);
      });
      if (channels.every((c): c is number => typeof c === 'number')) {
        return channels as [number, number, number];
      }
    }
  }

  return null;
};

export const toRgbTupleString = (value: string): string | null => {
  const parsed = parseRgbTuple(value);
  if (!parsed) return null;
  return `${parsed[0]}, ${parsed[1]}, ${parsed[2]}`;
};

export const toCssPx = (value: number): string => `${Math.max(0, Math.round(value * 100) / 100)}px`;
export const toCssPxSigned = (value: number): string => `${Math.round(value * 100) / 100}px`;
export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const toShadowColor = (color: string, opacity: number): string => {
  const clamped = clampNumber(opacity, 0, 1);
  if (clamped <= 0) return 'transparent';
  if (clamped >= 1) return color;
  const percent = Math.round(clamped * 100);
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
};

export const isDarkStorefrontAppearanceMode = (mode: CmsStorefrontAppearanceMode): boolean =>
  mode === 'dark' || mode === 'sunset';

export const applyTransparency = (color: string, opacity: number): string => {
  const clamped = clampNumber(opacity, 0, 1);
  if (clamped <= 0) return 'transparent';
  if (clamped >= 1) return color;
  const percent = Math.round(clamped * 100);
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
};

export const mixCssColor = (base: string, mixin: string, weight: number): string =>
  `color-mix(in srgb, ${base} ${Math.max(0, Math.min(100, weight))}%, ${mixin})`;

export const buildShadow = (values: {
  x: number;
  y: number;
  blur: number;
  color: string;
  opacity: number;
}): string => {
  const alpha = clampNumber(values.opacity, 0, 1);
  const shadowColor = alpha <= 0 ? 'transparent' : toShadowColor(values.color, alpha);
  const blur = Math.max(0, values.blur);
  return `${toCssPxSigned(values.x)} ${toCssPxSigned(values.y)} ${toCssPx(blur)} ${shadowColor}`;
};
