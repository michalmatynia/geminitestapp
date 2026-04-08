import { describe, expect, it } from 'vitest';

import type { ResolvedTraderaCategoryMapping } from '@/features/integrations/services/tradera-listing/category-mapping';
import type {
  TraderaParameterMapperCatalogEntry,
  TraderaParameterMapperRule,
} from '@/shared/contracts/integrations/tradera-parameter-mapper';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  buildTraderaParameterMapperCatalogEntryId,
  buildTraderaParameterMapperFieldKey,
  parseTraderaParameterMapperCatalogJson,
  parseTraderaParameterMapperRulesJson,
  replaceTraderaParameterMapperCatalogEntriesForCategory,
  resolveTraderaParameterMapperSelections,
  serializeTraderaParameterMapperCatalog,
  serializeTraderaParameterMapperRules,
} from './parameter-mapper';

const buildCatalogEntry = (
  overrides: Partial<TraderaParameterMapperCatalogEntry> = {}
): TraderaParameterMapperCatalogEntry => {
  const externalCategoryId = overrides.externalCategoryId ?? 'cat-jewellery';
  const fieldLabel = overrides.fieldLabel ?? 'Jewellery Material';
  const fieldKey = overrides.fieldKey ?? buildTraderaParameterMapperFieldKey(fieldLabel);

  return {
    id:
      overrides.id ??
      buildTraderaParameterMapperCatalogEntryId({
        externalCategoryId,
        fieldKey,
      }),
    externalCategoryId,
    externalCategoryName: overrides.externalCategoryName ?? 'Jewellery',
    externalCategoryPath: overrides.externalCategoryPath ?? 'Accessories > Jewellery',
    fieldLabel,
    fieldKey,
    optionLabels: overrides.optionLabels ?? ['18K', '24K'],
    source: overrides.source ?? 'playwright',
    fetchedAt: overrides.fetchedAt ?? '2026-04-08T10:00:00.000Z',
    runId: overrides.runId ?? 'run-1',
  };
};

const buildRule = (
  overrides: Partial<TraderaParameterMapperRule> = {}
): TraderaParameterMapperRule => {
  const fieldLabel = overrides.fieldLabel ?? 'Jewellery Material';
  const fieldKey = overrides.fieldKey ?? buildTraderaParameterMapperFieldKey(fieldLabel);

  return {
    id: overrides.id ?? 'rule-1',
    externalCategoryId: overrides.externalCategoryId ?? 'cat-jewellery',
    externalCategoryName: overrides.externalCategoryName ?? 'Jewellery',
    externalCategoryPath: overrides.externalCategoryPath ?? 'Accessories > Jewellery',
    fieldLabel,
    fieldKey,
    parameterId: overrides.parameterId ?? 'param-metal',
    parameterName: overrides.parameterName ?? 'Metal',
    parameterCatalogId: overrides.parameterCatalogId ?? 'catalog-a',
    sourceValue: overrides.sourceValue ?? 'Metal',
    targetOptionLabel: overrides.targetOptionLabel ?? '24K',
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? '2026-04-08T09:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-04-08T10:00:00.000Z',
  };
};

