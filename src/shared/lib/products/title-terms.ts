import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductTitleTerm,
  ProductTitleTermType,
} from '@/shared/contracts/products/title-terms';

export const PRODUCT_TITLE_SEPARATOR = ' | ';

export type StructuredProductName = {
  baseName: string;
  size: string;
  material: string;
  category: string;
  theme: string;
};

export type StructuredProductTitleLocale = 'en' | 'pl';

export type StructuredProductNameSegments = readonly [string, string, string, string, string];
export type StructuredProductTitleTermValues = Partial<Record<ProductTitleTermType, string>>;

export type PolishStructuredProductNameSyncResult = {
  polishTitle: string;
  generatedPolishTitle: string;
  generatedPolishSegments: StructuredProductNameSegments;
  baseNameSynced: boolean;
};

export const PRODUCT_TITLE_TERM_TYPES = ['size', 'material', 'theme'] as const satisfies readonly ProductTitleTermType[];

const normalizeSegment = (value: string): string => value.trim().replace(/\s+/g, ' ');

export const normalizeTitleTermName = (value: string): string => normalizeSegment(value).toLowerCase();

const toStructuredSegments = (value: string): StructuredProductNameSegments => {
  const [baseName = '', size = '', material = '', category = '', theme = ''] =
    splitStructuredProductName(value);
  return [baseName, size, material, category, theme];
};

export const splitStructuredProductName = (value: string): string[] =>
  value
    .split('|')
    .map((segment: string): string => normalizeSegment(segment));

export const resolveStructuredProductTitleTermValues = (
  value: string
): StructuredProductTitleTermValues => {
  const segments = splitStructuredProductName(value);
  const size = segments[1] ?? '';
  const material = segments[2] ?? '';
  const theme = segments[4] ?? '';

  return {
    ...(size ? { size } : {}),
    ...(material ? { material } : {}),
    ...(theme ? { theme } : {}),
  };
};

export const normalizeStructuredProductName = (value: string): string =>
  splitStructuredProductName(value)
    .filter((segment: string): boolean => segment.length > 0)
    .join(PRODUCT_TITLE_SEPARATOR);

const hasCompleteStructuredSegments = (segments: StructuredProductNameSegments): boolean =>
  segments.every((segment: string): boolean => segment.length > 0);

export const parseStructuredProductName = (value: string): StructuredProductName | null => {
  const [baseName = '', size = '', material = '', category = '', theme = '', ...rest] =
    splitStructuredProductName(value);
  if (rest.length > 0) return null;
  if (!hasCompleteStructuredSegments([baseName, size, material, category, theme])) return null;
  return {
    baseName,
    size,
    material,
    category,
    theme,
  };
};

export const composeStructuredProductName = (value: Partial<StructuredProductName>): string => {
  const segments = [
    normalizeSegment(value.baseName ?? ''),
    normalizeSegment(value.size ?? ''),
    normalizeSegment(value.material ?? ''),
    normalizeSegment(value.category ?? ''),
    normalizeSegment(value.theme ?? ''),
  ];
  return segments.filter((segment: string): boolean => segment.length > 0).join(PRODUCT_TITLE_SEPARATOR);
};

export const composeStructuredProductNameSegments = (value: readonly string[]): string => {
  const segments = value.map((segment: string): string => normalizeSegment(segment));
  let lastNonEmptyIndex = -1;
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if ((segments[index] ?? '').length > 0) {
      lastNonEmptyIndex = index;
      break;
    }
  }
  if (lastNonEmptyIndex < 0) return '';
  return segments.slice(0, lastNonEmptyIndex + 1).join(PRODUCT_TITLE_SEPARATOR);
};

const resolveFirstLocalizedValue = (
  values: ReadonlyArray<string | null | undefined>
): string | null => {
  for (const value of values) {
    const normalized = normalizeSegment(value ?? '');
    if (normalized.length > 0) return normalized;
  }
  return null;
};

export const resolveLocalizedTitleTermName = (
  term: Pick<ProductTitleTerm, 'name_en' | 'name_pl'>,
  locale: StructuredProductTitleLocale
): string =>
  locale === 'pl'
    ? (resolveFirstLocalizedValue([term.name_pl, term.name_en]) ?? '')
    : (resolveFirstLocalizedValue([term.name_en, term.name_pl]) ?? '');

export const resolveLocalizedCategoryName = (
  category: Pick<ProductCategory, 'name' | 'name_en' | 'name_pl' | 'name_de'>,
  locale: StructuredProductTitleLocale
): string =>
  locale === 'pl'
    ? (resolveFirstLocalizedValue([
        category.name_pl,
        category.name_en,
        category.name,
        category.name_de,
      ]) ?? '')
    : (resolveFirstLocalizedValue([
        category.name_en,
        category.name,
        category.name_pl,
        category.name_de,
      ]) ?? '');

const matchesNormalizedValue = (
  candidate: string | null | undefined,
  lookupKey: string
): boolean => normalizeTitleTermName(candidate ?? '') === lookupKey;

const findTitleTermByEnglishSegment = (
  terms: ProductTitleTerm[] | undefined,
  englishSegment: string
): ProductTitleTerm | null => {
  const lookupKey = normalizeTitleTermName(englishSegment);
  if (lookupKey === '') return null;
  const matches = (terms ?? []).filter((term: ProductTitleTerm): boolean =>
    matchesNormalizedValue(term.name_en, lookupKey)
  );
  return matches.length === 1 ? matches[0] ?? null : null;
};

