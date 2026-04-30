import { beforeEach, expect, it } from 'vitest';

import {
  BATTLESTOCK_PROFILE_ID,
  BATTLESTOCK_SOURCE_URL,
  importProductScrapeProfiles,
  makeDraft,
  makeSource,
  productScrapeProfileMocks as mocks,
  type ProductScrapeProfilesModule,
  resetProductScrapeProfileMocks,
} from './__tests__/product-scrape-profiles.support';

let scrapeProfiles: ProductScrapeProfilesModule;

const templateDraft = {
  id: 'draft-template-1',
  name: 'BattleStock pendant template',
  draftKind: 'scrape_template',
  scrapeProfileId: BATTLESTOCK_PROFILE_ID,
  name_en: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
  name_pl: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
  supplierName: 'BattleStock',
  supplierLink: '[sourceUrl]',
  priceComment: 'Scraped [price] [currency]',
  ean: '[externalId]',
  price: 99,
  weight: 0.2,
  sizeLength: 5,
  sizeWidth: 1,
  length: 5,
  stock: 4,
  defaultPriceGroupId: 'price-group-retail',
  shippingGroupId: 'shipping-small',
  catalogIds: ['catalog-template'],
  categoryId: 'category-pendants',
  tagIds: ['tag-warhammer'],
  producerIds: ['producer-games-workshop'],
  customFields: [{ fieldId: 'source-url', textValue: '[sourceUrl]' }],
  parameters: [
    { parameterId: 'source-brand', value: '[brand]' },
    {
      parameterId: 'material',
      value: 'Metal',
      valuesByLanguage: { en: 'Metal', pl: 'Metal PL' },
      skipParameterInference: true,
    },
  ],
  marketplaceContentOverrides: [
    {
      integrationIds: ['integration-allegro'],
      title: '[name] custom listing',
      description: '[description]',
    },
  ],
  notes: { text: 'Scraped category [category]', color: '#60a5fa' },
};

const mappedTemplateDraft = {
  ...makeDraft(),
  mapped: {
    title: '40k spiritseer',
    description: 'Psyker unit',
    price: 60,
    currency: 'PLN',
    images: [],
    sku: null,
    ean: null,
    brand: 'Games Workshop',
    category: 'Eldar / Aeldari',
    sourceUrl: BATTLESTOCK_SOURCE_URL,
    externalId: '13033',
    raw: {},
  },
  raw: {
    product_id: '13033',
    name: '40k spiritseer',
    price_raw: '60',
    currency: 'PLN',
    producer: 'Games Workshop',
  },
};

const expectedTemplateCreatePayload = {
  name_en: '40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
  name_pl: '40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
  supplierLink: BATTLESTOCK_SOURCE_URL,
  priceComment: 'Scraped 60 PLN',
  ean: '13033',
  price: 99,
  weight: 0.2,
  sizeLength: 5,
  sizeWidth: 1,
  length: 5,
  stock: 4,
  defaultPriceGroupId: 'price-group-retail',
  shippingGroupId: 'shipping-small',
  categoryId: 'category-pendants',
  tagIds: ['tag-warhammer'],
  producerIds: ['producer-games-workshop'],
  customFields: [{ fieldId: 'source-url', textValue: BATTLESTOCK_SOURCE_URL }],
  parameters: [
    { parameterId: 'source-brand', value: 'Games Workshop' },
    {
      parameterId: 'material',
      value: 'Metal',
      valuesByLanguage: { en: 'Metal', pl: 'Metal PL' },
      skipParameterInference: true,
    },
  ],
  marketplaceContentOverrides: [
    {
      integrationIds: ['integration-allegro'],
      title: '40k spiritseer custom listing',
      description: 'Psyker unit',
    },
  ],
  notes: { text: 'Scraped category Eldar / Aeldari', color: '#60a5fa' },
  sourcePrice: 60,
};

beforeEach(async () => {
  resetProductScrapeProfileMocks();
  scrapeProfiles = await importProductScrapeProfiles();
});

it('renders selected scrape template placeholders into created products', async () => {
  mocks.getDraft.mockResolvedValue(templateDraft);
  mocks.dryRun.mockResolvedValue(makeSource([mappedTemplateDraft]));

  const response = await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
    draftTemplateId: 'draft-template-1',
  });

  expect(mocks.getDraft).toHaveBeenCalledWith('draft-template-1');
  expect(mocks.getCategoryById).toHaveBeenCalledWith('category-pendants');
  expect(mocks.createProduct).toHaveBeenCalledWith(
    expect.objectContaining(expectedTemplateCreatePayload),
    undefined
  );
  expect(response.products[0]?.title).toBe(
    '40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k'
  );
});

it('renders selected scrape template placeholders in dry run results', async () => {
  mocks.getDraft.mockResolvedValue({
    id: 'draft-template-1',
    name: 'BattleStock pendant template',
    draftKind: 'scrape_template',
    scrapeProfileId: BATTLESTOCK_PROFILE_ID,
    name_pl: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
  });

  const response = await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
    draftTemplateId: 'draft-template-1',
    dryRun: true,
  });

  expect(mocks.createProduct).not.toHaveBeenCalled();
  expect(mocks.updateProduct).not.toHaveBeenCalled();
  expect(response.products[0]).toMatchObject({
    status: 'dry_run',
    title: '40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
  });
});
