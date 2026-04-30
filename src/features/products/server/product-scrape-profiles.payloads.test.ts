import { describe, expect, it } from 'vitest';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { ProductDraft } from '@/shared/contracts/products/drafts';

import type { ProductScrapeCandidate, ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';
import { buildCreatePayload } from './product-scrape-profiles.payloads';

const profile: ProductScrapeProfileConfig = {
  id: 'battlestock-warhammer-40k-30k',
  label: 'BattleStock Warhammer 40k / 30k',
  description: 'Products from BattleStock.',
  siteHost: 'www.battle-stock.pl',
  sourceUrl: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
  scripterId: 'battlestock-warhammer-40k-30k',
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
      candidate,
      draft,
      profile,
      catalogIds: ['catalog-battlestock'],
      template: template({ name_en: '[name]' }),
    });

    expect(payload.name_en).toBeUndefined();
    expect(payload.name_pl).toBe('40k spiritseer');
  });

  it('keeps structured rendered English template names when the template selects a category', () => {
    const payload = buildCreatePayload({
      candidate,
      draft,
      profile,
      catalogIds: ['catalog-battlestock'],
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
      candidate,
      draft,
      profile,
      catalogIds: ['catalog-battlestock'],
      template: template({
        categoryId: 'category-pendants',
        name_en: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
      }),
      templateCategoryAliases: ['Display Base'],
    });

    expect(payload.name_en).toBeUndefined();
    expect(payload.categoryId).toBe('category-pendants');
  });
});
