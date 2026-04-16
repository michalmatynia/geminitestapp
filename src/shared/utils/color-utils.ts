export const normalizeHexColor = (value: string): string | null => {
  const normalized = value.trim().replace(/^#/, '');
  if (normalized.length !== 3 && normalized.length !== 6) return null;
  if (!/^[0-9a-f]+$/i.test(normalized)) return null;
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((segment: string) => segment + segment)
          .join('')
      : normalized;
  return `#${expanded.toLowerCase()}`;
};

export const darkenColor = (hex: string, percent: number): string => {
  const normalizedHex = normalizeHexColor(hex);
  if (normalizedHex === null) return hex;
  const normalized = normalizedHex.replace('#', '');
  const num = parseInt(normalized, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, (num >> 16) - amt);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const b = Math.max(0, (num & 0x0000ff) - amt);
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const darkenCssColor = (color: string, percent: number): string => {
  const normalizedHex = normalizeHexColor(color);
  if (normalizedHex !== null) return darkenColor(normalizedHex, percent);
  return `color-mix(in srgb, ${color} ${Math.max(0, 100 - percent)}%, black)`;
};
