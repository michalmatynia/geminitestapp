import { describe, expect, it } from 'vitest';

import {
  buildProductAiRunFeedbackFromSnapshot,
  compareProductAiRunFeedback,
  resolveProductAiRunFeedbackForList,
  type ProductAiRunFeedback,
} from './product-ai-run-feedback';

describe('product-ai-run-feedback', () => {
  it('prefers tracker-backed feedback over the queued fallback for list pills', () => {
    const trackerFeedback: ProductAiRunFeedback = {
      runId: 'run-1',
      status: 'running',
      updatedAt: '2026-03-21T10:00:00.000Z',
      label: 'Running',
      variant: 'processing',
      badgeClassName: 'tracker',
    };

    expect(
      resolveProductAiRunFeedbackForList({
        productId: 'product-1',
        queuedProductIds: new Set(['product-1']),
        productAiRunStatusByProductId: new Map([['product-1', trackerFeedback]]),
      })
    ).toEqual(trackerFeedback);
  });

  it('falls back to queued feedback when only the queue marker exists', () => {
    expect(
      resolveProductAiRunFeedbackForList({
        productId: 'product-1',
        queuedProductIds: new Set(['product-1']),
      })
    ).toMatchObject({
      status: 'queued',
      label: 'Queued',
      variant: 'pending',
    });
  });

  it('prioritizes running feedback over a more recent queued run', () => {
    const queuedFeedback: ProductAiRunFeedback = {
      runId: 'run-queued',
      status: 'queued',
      updatedAt: '2026-03-21T10:01:00.000Z',
      label: 'Queued',
      variant: 'pending',
      badgeClassName: 'queued',
    };
    const runningFeedback: ProductAiRunFeedback = {
      runId: 'run-running',
      status: 'running',
      updatedAt: '2026-03-21T10:00:00.000Z',
      label: 'Running',
      variant: 'processing',
      badgeClassName: 'running',
    };

    expect(compareProductAiRunFeedback(runningFeedback, queuedFeedback)).toBeGreaterThan(0);
  });

  it('ignores terminal and stopped snapshots when building active list feedback', () => {
    expect(
      buildProductAiRunFeedbackFromSnapshot({
        runId: 'run-1',
        status: 'completed',
        updatedAt: '2026-03-21T10:00:00.000Z',
        finishedAt: '2026-03-21T10:00:01.000Z',
        errorMessage: null,
        entityId: 'product-1',
        entityType: 'product',
        trackingState: 'stopped',
      })
    ).toBeNull();
  });
});
