import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  readPlaywrightEngineArtifactMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  fetchWithOutboundUrlPolicyMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/playwright/server/engine-artifact-reader', () => ({
  readPlaywrightEngineArtifact: (...args: unknown[]) =>
    mocks.readPlaywrightEngineArtifactMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: (...args: unknown[]) => mocks.runBrainChatCompletionMock(...args),
}));

vi.mock('@/shared/lib/security/outbound-url-policy', () => ({
  fetchWithOutboundUrlPolicy: (...args: unknown[]) =>
    mocks.fetchWithOutboundUrlPolicyMock(...args),
}));

vi.mock('@/shared/lib/files/file-uploader', () => ({
  getDiskPathFromPublicPath: (...args: unknown[]) =>
    mocks.getDiskPathFromPublicPathMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import type { AmazonScanRuntimeResult } from './product-scans-service.types';
import {
  evaluateProductScanCandidateMatch,
  evaluateProductScanCandidateTriage,
} from './product-scan-ai-evaluator';

const createScan = (): ProductScanRecord =>
  ({
    id: 'scan-1',
    productId: 'product-1',
    integrationId: null,
    connectionId: null,
    provider: 'amazon',
    scanType: 'google_reverse_image',
    status: 'running',
    productName: 'Source Product 1',
    engineRunId: 'run-1',
    imageCandidates: [
      {
        id: 'image-1',
        url: 'data:image/png;base64,c291cmNl',
        filepath: null,
        filename: 'source.png',
      },
    ],
    matchedImageId: 'image-1',
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
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: null,
    createdBy: null,
    updatedBy: null,
    completedAt: null,
    createdAt: '2026-04-24T08:00:00.000Z',
    updatedAt: '2026-04-24T08:00:00.000Z',
  }) as ProductScanRecord;

const createProduct = () =>
  ({
    id: 'product-1',
    asin: null,
    ean: null,
    gtin: null,
    name_en: 'Source Product 1',
    description_en: 'Source product description',
    images: [],
    imageLinks: [],
  }) as never;

const enabledEvaluatorConfig = {
  enabled: true as const,
  mode: 'brain_default' as const,
  threshold: 0.8,
  onlyForAmbiguousCandidates: false,
  candidateSimilarityMode: 'ai_only' as const,
  allowedContentLanguage: 'en' as const,
  rejectNonEnglishContent: true,
  languageDetectionMode: 'ai_only' as const,
  modelId: 'gpt-4o',
  systemPrompt: 'Return only JSON.',
  brainApplied: {
    capability: 'product.scan.amazon_candidate_match',
  },
};

const createTriageResult = (): AmazonScanRuntimeResult =>
  ({
    status: 'triage_ready',
    asin: null,
    title: null,
    price: null,
    url: null,
    description: null,
    amazonDetails: null,
    amazonProbe: null,
    candidateUrls: ['https://www.amazon.com/dp/B00TEST123'],
    candidateResults: [
      {
        url: 'https://www.amazon.com/dp/B00TEST123',
        score: 0.92,
        asin: null,
        marketplaceDomain: 'www.amazon.com',
        title: 'Some Amazon listing',
        snippet: 'Marketplace result snippet',
        rank: 1,
      },
    ],
    candidatePreviews: [],
    matchedImageId: 'image-1',
    message: null,
    currentUrl: null,
    stage: 'amazon_triage',
    steps: [],
  }) as unknown as AmazonScanRuntimeResult;

const createProbeResult = (): AmazonScanRuntimeResult =>
  ({
    status: 'matched',
    asin: null,
    title: 'Some Amazon listing',
    price: '$19.99',
    url: 'https://www.amazon.com/dp/B00TEST123',
    description: 'Marketplace description',
    amazonDetails: {
      brand: null,
      manufacturer: null,
      modelNumber: null,
      partNumber: null,
      color: null,
      style: null,
      material: null,
      size: null,
      ean: null,
      gtin: null,
      upc: null,
      isbn: null,
      bulletPoints: [],
      attributes: [],
      rankings: [],
    },
    amazonProbe: {
      candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
      canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
      pageTitle: 'Some Amazon listing',
      descriptionSnippet: 'Marketplace description',
      heroImageUrl: null,
      heroImageAlt: null,
      heroImageArtifactName: null,
      artifactKey: null,
      imageCount: 1,
      asin: null,
      bulletPoints: [],
    },
    candidateUrls: ['https://www.amazon.com/dp/B00TEST123'],
    candidateResults: [],
    candidatePreviews: [],
    matchedImageId: 'image-1',
    message: null,
    currentUrl: 'https://www.amazon.com/dp/B00TEST123',
    stage: 'amazon_probe',
    steps: [],
  }) as unknown as AmazonScanRuntimeResult;

describe('Amazon AI evaluator fenced JSON handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDiskPathFromPublicPathMock.mockImplementation((value: string) => value);
  });

  it('parses fenced JSON responses during candidate triage', async () => {
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      modelId: 'gpt-4o',
      text: [
        '```json',
        JSON.stringify({
          recommendedAction: 'accept',
          rejectionCategory: null,
          reasons: ['Strongest candidate kept.'],
          candidates: [
            {
              url: 'https://www.amazon.com/dp/B00TEST123',
              keep: true,
              confidence: 0.93,
              rankAfter: 1,
              pageLanguage: 'en',
              languageAccepted: true,
              recommendedAction: 'accept',
              rejectionCategory: null,
              reasons: ['Result metadata matches the source product.'],
              mismatchLabels: [],
            },
          ],
        }),
        '```',
      ].join('\n'),
    });

    const result = await evaluateProductScanCandidateTriage({
      scan: createScan(),
      product: createProduct(),
      parsedResult: createTriageResult(),
      evaluatorConfig: enabledEvaluatorConfig,
      provider: 'google_lens_upload',
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'approved',
        recommendedAction: 'accept',
        keptCandidateUrls: ['https://www.amazon.com/dp/B00TEST123'],
        error: null,
      })
    );
  });

  it('parses fenced JSON responses during Amazon page evaluation', async () => {
    mocks.readPlaywrightEngineArtifactMock.mockResolvedValue({
      artifact: {
        name: 'amazon-scan-match',
        path: 'run-1/amazon-scan-match.png',
        mimeType: 'image/png',
        kind: 'screenshot',
      },
      content: Buffer.from('amazon-screenshot'),
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4o',
      text: [
        '```json',
        JSON.stringify({
          sameProduct: true,
          imageMatch: true,
          descriptionMatch: true,
          pageRepresentsSameProduct: true,
          pageLanguage: 'en',
          languageAccepted: true,
          languageReason: 'Page content is English.',
          confidence: 0.94,
          proceed: true,
          recommendedAction: 'accept',
          rejectionCategory: null,
          reasons: ['The Amazon page matches the source product.'],
          mismatches: [],
          mismatchLabels: [],
          variantAssessment: {
            brand: 'unknown',
            model: 'unknown',
            color: 'unknown',
            material: 'unknown',
            size: 'unknown',
            packCount: 'unknown',
            characterThemeLicense: 'unknown',
          },
        }),
        '```',
      ].join('\n'),
    });

    const result = await evaluateProductScanCandidateMatch({
      scan: createScan(),
      product: createProduct(),
      parsedResult: createProbeResult(),
      run: {
        runId: 'run-1',
        artifacts: [
          {
            name: 'amazon-scan-match',
            path: 'run-1/amazon-scan-match.png',
            mimeType: 'image/png',
            kind: 'screenshot',
          },
        ],
      },
      evaluatorConfig: enabledEvaluatorConfig,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'approved',
        proceed: true,
        languageAccepted: true,
        recommendedAction: 'accept',
        evidence: expect.objectContaining({
          candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
          candidateAsin: 'B00TEST123',
        }),
        error: null,
      })
    );
  });

  it('records source and candidate ASINs in evaluation evidence when both are known', async () => {
    mocks.readPlaywrightEngineArtifactMock.mockResolvedValue({
      artifact: {
        name: 'amazon-scan-match',
        path: 'run-1/amazon-scan-match.png',
        mimeType: 'image/png',
        kind: 'screenshot',
      },
      content: Buffer.from('amazon-screenshot'),
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4o',
      text: JSON.stringify({
        sameProduct: false,
        imageMatch: false,
        descriptionMatch: false,
        pageRepresentsSameProduct: false,
        pageLanguage: 'en',
        languageAccepted: true,
        languageReason: 'Page content is English.',
        confidence: 0.2,
        proceed: false,
        recommendedAction: 'try_next_candidate',
        rejectionCategory: 'wrong_product',
        reasons: ['The Amazon page shows a different product.'],
        mismatches: ['ASIN points to a different item.'],
        mismatchLabels: ['wrong_product'],
        variantAssessment: {
          brand: 'unknown',
          model: 'mismatch',
          color: 'unknown',
          material: 'unknown',
          size: 'unknown',
          packCount: 'unknown',
          characterThemeLicense: 'unknown',
        },
      }),
    });

    const result = await evaluateProductScanCandidateMatch({
      scan: createScan(),
      product: {
        ...createProduct(),
        asin: 'B07TWFYR7G',
      },
      parsedResult: createProbeResult(),
      run: {
        runId: 'run-1',
        artifacts: [
          {
            name: 'amazon-scan-match',
            path: 'run-1/amazon-scan-match.png',
            mimeType: 'image/png',
            kind: 'screenshot',
          },
        ],
      },
      evaluatorConfig: enabledEvaluatorConfig,
    });

    expect(result.evidence).toEqual(
      expect.objectContaining({
        sourceAsin: 'B07TWFYR7G',
        candidateAsin: 'B00TEST123',
      })
    );
  });
});
