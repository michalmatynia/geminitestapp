import { describe, expect, it } from 'vitest';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { classifyAmazonScanFailure } from './product-scan-amazon-classifier';

const makeScan = (overrides: Partial<ProductScanRecord> = {}): ProductScanRecord => ({
  id: 'scan_1',
  productId: 'product_1',
  integrationId: null,
  connectionId: null,
  provider: 'amazon',
  scanType: 'google_reverse_image',
  status: 'failed',
  productName: null,
  engineRunId: 'run_1',
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
  asinUpdateStatus: null,
  asinUpdateMessage: null,
  createdBy: null,
  updatedBy: null,
  completedAt: null,
  ...overrides,
});

describe('classifyAmazonScanFailure', () => {
  it('returns healthy for a completed scan with an ASIN', () => {
    const result = classifyAmazonScanFailure(
      makeScan({ status: 'completed', asin: 'B07XYZ1234', title: 'A thing' })
    );
    expect(result.kind).toBe('healthy');
  });

  it('classifies captcha from manualVerificationPending flag', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'failed',
        rawResult: { manualVerificationPending: true },
        error: 'manual_verification_expired',
      })
    );
    expect(result.kind).toBe('captcha');
    expect(result.details.evidence['manualVerificationPending']).toBe(true);
  });

  it('classifies captcha from error message', () => {
    const result = classifyAmazonScanFailure(
      makeScan({ status: 'failed', error: 'Amazon CAPTCHA challenge detected' })
    );
    expect(result.kind).toBe('captcha');
  });

  it('classifies lens_empty from no_candidates step', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'failed',
        steps: [
          {
            key: 'google_candidates',
            label: 'Google Lens search',
            group: 'image_search',
            status: 'failed',
            resultCode: 'no_candidates',
            message: 'no results',
            details: [],
            url: null,
          },
        ],
      })
    );
    expect(result.kind).toBe('lens_empty');
  });

  it('classifies captcha when google verification barrier steps are present', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'failed',
        error: 'No Amazon candidates found in Google Lens results.',
        steps: [
          {
            key: 'google_verification_review',
            label: 'Inspect Google verification barrier',
            group: 'google',
            status: 'pending',
            resultCode: null,
            message: null,
            details: [],
            url: null,
          },
          {
            key: 'google_captcha',
            label: 'Resolve Google captcha',
            group: 'google',
            status: 'pending',
            resultCode: null,
            message: null,
            details: [],
            url: null,
          },
          {
            key: 'google_candidates',
            label: 'Collect Amazon candidates from Google Lens',
            group: 'google',
            status: 'failed',
            resultCode: 'no_candidates',
            message: 'Google Lens results did not contain any Amazon product URLs.',
            details: [],
            url: null,
          },
        ] as never,
      })
    );
    expect(result.kind).toBe('captcha');
    expect(result.details.evidence['captchaSteps']).toEqual([
      {
        key: 'google_verification_review',
        message: null,
        resultCode: null,
        status: 'pending',
      },
      {
        key: 'google_captcha',
        message: null,
        resultCode: null,
        status: 'pending',
      },
    ]);
  });

  it('classifies lens_empty from message text', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'failed',
        error: 'Did not contain any Amazon product URLs.',
        rawResult: { imageSearchProviderHistory: [{ provider: 'google_lens_upload' }] },
      })
    );
    expect(result.kind).toBe('lens_empty');
  });

  it('classifies evaluator_reject when amazonEvaluation.status is rejected', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'no_match',
        amazonEvaluation: {
          status: 'rejected',
          stage: 'probe_evaluate',
          sameProduct: false,
          imageMatch: null,
          descriptionMatch: null,
          pageRepresentsSameProduct: false,
          pageLanguage: 'en',
          languageConfidence: 0.9,
          languageAccepted: true,
          confidence: 0.1,
          proceed: false,
          scrapeAllowed: false,
          recommendedAction: 'reject',
          rejectionCategory: 'wrong_product',
          threshold: 0.5,
          reasons: ['different product'],
          mismatches: [],
          mismatchLabels: [],
          variantAssessment: null,
          modelId: 'test-model',
          brainApplied: null,
          evidence: null,
          error: null,
          evaluatedAt: null,
        } as never,
      })
    );
    expect(result.kind).toBe('evaluator_reject');
    expect(result.details.reason).toContain('wrong_product');
  });

  it('classifies selector_rot when candidates exist but no asin/title extracted', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'no_match',
        imageCandidates: [{ id: 'c1', url: 'http://x' }],
        asin: null,
        title: null,
      })
    );
    expect(result.kind).toBe('selector_rot');
  });

  it('prioritises captcha over evaluator_reject when both signals present', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'failed',
        rawResult: { manualVerificationPending: true },
        amazonEvaluation: {
          status: 'rejected',
          rejectionCategory: 'low_confidence',
        } as never,
      })
    );
    expect(result.kind).toBe('captcha');
  });

  it('prioritises evaluator_reject over selector_rot', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'no_match',
        imageCandidates: [{ id: 'c1', url: 'http://x' }],
        amazonEvaluation: { status: 'rejected', rejectionCategory: 'variant' } as never,
      })
    );
    expect(result.kind).toBe('evaluator_reject');
  });

  it('falls back to other when no signal matches', () => {
    const result = classifyAmazonScanFailure(
      makeScan({ status: 'failed', error: 'Unknown failure' })
    );
    expect(result.kind).toBe('other');
  });
});