const findCategoryBySegment = (
  categories: ProductCategory[] | undefined,
  segment: string
): ProductCategory | null => {
  const lookupKey = normalizeTitleTermName(segment);
  if (lookupKey === '') return null;
  const matches = (categories ?? []).filter((category: ProductCategory): boolean =>
    [category.name_en, category.name, category.name_pl, category.name_de].some((candidate) =>
      matchesNormalizedValue(candidate, lookupKey)
    )
  );
  return matches.length === 1 ? matches[0] ?? null : null;
};

const translateTitleTermSegment = (
  segment: string,
  terms: ProductTitleTerm[] | undefined,
  locale: StructuredProductTitleLocale
): string => {
  const normalizedSegment = normalizeSegment(segment);
  if (normalizedSegment === '') return '';
  const matchedTerm = findTitleTermByEnglishSegment(terms, normalizedSegment);
  return matchedTerm ? resolveLocalizedTitleTermName(matchedTerm, locale) : normalizedSegment;
};

const translateCategorySegment = (
  segment: string,
  categories: ProductCategory[] | undefined,
  locale: StructuredProductTitleLocale
): string => {
  const normalizedSegment = normalizeSegment(segment);
  if (normalizedSegment === '') return '';
  const matchedCategory = findCategoryBySegment(categories, normalizedSegment);
  return matchedCategory ? resolveLocalizedCategoryName(matchedCategory, locale) : normalizedSegment;
};

export const translateStructuredProductNameSegments = ({
  englishTitle,
  locale,
  sizeTerms,
  materialTerms,
  categories,
  themeTerms,
}: {
  englishTitle: string;
  locale: StructuredProductTitleLocale;
  sizeTerms?: ProductTitleTerm[];
  materialTerms?: ProductTitleTerm[];
  categories?: ProductCategory[];
  themeTerms?: ProductTitleTerm[];
}): StructuredProductNameSegments => {
  const [baseName, size, material, category, theme] = toStructuredSegments(englishTitle);

  return [
    baseName,
    translateTitleTermSegment(size, sizeTerms, locale),
    translateTitleTermSegment(material, materialTerms, locale),
    translateCategorySegment(category, categories, locale),
    translateTitleTermSegment(theme, themeTerms, locale),
  ];
};

export const translateStructuredProductName = ({
  englishTitle,
  locale,
  sizeTerms,
  materialTerms,
  categories,
  themeTerms,
}: {
  englishTitle: string;
  locale: StructuredProductTitleLocale;
  sizeTerms?: ProductTitleTerm[];
  materialTerms?: ProductTitleTerm[];
  categories?: ProductCategory[];
  themeTerms?: ProductTitleTerm[];
}): string => {
  return composeStructuredProductNameSegments(
    translateStructuredProductNameSegments({
      englishTitle,
      locale,
      sizeTerms,
      materialTerms,
      categories,
      themeTerms,
    })
  );
};

const GENERIC_POLISH_BASE_NAME_VALUES = new Set([
  'name',
  'nazwa',
  'nazwa parametru',
  'nazwa produktu',
  'parameter name',
  'product name',
  'title',
  'tytul',
  'tytuł',
  '<name>',
  '<nazwa>',
  '<nazwa parametru>',
  '<nazwa produktu>',
  '<parameter name>',
  '<product name>',
]);

const shouldSyncPolishBaseName = ({
  currentBaseName,
  previousGeneratedBaseName,
  syncPreviousGeneratedBaseName,
}: {
  currentBaseName: string;
  previousGeneratedBaseName: string;
  syncPreviousGeneratedBaseName: boolean;
}): boolean => {
  const normalizedCurrentBaseName = normalizeTitleTermName(currentBaseName);
  if (normalizedCurrentBaseName === '') return true;
  if (GENERIC_POLISH_BASE_NAME_VALUES.has(normalizedCurrentBaseName)) return true;
  if (syncPreviousGeneratedBaseName === false) return false;
  return (
    previousGeneratedBaseName.trim() !== '' &&
    normalizedCurrentBaseName === normalizeTitleTermName(previousGeneratedBaseName)
  );
};

export const syncPolishStructuredProductName = ({
  englishTitle,
  polishTitle,
  previousGeneratedPolishTitle = '',
  syncPreviousGeneratedBaseName = true,
  sizeTerms,
  materialTerms,
  categories,
  themeTerms,
}: {
  englishTitle: string;
  polishTitle: string;
  previousGeneratedPolishTitle?: string;
  syncPreviousGeneratedBaseName?: boolean;
  sizeTerms?: ProductTitleTerm[];
  materialTerms?: ProductTitleTerm[];
  categories?: ProductCategory[];
  themeTerms?: ProductTitleTerm[];
}): PolishStructuredProductNameSyncResult => {
  const generatedPolishSegments = translateStructuredProductNameSegments({
    englishTitle,
    locale: 'pl',
    sizeTerms,
    materialTerms,
    categories,
    themeTerms,
  });
  const currentPolishSegments = toStructuredSegments(polishTitle);
  const previousGeneratedPolishSegments = toStructuredSegments(previousGeneratedPolishTitle);
  const baseNameSynced = shouldSyncPolishBaseName({
    currentBaseName: currentPolishSegments[0],
    previousGeneratedBaseName: previousGeneratedPolishSegments[0],
    syncPreviousGeneratedBaseName,
  });
  const nextPolishSegments: StructuredProductNameSegments = [
    baseNameSynced ? generatedPolishSegments[0] : currentPolishSegments[0],
    generatedPolishSegments[1],
    generatedPolishSegments[2],
    generatedPolishSegments[3],
    generatedPolishSegments[4],
  ];

  return {
    polishTitle: composeStructuredProductNameSegments(nextPolishSegments),
    generatedPolishTitle: composeStructuredProductNameSegments(generatedPolishSegments),
    generatedPolishSegments,
    baseNameSynced,
  };
};
