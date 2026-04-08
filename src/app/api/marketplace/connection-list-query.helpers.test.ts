import { describe, expect, it } from 'vitest';

import { parseMarketplaceConnectionListQuery } from './connection-list-query.helpers';

describe('marketplace connection list query helpers', () => {
  it('parses a valid connection-scoped query', () => {
    expect(
      parseMarketplaceConnectionListQuery(
        {
          connectionId: 'conn-1',
        },
        'Invalid marketplace query.'
      )
    ).toEqual({
      connectionId: 'conn-1',
    });
  });

  it('rejects invalid query shapes with the provided message', () => {
    expect(() =>
      parseMarketplaceConnectionListQuery(
        'invalid',
        'Invalid marketplace tags query.'
      )
    ).toThrow('Invalid marketplace tags query.');
  });

  it('requires connectionId after parsing', () => {
    expect(() =>
      parseMarketplaceConnectionListQuery(
        {
          connectionId: '',
        },
        'Invalid marketplace producers query.'
      )
    ).toThrow('Invalid marketplace producers query.');
  });
});
