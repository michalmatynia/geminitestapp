import { describe, expect, it } from 'vitest';

import { buildProductSyncRunListOptions, buildProductSyncRunsResponse } from './handler.helpers';

describe('product-sync runs handler helpers', () => {
  it('builds list options with only defined query fields', () => {
    expect(
      buildProductSyncRunListOptions({
        profileId: 'profile-1',
        limit: 25,
      })
    ).toEqual({
      profileId: 'profile-1',
      limit: 25,
    });

    expect(
      buildProductSyncRunListOptions({
        profileId: '',
        limit: undefined,
      })
    ).toEqual({});

    expect(buildProductSyncRunListOptions(undefined)).toEqual({});
  });

  it('wraps sync runs in the response shape', () => {
    expect(
      buildProductSyncRunsResponse([
        {
          id: 'run-1',
          profileId: 'profile-1',
          profileName: 'Default profile',
          status: 'completed',
          trigger: 'manual',
          startedAt: '2026-01-01T00:00:00.000Z',
          completedAt: '2026-01-01T00:01:00.000Z',
          errorMessage: null,
          stats: {
            total: 1,
            success: 1,
            skipped: 0,
            failed: 0,
          },
        },
      ])
    ).toEqual({
      runs: [
        {
          id: 'run-1',
          profileId: 'profile-1',
          profileName: 'Default profile',
          status: 'completed',
          trigger: 'manual',
          startedAt: '2026-01-01T00:00:00.000Z',
          completedAt: '2026-01-01T00:01:00.000Z',
          errorMessage: null,
          stats: {
            total: 1,
            success: 1,
            skipped: 0,
            failed: 0,
          },
        },
      ],
    });
  });
});
