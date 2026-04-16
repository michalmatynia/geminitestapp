import { describe, expect, it } from 'vitest';

import {
  buildPlaywrightListingExportHistoryRecord,
  buildPlaywrightListingFailureUpdateFields,
  buildPlaywrightListingSuccessUpdateFields,
} from './listing-persistence';

describe('playwright listing persistence helpers', () => {
  it('builds export history records with the shared listing fields', () => {
    expect(
      buildPlaywrightListingExportHistoryRecord({
        exportedAt: new Date('2026-04-10T12:00:00.000Z'),
        status: 'active',
        externalListingId: 'external-1',
        expiresAt: null,
        failureReason: null,
        relist: true,
        requestId: 'job-1',
        fields: ['browser_mode:headed'],
      })
    ).toEqual({
      exportedAt: new Date('2026-04-10T12:00:00.000Z'),
      status: 'active',
      externalListingId: 'external-1',
      expiresAt: null,
      failureReason: null,
      relist: true,
      requestId: 'job-1',
      fields: ['browser_mode:headed'],
    });
  });

  it('builds shared success update fields and preserves provider extras', () => {
    expect(
      buildPlaywrightListingSuccessUpdateFields({
        at: new Date('2026-04-10T12:00:00.000Z'),
        marketplaceData: {
          marketplace: 'vinted',
        },
        externalListingId: 'external-1',
        extra: {
          status: 'active',
          listedAt: new Date('2026-04-10T12:00:00.000Z'),
        },
      })
    ).toEqual({
      externalListingId: 'external-1',
      lastStatusCheckAt: new Date('2026-04-10T12:00:00.000Z'),
      failureReason: null,
      marketplaceData: {
        marketplace: 'vinted',
      },
      status: 'active',
      listedAt: new Date('2026-04-10T12:00:00.000Z'),
    });
  });

  it('builds shared failure update fields and preserves provider extras', () => {
    expect(
      buildPlaywrightListingFailureUpdateFields({
        at: new Date('2026-04-10T12:00:00.000Z'),
        marketplaceData: {
          marketplace: 'tradera',
        },
        failureReason: 'AUTH_REQUIRED',
        extra: {
          status: 'auth_required',
          nextRelistAt: null,
        },
      })
    ).toEqual({
      lastStatusCheckAt: new Date('2026-04-10T12:00:00.000Z'),
      failureReason: 'AUTH_REQUIRED',
      marketplaceData: {
        marketplace: 'tradera',
      },
      status: 'auth_required',
      nextRelistAt: null,
    });
  });
});
