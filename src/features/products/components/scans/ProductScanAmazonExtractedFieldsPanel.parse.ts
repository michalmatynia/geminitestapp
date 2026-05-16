import type { ParsedAmazonDimensions } from './ProductScanAmazonExtractedFieldsPanel.types';

export const normalizeComparableText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeMetadataLabel = (value: string | null | undefined): string | null => {
  const normalized = normalizeComparableText(value);
  if (normalized === null) return null;
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
};

const roundToDecimals = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const parsePositiveNumber = (value: string | undefined): number | null => {
  if (typeof value !== 'string') return null;
  const parsed = Number.parseFloat(value.replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const parseAmazonWeightKg = (value: string | null | undefined): number | null => {
  const normalized = normalizeComparableText(value)?.toLowerCase() ?? null;
  if (normalized === null) return null;

  const match = parseWeightMatch(normalized);
  if (match === null) return null;

  return convertAmazonWeightToKg(match.amount, match.unit);
};

const parseWeightMatch = (value: string): { amount: number; unit: string } | null => {
  const match = value.match(/([\d.,]+)\s*(kg|kilograms?|g|grams?|lb|lbs|pounds?|ounces?|oz)\b/i);
  const amount = parsePositiveNumber(match?.[1]);
  const unit = match?.[2]?.toLowerCase() ?? null;
  if (amount === null || unit === null) return null;
  return { amount, unit };
};

const convertAmazonWeightToKg = (amount: number, unit: string): number => {
  if (unit === 'kg' || unit.startsWith('kilogram')) return roundToDecimals(amount, 2);
  if (unit === 'g' || unit.startsWith('gram')) return roundToDecimals(amount / 1000, 2);
  if (unit === 'oz' || unit === 'ounces' || unit === 'ounce') {
    return roundToDecimals(amount * 0.0283495, 2);
  }
  return roundToDecimals(amount * 0.45359237, 2);
};

export const parseAmazonDimensionsCm = (
  value: string | null | undefined
): ParsedAmazonDimensions | null => {
  const normalized = normalizeComparableText(value)?.toLowerCase() ?? null;
  if (normalized === null) return null;

  const parsed = parseDimensionMatch(matchAmazonDimensions(normalized));
  if (parsed === null) return null;

  return {
    sizeLength: roundToDecimals(parsed.dimensions[0] * parsed.factor, 1),
    sizeWidth: roundToDecimals(parsed.dimensions[1] * parsed.factor, 1),
    length: roundToDecimals(parsed.dimensions[2] * parsed.factor, 1),
  };
};

const matchAmazonDimensions = (value: string): RegExpMatchArray | null =>
  value.match(
    /([\d.,]+)\s*x\s*([\d.,]+)\s*x\s*([\d.,]+)\s*(cm|centimeters?|mm|millimeters?|in|inch|inches)\b/i
  );

const parseDimensionMatch = (
  match: RegExpMatchArray | null
): { dimensions: [number, number, number]; factor: number } | null => {
  if (match === null) return null;
  const dimensions = parseDimensionValues(match.slice(1, 4));
  const factor = resolveDimensionFactor(match[4]);
  if (dimensions === null || factor === null) return null;
  return { dimensions, factor };
};

const parseDimensionValues = (values: string[]): [number, number, number] | null => {
  if (values.length !== 3) return null;

  const parsed = values.map((entry) => parsePositiveNumber(entry)) as [
    number | null,
    number | null,
    number | null,
  ];
  const [sizeLength, sizeWidth, length] = parsed;
  if (sizeLength === null || sizeWidth === null || length === null) return null;
  return [sizeLength, sizeWidth, length];
};

const resolveDimensionFactor = (unitValue: string | undefined): number | null => {
  const unit = unitValue?.toLowerCase() ?? null;
  if (unit === null) return null;
  if (unit === 'cm' || unit.startsWith('centimeter')) return 1;
  if (unit === 'mm' || unit.startsWith('millimeter')) return 0.1;
  return 2.54;
};
