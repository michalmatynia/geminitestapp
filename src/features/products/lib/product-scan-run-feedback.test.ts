import { describe, expect, it } from 'vitest';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { buildProductScanRunFeedbackFromRecord } from './product-scan-run-feedback';

const createScanRecord = (overrides: Partial<ProductScanRecord> = {}): ProductScanRecord => ({
  id: 'scan-1',
  productId: 'product-1',
  provider: 'amazon',
  scanType: 'google_reverse_image',
  status: 'running',
  productName: 'Product 1',
  engineRunId: 'run-1',
  imageCandidates: [],
  matchedImageId: null,
  asin: null,
  title: null,
  price: null,
  url: null,
  description: null,
  steps: [],
  rawResult: null,
  error: null,
  asinUpdateStatus: 'pending',
  asinUpdateMessage: null,
  createdBy: null,
  updatedBy: null,
  completedAt: null,
  createdAt: '2026-04-11T03:59:00.000Z',
  updatedAt: '2026-04-11T04:00:00.000Z',
  ...overrides,
});

describe('product scan run feedback', () => {
  it('shows a captcha label while manual verification is pending', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        rawResult: {
          manualVerificationPending: true,
        },
      })
    );

    expect(feedback.label).toBe('Captcha');
    expect(feedback.variant).toBe('warning');
  });

  it('keeps the standard running label when manual verification is not pending', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(createScanRecord());

    expect(feedback.label).toBe('Running');
    expect(feedback.variant).toBe('processing');
  });
});
