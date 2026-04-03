import { describe, expect, it } from 'vitest';

import { extractExternalListingId } from './utils';

describe('extractExternalListingId', () => {
  it('extracts ids only from Tradera item-style listing URLs', () => {
    expect(extractExternalListingId('https://www.tradera.com/item/123456789')).toBe(
      '123456789'
    );
    expect(
      extractExternalListingId('https://www.tradera.com/en/listing/987654321?foo=bar')
    ).toBe('987654321');
  });

  it('does not treat draft URLs as published listing ids', () => {
    expect(
      extractExternalListingId(
        'https://www.tradera.com/en/selling/draft/69cfa5c39050080001c3a2c9'
      )
    ).toBeNull();
  });
});
