/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';

import { computeBaseImportRunStats } from './base-import-run-repository';

describe('computeBaseImportRunStats', () => {
  it('counts item statuses and aggregates normalized parameter import summaries', () => {
    const stats = computeBaseImportRunStats([
      {
        itemId: 'item-pending',
        status: 'pending',
      },
      {
        itemId: 'item-processing',
        status: 'processing',
        parameterImportSummary: {
          extracted: 2,
          resolved: 1,
          created: 1,
          written: 0,
        },
      },
      {
        itemId: 'item-imported',
        status: 'imported',
        parameterImportSummary: {
          extracted: '3',
          resolved: 2,
          created: 1,
          written: 1,
        },
      },
      {
        itemId: 'item-updated',
        status: 'updated',
      },
      {
        itemId: 'item-skipped',
        status: 'skipped',
      },
      {
        itemId: 'item-failed',
        status: 'failed',
        parameterImportSummary: {
          extracted: 4,
          resolved: 3,
          created: 0,
          written: 0,
        },
      },
    ] as never);

    expect(stats).toEqual({
      total: 6,
      pending: 1,
      processing: 1,
      imported: 1,
      updated: 1,
      skipped: 1,
      failed: 1,
      parameterImportSummary: {
        itemsApplied: 3,
        extracted: 9,
        resolved: 6,
        created: 2,
        written: 1,
      },
    });
  });

  it('ignores invalid parameter import summaries and never makes pending negative', () => {
    const stats = computeBaseImportRunStats([
      {
        itemId: 'item-a',
        status: 'processing',
        parameterImportSummary: null,
      },
      {
        itemId: 'item-b',
        status: 'failed',
        parameterImportSummary: 'invalid',
      },
    ] as never);

    expect(stats.pending).toBe(0);
    expect(stats.parameterImportSummary).toEqual({
      itemsApplied: 0,
      extracted: 0,
      resolved: 0,
      created: 0,
      written: 0,
    });
  });
});
