/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import {
  extractTraderaListingFormCategoryPickerItems,
  TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR,
} from './tradera-listing-form-category-picker';
import {
  clearTraderaPublicCategoryPageCache,
  fetchTraderaPublicCategoryChildItemsForPath,
  fetchTraderaPublicCategoryChildItems,
  parseTraderaPublicCategoryLinkItems,
  mergeTraderaPublicCategoryChildItems,
  parseTraderaPublicCategoryChildItems,
} from './tradera-listing-form-category-public-page';
import {
  filterTraderaListingFormPostSelectionCategoryItems,
  shouldUseReopenedTraderaListingFormCategoryPickerItems,
} from './tradera-listing-form-category-picker-state';
import { extractTraderaListingFormPostSelectionTextCategoryItems } from './tradera-listing-form-category-post-selection-text';
import { crawlTraderaListingFormCategoryTree } from './tradera-listing-form-category-tree-crawl';

const makeElementVisible = (element: Element): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: 20,
      height: 20,
      left: 0,
      right: 140,
      top: 0,
      width: 140,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    }),
  });
};

const readPickerItems = (): ReturnType<
  typeof extractTraderaListingFormCategoryPickerItems
> => {
  const root = document.querySelector('[data-test-category-chooser="true"]');
  if (root === null) return [];
  const elements = Array.from(
    root.querySelectorAll(TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR)
  );
  for (const element of elements) {
    makeElementVisible(element);
  }
  return extractTraderaListingFormCategoryPickerItems(elements);
};

