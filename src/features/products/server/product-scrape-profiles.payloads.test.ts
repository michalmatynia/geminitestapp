import { describe, expect, it } from 'vitest';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { PriceGroupForCalculation } from '@/shared/contracts/products/product';
import { PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY } from '@/shared/lib/browser-execution/product-scrape-runtime-constants';

import type { ProductScrapeCandidate, ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';
import { buildCreatePayload } from './product-scrape-profiles.payloads';

const profile: ProductScrapeProfileConfig = {
  id: 'battlestock-warhammer-40k-30k',
  label: 'BattleStock Warhammer 40k / 30k',
  description: 'Products from BattleStock.',
  siteHost: 'www.battle-stock.pl',
  sourceUrl: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
  scripterId: 'battlestock-warhammer-40k-30k',
  runtimeActionKey: PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY,
  targetCatalogName: 'BattleStock',
  defaultLimit: null,
  maxPages: 75,
  skuPrefix: 'BATTLESTOCK-',
  supplierName: 'BattleStock',
  priceComment: 'Scraped from BattleStock',
};

const candidate: ProductScrapeCandidate = {
  title: '40k spiritseer',
  sku: 'BATTLESTOCK-13033',
  price: 60,
  sourceUrl: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
  imageLinks: [],
};

const draft: ScripterImportDraft = {
  index: 0,
  externalId: '13033',
  draft: {
    name: '40k spiritseer',
    name_en: '40k spiritseer',
    supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
  },
  raw: {
    product_id: '13033',
  },
  issues: [],
};

const defaultPayloadInput = {
  candidate,
  draft,
  profile,
  catalogIds: ['catalog-battlestock'],
  catalogDefaultPriceGroupId: null,
  priceGroups: [] as PriceGroupForCalculation[],
  sourcePriceCurrencyCode: 'PLN',
};

const template = (overrides: Partial<ProductDraft>): ProductDraft => {
  const draftTemplate: ProductDraft = {
    id: 'template-1',
    name: 'Scrape template',
    draftKind: 'scrape_template',
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
    ...overrides,
  };
  return draftTemplate;
};

describe('product scrape profile payloads', () => {
  it('drops unstructured rendered English template names so imports can still create products', () => {
    const payload = buildCreatePayload({
      ...defaultPayloadInput,
      template: template({ name_en: '[name]' }),
    });

    expect(payload.name_en).toBe('40k spiritseer');
    expect(payload.name_pl).toBe('40k spiritseer');
  });

  it('keeps structured rendered English template names when the template selects a category', () => {
    const payload = buildCreatePayload({
      ...defaultPayloadInput,
      template: template({
        categoryId: 'category-pendants',
        name_en: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
      }),
      templateCategoryAliases: ['Gaming Pendant'],
    });

    expect(payload.name_en).toBe(
      '40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k'
    );
    expect(payload.categoryId).toBe('category-pendants');
  });

  it('drops structured rendered English template names when the category segment does not match', () => {
    const payload = buildCreatePayload({
      ...defaultPayloadInput,
      template: template({
        categoryId: 'category-pendants',
        name_en: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
      }),
      templateCategoryAliases: ['Display Base'],
    });

    expect(payload.name_en).toBe('40k spiritseer');
    expect(payload.categoryId).toBe('category-pendants');
  });

  it('uses downloaded image file ids instead of scraped image links in file mode', () => {
    const payload = buildCreatePayload({
      ...defaultPayloadInput,
      candidate: {
        ...candidate,
        imageLinks: ['https://www.battle-stock.pl/source-image.jpg'],
      },
      imagePayload: {
        imageFileIds: ['image-file-1'],
        imageLinks: [],
      },
    });

    expect(payload.imageFileIds).toEqual(['image-file-1']);
    expect(payload.imageLinks).toEqual([]);
  });

  it('infers catalog-agnostic linked parameters from rendered structured template names', () => {
    const payload = buildCreatePayload({
      ...defaultPayloadInput,
      template: template({
        categoryId: 'category-pendants',
        name_en: '[name] | 4 cm | Resin | Gaming Figurine | Warhammer',
      }),
      templateCategoryAliases: ['Gaming Figurine'],
      templateLinkedParameterMetadata: {
        parameters: [
          { id: 'param-size', linkedTitleTermType: 'size' },
          { id: 'param-material', linkedTitleTermType: 'material' },
          { id: 'param-theme', linkedTitleTermType: 'theme' },
        ],
        titleTermsByType: {
          size: [
            {
              id: 'term-size',
              catalogId: 'catalog-pin',
              type: 'size',
              name_en: '4 cm',
              name_pl: null,
              createdAt: '2026-04-30T00:00:00.000Z',
              updatedAt: '2026-04-30T00:00:00.000Z',
            },
          ],
          material: [
            {
              id: 'term-material',
              catalogId: 'catalog-pin',
              type: 'material',
              name_en: 'Resin',
              name_pl: 'Zywica',
              createdAt: '2026-04-30T00:00:00.000Z',
              updatedAt: '2026-04-30T00:00:00.000Z',
            },
          ],
          theme: [
            {
              id: 'term-theme',
              catalogId: 'catalog-pin',
              type: 'theme',
              name_en: 'Warhammer',
              name_pl: null,
              createdAt: '2026-04-30T00:00:00.000Z',
              updatedAt: '2026-04-30T00:00:00.000Z',
            },
          ],
        },
      },
    });

    expect(payload.parameters).toEqual([
      {
        parameterId: 'param-size',
        value: '4 cm',
        valuesByLanguage: { en: '4 cm', pl: '4 cm' },
      },
      {
        parameterId: 'param-material',
        value: 'Resin',
        valuesByLanguage: { en: 'Resin', pl: 'Zywica' },
      },
      {
        parameterId: 'param-theme',
        value: 'Warhammer',
        valuesByLanguage: { en: 'Warhammer', pl: 'Warhammer' },
      },
    ]);
  });
});

describe('product scrape profile payload pricing', () => {
  it('calculates imported product price from the catalog default source price group', () => {
    const priceGroups: PriceGroupForCalculation[] = [
      {
        id: 'price-group-retail',
        groupId: 'RETAIL',
        currencyId: 'PLN',
        type: 'standard',
        basePriceField: 'sourcePrice',
        isDefault: false,
        sourceGroupId: null,
        priceMultiplier: 1.5,
        addToPrice: 10,
        currency: { code: 'PLN' },
        currencyCode: 'PLN',
      },
    ];

    const payload = buildCreatePayload({
      ...defaultPayloadInput,
      catalogDefaultPriceGroupId: 'price-group-retail',
      priceGroups,
    });

    expect(payload.defaultPriceGroupId).toBe('price-group-retail');
    expect(payload.sourcePrice).toBe(60);
    expect(payload.sourcePriceCurrencyCode).toBe('PLN');
    expect(payload.price).toBe(100);
  });

  it('uses selected sourcePrice currency when the default group is not sourcePrice-backed', () => {
    const priceGroups: PriceGroupForCalculation[] = [
      {
        id: 'price-group-pln',
        groupId: 'PLN',
        currencyId: 'PLN',
        type: 'standard',
        basePriceField: 'price',
        isDefault: false,
        sourceGroupId: null,
        priceMultiplier: 1,
        addToPrice: 0,
        currency: { code: 'PLN' },
        currencyCode: 'PLN',
      },
      {
        id: 'price-group-eur',
        groupId: 'EUR',
        currencyId: 'EUR',
        type: 'dependent',
        basePriceField: 'price',
        isDefault: false,
        sourceGroupId: 'price-group-pln',
        priceMultiplier: 0.28,
        addToPrice: 0,
        currency: { code: 'EUR' },
        currencyCode: 'EUR',
      },
    ];

    const payload = buildCreatePayload({
      ...defaultPayloadInput,
      catalogDefaultPriceGroupId: 'price-group-eur',
      priceGroups,
      sourcePriceCurrencyCode: 'PLN',
    });

    expect(payload.defaultPriceGroupId).toBe('price-group-eur');
    expect(payload.sourcePrice).toBe(60);
    expect(payload.sourcePriceCurrencyCode).toBe('PLN');
    expect(payload.price).toBe(16.8);
  });
});
