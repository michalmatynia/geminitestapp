import { describe, expect, it } from 'vitest';

import type { ScripterImportDraft } from '@/features/playwright/scripters';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';
import {
  buildScrapeTemplateValues,
  renderScrapeTemplateParameterValues,
  renderScrapeTemplateText,
} from './product-scrape-template-renderer';

const candidate: ProductScrapeCandidate = {
  title: '40k spiritseer',
  sku: 'BATTLESTOCK-13033',
  price: 60,
  sourceUrl: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
  imageLinks: ['https://www.battle-stock.pl/image.jpg'],
};

const draft: ScripterImportDraft = {
  index: 0,
  externalId: '13033',
  mapped: {
    title: '40k spiritseer',
    description: 'Aeldari psyker',
    price: 60,
    currency: 'PLN',
    images: ['https://www.battle-stock.pl/image.jpg'],
    sku: null,
    ean: null,
    brand: 'Games Workshop',
    category: 'Eldar / Aeldari',
    sourceUrl: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
    externalId: '13033',
    raw: {},
  },
  draft: {
    name: '40k spiritseer',
    name_en: '40k spiritseer',
    supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
  },
  raw: {
    product_id: '13033',
    producer: 'Games Workshop',
    category: 'Eldar / Aeldari',
    currency: 'PLN',
  },
  issues: [],
};

const assertBracketPlaceholdersRender = (): void => {
  const values = buildScrapeTemplateValues(draft, candidate);

  expect(
    renderScrapeTemplateText('[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k', values)
  ).toBe('40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k');
  expect(renderScrapeTemplateText('[name(TitleCase)] custom listing', values)).toBe(
    '40K Spiritseer custom listing'
  );
  expect(renderScrapeTemplateText('[title(TitleCase)] custom listing', values)).toBe(
    '40K Spiritseer custom listing'
  );
  expect(renderScrapeTemplateText('[nameTitleCase] custom listing', values)).toBe(
    '40K Spiritseer custom listing'
  );
  expect(renderScrapeTemplateText('[titleTitleCase] custom listing', values)).toBe(
    '40K Spiritseer custom listing'
  );
  expect(renderScrapeTemplateText('[brand] / [category] / [price] [currency]', values)).toBe(
    'Games Workshop / Eldar / Aeldari / 60 PLN'
  );
};

const assertStackedPlaceholderTransformsRender = (): void => {
  const values = buildScrapeTemplateValues(draft, {
    ...candidate,
    title: 'WFB arco-flagelants',
  });

  expect(renderScrapeTemplateText('[name(TitleCase)(remove:"WFB")(trim)]', values)).toBe(
    'Arco-Flagelants'
  );
  expect(renderScrapeTemplateText('[name(remove:"WFB")(trim)(TitleCase)]', values)).toBe(
    'Arco-Flagelants'
  );
};

const assertMalformedTransformsStayVisible = (): void => {
  const values = buildScrapeTemplateValues(draft, candidate);

  expect(renderScrapeTemplateText('[name(remove:"WFB"] custom listing', values)).toBe(
    '[name(remove:"WFB"] custom listing'
  );
};

const assertParameterValuesRender = (): void => {
  const values = buildScrapeTemplateValues(draft, candidate);

  expect(
    renderScrapeTemplateParameterValues(
      [
        { parameterId: 'material', value: 'Metal' },
        { parameterId: 'source', value: '[sourceUrl]' },
        { parameterId: '', value: '[name]' },
      ],
      values
    )
  ).toEqual([
    { parameterId: 'material', value: 'Metal' },
    {
      parameterId: 'source',
      value: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
    },
  ]);
};

const assertLocalizedParameterValuesRender = (): void => {
  const values = buildScrapeTemplateValues(draft, candidate);

  expect(
    renderScrapeTemplateParameterValues(
      [
        {
          parameterId: 'material',
          value: '[brand]',
          valuesByLanguage: {
            en: '[brand]',
            pl: '[category]',
            de: '',
          },
          skipParameterInference: true,
        },
      ],
      values
    )
  ).toEqual([
    {
      parameterId: 'material',
      value: 'Games Workshop',
      valuesByLanguage: {
        en: 'Games Workshop',
        pl: 'Eldar / Aeldari',
      },
      skipParameterInference: true,
    },
  ]);
};

describe('product scrape template renderer', () => {
  it('renders bracket placeholders from mapped scrape values', assertBracketPlaceholdersRender);
  it('renders stacked placeholder transforms from left to right', assertStackedPlaceholderTransformsRender);
  it('leaves malformed placeholder transforms visible', assertMalformedTransformsStayVisible);
  it('renders parameter values and drops invalid parameter rows', assertParameterValuesRender);
  it(
    'renders localized parameter values and preserves inference metadata',
    assertLocalizedParameterValuesRender
  );
});