describe('tradera listing form category picker extraction', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearTraderaPublicCategoryPageCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads visible category options across current Tradera picker roles', () => {
    document.body.innerHTML = `
      <div data-test-category-chooser="true">
        <nav aria-label="Breadcrumb">
          <button type="button">Accessories</button>
        </nav>
        <button type="button" aria-label="Back">Back</button>
        <button type="button" role="menuitemradio" data-category-id="100">
          Accessories
        </button>
        <button type="button" role="option" data-value="101">
          Patches & pins
        </button>
        <a href="/en/category/102">Pins</a>
      </div>
    `;

    expect(readPickerItems()).toEqual([
      { id: '100', name: 'Accessories' },
      { id: '101', name: 'Patches & pins' },
      { id: '102', name: 'Pins' },
    ]);
  });

  it('deduplicates labels and ignores hidden or picker navigation controls', () => {
    document.body.innerHTML = `
      <div data-test-category-chooser="true">
        <button type="button" role="menuitem" data-category-id="200">
          Antiques & Design
        </button>
        <button type="button" role="menuitem" data-category-id="duplicate">
          Antiques & Design
        </button>
        <button type="button" role="menuitem" style="display: none">
          Hidden option
        </button>
        <button type="button" title="Tillbaka">Ignored back button</button>
        <button type="button" role="menuitem" data-id="201">
          Ceramics
        </button>
        <button type="button">Listing details</button>
        <button type="button">Listing format</button>
        <button type="button">Choose</button>
        <button type="button">VAT</button>
        <button type="button">Preview</button>
      </div>
    `;

    expect(readPickerItems()).toEqual([
      { id: '200', name: 'Antiques & Design' },
      { id: '201', name: 'Ceramics' },
    ]);
  });

  it('accepts reopened child options after Tradera closes a selected parent category', () => {
    expect(
      shouldUseReopenedTraderaListingFormCategoryPickerItems({
        clickedName: 'Pins & needles',
        nextName: null,
        optionsBefore: ['Badges', 'Pins & needles', 'Postcards'],
        reopenedItems: [
          { id: 'pins-advertising', name: 'Advertising' },
          { id: 'pins-club', name: 'Club Pins' },
          { id: 'pins-other', name: 'Other pins & needles' },
        ],
      })
    ).toBe(true);
  });

  it('rejects reopened sibling menus when a closed category did not reveal children', () => {
    expect(
      shouldUseReopenedTraderaListingFormCategoryPickerItems({
        clickedName: 'Pins & needles',
        nextName: null,
        optionsBefore: ['Badges', 'Pins & needles', 'Postcards'],
        reopenedItems: [
          { id: 'badges', name: 'Badges' },
          { id: 'pins', name: 'Pins & needles' },
          { id: 'postcards', name: 'Postcards' },
        ],
      })
    ).toBe(false);
  });

  it('extracts page-level child categories after Pins & needles is selected', () => {
    const items = [
      { id: 'collectibles', name: 'Collectibles' },
      { id: 'pins-needles', name: 'Pins & needles' },
      { id: 'pins-advertising', name: 'Advertising' },
      { id: 'pins-club', name: 'Club Pins' },
      { id: 'pins-geographic', name: 'Geographic' },
      { id: 'pins-historical', name: 'Historical' },
      { id: 'pins-music', name: 'Music & bands' },
      { id: 'pins-other', name: 'Other pins & needles' },
      { id: 'pins-social', name: 'Social Movement' },
      { id: 'pins-sports', name: 'Sports' },
      { id: 'pins-labor', name: 'The Labor Movement' },
    ];

    expect(
      filterTraderaListingFormPostSelectionCategoryItems({
        items,
        nextName: null,
        optionsBefore: ['Badges', 'Pins & needles', 'Postcards'],
        pathNames: ['Collectibles', 'Pins & needles'],
      })
    ).toEqual([
      { id: 'pins-advertising', name: 'Advertising' },
      { id: 'pins-club', name: 'Club Pins' },
      { id: 'pins-geographic', name: 'Geographic' },
      { id: 'pins-historical', name: 'Historical' },
      { id: 'pins-music', name: 'Music & bands' },
      { id: 'pins-other', name: 'Other pins & needles' },
      { id: 'pins-social', name: 'Social Movement' },
      { id: 'pins-sports', name: 'Sports' },
      { id: 'pins-labor', name: 'The Labor Movement' },
    ]);
  });

  it('extracts text-only child categories after Pins & needles is selected', () => {
    expect(
      extractTraderaListingFormPostSelectionTextCategoryItems({
        nextName: null,
        optionsBefore: [
          'Advertising Gadgets',
          'Autographs',
          'Playing Cards',
          'Pins & needles',
        ],
        pathNames: ['Collectibles', 'Pins & needles'],
        text: `
          Collectibles
          Pins & needles
          Advertising
          Club Pins
          Geographic
          Historical
          Music & bands
          Other pins & needles
          Social Movement
          Sports
          The Labor Movement
          Listing details
          Listing format
          Choose
          VAT
          0 %
        `,
      })
    ).toEqual([
      { id: '', name: 'Advertising' },
      { id: '', name: 'Club Pins' },
      { id: '', name: 'Geographic' },
      { id: '', name: 'Historical' },
      { id: '', name: 'Music & bands' },
      { id: '', name: 'Other pins & needles' },
      { id: '', name: 'Social Movement' },
      { id: '', name: 'Sports' },
      { id: '', name: 'The Labor Movement' },
    ]);
  });

  it('fills text-only child category ids from Tradera public category page data', () => {
    const publicItems = parseTraderaPublicCategoryChildItems(`
      "activeCategory":{"id":2929,"name":"Pins \\u0026 needles","children":[
        {"id":292904,"name":"Other pins \\u0026 needles","url":"https://www.tradera.com/category/292904"},
        {"id":292908,"name":"Advertising","url":"https://www.tradera.com/category/292908"},
        {"id":1000126,"name":"Music \\u0026 bands","url":"https://www.tradera.com/category/1000126"}
      ],"isSelected":true}
    `);

    expect(publicItems).toEqual([
      { id: '292904', name: 'Other pins & needles' },
      { id: '292908', name: 'Advertising' },
      { id: '1000126', name: 'Music & bands' },
    ]);
    expect(
      mergeTraderaPublicCategoryChildItems(
        [
          { id: '', name: 'Advertising' },
          { id: '', name: 'Music & bands' },
        ],
        publicItems
      )
    ).toEqual([
      { id: '292908', name: 'Advertising' },
      { id: '1000126', name: 'Music & bands' },
    ]);
  });

  it('fetches public child categories for numeric listing-form parents', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => `
        "activeCategory":{"id":2929,"name":"Pins \\u0026 needles","children":[
          {"id":292908,"name":"Advertising","url":"https://www.tradera.com/category/292908"}
        ],"isSelected":true}
      `,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchTraderaPublicCategoryChildItems({ id: '2929', name: 'Pins & needles' })
    ).resolves.toEqual([{ id: '292908', name: 'Advertising' }]);
    await expect(
      fetchTraderaPublicCategoryChildItems({ id: '', name: 'Pins & needles' })
    ).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://www.tradera.com/en/category/2929');
  });

  it('resolves text-only category paths before fetching public child categories', async () => {
    expect(
      parseTraderaPublicCategoryLinkItems(`
        <div class="hidden" data-sentry-component="SeoLinks">
          <a href="/en/category/29">Collectibles</a>
          <a href="/en/category/24">Jewelry &amp; Gemstones</a>
        </div>
      `)
    ).toEqual([
      { id: '29', name: 'Collectibles' },
      { id: '24', name: 'Jewelry & Gemstones' },
    ]);

    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      text: async () => {
        if (url === 'https://www.tradera.com/en') {
          return `
            <div class="hidden" data-sentry-component="SeoLinks">
              <a href="/en/category/29">Collectibles</a>
            </div>
          `;
        }
        if (url === 'https://www.tradera.com/en/category/29') {
          return `
            "activeCategory":{"id":29,"name":"Collectibles","children":[
              {"id":2929,"name":"Pins \\u0026 needles","url":"https://www.tradera.com/category/2929"}
            ],"isSelected":true}
          `;
        }
        return `
          "activeCategory":{"id":2929,"name":"Pins \\u0026 needles","children":[
            {"id":292908,"name":"Advertising","url":"https://www.tradera.com/category/292908"},
            {"id":292901,"name":"Club Pins","url":"https://www.tradera.com/category/292901"}
          ],"isSelected":true}
        `;
      },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchTraderaPublicCategoryChildItemsForPath([
        { id: 'lf:collectibles', name: 'Collectibles' },
        { id: 'lf:collectibles:pins-needles', name: 'Pins & needles' },
      ])
    ).resolves.toEqual([
      { id: '292908', name: 'Advertising' },
      { id: '292901', name: 'Club Pins' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('https://www.tradera.com/en');
    expect(fetchMock).toHaveBeenCalledWith('https://www.tradera.com/en/category/29');
    expect(fetchMock).toHaveBeenCalledWith('https://www.tradera.com/en/category/2929');
  });

  it('requires the next path segment before using page-level category options', () => {
    const items = [
      { id: 'pins-advertising', name: 'Advertising' },
      { id: 'pins-club', name: 'Club Pins' },
    ];

    expect(
      filterTraderaListingFormPostSelectionCategoryItems({
        items,
        nextName: 'Club Pins',
        optionsBefore: ['Pins & needles'],
        pathNames: ['Collectibles', 'Pins & needles'],
      })
    ).toEqual(items);
    expect(
      filterTraderaListingFormPostSelectionCategoryItems({
        items,
        nextName: 'Sports',
        optionsBefore: ['Pins & needles'],
        pathNames: ['Collectibles', 'Pins & needles'],
      })
    ).toEqual([]);
  });
});

