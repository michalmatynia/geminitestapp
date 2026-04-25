import type {
  ProductParameter,
  ProductSimpleParameter,
} from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

const EMPTY_PARAMETER_TIMESTAMP = new Date(0).toISOString();

const normalizeParameterLabel = (parameter: ProductSimpleParameter): string => {
  const candidates = [
    parameter.name_en,
    parameter.name,
    parameter.label,
    parameter.name_pl,
    parameter.name_de,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim();
    if (normalized.length > 0) return normalized;
  }

  return 'Unnamed parameter';
};

const normalizeSimpleParameterOptions = (parameter: ProductSimpleParameter): string[] => {
  if (!Array.isArray(parameter.options)) return [];

  const seen = new Set<string>();
  return parameter.options
    .map((option: string): string => option.trim())
    .filter((option: string): boolean => {
      if (option.length === 0) return false;
      const key = option.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const normalizeSimpleParameterName = (
  value: ProductSimpleParameter['name'],
  fallback: string
): string => (typeof value === 'string' ? value : fallback);

const normalizeSimpleParameterCatalogId = (
  value: ProductSimpleParameter['catalogId'],
  fallback: string
): string => (typeof value === 'string' && value.trim().length > 0 ? value : fallback);

const normalizeNullableSimpleParameterText = (
  value: string | null | undefined
): string | null => value ?? null;

const normalizeSimpleParameterSelectorType = (
  value: ProductSimpleParameter['type']
): ProductParameter['selectorType'] => value ?? 'text';

const normalizeSimpleParameterLinkedTitleTermType = (
  value: ProductSimpleParameter['linkedTitleTermType']
): ProductParameter['linkedTitleTermType'] => value ?? null;

const normalizeSimpleParameterTimestamp = (value: string | undefined): string =>
  value ?? EMPTY_PARAMETER_TIMESTAMP;

const POLISH_PARAMETER_LABEL_PATTERN =
  /(?:[ąćęłńóśźż]|\b(?:cecha|cechy|długość|kolor|materiał|modelu|nazwa|numer|parametr|producent|rodzaj|rozmiar|szerokość|stan|waga|wysokość)\b)/i;

const isLikelyPolishParameterLabel = (value: string): boolean =>
  POLISH_PARAMETER_LABEL_PATTERN.test(value.trim());

const LEGACY_POLISH_PARAMETER_LABELS = new Map<string, { nameEn: string; namePl: string }>([
  [
    'atrybuty niemarkowe amazon',
    {
      nameEn: 'Attributes unbranded (Amazon)',
      namePl: 'Atrybuty Niemarkowe (Amazon)',
    },
  ],
  ['bohater', { nameEn: 'Character', namePl: 'Bohater' }],
  ['dlugosc calkowita', { nameEn: 'Overall Length', namePl: 'Długość całkowita' }],
  ['kolor', { nameEn: 'Colour', namePl: 'Kolor' }],
  ['marka', { nameEn: 'Brand', namePl: 'Marka' }],
  ['material', { nameEn: 'Material', namePl: 'Materiał' }],
  ['nazwa modelu', { nameEn: 'Model Name', namePl: 'Nazwa modelu' }],
  ['numer modelu', { nameEn: 'Model Number', namePl: 'Numer modelu' }],
  ['okazje', { nameEn: 'Occasion', namePl: 'Okazje' }],
  ['postac', { nameEn: 'Character', namePl: 'Postać' }],
  ['rodzaj gadzetu', { nameEn: 'Gadget Type', namePl: 'Rodzaj gadżetu' }],
  ['rozmiar', { nameEn: 'Size', namePl: 'Rozmiar' }],
  ['stan', { nameEn: 'Condition', namePl: 'Stan' }],
  ['stan opakowania', { nameEn: 'Packaging Condition', namePl: 'Stan opakowania' }],
  ['tagi', { nameEn: 'Tags', namePl: 'Tagi' }],
  ['tematyka motyw', { nameEn: 'Theme / Motif', namePl: 'Tematyka, motyw' }],
  ['wysokosc produktu', { nameEn: 'Product Height', namePl: 'Wysokość produktu' }],
]);

const normalizeFallbackLabelLookupKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const resolveLegacyFallbackParameterNames = (
  parameterId: string
): { nameEn: string; namePl: string | null } | null => {
  const names = LEGACY_POLISH_PARAMETER_LABELS.get(normalizeFallbackLabelLookupKey(parameterId));
  return names ? { nameEn: names.nameEn, namePl: names.namePl } : null;
};

const normalizeFallbackParameterLabel = (parameterId: string): string => {
  const normalizedId = parameterId.trim();
  const spaced = normalizedId.replace(/[_-]+/g, ' ').trim();
  if (spaced.length === 0) return 'Unknown parameter';
  const label = spaced.replace(/\b[a-z]/g, (letter: string): string => letter.toUpperCase());
  return isLikelyPolishParameterLabel(label) ? 'Imported parameter' : label;
};

const toProductParameterFromSimple = (
  parameter: ProductSimpleParameter,
  parameterId: string,
  fallbackCatalogId: string
): ProductParameter => {
  const nameEn = normalizeParameterLabel(parameter);
  return {
    id: parameterId,
    name: normalizeSimpleParameterName(parameter.name, nameEn),
    name_en: nameEn,
    name_pl: normalizeNullableSimpleParameterText(parameter.name_pl),
    name_de: normalizeNullableSimpleParameterText(parameter.name_de),
    catalogId: normalizeSimpleParameterCatalogId(parameter.catalogId, fallbackCatalogId),
    selectorType: normalizeSimpleParameterSelectorType(parameter.type),
    optionLabels: normalizeSimpleParameterOptions(parameter),
    linkedTitleTermType: normalizeSimpleParameterLinkedTitleTermType(parameter.linkedTitleTermType),
    createdAt: normalizeSimpleParameterTimestamp(parameter.createdAt),
    updatedAt: normalizeSimpleParameterTimestamp(parameter.updatedAt),
  };
};

const toProductParameterFromSavedValue = (
  parameterId: string,
  fallbackCatalogId: string
): ProductParameter => {
  const legacyNames = resolveLegacyFallbackParameterNames(parameterId);
  const nameEn = legacyNames?.nameEn ?? normalizeFallbackParameterLabel(parameterId);
  return {
    id: parameterId,
    name: nameEn,
    name_en: nameEn,
    name_pl: legacyNames?.namePl ?? null,
    name_de: null,
    catalogId: fallbackCatalogId,
    selectorType: 'text',
    optionLabels: [],
    linkedTitleTermType: null,
    createdAt: EMPTY_PARAMETER_TIMESTAMP,
    updatedAt: EMPTY_PARAMETER_TIMESTAMP,
  };
};

export const mergeParameterDefinitions = ({
  parameters,
  simpleParameters,
  parameterValues = [],
  fallbackCatalogId,
}: {
  parameters: ProductParameter[];
  simpleParameters: ProductSimpleParameter[];
  parameterValues?: ProductParameterValue[];
  fallbackCatalogId: string;
}): ProductParameter[] => {
  const byId = new Map<string, ProductParameter>();

  simpleParameters.forEach((parameter: ProductSimpleParameter) => {
    const normalizedId = typeof parameter.id === 'string' ? parameter.id.trim() : '';
    if (normalizedId.length === 0) return;
    byId.set(normalizedId, toProductParameterFromSimple(parameter, normalizedId, fallbackCatalogId));
  });

  parameterValues.forEach((parameterValue: ProductParameterValue) => {
    const normalizedId =
      typeof parameterValue.parameterId === 'string' ? parameterValue.parameterId.trim() : '';
    if (normalizedId.length === 0) return;
    if (byId.has(normalizedId)) return;
    byId.set(normalizedId, toProductParameterFromSavedValue(normalizedId, fallbackCatalogId));
  });

  parameters.forEach((parameter: ProductParameter) => {
    const normalizedId = typeof parameter.id === 'string' ? parameter.id.trim() : '';
    if (normalizedId.length === 0) return;
    byId.set(normalizedId, parameter);
  });

  return Array.from(byId.values()).sort((a: ProductParameter, b: ProductParameter) =>
    (a.name_en.length > 0 ? a.name_en : '').localeCompare(
      b.name_en.length > 0 ? b.name_en : '',
      undefined,
      { sensitivity: 'base' }
    )
  );
};
