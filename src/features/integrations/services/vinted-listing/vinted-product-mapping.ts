import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type {
  ProductParameterValue,
  ProductWithImages,
} from '@/shared/contracts/products/product';
import { resolveMarketplaceAwareProductCopy } from '@/shared/lib/products/utils/marketplace-content-overrides';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeLookupKey = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const dedupeStrings = (values: readonly (string | null | undefined)[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const normalized = normalizeLookupKey(trimmed);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(trimmed);
  }
  return result;
};

const toPreferredParameterValue = (value: ProductParameterValue): string => {
  const directValue = toTrimmedString(value.value);
  if (directValue) return directValue;

  const valuesByLanguage = value.valuesByLanguage ?? {};
  return (
    toTrimmedString(valuesByLanguage['pl']) ||
    toTrimmedString(valuesByLanguage['en']) ||
    toTrimmedString(valuesByLanguage['de']) ||
    Object.values(valuesByLanguage)
      .map((entry) => toTrimmedString(entry))
      .find(Boolean) ||
    ''
  );
};

const toPreferredCategoryLabel = (category: ProductCategory): string =>
  toTrimmedString(category.name_pl) ||
  toTrimmedString(category.name_en) ||
  toTrimmedString(category.name_de) ||
  toTrimmedString(category.name) ||
  toTrimmedString(category.id);