describe('tradera listing form category tree crawl', () => {
  it('recursively drills category paths and links children to their parent ids', async () => {
    const categories: Array<{ id: string; name: string; parentId: string }> = [];
    const root = { id: '100', name: 'Accessories' };
    const patches = { id: '101', name: 'Patches & pins' };
    const pinsNeedles = { id: '102', name: 'Pins & Needles' };
    const otherPinsNeedles = { id: '103', name: 'Other pins & needles' };
    const drillAndRead = vi.fn(async (path: typeof root[]) => {
      const leaf = path.at(-1);
      if (path.length === 1) return [patches];
      if (leaf?.id === patches.id) return [pinsNeedles];
      if (leaf?.id === pinsNeedles.id) return [otherPinsNeedles];
      return null;
    });

    const result = await crawlTraderaListingFormCategoryTree({
      rootItems: [root],
      isBudgetExhausted: () => false,
      resolveId: (item, parentId) =>
        item.id.length > 0 ? item.id : `${parentId}:${item.name}`,
      addCategory: (id, name, parentId) => {
        categories.push({ id, name, parentId });
      },
      drillAndRead,
    });

    expect(result).toEqual({ pagesVisited: 4, budgetExhausted: false });
    expect(categories).toEqual([
      { id: '101', name: 'Patches & pins', parentId: '100' },
      { id: '102', name: 'Pins & Needles', parentId: '101' },
      { id: '103', name: 'Other pins & needles', parentId: '102' },
    ]);
    expect(drillAndRead).toHaveBeenCalledWith([root]);
    expect(drillAndRead).toHaveBeenCalledWith([root, patches]);
    expect(drillAndRead).toHaveBeenCalledWith([root, patches, pinsNeedles]);
    expect(drillAndRead).toHaveBeenCalledWith([
      root,
      patches,
      pinsNeedles,
      otherPinsNeedles,
    ]);
  });

  it('stops before drilling when the crawl budget is already exhausted', async () => {
    const result = await crawlTraderaListingFormCategoryTree({
      rootItems: [{ id: '100', name: 'Accessories' }],
      isBudgetExhausted: () => true,
      resolveId: (item) => item.id,
      addCategory: vi.fn(),
      drillAndRead: vi.fn(),
    });

    expect(result).toEqual({ pagesVisited: 0, budgetExhausted: true });
  });

  it('ignores repeated ancestor labels when Tradera omits category ids', async () => {
    const categories: Array<{ id: string; name: string; parentId: string }> = [];
    const root = { id: '', name: 'Collectibles' };
    const pinsNeedles = { id: '', name: 'Pins & needles' };
    const repeatedParent = { id: '', name: 'Collectibles' };
    const advertising = { id: '', name: 'Advertising' };
    const drillAndRead = vi.fn(async (path: typeof root[]) => {
      if (path.length === 1) return [repeatedParent, pinsNeedles];
      if (path.at(-1)?.name === pinsNeedles.name) return [advertising];
      return null;
    });

    const result = await crawlTraderaListingFormCategoryTree({
      rootItems: [root],
      isBudgetExhausted: () => false,
      resolveId: (item, parentId) => `${parentId}:${item.name}`,
      addCategory: (id, name, parentId) => {
        categories.push({ id, name, parentId });
      },
      drillAndRead,
    });

    expect(result).toEqual({ pagesVisited: 3, budgetExhausted: false });
    expect(categories).toEqual([
      {
        id: '0:Collectibles:Pins & needles',
        name: 'Pins & needles',
        parentId: '0:Collectibles',
      },
      {
        id: '0:Collectibles:Pins & needles:Advertising',
        name: 'Advertising',
        parentId: '0:Collectibles:Pins & needles',
      },
    ]);
  });
});