describe('tradera parameter mapper helpers', () => {
  it('serializes and parses rule and catalog payloads in updated order', () => {
    const rules = [
      buildRule({ id: 'rule-older', updatedAt: '2026-04-08T09:00:00.000Z' }),
      buildRule({ id: 'rule-newer', updatedAt: '2026-04-08T11:00:00.000Z' }),
    ];
    const catalogEntries = [
      buildCatalogEntry({
        id: 'cat-b:condition',
        externalCategoryId: 'cat-b',
        externalCategoryName: 'Watches',
        externalCategoryPath: 'Accessories > Watches',
        fieldLabel: 'Condition',
        fieldKey: 'condition',
      }),
      buildCatalogEntry(),
    ];

    expect(parseTraderaParameterMapperRulesJson(serializeTraderaParameterMapperRules(rules))).toEqual([
      expect.objectContaining({ id: 'rule-newer' }),
      expect.objectContaining({ id: 'rule-older' }),
    ]);
    expect(
      parseTraderaParameterMapperCatalogJson(serializeTraderaParameterMapperCatalog(catalogEntries))
    ).toEqual([
      expect.objectContaining({ externalCategoryId: 'cat-jewellery' }),
      expect.objectContaining({ externalCategoryId: 'cat-b' }),
    ]);
    expect(serializeTraderaParameterMapperRules([])).toBeNull();
    expect(serializeTraderaParameterMapperCatalog([])).toBeNull();
  });

  it('replaces stored catalog entries only for the requested Tradera category', () => {
    const existingEntries = [
      buildCatalogEntry({
        externalCategoryId: 'cat-jewellery',
        fieldLabel: 'Jewellery Material',
      }),
      buildCatalogEntry({
        id: 'cat-watches:condition',
        externalCategoryId: 'cat-watches',
        externalCategoryName: 'Watches',
        externalCategoryPath: 'Accessories > Watches',
        fieldLabel: 'Condition',
        fieldKey: 'condition',
        optionLabels: ['Used', 'New'],
      }),
    ];
    const nextEntries = [
      buildCatalogEntry({
        id: 'cat-jewellery:stone',
        externalCategoryId: 'cat-jewellery',
        fieldLabel: 'Stone Type',
        fieldKey: 'stonetype',
        optionLabels: ['Diamond'],
      }),
    ];

    expect(
      replaceTraderaParameterMapperCatalogEntriesForCategory({
        existingEntries,
        externalCategoryId: 'cat-jewellery',
        nextEntries,
      })
    ).toEqual([
      expect.objectContaining({ externalCategoryId: 'cat-jewellery', fieldLabel: 'Stone Type' }),
      expect.objectContaining({ externalCategoryId: 'cat-watches', fieldLabel: 'Condition' }),
    ]);
  });

  it('resolves the newest exact-match rule for the mapped Tradera category', () => {
    const mappedCategory: ResolvedTraderaCategoryMapping = {
      externalCategoryId: 'cat-jewellery',
      externalCategoryName: 'Jewellery',
      externalCategoryPath: 'Accessories > Jewellery',
      internalCategoryId: 'internal-1',
      catalogId: 'catalog-a',
      pathSegments: ['Accessories', 'Jewellery'],
    };

    const product = {
      id: 'product-1',
      catalogId: 'catalog-a',
      catalogs: [],
      parameters: [{ parameterId: 'param-metal', value: 'Metal' }],
    } as ProductWithImages;

    const parameters = [
      {
        id: 'param-metal',
        name: 'Metal',
        name_en: 'Metal',
        catalogId: 'catalog-a',
      },
    ] as ProductParameter[];

    const selections = resolveTraderaParameterMapperSelections({
      product,
      mappedCategory,
      rules: [
        buildRule({
          id: 'rule-older',
          targetOptionLabel: '18K',
          updatedAt: '2026-04-08T09:00:00.000Z',
        }),
        buildRule({
          id: 'rule-newer',
          targetOptionLabel: '24K',
          updatedAt: '2026-04-08T11:00:00.000Z',
        }),
        buildRule({
          id: 'rule-other-category',
          externalCategoryId: 'cat-watches',
          externalCategoryName: 'Watches',
          externalCategoryPath: 'Accessories > Watches',
          targetOptionLabel: 'Vintage',
        }),
      ],
      catalogEntries: [
        buildCatalogEntry({
          optionLabels: ['18K', '24K'],
        }),
      ],
      parameters,
    });

    expect(selections).toEqual([
      {
        fieldLabel: 'Jewellery Material',
        fieldKey: 'jewellerymaterial',
        optionLabel: '24K',
        parameterId: 'param-metal',
        parameterName: 'Metal',
        sourceValue: 'Metal',
      },
    ]);
  });
});
