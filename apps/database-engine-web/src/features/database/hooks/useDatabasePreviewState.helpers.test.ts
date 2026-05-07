import { describe, expect, it } from 'vitest';

import type {
  DatabasePreviewGroup,
  DatabaseTableDetail,
  DatabaseTablePreviewData,
} from '@/shared/contracts/database';

import {
  buildDatabasePreviewConsoleSql,
  computeDatabasePreviewMaxPage,
  computeDatabasePreviewStats,
  filterDatabasePreviewGroups,
  filterDatabasePreviewTableDetails,
} from './useDatabasePreviewState.helpers';

describe('useDatabasePreviewState helpers', () => {
  it('filters preview groups by group type or object name', () => {
    const groups: DatabasePreviewGroup[] = [
      { type: 'Core', objects: ['users', 'orders'] },
      { type: 'Audit', objects: ['events'] },
    ];

    expect(filterDatabasePreviewGroups(groups, 'core')).toEqual([groups[0]]);
    expect(filterDatabasePreviewGroups(groups, 'event')).toEqual([
      { type: 'Audit', objects: ['events'] },
    ]);
    expect(filterDatabasePreviewGroups(groups, '')).toEqual(groups);
  });

  it('filters table details by table name', () => {
    const tableDetails: DatabaseTableDetail[] = [
      {
        name: 'users',
        rowEstimate: 10,
        sizeFormatted: '1 KB',
        columns: [],
        indexes: [],
        foreignKeys: [],
      },
      {
        name: 'orders',
        rowEstimate: 5,
        sizeFormatted: '1 KB',
        columns: [],
        indexes: [],
        foreignKeys: [],
      },
    ];

    expect(filterDatabasePreviewTableDetails(tableDetails, 'user')).toEqual([tableDetails[0]]);
    expect(filterDatabasePreviewTableDetails(tableDetails, '')).toEqual(tableDetails);
  });

  it('builds console JSON for querying a table', () => {
    expect(buildDatabasePreviewConsoleSql('users')).toBe(
      JSON.stringify(
        {
          collection: 'users',
          operation: 'find',
          filter: {},
        },
        null,
        2
      )
    );
  });

  it('computes aggregate stats and max page counts', () => {
    const tableDetails: DatabaseTableDetail[] = [
      {
        name: 'users',
        rowEstimate: 10,
        sizeFormatted: '1 KB',
        columns: [],
        indexes: [{ name: 'users_pkey', columns: ['id'], isUnique: true, definition: 'pk' }],
        foreignKeys: [],
      },
      {
        name: 'orders',
        rowEstimate: 5,
        sizeFormatted: '1 KB',
        columns: [],
        indexes: [],
        foreignKeys: [
          {
            name: 'orders_user_id_fkey',
            column: 'user_id',
            referencedTable: 'users',
            referencedColumn: 'id',
          },
        ],
      },
    ];
    const tableRows: DatabaseTablePreviewData[] = [
      { name: 'users', rows: [], totalRows: 20 },
      { name: 'orders', rows: [], totalRows: 7 },
    ];

    expect(computeDatabasePreviewStats(tableDetails)).toEqual({
      totalFks: 1,
      totalIndexes: 1,
    });
    expect(computeDatabasePreviewMaxPage(tableRows, 10)).toBe(2);
    expect(computeDatabasePreviewMaxPage([], 10)).toBe(1);
  });
});
