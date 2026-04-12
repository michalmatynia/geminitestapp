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
  amazonDetails: null,
  amazonProbe: null,
  amazonEvaluation: null,
  supplierDetails: null,
  supplierProbe: null,
  supplierEvaluation: null,
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

  it('surfaces AI rejection distinctly from a generic no-match result', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        status: 'no_match',
        amazonEvaluation: {
          status: 'rejected',
          sameProduct: false,
          imageMatch: false,
          descriptionMatch: false,
          pageRepresentsSameProduct: false,
          confidence: 0.24,
          proceed: false,
          threshold: 0.85,
          reasons: ['Different product.'],
          mismatches: ['Hero image does not match.'],
          modelId: 'gpt-4o',
          brainApplied: null,
          evidence: null,
          error: null,
          evaluatedAt: '2026-04-11T04:00:00.000Z',
        },
      })
    );

    expect(feedback.label).toBe('AI Rejected');
    expect(feedback.variant).toBe('warning');
  });

  it('surfaces language rejection distinctly from a generic AI no-match result', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        status: 'no_match',
        amazonEvaluation: {
          status: 'rejected',
          sameProduct: true,
          imageMatch: true,
          descriptionMatch: true,
          pageRepresentsSameProduct: true,
          pageLanguage: 'de',
          languageConfidence: 0.99,
          languageAccepted: false,
          languageReason: 'Amazon page declares German content.',
          confidence: 0.91,
          proceed: false,
          scrapeAllowed: false,
          threshold: 0.85,
          reasons: ['Amazon page declares German content.'],
          mismatches: ['Amazon page content is not in English.'],
          modelId: 'gpt-4o',
          brainApplied: null,
          evidence: null,
          error: null,
          evaluatedAt: '2026-04-11T04:00:00.000Z',
        },
      })
    );

    expect(feedback.label).toBe('AI Rejected: Language');
    expect(feedback.variant).toBe('warning');
  });

  it('keeps active scans in queued/running feedback even when the latest candidate was AI rejected', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        status: 'queued',
        amazonEvaluation: {
          status: 'rejected',
          sameProduct: false,
          imageMatch: false,
          descriptionMatch: false,
          pageRepresentsSameProduct: false,
          confidence: 0.24,
          proceed: false,
          threshold: 0.85,
          reasons: ['Different product.'],
          mismatches: ['Hero image does not match.'],
          modelId: 'gpt-4o',
          brainApplied: null,
          evidence: null,
          error: null,
          evaluatedAt: '2026-04-11T04:00:00.000Z',
        },
      })
    );

    expect(feedback.label).toBe('Queued');
    expect(feedback.variant).toBe('pending');
  });

  it('surfaces evaluator failures distinctly from generic scan failures', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        status: 'failed',
        amazonEvaluation: {
          status: 'failed',
          sameProduct: null,
          imageMatch: null,
          descriptionMatch: null,
          pageRepresentsSameProduct: null,
          confidence: null,
          proceed: false,
          threshold: 0.85,
          reasons: [],
          mismatches: [],
          modelId: 'gpt-4o',
          brainApplied: null,
          evidence: null,
          error: 'Evaluator runtime failed.',
          evaluatedAt: '2026-04-11T04:00:00.000Z',
        },
      })
    );

    expect(feedback.label).toBe('AI Failed');
    expect(feedback.variant).toBe('error');
  });
});
