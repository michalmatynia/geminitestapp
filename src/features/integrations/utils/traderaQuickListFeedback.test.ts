/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearPersistedTraderaQuickListFeedback,
  persistTraderaQuickListFeedback,
  readPersistedTraderaQuickListFeedback,
} from './traderaQuickListFeedback';

describe('traderaQuickListFeedback', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('persists duplicate match strategy as a top-level feedback field', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      duplicateLinked: true,
      duplicateMatchStrategy: 'exact-title-single-candidate',
      metadata: {
        rawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    });

    expect(readPersistedTraderaQuickListFeedback('product-1')).toMatchObject({
      productId: 'product-1',
      status: 'completed',
      duplicateLinked: true,
      duplicateMatchStrategy: 'exact-title-single-candidate',
      metadata: {
        rawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    });
  });

  it('normalizes duplicate-link fields from metadata on write when top-level fields are omitted', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      metadata: {
        duplicateLinked: true,
        duplicateMatchStrategy: 'existing-linked-record',
      },
    });

    expect(readPersistedTraderaQuickListFeedback('product-1')).toMatchObject({
      productId: 'product-1',
      status: 'completed',
      duplicateLinked: true,
      duplicateMatchStrategy: 'existing-linked-record',
      metadata: {
        duplicateLinked: true,
        duplicateMatchStrategy: 'existing-linked-record',
      },
    });
  });

  it('normalizes duplicate-link fields from rawResult on write when top-level fields are omitted', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      metadata: {
        rawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    });

    expect(readPersistedTraderaQuickListFeedback('product-1')).toMatchObject({
      productId: 'product-1',
      status: 'completed',
      duplicateLinked: true,
      duplicateMatchStrategy: 'exact-title-single-candidate',
      metadata: {
        rawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    });
  });

  it('clears persisted feedback normally after storing duplicate strategy', () => {
    persistTraderaQuickListFeedback('product-1', 'completed', {
      duplicateLinked: true,
      duplicateMatchStrategy: 'exact-title-single-candidate',
    });

    clearPersistedTraderaQuickListFeedback('product-1');

    expect(readPersistedTraderaQuickListFeedback('product-1')).toBeNull();
  });

  it('hydrates legacy duplicate-link fields from feedback metadata and rawResult on read', () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'completed',
          expiresAt: Date.now() + 60_000,
          metadata: {
            rawResult: {
              duplicateMatchStrategy: 'exact-title-single-candidate',
            },
          },
        },
      })
    );

    expect(readPersistedTraderaQuickListFeedback('product-1')).toMatchObject({
      productId: 'product-1',
      status: 'completed',
      duplicateLinked: true,
      duplicateMatchStrategy: 'exact-title-single-candidate',
      metadata: {
        rawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    });

    expect(
      JSON.parse(window.sessionStorage.getItem('tradera-quick-list-feedback') ?? '{}')
    ).toMatchObject({
      'product-1': {
        duplicateLinked: true,
        duplicateMatchStrategy: 'exact-title-single-candidate',
      },
    });
  });

  it('hydrates legacy duplicate-linked state from feedback metadata when rawResult is absent', () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'completed',
          expiresAt: Date.now() + 60_000,
          metadata: {
            duplicateMatchStrategy: 'existing-linked-record',
          },
        },
      })
    );

    expect(readPersistedTraderaQuickListFeedback('product-1')).toMatchObject({
      productId: 'product-1',
      status: 'completed',
      duplicateLinked: true,
      duplicateMatchStrategy: 'existing-linked-record',
      metadata: {
        duplicateMatchStrategy: 'existing-linked-record',
      },
    });

    expect(
      JSON.parse(window.sessionStorage.getItem('tradera-quick-list-feedback') ?? '{}')
    ).toMatchObject({
      'product-1': {
        duplicateLinked: true,
        duplicateMatchStrategy: 'existing-linked-record',
      },
    });
  });

  it('normalizes stale failed duplicate-linked feedback to completed on read', () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'failed',
          failureReason: 'Old failure that should not survive duplicate-linked success.',
          expiresAt: Date.now() + 60_000,
          metadata: {
            rawResult: {
              duplicateMatchStrategy: 'exact-title-single-candidate',
            },
          },
        },
      })
    );

    expect(readPersistedTraderaQuickListFeedback('product-1')).toMatchObject({
      productId: 'product-1',
      status: 'completed',
      failureReason: null,
      duplicateLinked: true,
      duplicateMatchStrategy: 'exact-title-single-candidate',
    });

    expect(
      JSON.parse(window.sessionStorage.getItem('tradera-quick-list-feedback') ?? '{}')
    ).toMatchObject({
      'product-1': {
        status: 'completed',
        failureReason: null,
        duplicateLinked: true,
        duplicateMatchStrategy: 'exact-title-single-candidate',
      },
    });
  });

  it('normalizes failed duplicate-linked feedback to completed on write', () => {
    persistTraderaQuickListFeedback('product-1', 'failed', {
      failureReason: 'Stale failure',
      metadata: {
        rawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    });

    expect(readPersistedTraderaQuickListFeedback('product-1')).toMatchObject({
      productId: 'product-1',
      status: 'completed',
      failureReason: null,
      duplicateLinked: true,
      duplicateMatchStrategy: 'exact-title-single-candidate',
    });
  });
});
