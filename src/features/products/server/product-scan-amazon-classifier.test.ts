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

  it('returns healthy when candidate selection is still required', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'completed',
        imageCandidates: [{ id: 'image-1', url: 'https://cdn.example.com/p.jpg' }] as never,
        rawResult: {
          candidateSelectionRequired: true,
          candidateUrls: ['https://www.amazon.co.jp/dp/B0TEST1234'],
        },
      })
    );
    expect(result.kind).toBe('healthy');
    expect(result.details.reason).toContain('manual selection');
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

  it('classifies captcha from stealth retry evidence', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'failed',
        rawResult: { captchaStealthRetryStarted: true },
      })
    );
    expect(result.kind).toBe('captcha');
    expect(result.details.evidence['captchaStealthRetryStarted']).toBe(true);
    expect(result.details.recovery).toMatchObject({
      automaticRetryAttempted: true,
      manualFallbackOpened: false,
      recoveryPath: 'automatic_retry',
    });
  });

  it('classifies manual fallback recovery from manual retry step evidence', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'running',
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
            details: [{ label: 'Blocked stage', value: 'google_candidates' }],
            url: 'https://www.google.com/sorry/index',
          },
        ] as never,
      })
    );
    expect(result.kind).toBe('captcha');
    expect(result.details.reason).toContain('visible browser');
    expect(result.details.recovery).toMatchObject({
      automaticRetryAttempted: false,
      manualFallbackOpened: true,
      recoveryPath: 'manual_fallback',
      latestCaptchaStage: 'google_candidates',
    });
  });

  it('classifies skipped automatic retry before manual fallback', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'running',
        rawResult: {
          manualVerificationPending: true,
          captchaManualRetryStarted: true,
        },
        steps: [
          {
            key: 'google_stealth_retry_skipped',
            label: 'Skip automatic Google retry',
            group: 'google_lens',
            status: 'skipped',
            resultCode: 'proxy_unavailable',
            message:
              'Skipped automatic Google retry because no proxy is configured; continuing to manual verification settings.',
            details: [{ label: 'Blocked stage', value: 'google_captcha' }],
            url: 'https://www.google.com/sorry/index',
          },
          {
            key: 'google_manual_retry',
            label: 'Open Google candidate search in visible browser',
            group: 'google_lens',
            status: 'completed',
            resultCode: 'run_started',
            message: 'Opened a visible browser for Google captcha verification.',
            details: [{ label: 'Blocked stage', value: 'google_candidates' }],
            url: 'https://www.google.com/sorry/index',
          },
        ] as never,
      })
    );

    expect(result.kind).toBe('captcha');
    expect(result.details.reason).toContain('automatic retry was skipped');
    expect(result.details.recovery).toMatchObject({
      automaticRetryAttempted: false,
      automaticRetrySkipped: true,
      manualFallbackOpened: true,
      recoveryPath: 'automatic_retry_skipped_then_manual_fallback',
      latestCaptchaStage: 'google_candidates',
    });
  });

  it('classifies automatic retry escalated to manual fallback', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'running',
        rawResult: {
          captchaStealthRetryStarted: true,
          captchaManualRetryStarted: true,
          manualVerificationPending: true,
        },
        steps: [
          {
            key: 'google_stealth_retry',
            label: 'Retry Google candidate search with fresh proxy session',
            group: 'google_lens',
            status: 'completed',
            resultCode: 'run_started',
            message:
              'Queued an automatic Google retry with a fresh proxy session before manual fallback.',
            details: [{ label: 'Blocked stage', value: 'google_captcha' }],
            url: 'https://www.google.com/sorry/index',
          },
          {
            key: 'google_manual_retry',
            label: 'Open Google candidate search in visible browser',
            group: 'google_lens',
            status: 'completed',
            resultCode: 'run_started',
            message: 'Opened a visible browser for Google captcha verification.',
            details: [{ label: 'Blocked stage', value: 'google_candidates' }],
            url: 'https://www.google.com/sorry/index',
          },
        ] as never,
      })
    );
    expect(result.kind).toBe('captcha');
    expect(result.details.reason).toContain('automatic retry');
    expect(result.details.recovery).toMatchObject({
      automaticRetryAttempted: true,
      manualFallbackOpened: true,
      recoveryPath: 'automatic_retry_then_manual_fallback',
      latestCaptchaStage: 'google_candidates',
    });
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

  it('classifies lens_empty when only placeholder captcha steps are present', () => {
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
    expect(result.kind).toBe('lens_empty');
  });

  it('classifies captcha when google verification barrier url is present', () => {
    const result = classifyAmazonScanFailure(
      makeScan({
        status: 'failed',
        rawResult: {
          currentUrl: 'https://www.google.com/sorry/index?continue=https://lens.google.com/',
        },
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
        ] as never,
      })
    );
    expect(result.kind).toBe('captcha');
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
