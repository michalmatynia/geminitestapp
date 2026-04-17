import { describe, expect, it } from 'vitest';

import {
  getPlaywrightActionRunResultRecord,
  getPlaywrightActionRunScrapedItems,
} from './action-run-scrape-results';

describe('action-run-scrape-results', () => {
  it('prefers canonical scrapedItems from nested outputs.result payloads', () => {
    expect(
      getPlaywrightActionRunScrapedItems({
        outputs: {
          result: {
            rawProducts: [{ title: 'Legacy item' }],
            scrapedItems: [{ title: 'Canonical item' }],
          },
        },
      })
    ).toEqual([{ title: 'Canonical item' }]);
  });

  it('falls back to legacy rawProducts from nested outputs.result payloads', () => {
    expect(
      getPlaywrightActionRunScrapedItems({
        outputs: {
          result: {
            rawProducts: [{ title: 'Legacy item' }],
          },
        },
      })
    ).toEqual([{ title: 'Legacy item' }]);
  });

  it('accepts an array result payload directly', () => {
    expect(getPlaywrightActionRunScrapedItems([{ title: 'Array item' }])).toEqual([
      { title: 'Array item' },
    ]);
  });

  it('returns the normalized result record when present', () => {
    expect(
      getPlaywrightActionRunResultRecord({
        outputs: {
          result: {
            status: 'completed',
          },
        },
      })
    ).toEqual({ status: 'completed' });
  });
});
