import { describe, expect, it } from 'vitest';

import {
  findPriceGroupByIdentifier,
  matchesPriceGroupIdentifier,
  resolvePriceGroupIdentifierToId,
} from './price-group-identifiers';

const groups = [
  { id: 'group-pln', groupId: 'PLN_STANDARD' },
  { id: 'group-eur', groupId: 'EUR_STANDARD' },
];

describe('price-group-identifiers', () => {
  it('matches groups by either internal id or external groupId', () => {
    expect(matchesPriceGroupIdentifier(groups[0]!, 'group-pln')).toBe(true);
    expect(matchesPriceGroupIdentifier(groups[0]!, 'PLN_STANDARD')).toBe(true);
    expect(matchesPriceGroupIdentifier(groups[0]!, 'missing')).toBe(false);
  });

  it('finds the correct group by either identifier shape', () => {
    expect(findPriceGroupByIdentifier(groups, 'group-eur')).toEqual(groups[1]);
    expect(findPriceGroupByIdentifier(groups, 'EUR_STANDARD')).toEqual(groups[1]);
    expect(findPriceGroupByIdentifier(groups, 'missing')).toBeUndefined();
  });

  it('resolves an identifier to the canonical internal id when possible', () => {
    expect(resolvePriceGroupIdentifierToId(groups, 'PLN_STANDARD')).toBe('group-pln');
    expect(resolvePriceGroupIdentifierToId(groups, 'group-eur')).toBe('group-eur');
    expect(resolvePriceGroupIdentifierToId(groups, 'missing')).toBe('missing');
    expect(resolvePriceGroupIdentifierToId(groups, '')).toBe('');
  });
});
