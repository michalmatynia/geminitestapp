import { describe, expect, it } from 'vitest';

import {
  getProgrammableScrapedItemsFromResultRecord,
  getProgrammableScrapedItemsFromTestResultJson,
} from './playwrightProgrammableScrapeResults';

describe('playwrightProgrammableScrapeResults', () => {
  it('prefers canonical scrapedItems over rawProducts', () => {
    expect(
      getProgrammableScrapedItemsFromResultRecord({
        rawProducts: [{ title: 'Legacy item' }],
        scrapedItems: [{ title: 'Canonical item' }],
      })
    ).toEqual([{ title: 'Canonical item' }]);
  });

  it('falls back to rawProducts when scrapedItems is absent', () => {
    expect(
      getProgrammableScrapedItemsFromTestResultJson(
        JSON.stringify({
          result: {
            rawProducts: [{ title: 'Legacy item' }],
          },
        })
      )
    ).toEqual([{ title: 'Legacy item' }]);
  });
});
