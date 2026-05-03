import { describe, expect, it } from 'vitest';

import {
  selectPreferredTraderaListingForStatusCheck,
} from './tradera-status-check';

const makeCandidate = (overrides: Record<string, unknown> = {}) => ({
  id: 'listing-1',
  status: 'active',
  listedAt: '2026-04-01T10:00:00.000Z',
  lastStatusCheckAt: '2026-04-01T11:00:00.000Z',
  externalListingId: null,
  marketplaceData: null,
  ...overrides,
});

describe('tradera-status-check', () => {
  it('prefers the listing that already has a non-stale pending status check', () => {
    const queuedAt = new Date(Date.now() - 60_000).toISOString();
    const selected = selectPreferredTraderaListingForStatusCheck([
      makeCandidate({
        id: 'listing-active',
        status: 'active',
        listedAt: '2026-04-03T10:00:00.000Z',
      }),
      makeCandidate({
        id: 'listing-pending-check',
        status: 'processing',
        listedAt: '2026-04-01T10:00:00.000Z',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'check_status',
              queuedAt,
            },
          },
        },
      }),
    ]);

    expect(selected?.id).toBe('listing-pending-check');
  });

  it('treats stale pending check markers as expired and falls back to the stronger status', () => {
    const queuedAt = new Date(Date.now() - 10 * 60_000).toISOString();
    const selected = selectPreferredTraderaListingForStatusCheck([
      makeCandidate({
        id: 'listing-active',
        status: 'active',
        listedAt: '2026-04-03T10:00:00.000Z',
      }),
      makeCandidate({
        id: 'listing-stale-pending',
        status: 'processing',
        listedAt: '2026-04-04T10:00:00.000Z',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'check_status',
              queuedAt,
            },
          },
        },
      }),
    ]);

    expect(selected?.id).toBe('listing-active');
  });

  it('prefers linked listings when statuses are otherwise tied', () => {
    const selected = selectPreferredTraderaListingForStatusCheck([
      makeCandidate({
        id: 'listing-unlinked',
        status: 'active',
        listedAt: '2026-04-03T10:00:00.000Z',
        externalListingId: null,
      }),
      makeCandidate({
        id: 'listing-linked',
        status: 'active',
        listedAt: '2026-04-01T10:00:00.000Z',
        externalListingId: '721891408',
      }),
    ]);

    expect(selected?.id).toBe('listing-linked');
  });

  it('prefers unknown over ended when choosing the next listing to verify', () => {
    const selected = selectPreferredTraderaListingForStatusCheck([
      makeCandidate({
        id: 'listing-ended',
        status: 'ended',
        listedAt: '2026-04-03T10:00:00.000Z',
      }),
      makeCandidate({
        id: 'listing-unknown',
        status: 'unknown',
        listedAt: '2026-04-01T10:00:00.000Z',
      }),
    ]);

    expect(selected?.id).toBe('listing-unknown');
  });
});
