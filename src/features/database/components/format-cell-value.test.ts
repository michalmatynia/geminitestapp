import { describe, expect, it } from 'vitest';

import {
  DATABASE_EMPTY_CELL_VALUE,
  formatDatabaseCellValue,
} from './format-cell-value';

describe('formatDatabaseCellValue', () => {
  it('returns the empty sentinel for nullish values', () => {
    expect(formatDatabaseCellValue(null)).toBe(DATABASE_EMPTY_CELL_VALUE);
    expect(formatDatabaseCellValue(undefined)).toBe(DATABASE_EMPTY_CELL_VALUE);
  });

  it('stringifies objects and arrays as JSON', () => {
    expect(formatDatabaseCellValue({ id: 1, label: 'row' })).toBe(
      JSON.stringify({ id: 1, label: 'row' }),
    );
    expect(formatDatabaseCellValue(['a', 2, true])).toBe(
      JSON.stringify(['a', 2, true]),
    );
  });

  it('formats primitive values with String coercion', () => {
    expect(formatDatabaseCellValue(42)).toBe('42');
    expect(formatDatabaseCellValue(false)).toBe('false');
    expect(formatDatabaseCellValue('cell')).toBe('cell');
  });
});
