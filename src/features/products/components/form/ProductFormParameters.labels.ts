import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

const POLISH_PARAMETER_LABEL_PATTERN =
  /(?:[ąćęłńóśźż]|\b(?:cecha|cechy|długość|kolor|materiał|modelu|nazwa|numer|producent|rodzaj|rozmiar|szerokość|stan|waga|wysokość)\b)/i;

export const trimString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const readNonEmptyString = (value: unknown): string | null => {
  const trimmed = trimString(value);
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeLanguageCode = (value: unknown): string =>
  trimString(value).toLowerCase();

export const isLikelyPolishParameterLabel = (value: unknown): boolean =>
  POLISH_PARAMETER_LABEL_PATTERN.test(trimString(value));

export const formatParameterIdFallbackLabel = (value: unknown): string | null => {
  const normalized = readNonEmptyString(value);
  if (normalized === null) return null;
  const words = normalized
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((part: string): boolean => part.length > 0);
  if (words.length === 0) return null;
  return words
    .map((word: string): string => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const resolvePolishImportedFallbackLabel = (
  parameter: Pick<ProductParameter, 'id' | 'name_en'>
): string => {
  const fallbackLabel = formatParameterIdFallbackLabel(parameter.id);
  if (fallbackLabel !== null && isLikelyPolishParameterLabel(fallbackLabel) !== true) {
    return fallbackLabel;
  }
  return 'Imported parameter';
};

const shouldUseImportedFallbackLabel = (
  preferred: string,
  value: unknown
): boolean => {
  if (preferred !== 'en' && preferred !== 'default' && preferred.length > 0) return false;
  return isLikelyPolishParameterLabel(value);
};

const resolvePreferredParameterLabel = (args: {
  preferred: string;
  namePl: string | null;
  nameDe: string | null;
}): string | null => {
  if (args.preferred === 'pl') return args.namePl;
  if (args.preferred === 'de') return args.nameDe;
  return null;
};

export const getParameterLabel = (
  parameter: Pick<ProductParameter, 'id' | 'name_de' | 'name_en' | 'name_pl'>,
  preferredLocale?: string
): string => {
  const preferred = normalizeLanguageCode(preferredLocale);
  const namePl = readNonEmptyString(parameter.name_pl);
  const nameDe = readNonEmptyString(parameter.name_de);
  const nameEn = readNonEmptyString(parameter.name_en);
  const preferredLabel = resolvePreferredParameterLabel({ preferred, namePl, nameDe });

  if (preferredLabel !== null) return preferredLabel;
  if (shouldUseImportedFallbackLabel(preferred, parameter.name_en)) {
    return resolvePolishImportedFallbackLabel(parameter);
  }
  return nameEn ?? namePl ?? nameDe ?? 'Unnamed parameter';
};

export const buildParameterOptions = (
  parameters: ProductParameter[],
  preferredLocale?: string
): Array<LabeledOptionDto<string>> =>
  parameters.map((parameter) => ({
    value: parameter.id,
    label: getParameterLabel(parameter, preferredLocale),
  }));

export const buildLabelOptions = (labels: string[]): Array<LabeledOptionDto<string>> =>
  labels.map((label) => ({ value: label, label }));

const readValuesByLanguage = (
  entry: ProductParameterValue
): Record<string, string> | null => {
  if (entry.valuesByLanguage === undefined) return null;
  if (Array.isArray(entry.valuesByLanguage)) return null;
  return typeof entry.valuesByLanguage === 'object' ? entry.valuesByLanguage : null;
};

export const getParameterLanguageValue = (
  entry: ProductParameterValue,
  languageCode: string,
  primaryLanguageCode: string
): string => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode);
  if (normalizedLanguageCode.length === 0) return '';
  const valuesByLanguage = readValuesByLanguage(entry);
  const localizedValue = valuesByLanguage?.[normalizedLanguageCode];
  if (typeof localizedValue === 'string') return localizedValue;
  // For non-primary languages: never fall back to other-language values or scalar
  if (normalizedLanguageCode !== primaryLanguageCode) return '';
  // For the primary language: fall back to scalar only for legacy non-localized values.
  if (valuesByLanguage && Object.keys(valuesByLanguage).length > 0) return '';
  return typeof entry.value === 'string' ? entry.value : '';
};

export const parseChecklistValues = (value: string): string[] => {
  const seen = new Set<string>();
  return value
    .split(/[,;\n]/)
    .map((entry: string) => entry.trim())
    .filter((entry: string): boolean => {
      if (entry.length === 0) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const formatChecklistValues = (values: string[]): string => values.join(', ');

export const getLinkedTitleTermLabel = (
  value: ProductParameter['linkedTitleTermType']
): string | null => {
  switch (value) {
    case 'size':
      return 'Size';
    case 'material':
      return 'Material';
    case 'theme':
      return 'Theme';
    default:
      return null;
  }
};
