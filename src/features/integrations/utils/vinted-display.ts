export const normalizeVintedDisplayText = (value: string): string =>
  value.replace(/\bVinted\b(?!\.pl)/g, 'Vinted.pl');
