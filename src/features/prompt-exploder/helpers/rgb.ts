export const PROMPT_EXPLODER_RGB_LITERAL_RE =
  /RGB\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i;

export const clampRgb = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

export const extractRgbLiteral = (text: string): [number, number, number] | null => {
  const match = PROMPT_EXPLODER_RGB_LITERAL_RE.exec(text);
  if (!match) return null;
  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);
  if (![red, green, blue].every((value) => Number.isFinite(value))) return null;
  return [clampRgb(red), clampRgb(green), clampRgb(blue)];
};

export const rgbToHex = ([red, green, blue]: [number, number, number]): string =>
  `#${[red, green, blue].map((value) => clampRgb(value).toString(16).padStart(2, '0')).join('')}`;

export const hexToRgb = (value: string): [number, number, number] | null => {
  const normalized = value.trim();
  const match = /^#?([a-f0-9]{6})$/i.exec(normalized);
  if (!match) return null;
  const hex = match[1] ?? '';
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
};

export const replaceRgbLiteral = (text: string, rgb: [number, number, number]): string => {
  return text.replace(
    PROMPT_EXPLODER_RGB_LITERAL_RE,
    `RGB(${clampRgb(rgb[0])},${clampRgb(rgb[1])},${clampRgb(rgb[2])})`
  );
};
