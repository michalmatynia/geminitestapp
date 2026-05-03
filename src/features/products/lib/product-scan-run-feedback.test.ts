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

  it('surfaces the automatic Google retry state before manual fallback', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        rawResult: {
          captchaStealthRetryStarted: true,
        },
      })
    );

    expect(feedback.label).toBe('Retrying Google');
    expect(feedback.variant).toBe('warning');
  });

  it('surfaces the visible-browser Google recovery as manual fallback', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        rawResult: {
          manualVerificationPending: true,
          captchaManualRetryStarted: true,
        },
        steps: [
          {
            key: 'google_manual_retry',
            label: 'Open Google candidate search in visible browser',
            group: 'google_lens',
            status: 'completed',
            resultCode: 'run_started',
            message: 'Opened a visible browser for Google captcha verification.',
            details: [],
            url: 'https://www.google.com/sorry/index',
          },
        ] as never,
      })
    );

    expect(feedback.label).toBe('Manual Fallback');
    expect(feedback.variant).toBe('warning');
  });

  it('surfaces candidate-selection scans as awaiting selection instead of completed', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        status: 'completed',
        rawResult: {
          candidateSelectionRequired: true,
        },
      })
    );

    expect(feedback.label).toBe('Awaiting Selection');
    expect(feedback.variant).toBe('warning');
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

  it('surfaces 1688 AI rejection distinctly from a generic supplier no-match result', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        provider: '1688',
        scanType: 'supplier_reverse_image',
        status: 'no_match',
        supplierEvaluation: {
          status: 'rejected',
          sameProduct: false,
          imageMatch: false,
          titleMatch: false,
          confidence: 0.34,
          proceed: false,
          reasons: ['Supplier candidate does not represent the same product.'],
          mismatches: ['Supplier gallery differs from the source product.'],
          modelId: 'gpt-4.1-mini',
          error: null,
          evaluatedAt: '2026-04-11T04:00:00.000Z',
        },
      })
    );

    expect(feedback.label).toBe('AI Rejected');
    expect(feedback.variant).toBe('warning');
  });

  it('surfaces 1688 evaluator failures distinctly from generic supplier scan failures', () => {
    const feedback = buildProductScanRunFeedbackFromRecord(
      createScanRecord({
        provider: '1688',
        scanType: 'supplier_reverse_image',
        status: 'failed',
        supplierEvaluation: {
          status: 'failed',
          sameProduct: null,
          imageMatch: null,
          titleMatch: null,
          confidence: null,
          proceed: false,
          reasons: [],
          mismatches: [],
          modelId: 'gpt-4.1-mini',
          error: 'Supplier evaluator runtime failed.',
          evaluatedAt: '2026-04-11T04:00:00.000Z',
        },
      })
    );

    expect(feedback.label).toBe('AI Failed');
    expect(feedback.variant).toBe('error');
  });
});
