// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import {
  VINTED_QUICK_LIST_FEEDBACK_STORAGE_KEY,
  clearPersistedVintedQuickListFeedback,
  persistVintedQuickListFeedback,
  readPersistedVintedQuickListFeedback,
} from './vintedQuickListFeedback';

describe('vintedQuickListFeedback', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('persists and reads Vinted quick list feedback', () => {
    persistVintedQuickListFeedback('product-1', 'queued', {
      requestId: 'job-vinted-1',
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
      listingId: 'listing-vinted-1',
    });

    expect(readPersistedVintedQuickListFeedback('product-1')).toMatchObject({
      productId: 'product-1',
      status: 'queued',
      requestId: 'job-vinted-1',
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
      listingId: 'listing-vinted-1',
    });
  });

  it('converts expired queued feedback into a failed recovery state', () => {
    window.sessionStorage.setItem(
      VINTED_QUICK_LIST_FEEDBACK_STORAGE_KEY,
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'queued',
          expiresAt: Date.now() - 1000,
          requestId: 'job-vinted-1',
        },
      })
    );

    expect(readPersistedVintedQuickListFeedback('product-1')).toMatchObject({
      productId: 'product-1',
      status: 'failed',
      requestId: 'job-vinted-1',
    });
  });

  it('clears persisted feedback for a product', () => {
    persistVintedQuickListFeedback('product-1', 'failed', {
      failureReason: 'Session expired.',
    });

    clearPersistedVintedQuickListFeedback('product-1');

    expect(readPersistedVintedQuickListFeedback('product-1')).toBeNull();
  });
});
