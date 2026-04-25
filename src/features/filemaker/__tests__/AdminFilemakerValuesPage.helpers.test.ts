import { describe, expect, it } from 'vitest';

import { filterFilemakerValuesWithHierarchy } from '../pages/AdminFilemakerValuesPage.helpers';
import type { FilemakerValue } from '../types';

const timestamp = '2026-04-25T00:00:00.000Z';

const value = (input: {
  id: string;
  label: string;
  parentId?: string | null;
  sortOrder?: number;
  storedValue?: string;
}): FilemakerValue => ({
  id: input.id,
  parentId: input.parentId ?? null,
  label: input.label,
  value: input.storedValue ?? input.label.toLowerCase(),
  sortOrder: input.sortOrder ?? 0,
  createdAt: timestamp,
  updatedAt: timestamp,
});

describe('filterFilemakerValuesWithHierarchy', () => {
  it('includes child values when a parent value matches the query', () => {
    const values = [
      value({ id: 'root', label: 'Priority', sortOrder: 1 }),
      value({ id: 'child', label: 'Urgent', parentId: 'root', sortOrder: 2 }),
      value({ id: 'grandchild', label: 'Immediate', parentId: 'child', sortOrder: 3 }),
      value({ id: 'other', label: 'Status', sortOrder: 4 }),
    ];

    const filtered = filterFilemakerValuesWithHierarchy(values, 'priority');

    expect(filtered.map((entry: FilemakerValue): string => entry.id)).toEqual([
      'root',
      'child',
      'grandchild',
    ]);
  });

  it('keeps parent hierarchy when a child value matches the query', () => {
    const values = [
      value({ id: 'root', label: 'Priority', sortOrder: 1 }),
      value({ id: 'child', label: 'Urgent', parentId: 'root', sortOrder: 2 }),
      value({ id: 'sibling', label: 'Routine', parentId: 'root', sortOrder: 3 }),
    ];

    const filtered = filterFilemakerValuesWithHierarchy(values, 'urgent');

    expect(filtered.map((entry: FilemakerValue): string => entry.id)).toEqual(['root', 'child']);
  });
});