const toPathSegments = (value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const segments = trimmed
    .split(/\s*(?:>|\/|\\|›|»|→)\s*/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments : [trimmed];
};

type MappingSourceKind =
  | 'custom_field'
  | 'parameter'
  | 'producer'
  | 'product_field'
  | 'product_category';

type MappingValue = {
  kind: MappingSourceKind;
  sourceName: string | null;
  normalizedNames: string[];
  label: string;
};

export type VintedResolvedField = {
  label: string;
  source: MappingSourceKind;
  sourceName: string | null;
};

export type VintedResolvedCategoryField = VintedResolvedField & {
  pathSegments: string[];
  pathLabel: string;
};

export type VintedProductMapping = {
  title: string;
  description: string;
  price: string;
  brand: VintedResolvedField | null;
  condition: VintedResolvedField | null;
  size: VintedResolvedField | null;
  category: VintedResolvedCategoryField | null;
  diagnostics: {
    availableCustomFields: string[];
    availableParameters: string[];
    productCategoryPath: string | null;
    producerNames: string[];
  };
};

const VINTED_BRAND_ALIAS_GROUPS = [
  ['vintedbrand'],
  ['brand', 'marka', 'producer', 'manufacturer'],
] as const;

const VINTED_CATEGORY_ALIAS_GROUPS = [
  ['vintedcategory'],
  ['marketplacecategory'],
  ['category', 'kategoria'],
] as const;

const VINTED_CONDITION_ALIAS_GROUPS = [
  ['vintedcondition'],
  ['productcondition'],
  ['condition', 'stan'],
] as const;

const VINTED_SIZE_ALIAS_GROUPS = [
  ['vintedsize'],
  ['sizelabel'],
  ['size', 'rozmiar'],
] as const;

const collectCustomFieldValues = ({
  product,
  customFieldDefinitions,
}: {
  product: ProductWithImages;
  customFieldDefinitions: ProductCustomFieldDefinition[];
}): MappingValue[] => {
  const definitionsById = new Map(
    customFieldDefinitions.map((definition) => [definition.id, definition] as const)
  );

  return (product.customFields ?? []).flatMap((customFieldValue: ProductCustomFieldValue) => {
    const definition = definitionsById.get(customFieldValue.fieldId);
    if (!definition) return [];

    const selectedLabel =
      (customFieldValue.selectedOptionIds ?? [])
        .map((optionId) =>
          definition.options.find((option) => option.id === optionId)?.label?.trim() ?? ''
        )
        .find(Boolean) ?? '';
    const label = selectedLabel || toTrimmedString(customFieldValue.textValue);
    if (!label) return [];

    return [
      {
        kind: 'custom_field',
        sourceName: definition.name,
        normalizedNames: [normalizeLookupKey(definition.name)],
        label,
      },
    ];
  });
};

const collectParameterValues = ({
  product,
  parameters,
}: {
  product: ProductWithImages;
  parameters: ProductParameter[];
}): MappingValue[] => {
  const parametersById = new Map(parameters.map((parameter) => [parameter.id, parameter] as const));

  return (product.parameters ?? []).flatMap((parameterValue: ProductParameterValue) => {
    const parameter = parametersById.get(parameterValue.parameterId);
    if (!parameter) return [];

    const label = toPreferredParameterValue(parameterValue);
    if (!label) return [];

    const parameterNames = dedupeStrings([
      parameter.name,
      parameter.name_en,
      parameter.name_pl,
      parameter.name_de,
    ]);
    return [
      {
        kind: 'parameter',
        sourceName: parameterNames[0] ?? parameter.id,
        normalizedNames: parameterNames.map(normalizeLookupKey),
        label,
      },
    ];
  });
};

const collectProducerValues = (product: ProductWithImages): MappingValue[] => {
  const producerNames = dedupeStrings(
    (product.producers ?? []).flatMap((producerRelation) => [
      toTrimmedString(producerRelation.producer?.name),
    ])
  );

  return producerNames.map((producerName) => ({
    kind: 'producer',
    sourceName: 'producer',
    normalizedNames: ['producer', 'brand', 'manufacturer'],
    label: producerName,
  }));
};

const collectProductFieldValues = (product: ProductWithImages): MappingValue[] => {
  const productRecord = product as Record<string, unknown>;
  const brandValue =
    toTrimmedString(productRecord['brand']) ||
    toTrimmedString(productRecord['producer']) ||
    toTrimmedString(productRecord['manufacturer']);
  if (!brandValue) return [];

  return [
    {
      kind: 'product_field',
      sourceName: 'brand',
      normalizedNames: ['brand', 'producer', 'manufacturer'],
      label: brandValue,
    },
  ];
};

const resolveProductCategory = ({
  product,
  categories,
}: {
  product: ProductWithImages;
  categories: ProductCategory[];
}): VintedResolvedCategoryField | null => {
  const productCategoryId = toTrimmedString(product.categoryId);
  if (!productCategoryId) return null;

  const categoriesById = new Map(
    categories.map((category) => [toTrimmedString(category.id), category] as const)
  );
  const pathSegments: string[] = [];
  const visited = new Set<string>();
  let currentCategoryId: string | null = productCategoryId;

  while (currentCategoryId && !visited.has(currentCategoryId)) {
    visited.add(currentCategoryId);
    const category = categoriesById.get(currentCategoryId);
    if (!category) {
      pathSegments.unshift(currentCategoryId);
      break;
    }
    pathSegments.unshift(toPreferredCategoryLabel(category));
    currentCategoryId = toTrimmedString(category.parentId) || null;
  }

  if (pathSegments.length === 0) return null;

  return {
    label: pathSegments[pathSegments.length - 1] ?? pathSegments[0] ?? productCategoryId,
    source: 'product_category',
    sourceName: productCategoryId,
    pathSegments,
    pathLabel: pathSegments.join(' > '),
  };
};

const findMappedValue = (
  values: readonly MappingValue[],
  aliasGroups: readonly (readonly string[])[]
): VintedResolvedField | null => {
  for (const aliasGroup of aliasGroups) {
    for (const alias of aliasGroup) {
      const match = values.find((value) => value.normalizedNames.includes(alias));
      if (match) {
        return {
          label: match.label,
          source: match.kind,
          sourceName: match.sourceName,
        };
      }
    }
  }

  return null;
};

const findMappedCategory = (
  values: readonly MappingValue[]
): VintedResolvedCategoryField | null => {
  const mapped = findMappedValue(values, VINTED_CATEGORY_ALIAS_GROUPS);
  if (!mapped) return null;

  const pathSegments = toPathSegments(mapped.label);
  if (pathSegments.length === 0) return null;

  return {
    ...mapped,
    label: pathSegments[pathSegments.length - 1] ?? mapped.label,
    pathSegments,
    pathLabel: pathSegments.join(' > '),
  };
};

export const resolveVintedProductMapping = ({
  product,
  integrationId,
  customFieldDefinitions,
  parameters,
  categories,
}: {
  product: ProductWithImages;
  integrationId?: string | null | undefined;
  customFieldDefinitions: ProductCustomFieldDefinition[];
  parameters: ProductParameter[];
  categories: ProductCategory[];
}): VintedProductMapping => {
  const { title, description } = resolveMarketplaceAwareProductCopy({
    product,
    integrationId,
    preferredLocales: ['pl', 'en', 'de'],
  });
  const price = product.price ? String(Math.floor(product.price)) : '10';

  const customFieldValues = collectCustomFieldValues({ product, customFieldDefinitions });
  const parameterValues = collectParameterValues({ product, parameters });
  const producerValues = collectProducerValues(product);
  const productFieldValues = collectProductFieldValues(product);
  const namedValues = [
    ...customFieldValues,
    ...parameterValues,
    ...producerValues,
    ...productFieldValues,
  ];

  const explicitCategory = findMappedCategory(namedValues);
  const fallbackCategory = resolveProductCategory({ product, categories });

  return {
    title,
    description,
    price,
    brand: findMappedValue(namedValues, VINTED_BRAND_ALIAS_GROUPS),
    condition: findMappedValue(namedValues, VINTED_CONDITION_ALIAS_GROUPS),
    size: findMappedValue(namedValues, VINTED_SIZE_ALIAS_GROUPS),
    category: explicitCategory ?? fallbackCategory,
    diagnostics: {
      availableCustomFields: dedupeStrings(customFieldDefinitions.map((definition) => definition.name)),
      availableParameters: dedupeStrings(
        parameters.flatMap((parameter) => [
          parameter.name,
          parameter.name_en,
          parameter.name_pl,
          parameter.name_de,
        ])
      ),
      productCategoryPath: fallbackCategory?.pathLabel ?? null,
      producerNames: dedupeStrings(producerValues.map((value) => value.label)),
    },
  };
};
