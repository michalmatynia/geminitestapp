import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductParameter } from '@/shared/contracts/products/parameters';

type BuildParameterValueInferenceTriggerInputArgs = {
  values: ProductFormData & Record<string, unknown>;
  imageLinks?: string[] | undefined;
  row: {
    index: number;
    parameter: ProductParameter;
    languageCode: string;
    languageLabel: string;
    currentValue: string;
  };
};

export type ParameterValueInferenceTriggerInput = {
  product: {
    title: string;
    description: string;
    titleByLanguage: Record<string, string>;
    descriptionByLanguage: Record<string, string>;
    imageLinks: string[];
  };
  targetParameter: {
    id: string;
    rowIndex: number;
    languageCode: string;
    languageLabel: string;
    selectorType: ProductParameter['selectorType'];
    name: string;
    namesByLanguage: Record<string, string>;
    optionLabels: string[];
    currentValue: string | null;
  };
  currentValue: string | null;
};

const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeLanguageCode = (value: unknown): string => {
  if (typeof value !== 'string') return 'en';
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : 'en';
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry: unknown) => {
    const normalized = normalizeOptionalText(entry);
    if (normalized !== null) unique.add(normalized);
  });
  return Array.from(unique);
};

const normalizeOptionLabels = (value: unknown): string[] => normalizeStringArray(value);

const buildLanguageMap = (
  values: ProductFormData & Record<string, unknown>,
  prefix: 'name' | 'description'
): Record<string, string> => {
  const result: Record<string, string> = {};
  (['en', 'pl', 'de'] as const).forEach((languageCode) => {
    const normalized = normalizeOptionalText(values[`${prefix}_${languageCode}`]);
    if (normalized !== null) {
      result[languageCode] = normalized;
    }
  });
  return result;
};

const resolvePreferredLanguageValue = (
  valuesByLanguage: Record<string, string>,
  languageCode: string
): string => {
  return (
    valuesByLanguage[languageCode] ??
    valuesByLanguage.en ??
    valuesByLanguage.pl ??
    valuesByLanguage.de ??
    ''
  );
};

const resolveParameterName = (
  parameter: ProductParameter,
  languageCode: string
): string => {
  const namesByLanguage = {
    en: parameter.name_en,
    ...(typeof parameter.name_pl === 'string' && parameter.name_pl.trim().length > 0
      ? { pl: parameter.name_pl }
      : {}),
    ...(typeof parameter.name_de === 'string' && parameter.name_de.trim().length > 0
      ? { de: parameter.name_de }
      : {}),
  };
  const resolved = resolvePreferredLanguageValue(namesByLanguage, languageCode);
  return resolved.length > 0 ? resolved : 'Unnamed parameter';
};

export const buildParameterValueInferenceTriggerInput = (
  args: BuildParameterValueInferenceTriggerInputArgs
): ParameterValueInferenceTriggerInput => {
  const languageCode = normalizeLanguageCode(args.row.languageCode);
  const titleByLanguage = buildLanguageMap(args.values, 'name');
  const descriptionByLanguage = buildLanguageMap(args.values, 'description');
  const currentValue = normalizeOptionalText(args.row.currentValue);
  const namesByLanguage = {
    en: args.row.parameter.name_en,
    ...(typeof args.row.parameter.name_pl === 'string' &&
    args.row.parameter.name_pl.trim().length > 0
      ? { pl: args.row.parameter.name_pl }
      : {}),
    ...(typeof args.row.parameter.name_de === 'string' &&
    args.row.parameter.name_de.trim().length > 0
      ? { de: args.row.parameter.name_de }
      : {}),
  };

  return {
    product: {
      title: resolvePreferredLanguageValue(titleByLanguage, languageCode),
      description: resolvePreferredLanguageValue(descriptionByLanguage, languageCode),
      titleByLanguage,
      descriptionByLanguage,
      imageLinks: normalizeStringArray(args.imageLinks ?? args.values.imageLinks),
    },
    targetParameter: {
      id: args.row.parameter.id,
      rowIndex: args.row.index,
      languageCode,
      languageLabel: normalizeOptionalText(args.row.languageLabel) ?? languageCode.toUpperCase(),
      selectorType: args.row.parameter.selectorType,
      name: resolveParameterName(args.row.parameter, languageCode),
      namesByLanguage,
      optionLabels: normalizeOptionLabels(args.row.parameter.optionLabels),
      currentValue,
    },
    currentValue,
  };
};
