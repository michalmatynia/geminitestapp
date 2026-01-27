export const darkenColor = (hex: string, percent: number): string => {
  const normalized = hex.replace("#", "");
  const num = parseInt(normalized, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, (num >> 16) - amt);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const b = Math.max(0, (num & 0x0000ff) - amt);
  return `#${(0x1000000 + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`;
};