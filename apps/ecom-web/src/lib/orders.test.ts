import { describe, expect, it } from 'vitest';

import { sanitizeInpostPoint } from './orders';

describe('sanitizeInpostPoint', () => {
  it('normalizes Paczkomat codes while preserving safe address metadata', () => {
    expect(sanitizeInpostPoint({
      id: ' waw 01a ',
      name: 'waw01a',
      addressLine1: 'ul. Testowa 1',
      addressLine2: 'wejście od parku',
      city: 'Warszawa',
      postCode: '00-001',
      ignored: '<script>',
    })).toEqual({
      id: 'WAW01A',
      name: 'WAW01A',
      description: undefined,
      addressLine1: 'ul. Testowa 1',
      addressLine2: 'wejście od parku',
      city: 'Warszawa',
      postCode: '00-001',
      latitude: undefined,
      longitude: undefined,
    });
  });

  it('rejects missing or unsafe Paczkomat codes', () => {
    expect(sanitizeInpostPoint(null)).toBeNull();
    expect(sanitizeInpostPoint({ id: 'WA' })).toBeNull();
    expect(sanitizeInpostPoint({ id: '<script>' })).toBeNull();
  });
});
