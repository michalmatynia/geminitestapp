import { describe, expect, it } from 'vitest';

import { fetchBaseCategoriesFromPayload } from "@/features/integrations/services/imports/base-client-parsers";


describe('base-client-parsers categories', () => {
  it('flattens nested category trees and infers parent IDs from hierarchy', () => {
    const payload = {
      categories: {
        '100': {
          category_id: 100,
          name: 'Root',
          parent_id: 0,
          categories: {
            '110': {
              category_id: 110,
              name: 'Child A',
            },
            '120': {
              id: '120',
              label: 'Child B',
              subcategories: [
                {
                  id: '121',
                  name: 'Leaf B1',
                },
              ],
            },
          },
        },
      },
    };

    const categories = fetchBaseCategoriesFromPayload(payload);
    const byId = new Map(categories.map((category) => [category.id, category]));

    expect(byId.size).toBe(4);
    expect(byId.get('100')).toEqual({ id: '100', name: 'Root', parentId: null });
    expect(byId.get('110')).toEqual({ id: '110', name: 'Child A', parentId: '100' });
    expect(byId.get('120')).toEqual({ id: '120', name: 'Child B', parentId: '100' });
    expect(byId.get('121')).toEqual({ id: '121', name: 'Leaf B1', parentId: '120' });
  });

  it('respects explicit parent fields over inferred hierarchy parent', () => {
    const payload = {
      categories: [
        {
          id: '10',
          name: 'Parent',
          children: [
            { id: '11', name: 'Inferred Child' },
            { id: '12', name: 'Explicit Root', parent_id: 0 },
            { id: '13', name: 'Explicit Child', parent_category_id: '10' },
          ],
        },
      ],
    };

    const categories = fetchBaseCategoriesFromPayload(payload);
    const byId = new Map(categories.map((category) => [category.id, category]));

    expect(byId.get('10')).toEqual({ id: '10', name: 'Parent', parentId: null });
    expect(byId.get('11')).toEqual({ id: '11', name: 'Inferred Child', parentId: '10' });
    expect(byId.get('12')).toEqual({ id: '12', name: 'Explicit Root', parentId: null });
    expect(byId.get('13')).toEqual({ id: '13', name: 'Explicit Child', parentId: '10' });
  });
});
