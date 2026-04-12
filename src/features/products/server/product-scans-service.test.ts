import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  statMock: vi.fn(),
  readPlaywrightEngineRunMock: vi.fn(),
  readPlaywrightEngineArtifactMock: vi.fn(),
  collectPlaywrightEngineRunFailureMessagesMock: vi.fn(),
  buildPlaywrightEngineRunFailureMetaMock: vi.fn(),
  resolvePlaywrightEngineRunOutputsMock: vi.fn(),
  startPlaywrightEngineTaskMock: vi.fn(),
  createCustomPlaywrightInstanceMock: vi.fn(),
  invalidateProductMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  updateProductMock: vi.fn(),
  findLatestActiveProductScanMock: vi.fn(),
  getProductScanByIdMock: vi.fn(),
  listProductScansMock: vi.fn(),
  updateProductScanMock: vi.fn(),
  upsertProductScanMock: vi.fn(),
  getProductScannerSettingsMock: vi.fn(),
  resolveProductScannerHeadlessMock: vi.fn(),
  buildProductScannerEngineRequestOptionsMock: vi.fn(),
  resolveProductScannerAmazonCandidateEvaluatorConfigMock: vi.fn(),
  resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock: vi.fn(),
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfigMock: vi.fn(),
  resolveProductScanner1688CandidateEvaluatorConfigMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  evaluate1688SupplierCandidateMatchMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/files/runtime-fs', () => ({
  getFsPromises: () => ({
    stat: (...args: unknown[]) => mocks.statMock(...args),
  }),
}));

vi.mock('@/features/playwright/server', () => ({
  buildPlaywrightEngineRunFailureMeta: (...args: unknown[]) =>
    mocks.buildPlaywrightEngineRunFailureMetaMock(...args),
  collectPlaywrightEngineRunFailureMessages: (...args: unknown[]) =>
    mocks.collectPlaywrightEngineRunFailureMessagesMock(...args),
  createCustomPlaywrightInstance: (...args: unknown[]) =>
    mocks.createCustomPlaywrightInstanceMock(...args),
  readPlaywrightEngineArtifact: (...args: unknown[]) =>
    mocks.readPlaywrightEngineArtifactMock(...args),
  readPlaywrightEngineRun: (...args: unknown[]) => mocks.readPlaywrightEngineRunMock(...args),
  resolvePlaywrightEngineRunOutputs: (...args: unknown[]) =>
    mocks.resolvePlaywrightEngineRunOutputsMock(...args),
  startPlaywrightEngineTask: (...args: unknown[]) => mocks.startPlaywrightEngineTaskMock(...args),
}));

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateProduct: (...args: unknown[]) => mocks.invalidateProductMock(...args),
  },
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: (...args: unknown[]) => mocks.getProductByIdMock(...args),
    updateProduct: (...args: unknown[]) => mocks.updateProductMock(...args),
  },
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

vi.mock('./product-scans-repository', () => ({
  findLatestActiveProductScan: (...args: unknown[]) =>
    mocks.findLatestActiveProductScanMock(...args),
  getProductScanById: (...args: unknown[]) => mocks.getProductScanByIdMock(...args),
  listProductScans: (...args: unknown[]) => mocks.listProductScansMock(...args),
  updateProductScan: (...args: unknown[]) => mocks.updateProductScanMock(...args),
  upsertProductScan: (...args: unknown[]) => mocks.upsertProductScanMock(...args),
}));

vi.mock('./product-scanner-settings', () => ({
  getProductScannerSettings: (...args: unknown[]) =>
    mocks.getProductScannerSettingsMock(...args),
  resolveProductScannerHeadless: (...args: unknown[]) =>
    mocks.resolveProductScannerHeadlessMock(...args),
  buildProductScannerEngineRequestOptions: (...args: unknown[]) =>
    mocks.buildProductScannerEngineRequestOptionsMock(...args),
  resolveProductScannerAmazonCandidateEvaluatorConfig: (...args: unknown[]) =>
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock(...args),
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig: (...args: unknown[]) =>
    mocks.resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock(...args),
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfig: (...args: unknown[]) =>
    mocks.resolveProductScannerAmazonCandidateEvaluatorExtractionConfigMock(...args),
  resolveProductScanner1688CandidateEvaluatorConfig: (...args: unknown[]) =>
    mocks.resolveProductScanner1688CandidateEvaluatorConfigMock(...args),
}));

vi.mock('./product-scan-1688-evaluator', () => ({
  evaluate1688SupplierCandidateMatch: (...args: unknown[]) =>
    mocks.evaluate1688SupplierCandidateMatchMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: (...args: unknown[]) => mocks.runBrainChatCompletionMock(...args),
}));

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  queue1688BatchProductScans,
  queueAmazonBatchProductScans,
  synchronizeProductScan,
} from './product-scans-service';

const createScan = (overrides: Partial<ProductScanRecord> = {}): ProductScanRecord => ({
  id: 'scan-1',
  productId: 'product-1',
  provider: 'amazon',
  scanType: 'google_reverse_image',
  status: 'queued',
  productName: 'Product 1',
  engineRunId: 'run-1',
  imageCandidates: [
    {
      id: 'image-1',
      filepath: '/tmp/product-1.jpg',
      url: 'https://cdn.example.com/product-1.jpg',
      filename: 'product-1.jpg',
    },
  ],
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
  createdBy: 'user-1',
  updatedBy: 'user-1',
  completedAt: null,
  createdAt: '2026-04-11T04:00:00.000Z',
  updatedAt: '2026-04-11T04:00:00.000Z',
  ...overrides,
});

describe('product-scans-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.statMock.mockResolvedValue({
      isFile: () => true,
      size: 1024,
    });
    mocks.collectPlaywrightEngineRunFailureMessagesMock.mockReturnValue([
      'Amazon reverse image scan failed.',
    ]);
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({ reason: 'failed' });
    mocks.createCustomPlaywrightInstanceMock.mockReturnValue({
      family: 'scrape',
      label: 'Amazon reverse image ASIN scan',
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: null,
      playwrightBrowser: 'auto',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      playwrightSettingsOverrides: {
        headless: true,
      },
    });
    mocks.resolveProductScannerHeadlessMock.mockResolvedValue(true);
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({});
    const defaultAmazonEvaluationConfig = {
      enabled: false,
      mode: 'disabled',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: null,
      systemPrompt: null,
      brainApplied: null,
    };
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue(
      defaultAmazonEvaluationConfig
    );
    mocks.resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock.mockImplementation(
      (...args: unknown[]) =>
        mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock(...args)
    );
    mocks.resolveProductScannerAmazonCandidateEvaluatorExtractionConfigMock.mockImplementation(
      (...args: unknown[]) =>
        mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock(...args)
    );
    mocks.resolveProductScanner1688CandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: false,
      mode: 'disabled',
      threshold: 0.75,
      onlyForAmbiguousCandidates: true,
      modelId: null,
      systemPrompt: null,
      brainApplied: null,
    });
    mocks.updateProductScanMock.mockImplementation(
      async (id: string, updates: Partial<ProductScanRecord>) => ({
        ...createScan({ id }),
        ...updates,
        id,
      })
    );
    mocks.upsertProductScanMock.mockImplementation(async (scan: ProductScanRecord) => scan);
    mocks.evaluate1688SupplierCandidateMatchMock.mockResolvedValue(null);
  });

  it('fills a missing ASIN from a completed Amazon scan result', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'b00test123',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description',
        amazonDetails: {
          brand: 'Acme',
          manufacturer: 'Acme Manufacturing',
          modelNumber: 'MODEL-1',
          partNumber: 'PART-1',
          color: 'Blue',
          style: 'Modern',
          material: 'Steel',
          size: 'Large',
          pattern: null,
          finish: 'Matte',
          itemDimensions: '12 x 8 x 4 inches',
          packageDimensions: '14 x 10 x 5 inches',
          itemWeight: '1.2 pounds',
          packageWeight: '1.5 pounds',
          bestSellersRank: '#42 in Home & Kitchen',
          ean: '5901234567890',
          gtin: '5901234567890',
          upc: null,
          isbn: null,
          bulletPoints: ['Steel frame', 'Blue finish'],
          attributes: [
            {
              key: 'manufacturer',
              label: 'Manufacturer',
              value: 'Acme Manufacturing',
              source: 'technical_details',
            },
          ],
          rankings: [
            {
              rank: '#42',
              category: 'Home & Kitchen',
              source: 'best_sellers_rank',
            },
          ],
        },
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
    });
    mocks.updateProductMock.mockResolvedValue({ id: 'product-1', asin: 'B00TEST123' });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      { asin: 'B00TEST123' },
      { userId: 'user-1' }
    );
    expect(mocks.invalidateProductMock).toHaveBeenCalledWith('product-1');
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'completed',
        asin: 'B00TEST123',
        asinUpdateStatus: 'updated',
        asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
        amazonDetails: expect.objectContaining({
          manufacturer: 'Acme Manufacturing',
          ean: '5901234567890',
          itemDimensions: '12 x 8 x 4 inches',
          bulletPoints: ['Steel frame', 'Blue finish'],
        }),
        steps: [
          expect.objectContaining({
            key: 'product_asin_update',
            status: 'completed',
            message: 'Product ASIN filled from Amazon scan.',
          }),
        ],
        error: null,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'completed',
        asin: 'B00TEST123',
        asinUpdateStatus: 'updated',
        amazonDetails: expect.objectContaining({
          manufacturer: 'Acme Manufacturing',
          ean: '5901234567890',
        }),
      })
    );
  });

  it('gates matched Amazon scans through the AI evaluator and proceeds on approval', async () => {
    const scan = createScan({
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        {
          name: 'amazon-scan-match',
          path: 'run-1/amazon-scan-match.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        {
          name: 'amazon-scan-match',
          path: 'run-1/amazon-scan-match.html',
          mimeType: 'text/html',
          kind: 'html',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'b00test123',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description',
        amazonProbe: {
          pageTitle: 'Amazon title',
          candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
          canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
          heroImageUrl: 'data:image/jpeg;base64,QUJDREVGRw==',
          heroImageAlt: 'Acme product',
          heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          bulletCount: 1,
          attributeCount: 1,
        },
        amazonDetails: {
          brand: 'Acme',
          manufacturer: 'Acme Manufacturing',
          bulletPoints: ['Steel frame'],
          attributes: [],
          rankings: [],
        },
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
    mocks.readPlaywrightEngineArtifactMock.mockImplementation(async ({ fileName }) => {
      if (fileName === 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png') {
        return {
          artifact: {
            name: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero',
            path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
            mimeType: 'image/png',
            kind: 'screenshot',
          },
          content: Buffer.from('amazon-hero-screenshot'),
        };
      }

      return {
        artifact: {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        content: Buffer.from('amazon-screenshot'),
      };
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4o',
      text: JSON.stringify({
        sameProduct: true,
        imageMatch: true,
        descriptionMatch: true,
        pageRepresentsSameProduct: true,
        confidence: 0.93,
        proceed: true,
        reasons: ['Packaging and title align with the source product.'],
        mismatches: [],
      }),
    });
    mocks.updateProductMock.mockResolvedValue({ id: 'product-1', asin: 'B00TEST123' });

    const result = await synchronizeProductScan(scan);

    expect(mocks.runBrainChatCompletionMock).toHaveBeenCalledTimes(1);
    expect(mocks.readPlaywrightEngineArtifactMock).toHaveBeenNthCalledWith(1, {
      runId: 'run-1',
      fileName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
    });
    expect(mocks.readPlaywrightEngineArtifactMock).toHaveBeenCalledWith({
      runId: 'run-1',
      fileName: 'amazon-scan-probe-image-1-attempt-1-rank-1.png',
    });
    const brainCall = mocks.runBrainChatCompletionMock.mock.calls[0]?.[0];
    const userMessage = Array.isArray(brainCall?.messages)
      ? brainCall.messages.find((entry) => entry.role === 'user')
      : null;
    expect(userMessage).toEqual(
      expect.objectContaining({
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'image_url',
            image_url: expect.objectContaining({
              url: 'data:image/jpeg;base64,QUJD',
            }),
          }),
          expect.objectContaining({
            type: 'image_url',
            image_url: expect.objectContaining({
              url: 'data:image/png;base64,YW1hem9uLWhlcm8tc2NyZWVuc2hvdA==',
            }),
          }),
          expect.objectContaining({
            type: 'image_url',
            image_url: expect.objectContaining({
              url: 'data:image/png;base64,YW1hem9uLXNjcmVlbnNob3Q=',
            }),
          }),
        ]),
      })
    );
    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      { asin: 'B00TEST123' },
      { userId: 'user-1' }
    );
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'completed',
        amazonEvaluation: expect.objectContaining({
          status: 'approved',
          proceed: true,
          modelId: 'gpt-4o',
          evidence: expect.objectContaining({
            heroImageSource: 'data:image/jpeg;base64,QUJDREVGRw==',
            heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
            screenshotArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1.png',
          }),
        }),
        steps: expect.arrayContaining([
          expect.objectContaining({
            key: 'amazon_ai_evaluate',
            status: 'completed',
            resultCode: 'candidate_approved',
          }),
          expect.objectContaining({
            key: 'product_asin_update',
            status: 'completed',
          }),
        ]),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'completed',
        amazonEvaluation: expect.objectContaining({
          status: 'approved',
        }),
      })
    );
  });

  it('queues a direct Amazon extraction run after an approved probe-stage AI evaluation', async () => {
    const scan = createScan({
      status: 'running',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'probe_ready',
        asin: 'b00test123',
        title: 'Amazon title',
        price: null,
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description snippet',
        amazonDetails: null,
        amazonProbe: {
          asin: 'b00test123',
          pageTitle: 'Amazon title',
          descriptionSnippet: 'Amazon description snippet',
          candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
          canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
          heroImageUrl: 'data:image/jpeg;base64,QUJDREVGRw==',
          heroImageAlt: 'Acme product',
          heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          bulletPoints: ['Steel frame'],
          bulletCount: 1,
          attributeCount: 1,
        },
        matchedImageId: 'image-1',
        steps: [
          {
            key: 'amazon_probe',
            label: 'Probe Amazon product page',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-1',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'probe_ready',
            status: 'completed',
            message: 'Collected Amazon candidate page evidence before extraction.',
            warning: null,
            details: [],
            url: 'https://www.amazon.com/dp/B00TEST123',
            startedAt: '2026-04-11T04:04:00.000Z',
            completedAt: '2026-04-11T04:04:03.000Z',
            durationMs: 3000,
          },
        ],
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
    mocks.readPlaywrightEngineArtifactMock.mockImplementation(async ({ fileName }) => {
      if (fileName === 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png') {
        return {
          artifact: {
            name: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero',
            path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
            mimeType: 'image/png',
            kind: 'screenshot',
          },
          content: Buffer.from('amazon-hero-screenshot'),
        };
      }

      return {
        artifact: {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        content: Buffer.from('amazon-screenshot'),
      };
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4o',
      text: JSON.stringify({
        sameProduct: true,
        imageMatch: true,
        descriptionMatch: true,
        pageRepresentsSameProduct: true,
        confidence: 0.93,
        proceed: true,
        reasons: ['Packaging and title align with the source product.'],
        mismatches: [],
      }),
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-2',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledTimes(1);
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            directAmazonCandidateUrl: 'https://www.amazon.com/dp/B00TEST123',
            directMatchedImageId: 'image-1',
            directAmazonCandidateRank: 1,
            probeOnlyOnAmazonMatch: false,
            skipAmazonProbe: true,
          }),
        }),
      })
    );
    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: 'queued',
        engineRunId: 'run-2',
        amazonProbe: expect.objectContaining({
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
        }),
        amazonEvaluation: expect.objectContaining({
          status: 'approved',
          proceed: true,
        }),
      })
    );
  });

  it('does not rerun AI evaluation during approved-candidate extraction completion', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-2',
      rawResult: {
        runId: 'run-2',
        approvedCandidateExtraction: true,
      },
      amazonProbe: {
        asin: 'b00test123',
        pageTitle: 'Amazon title',
        descriptionSnippet: 'Amazon description snippet',
        candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
        canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
        heroImageUrl: 'data:image/jpeg;base64,QUJDREVGRw==',
        heroImageAlt: 'Acme product',
        heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
        artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
        bulletPoints: ['Steel frame'],
        bulletCount: 1,
        attributeCount: 1,
      },
      amazonEvaluation: {
        status: 'approved',
        sameProduct: true,
        imageMatch: true,
        descriptionMatch: true,
        pageRepresentsSameProduct: true,
        confidence: 0.93,
        proceed: true,
        threshold: 0.85,
        reasons: ['Packaging and title align with the source product.'],
        mismatches: [],
        modelId: 'gpt-4o',
        brainApplied: {
          capability: 'product.scan.amazon_candidate_match',
        },
        evidence: {
          candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
          pageTitle: 'Amazon title',
          heroImageSource: 'data:image/jpeg;base64,QUJDREVGRw==',
          heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          screenshotArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1.png',
          htmlArtifactName: null,
          productImageSource: 'data:image/jpeg;base64,QUJD',
        },
        error: null,
        evaluatedAt: '2026-04-11T04:04:05.000Z',
      },
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-2',
      status: 'completed',
      completedAt: '2026-04-11T04:06:00.000Z',
      artifacts: [],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'b00test123',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description',
        amazonProbe: null,
        amazonDetails: {
          brand: 'Acme',
          manufacturer: 'Acme Manufacturing',
          bulletPoints: ['Steel frame'],
          attributes: [],
          rankings: [],
        },
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.updateProductMock.mockResolvedValue({ id: 'product-1', asin: 'B00TEST123' });

    const result = await synchronizeProductScan(scan);

    expect(mocks.runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      { asin: 'B00TEST123' },
      { userId: 'user-1' }
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'completed',
        amazonProbe: expect.objectContaining({
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
        }),
        amazonEvaluation: expect.objectContaining({
          status: 'approved',
        }),
      })
    );
  });

  it('continues with the next Amazon candidate after a probe-stage AI rejection', async () => {
    const scan = createScan({
      status: 'running',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'probe_ready',
        asin: 'b00test123',
        title: 'Wrong Amazon title',
        price: null,
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Wrong Amazon description snippet',
        candidateUrls: [
          'https://www.amazon.com/dp/B00TEST123',
          'https://www.amazon.com/dp/B00TEST456',
          'https://www.amazon.com/dp/B00TEST789',
        ],
        amazonDetails: null,
        amazonProbe: {
          asin: 'b00test123',
          pageTitle: 'Wrong Amazon title',
          descriptionSnippet: 'Wrong Amazon description snippet',
          candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
          canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
          heroImageUrl: 'data:image/jpeg;base64,QUJDREVGRw==',
          heroImageAlt: 'Wrong product',
          heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          bulletPoints: ['Wrong bullet'],
          bulletCount: 1,
          attributeCount: 1,
        },
        matchedImageId: 'image-1',
        steps: [
          {
            key: 'amazon_probe',
            label: 'Probe Amazon product page',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-1',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'probe_ready',
            status: 'completed',
            message: 'Collected Amazon candidate page evidence before extraction.',
            warning: null,
            details: [],
            url: 'https://www.amazon.com/dp/B00TEST123',
            startedAt: '2026-04-11T04:04:00.000Z',
            completedAt: '2026-04-11T04:04:03.000Z',
            durationMs: 3000,
          },
        ],
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
    mocks.readPlaywrightEngineArtifactMock.mockImplementation(async ({ fileName }) => {
      if (fileName === 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png') {
        return {
          artifact: {
            name: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero',
            path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
            mimeType: 'image/png',
            kind: 'screenshot',
          },
          content: Buffer.from('amazon-hero-screenshot'),
        };
      }

      return {
        artifact: {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        content: Buffer.from('amazon-screenshot'),
      };
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4o',
      text: JSON.stringify({
        sameProduct: false,
        imageMatch: false,
        descriptionMatch: false,
        pageRepresentsSameProduct: false,
        confidence: 0.21,
        proceed: false,
        reasons: ['The Amazon page shows a different product.'],
        mismatches: ['Title and image do not match.'],
      }),
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-2',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledTimes(1);
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            directAmazonCandidateUrl: 'https://www.amazon.com/dp/B00TEST456',
            directAmazonCandidateUrls: [
              'https://www.amazon.com/dp/B00TEST456',
              'https://www.amazon.com/dp/B00TEST789',
            ],
            directMatchedImageId: 'image-1',
            directAmazonCandidateRank: 2,
            probeOnlyOnAmazonMatch: true,
            skipAmazonProbe: false,
          }),
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'queued',
        engineRunId: 'run-2',
        url: 'https://www.amazon.com/dp/B00TEST456',
        amazonProbe: expect.objectContaining({
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
        }),
        amazonEvaluation: expect.objectContaining({
          status: 'rejected',
          proceed: false,
        }),
      })
    );
  });

  it('continues with the next Amazon candidate after rejecting non-English page content', async () => {
    const scan = createScan({
      status: 'running',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'probe_ready',
        asin: 'b00test123',
        title: 'Matching Amazon title',
        price: null,
        url: 'https://www.amazon.de/dp/B00TEST123',
        description: 'Matching Amazon description snippet',
        candidateUrls: [
          'https://www.amazon.de/dp/B00TEST123',
          'https://www.amazon.com/dp/B00TEST456',
        ],
        amazonDetails: null,
        amazonProbe: {
          asin: 'b00test123',
          pageTitle: 'Matching Amazon title',
          descriptionSnippet: 'Matching Amazon description snippet',
          pageLanguage: 'de',
          pageLanguageSource: 'html_lang',
          marketplaceDomain: 'amazon.de',
          candidateUrl: 'https://www.amazon.de/dp/B00TEST123',
          canonicalUrl: 'https://www.amazon.de/dp/B00TEST123',
          heroImageUrl: null,
          heroImageAlt: null,
          heroImageArtifactName: null,
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          bulletPoints: ['Produktbeschreibung'],
          bulletCount: 1,
          attributeCount: 0,
        },
        matchedImageId: 'image-1',
        steps: [
          {
            key: 'amazon_probe',
            label: 'Probe Amazon product page',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-1',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'probe_ready',
            status: 'completed',
            message: 'Collected Amazon candidate page evidence before extraction.',
            warning: null,
            details: [],
            url: 'https://www.amazon.de/dp/B00TEST123',
            startedAt: '2026-04-11T04:04:00.000Z',
            completedAt: '2026-04-11T04:04:03.000Z',
            durationMs: 3000,
          },
        ],
      },
      finalUrl: 'https://www.amazon.de/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-2',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: 'queued',
        engineRunId: 'run-2',
        url: 'https://www.amazon.com/dp/B00TEST456',
        amazonEvaluation: expect.objectContaining({
          status: 'rejected',
          languageAccepted: false,
          pageLanguage: 'de',
        }),
      })
    );
  });

  it('preserves rejected Amazon candidate evaluation history across multiple continuations', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-2',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
      rawResult: {
        runId: 'run-2',
        candidateRejectedByAi: true,
        candidateContinuation: true,
        continuationCandidateUrls: [
          'https://www.amazon.com/dp/B00TEST456',
          'https://www.amazon.com/dp/B00TEST789',
        ],
      },
      amazonProbe: {
        asin: 'b00test123',
        pageTitle: 'Wrong Amazon title',
        descriptionSnippet: 'Wrong Amazon description snippet',
        candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
        canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
        heroImageUrl: 'data:image/jpeg;base64,QUJDREVGRw==',
        heroImageAlt: 'Wrong product',
        heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
        artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
        bulletPoints: ['Wrong bullet'],
        bulletCount: 1,
        attributeCount: 1,
      },
      amazonEvaluation: {
        status: 'rejected',
        sameProduct: false,
        imageMatch: false,
        descriptionMatch: false,
        pageRepresentsSameProduct: false,
        confidence: 0.21,
        proceed: false,
        threshold: 0.85,
        reasons: ['The Amazon page shows a different product.'],
        mismatches: ['Title and image do not match.'],
        modelId: 'gpt-4o',
        brainApplied: {
          capability: 'product.scan.amazon_candidate_match',
        },
        evidence: {
          candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
          pageTitle: 'Wrong Amazon title',
          heroImageSource: 'data:image/jpeg;base64,QUJDREVGRw==',
          heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          screenshotArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1.png',
          htmlArtifactName: null,
          productImageSource: 'data:image/jpeg;base64,QUJD',
        },
        error: null,
        evaluatedAt: '2026-04-11T04:04:05.000Z',
      },
      steps: [
        {
          key: 'amazon_probe',
          label: 'Probe Amazon product page',
          group: 'amazon',
          attempt: 1,
          candidateId: 'image-1',
          candidateRank: 1,
          inputSource: null,
          retryOf: null,
          resultCode: 'probe_ready',
          status: 'completed',
          message: 'Collected Amazon candidate page evidence before extraction.',
          warning: null,
          details: [],
          url: 'https://www.amazon.com/dp/B00TEST123',
          startedAt: '2026-04-11T04:04:00.000Z',
          completedAt: '2026-04-11T04:04:03.000Z',
          durationMs: 3000,
        },
        {
          key: 'amazon_ai_evaluate',
          label: 'Evaluate Amazon candidate match',
          group: 'amazon',
          attempt: 1,
          candidateId: 'image-1',
          candidateRank: 1,
          inputSource: null,
          retryOf: null,
          resultCode: 'candidate_rejected',
          status: 'failed',
          message: 'AI evaluator rejected the Amazon candidate (21%).',
          warning: null,
          details: [
            { label: 'Model', value: 'gpt-4o' },
            { label: 'Confidence', value: '21%' },
            { label: 'Candidate URL', value: 'https://www.amazon.com/dp/B00TEST123' },
            { label: 'Reason', value: 'The Amazon page shows a different product.' },
            { label: 'Mismatch', value: 'Title and image do not match.' },
          ],
          url: 'https://www.amazon.com/dp/B00TEST123',
          startedAt: '2026-04-11T04:04:04.000Z',
          completedAt: '2026-04-11T04:04:05.000Z',
          durationMs: 1000,
        },
        {
          key: 'queue_scan',
          label: 'Continue with next Amazon candidate',
          group: 'input',
          attempt: 2,
          candidateId: null,
          candidateRank: null,
          inputSource: null,
          retryOf: null,
          resultCode: 'run_queued',
          status: 'completed',
          message: 'Queued the next Amazon candidate after AI rejection.',
          warning: null,
          details: [
            { label: 'Rejected candidate URL', value: 'https://www.amazon.com/dp/B00TEST123' },
            { label: 'Next candidate URL', value: 'https://www.amazon.com/dp/B00TEST456' },
          ],
          url: 'https://www.amazon.com/dp/B00TEST456',
          startedAt: '2026-04-11T04:04:05.500Z',
          completedAt: '2026-04-11T04:04:05.500Z',
          durationMs: 0,
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-2',
      status: 'completed',
      completedAt: '2026-04-11T04:06:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-2-hero',
          path: 'run-2/amazon-scan-probe-image-1-attempt-1-rank-2-hero.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-2',
          path: 'run-2/amazon-scan-probe-image-1-attempt-1-rank-2.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'probe_ready',
        asin: 'b00test456',
        title: 'Still wrong Amazon title',
        price: null,
        url: 'https://www.amazon.com/dp/B00TEST456',
        description: 'Still wrong Amazon description snippet',
        candidateUrls: [
          'https://www.amazon.com/dp/B00TEST456',
          'https://www.amazon.com/dp/B00TEST789',
        ],
        amazonDetails: null,
        amazonProbe: {
          asin: 'b00test456',
          pageTitle: 'Still wrong Amazon title',
          descriptionSnippet: 'Still wrong Amazon description snippet',
          candidateUrl: 'https://www.amazon.com/dp/B00TEST456',
          canonicalUrl: 'https://www.amazon.com/dp/B00TEST456',
          heroImageUrl: 'data:image/jpeg;base64,SElKS0w=',
          heroImageAlt: 'Still wrong product',
          heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-2-hero.png',
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-2',
          bulletPoints: ['Still wrong bullet'],
          bulletCount: 1,
          attributeCount: 1,
        },
        matchedImageId: 'image-1',
        steps: [
          {
            key: 'amazon_probe',
            label: 'Probe Amazon product page',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-1',
            candidateRank: 2,
            inputSource: null,
            retryOf: null,
            resultCode: 'probe_ready',
            status: 'completed',
            message: 'Collected Amazon candidate page evidence before extraction.',
            warning: null,
            details: [],
            url: 'https://www.amazon.com/dp/B00TEST456',
            startedAt: '2026-04-11T04:05:00.000Z',
            completedAt: '2026-04-11T04:05:03.000Z',
            durationMs: 3000,
          },
        ],
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST456',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
    mocks.readPlaywrightEngineArtifactMock.mockImplementation(async ({ fileName }) => {
      if (fileName === 'amazon-scan-probe-image-1-attempt-1-rank-2-hero.png') {
        return {
          artifact: {
            name: 'amazon-scan-probe-image-1-attempt-1-rank-2-hero',
            path: 'run-2/amazon-scan-probe-image-1-attempt-1-rank-2-hero.png',
            mimeType: 'image/png',
            kind: 'screenshot',
          },
          content: Buffer.from('amazon-hero-screenshot-2'),
        };
      }

      return {
        artifact: {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-2',
          path: 'run-2/amazon-scan-probe-image-1-attempt-1-rank-2.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        content: Buffer.from('amazon-screenshot-2'),
      };
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4o',
      text: JSON.stringify({
        sameProduct: false,
        imageMatch: false,
        descriptionMatch: false,
        pageRepresentsSameProduct: false,
        confidence: 0.17,
        proceed: false,
        reasons: ['The second Amazon page is still a different product.'],
        mismatches: ['Brand and bullets do not match.'],
      }),
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-3',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(result).toEqual(
      expect.objectContaining({
        status: 'queued',
        engineRunId: 'run-3',
        url: 'https://www.amazon.com/dp/B00TEST789',
      })
    );

    const evaluationSteps = result.steps.filter((step) => step.key === 'amazon_ai_evaluate');
    expect(evaluationSteps).toHaveLength(2);
    expect(
      evaluationSteps.map((step) => ({
        attempt: step.attempt,
        candidateRank: step.candidateRank,
        url: step.url,
        resultCode: step.resultCode,
      }))
    ).toEqual([
      {
        attempt: 1,
        candidateRank: 1,
        url: 'https://www.amazon.com/dp/B00TEST123',
        resultCode: 'candidate_rejected',
      },
      {
        attempt: 2,
        candidateRank: 2,
        url: 'https://www.amazon.com/dp/B00TEST456',
        resultCode: 'candidate_rejected',
      },
    ]);

    const continuationQueueSteps = result.steps.filter((step) => step.key === 'queue_scan');
    expect(continuationQueueSteps.map((step) => step.attempt)).toEqual([2, 3]);
    expect(continuationQueueSteps[1]).toEqual(
      expect.objectContaining({
        attempt: 3,
        url: 'https://www.amazon.com/dp/B00TEST789',
      })
    );
  });

  it('turns a matched Amazon candidate into no_match when the AI evaluator rejects it', async () => {
    const scan = createScan({
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-match',
          path: 'run-1/amazon-scan-match.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'b00test123',
        title: 'Wrong Amazon product',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Wrong description',
        amazonDetails: {
          brand: 'Other Brand',
          bulletPoints: ['Different item'],
          attributes: [],
          rankings: [],
        },
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
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
        confidence: 0.24,
        proceed: false,
        reasons: ['The Amazon page shows a different product.'],
        mismatches: ['Brand and visible image do not match.'],
      }),
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'no_match',
        asin: null,
        title: null,
        url: null,
        amazonDetails: null,
        asinUpdateStatus: 'not_needed',
        amazonEvaluation: expect.objectContaining({
          status: 'rejected',
          proceed: false,
        }),
        steps: expect.arrayContaining([
          expect.objectContaining({
            key: 'amazon_ai_evaluate',
            status: 'failed',
            resultCode: 'candidate_rejected',
            details: expect.arrayContaining([
              { label: 'Model source', value: 'AI Brain default' },
              { label: 'Threshold', value: '85%' },
              { label: 'Evaluation scope', value: 'Every Amazon candidate' },
              { label: 'Allowed content language', value: 'English' },
              { label: 'Language policy', value: 'Reject non-English content' },
              { label: 'Language detection', value: 'Deterministic first, then AI' },
            ]),
          }),
          expect.objectContaining({
            key: 'product_asin_update',
            status: 'skipped',
            resultCode: 'asin_not_needed',
          }),
        ]),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'no_match',
        amazonEvaluation: expect.objectContaining({
          status: 'rejected',
        }),
      })
    );
  });

  it('skips the AI evaluator for non-ambiguous matches when configured to do so', async () => {
    const scan = createScan({
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'b00test123',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description',
        amazonDetails: {
          ean: '5901234567890',
          gtin: '5901234567890',
          bulletPoints: [],
          attributes: [],
          rankings: [],
        },
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: 'B00TEST123',
      ean: '5901234567890',
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: true,
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'completed',
        asin: 'B00TEST123',
        asinUpdateStatus: 'unchanged',
        amazonEvaluation: expect.objectContaining({
          status: 'skipped',
          proceed: true,
        }),
        steps: expect.arrayContaining([
          expect.objectContaining({
            key: 'amazon_ai_evaluate',
            status: 'skipped',
            resultCode: 'evaluation_skipped',
          }),
          expect.objectContaining({
            key: 'product_asin_update',
            status: 'completed',
            resultCode: 'asin_unchanged',
          }),
        ]),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'completed',
        amazonEvaluation: expect.objectContaining({
          status: 'skipped',
        }),
      })
    );
  });

  it('persists structured scan steps from a running Playwright scan result', async () => {
    const scan = createScan({
      status: 'running',
      steps: [
        {
          key: 'prepare_scan',
          label: 'Prepare Amazon scan',
          status: 'completed',
          message: 'Prepared 1 image candidate for Amazon reverse image scan.',
          url: null,
          startedAt: '2026-04-11T03:59:58.000Z',
          completedAt: '2026-04-11T03:59:58.000Z',
        },
        {
          key: 'queue_scan',
          label: 'Start Playwright scan',
          status: 'completed',
          message: 'Playwright Amazon scan queued.',
          url: null,
          startedAt: '2026-04-11T03:59:59.000Z',
          completedAt: '2026-04-11T03:59:59.000Z',
        },
      ],
      rawResult: {
        runId: 'run-1',
        runStatus: 'running',
      },
    });
    const oversizedStepDetails = Array.from({ length: 25 }, (_, index) => ({
      label: `Detail ${index + 1}`,
      value: `Value ${index + 1}`,
    }));

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'running',
        stage: 'google_candidates',
        message: 'Found 3 Amazon candidates.',
        steps: [
          {
            key: 'validate',
            label: 'Validate scan input',
            status: 'completed',
            message: 'Validated 1 product image candidate.',
            url: 'https://lens.google.com/',
            startedAt: '2026-04-11T04:00:00.000Z',
            completedAt: '2026-04-11T04:00:01.000Z',
          },
          {
            key: 'google_candidates',
            label: 'Collect Amazon candidates from Google Lens',
            status: 'completed',
            message: 'Found 3 Amazon candidates.',
            details: oversizedStepDetails,
            url: 'https://lens.google.com/search',
            startedAt: '2026-04-11T04:00:02.000Z',
            completedAt: '2026-04-11T04:00:03.000Z',
          },
        ],
      },
      finalUrl: 'https://lens.google.com/search',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'running',
        steps: [
          expect.objectContaining({
            key: 'prepare_scan',
            status: 'completed',
          }),
          expect.objectContaining({
            key: 'queue_scan',
            status: 'completed',
          }),
          expect.objectContaining({
            key: 'validate',
            status: 'completed',
          }),
          expect.objectContaining({
            key: 'google_candidates',
            status: 'completed',
            details: oversizedStepDetails.slice(0, 20),
          }),
        ],
      })
    );
    expect(result.steps).toHaveLength(4);
    expect(result.steps.find((step) => step.key === 'google_candidates')?.details).toEqual(
      oversizedStepDetails.slice(0, 20)
    );
  });

  it('marks conflicting ASIN results without overwriting the product', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'B00TEST999',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST999',
        description: 'Amazon description',
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST999',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: 'B00TEST123',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.invalidateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'conflict',
        asin: 'B00TEST999',
        asinUpdateStatus: 'conflict',
        asinUpdateMessage: 'Detected ASIN B00TEST999 differs from existing ASIN B00TEST123.',
        steps: [
          expect.objectContaining({
            key: 'product_asin_update',
            status: 'failed',
            message: 'Detected ASIN B00TEST999 differs from existing ASIN B00TEST123.',
          }),
        ],
        error: 'Detected ASIN B00TEST999 differs from existing ASIN B00TEST123.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'conflict',
        asinUpdateStatus: 'conflict',
      })
    );
  });

  it('surfaces captcha waiting guidance while a headed scan run is still running', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      completedAt: null,
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            message:
              'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
            stage: 'google_candidates',
            currentUrl: 'https://lens.google.com/search',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        message:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
        stage: 'google_candidates',
        currentUrl: 'https://lens.google.com/search',
      },
      finalUrl: 'https://lens.google.com/search',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'running',
        asinUpdateStatus: 'pending',
        asinUpdateMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
        rawResult: expect.objectContaining({
          status: 'captcha_required',
          manualVerificationPending: true,
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'running',
        asinUpdateMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
      })
    );
  });

  it('clears manual verification messaging once the running scan continues past captcha', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
      rawResult: {
        runId: 'run-1',
        manualVerificationPending: true,
        manualVerificationMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
        manualVerificationTimeoutMs: 180000,
      },
      asinUpdateMessage:
        'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      completedAt: null,
      result: {
        outputs: {
          result: {
            status: 'matched',
            asin: 'B000123456',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'B000123456',
      },
      finalUrl: 'https://www.amazon.com/dp/B000123456',
    });

    await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'running',
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        rawResult: expect.objectContaining({
          runId: 'run-1',
          runStatus: 'running',
          manualVerificationPending: false,
          manualVerificationMessage: null,
          manualVerificationTimeoutMs: 180000,
        }),
      })
    );
  });

  it('relaunches a captcha-blocked headless run in headed mode and keeps the scan active', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: '/tmp/product-1.jpg',
          url: 'https://cdn.example.com/product-1.jpg',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            message: 'Google Lens requested captcha verification.',
            stage: 'google_candidates',
            currentUrl: 'https://www.google.com/sorry/index',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        message: 'Google Lens requested captcha verification.',
        stage: 'google_candidates',
        currentUrl: 'https://www.google.com/sorry/index',
      },
      finalUrl: 'https://www.google.com/sorry/index',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 180000,
      playwrightSettingsOverrides: {
        headless: true,
        timeout: 45000,
      },
    });
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      personaId: 'persona-1',
      settingsOverrides: {
        timeout: 45000,
      },
      launchOptions: {
        channel: 'chrome',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-headed-1',
      status: 'running',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.getProductScannerSettingsMock).toHaveBeenCalledTimes(1);
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          personaId: 'persona-1',
          browserEngine: 'chromium',
          settingsOverrides: {
            timeout: 45000,
            headless: false,
          },
          launchOptions: {
            channel: 'chrome',
          },
          input: expect.objectContaining({
            productId: 'product-1',
            productName: 'Product 1',
            existingAsin: null,
            allowManualVerification: true,
            manualVerificationTimeoutMs: 180000,
          }),
        }),
      })
    );
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-headed-1',
        status: 'running',
        asinUpdateStatus: 'pending',
        asinUpdateMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        engineRunId: 'run-headed-1',
        status: 'running',
      })
    );
  });

  it('does not show manual verification guidance until a captcha retry is actually running', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: '/tmp/product-1.jpg',
          url: 'https://cdn.example.com/product-1.jpg',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            message: 'Google Lens requested captcha verification.',
            stage: 'google_candidates',
            currentUrl: 'https://www.google.com/sorry/index',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        message: 'Google Lens requested captcha verification.',
        stage: 'google_candidates',
        currentUrl: 'https://www.google.com/sorry/index',
      },
      finalUrl: 'https://www.google.com/sorry/index',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 180000,
      playwrightSettingsOverrides: {
        headless: true,
      },
    });
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      personaId: 'persona-1',
      settingsOverrides: {},
      launchOptions: {
        channel: 'chrome',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-headed-queued',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(result).toEqual(
      expect.objectContaining({
        engineRunId: 'run-headed-queued',
        status: 'queued',
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        rawResult: expect.objectContaining({
          manualVerificationPending: false,
          manualVerificationMessage: null,
        }),
      })
    );
  });

  it('fails a captcha-blocked run when scanner settings are configured not to reopen a visible browser', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            message: 'Google Lens requested captcha verification.',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        message: 'Google Lens requested captcha verification.',
      },
      finalUrl: 'https://www.google.com/sorry/index',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'fail',
      manualVerificationTimeoutMs: 120000,
      playwrightSettingsOverrides: {
        headless: true,
      },
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.startPlaywrightEngineTaskMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
        asinUpdateMessage:
          'Google Lens requested captcha verification, and scanner settings are configured to fail instead of reopening a visible browser.',
      })
    );
  });

  it('stores no_match results without attempting an ASIN update', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'no_match',
        asin: null,
        title: null,
        price: null,
        url: null,
        description: null,
        matchedImageId: null,
        message: 'Google reverse image search did not return a usable Amazon result.',
      },
      finalUrl: 'https://lens.google.com/',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.getProductByIdMock).not.toHaveBeenCalled();
    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'no_match',
        url: 'https://lens.google.com/',
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage:
          'Google reverse image search did not return a usable Amazon result.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'no_match',
        asinUpdateStatus: 'not_needed',
      })
    );
  });

  it('stores failed engine runs with failure metadata', async () => {
    const scan = createScan({
      steps: [
        {
          key: 'google_upload',
          label: 'Upload image to Google Lens',
          status: 'completed',
          message: 'Uploaded image image-1 to Google Lens.',
          url: 'https://lens.google.com/search',
          startedAt: '2026-04-11T04:00:00.000Z',
          completedAt: '2026-04-11T04:00:02.000Z',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'failed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'running',
        steps: [
          {
            key: 'google_upload',
            label: 'Upload image to Google Lens',
            status: 'completed',
            message: 'Uploaded image image-1 to Google Lens.',
            url: 'https://lens.google.com/search',
            startedAt: '2026-04-11T04:00:00.000Z',
            completedAt: '2026-04-11T04:00:02.000Z',
          },
          {
            key: 'google_candidates',
            label: 'Collect Amazon candidates from Google Lens',
            status: 'running',
            message: 'Collecting Amazon result candidates from Google Lens.',
            url: 'https://lens.google.com/search',
            startedAt: '2026-04-11T04:00:03.000Z',
            completedAt: null,
          },
        ],
      },
      finalUrl: 'https://lens.google.com/search',
    });
    mocks.collectPlaywrightEngineRunFailureMessagesMock.mockReturnValue([
      'Engine run failed before producing a result.',
    ]);
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({
      reason: 'Engine run failed before producing a result.',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Engine run failed before producing a result.',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'Engine run failed before producing a result.',
        steps: [
          expect.objectContaining({
            key: 'google_upload',
            status: 'completed',
          }),
          expect.objectContaining({
            key: 'google_candidates',
            status: 'running',
          }),
        ],
        rawResult: {
          reason: 'Engine run failed before producing a result.',
        },
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
        steps: [
          expect.objectContaining({
            key: 'google_upload',
            status: 'completed',
          }),
          expect.objectContaining({
            key: 'google_candidates',
            status: 'running',
          }),
        ],
      })
    );
  });

  it('fails active scans whose Playwright engine run can no longer be found', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue(null);

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Playwright engine run run-1 was not found.',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'Playwright engine run run-1 was not found.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
      })
    );
  });

  it('fails stale active scans that are missing an engine run id', async () => {
    const scan = createScan({
      status: 'queued',
      engineRunId: null,
      createdAt: new Date(Date.now() - 120_000).toISOString(),
      updatedAt: new Date(Date.now() - 120_000).toISOString(),
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.readPlaywrightEngineRunMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Amazon scan is missing its Playwright engine run id.',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'Amazon scan is missing its Playwright engine run id.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
      })
    );
  });

  it('keeps recent active scans without an engine run id in queued state', async () => {
    const scan = createScan({
      status: 'queued',
      engineRunId: null,
      createdAt: new Date(Date.now() - 5_000).toISOString(),
      updatedAt: new Date(Date.now() - 5_000).toISOString(),
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.readPlaywrightEngineRunMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).not.toHaveBeenCalled();
    expect(result).toEqual(scan);
  });

  it('recovers an active scan engine run id from rawResult metadata', async () => {
    const scan = createScan({
      status: 'queued',
      engineRunId: null,
      rawResult: {
        runId: 'run-from-raw-result',
        status: 'queued',
      },
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-from-raw-result',
      status: 'running',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.readPlaywrightEngineRunMock).toHaveBeenCalledWith('run-from-raw-result');
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-from-raw-result',
        status: 'running',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        engineRunId: 'run-from-raw-result',
        status: 'running',
      })
    );
  });

  it('persists a recovered engine run id even when the run status is still queued', async () => {
    const scan = createScan({
      status: 'queued',
      engineRunId: null,
      rawResult: {
        runId: 'run-still-queued',
        status: 'queued',
      },
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-still-queued',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.readPlaywrightEngineRunMock).toHaveBeenCalledWith('run-still-queued');
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-still-queued',
        status: 'queued',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        engineRunId: 'run-still-queued',
        status: 'queued',
      })
    );
  });

  it('returns an in-memory running scan when persisting a queued-to-running sync fails', async () => {
    const scan = createScan({ status: 'queued' });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
    });
    mocks.updateProductScanMock.mockRejectedValue(new Error('repository unavailable'));

    const result = await synchronizeProductScan(scan);

    expect(result).toEqual(
      expect.objectContaining({
        id: 'scan-1',
        status: 'running',
        engineRunId: 'run-1',
        error: null,
        asinUpdateStatus: 'pending',
      })
    );
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'repository unavailable' }),
      expect.objectContaining({
        service: 'product-scans.service',
        action: 'persistSynchronizedScan',
        scanId: 'scan-1',
        productId: 'product-1',
        engineRunId: 'run-1',
      })
    );
  });

  it('retries a transient synchronized-scan write failure before falling back in memory', async () => {
    const scan = createScan({ status: 'queued' });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
    });
    mocks.updateProductScanMock
      .mockRejectedValueOnce(new Error('repository temporarily unavailable'))
      .mockImplementation(async (id: string, updates: Partial<ProductScanRecord>) => ({
        ...createScan({ id }),
        ...updates,
        id,
      }));

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledTimes(2);
    expect(mocks.captureExceptionMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: 'scan-1',
        status: 'running',
        engineRunId: 'run-1',
        error: null,
        asinUpdateStatus: 'pending',
      })
    );
  });

  it('keeps the scan active when reading the Playwright engine run throws', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockRejectedValue(new Error('engine read failed'));

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).not.toHaveBeenCalled();
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'engine read failed' }),
      expect.objectContaining({
        service: 'product-scans.service',
        action: 'synchronizeProductScan.readRun',
        scanId: 'scan-1',
        productId: 'product-1',
        engineRunId: 'run-1',
      })
    );
    expect(result).toEqual(scan);
  });

  it('marks the scan failed when updating the product ASIN throws', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'B00TEST123',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description',
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
    });
    mocks.updateProductMock.mockRejectedValue(new Error('database write failed'));

    const result = await synchronizeProductScan(scan);

    expect(mocks.invalidateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        asin: 'B00TEST123',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'database write failed',
        error: 'database write failed',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
      })
    );
  });

  it('truncates oversized Amazon result fields before persisting the scan', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'B00TEST123',
        title: 'T'.repeat(1_200),
        price: '$'.repeat(250),
        url: `https://www.amazon.com/dp/B00TEST123?${'x'.repeat(4_200)}`,
        description: 'D'.repeat(8_500),
        matchedImageId: 'M'.repeat(200),
      },
      finalUrl: `https://www.amazon.com/dp/B00TEST123?${'y'.repeat(4_200)}`,
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
    });
    mocks.updateProductMock.mockResolvedValue({ id: 'product-1', asin: 'B00TEST123' });

    await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        matchedImageId: 'M'.repeat(160),
        title: 'T'.repeat(1_000),
        price: '$'.repeat(200),
        url: expect.stringMatching(/^https:\/\/www\.amazon\.com\/dp\/B00TEST123\?/),
        description: 'D'.repeat(8_000),
      })
    );
  });

  it('truncates long finalUrl fallbacks when the script result does not provide a URL', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'no_match',
        asin: null,
        title: null,
        price: null,
        url: null,
        description: null,
        matchedImageId: null,
        message: 'No Amazon result matched.',
        currentUrl: null,
      },
      finalUrl: `https://lens.google.com/?${'z'.repeat(4_200)}`,
    });

    await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'no_match',
        url: expect.stringMatching(/^https:\/\/lens\.google\.com\/\?/),
        asinUpdateStatus: 'not_needed',
      })
    );
    expect(
      (mocks.updateProductScanMock.mock.calls.at(-1)?.[1] as { url?: string | null } | undefined)?.url
        ?.length
    ).toBe(4_000);
  });

  it('marks the scan failed when loading the product during finalization throws', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'B00TEST123',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description',
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockRejectedValue(new Error('product lookup failed'));

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        error: 'product lookup failed',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'product lookup failed',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        error: 'product lookup failed',
        asinUpdateStatus: 'failed',
      })
    );
  });

  it('returns an in-memory failed scan when persisting a missing-run failure also throws', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue(null);
    mocks.updateProductScanMock.mockRejectedValue(new Error('repository unavailable'));

    const result = await synchronizeProductScan(scan);

    expect(result).toEqual(
      expect.objectContaining({
        id: 'scan-1',
        status: 'failed',
        error: 'Playwright engine run run-1 was not found.',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'Playwright engine run run-1 was not found.',
      })
    );
    expect(result.completedAt).not.toBeNull();
  });

  it('returns an in-memory completed scan when final persistence fails after a successful ASIN update', async () => {
    const scan = createScan();

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'B00TEST123',
        title: 'Amazon title',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Amazon description',
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
    });
    mocks.updateProductMock.mockResolvedValue({ id: 'product-1', asin: 'B00TEST123' });
    mocks.updateProductScanMock.mockRejectedValue(new Error('repository unavailable'));

    const result = await synchronizeProductScan(scan);

    expect(mocks.invalidateProductMock).toHaveBeenCalledWith('product-1');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'scan-1',
        status: 'completed',
        asin: 'B00TEST123',
        asinUpdateStatus: 'updated',
        asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
        error: null,
      })
    );
  });

  it('persists a completed 1688 supplier scan result', async () => {
    const scan = createScan({
      provider: '1688',
      scanType: 'supplier_reverse_image',
      asinUpdateStatus: 'not_needed',
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        title: '1688 Supplier Listing',
        price: 'CN¥ 12.50-15.00',
        url: 'https://detail.1688.com/offer/123456789.html',
        description: 'Supplier description',
        matchedImageId: 'image-1',
        supplierDetails: {
          supplierName: 'Yiwu Supplier Co.',
          supplierProductUrl: 'https://detail.1688.com/offer/123456789.html',
          supplierStoreUrl: 'https://shop.1688.com/page.html',
          currency: 'CNY',
          priceRangeText: 'CN¥ 12.50-15.00',
          moqText: '2 pcs',
          images: [
            {
              url: 'https://img.alicdn.com/example-1.jpg',
              source: 'gallery',
            },
          ],
          prices: [
            {
              label: '2-9 pcs',
              amount: '12.50',
              currency: 'CNY',
              moq: '2',
              unit: 'pcs',
              source: 'offer',
            },
          ],
        },
        supplierProbe: {
          candidateUrl: 'https://detail.1688.com/offer/123456789.html',
          canonicalUrl: 'https://detail.1688.com/offer/123456789.html',
          pageTitle: '1688 Probe Title',
          supplierName: 'Yiwu Supplier Co.',
          priceText: 'CN¥ 12.50-15.00',
          currency: 'CNY',
        },
        supplierEvaluation: {
          status: 'approved',
          sameProduct: true,
          imageMatch: true,
          titleMatch: true,
          confidence: 0.88,
          proceed: true,
          reasons: ['The strongest 1688 supplier candidate met the heuristic match threshold.'],
          mismatches: [],
          modelId: 'heuristic_1688_probe_v1',
          error: null,
          evaluatedAt: '2026-04-11T04:05:00.000Z',
        },
      },
      finalUrl: 'https://detail.1688.com/offer/123456789.html',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'completed',
        title: '1688 Supplier Listing',
        price: 'CN¥ 12.50-15.00',
        url: 'https://detail.1688.com/offer/123456789.html',
        matchedImageId: 'image-1',
        supplierDetails: expect.objectContaining({
          supplierName: 'Yiwu Supplier Co.',
        }),
        supplierProbe: expect.objectContaining({
          pageTitle: '1688 Probe Title',
        }),
        supplierEvaluation: expect.objectContaining({
          status: 'approved',
          proceed: true,
          modelId: 'heuristic_1688_probe_v1',
        }),
        asinUpdateStatus: 'not_needed',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'completed',
        supplierDetails: expect.objectContaining({
          supplierName: 'Yiwu Supplier Co.',
        }),
        supplierEvaluation: expect.objectContaining({
          status: 'approved',
        }),
        asinUpdateStatus: 'not_needed',
      })
    );
  });

  it('upgrades a borderline 1688 supplier result through the AI evaluator', async () => {
    const scan = createScan({
      provider: '1688',
      scanType: 'supplier_reverse_image',
      asinUpdateStatus: 'not_needed',
    });

    mocks.resolveProductScanner1688CandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.8,
      onlyForAmbiguousCandidates: true,
      modelId: 'gpt-4.1-mini',
      systemPrompt: 'Supplier prompt',
      brainApplied: {
        capability: 'product.scan.1688_supplier_match',
      },
    });
    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'no_match',
        title: '1688 Supplier Listing',
        price: 'CN¥ 12.50-15.00',
        url: 'https://detail.1688.com/offer/123456789.html',
        description: 'Supplier description',
        matchedImageId: 'image-1',
        supplierDetails: {
          supplierName: 'Yiwu Supplier Co.',
          supplierProductUrl: 'https://detail.1688.com/offer/123456789.html',
          supplierStoreUrl: 'https://shop.1688.com/page.html',
          currency: 'CNY',
          priceRangeText: 'CN¥ 12.50-15.00',
          moqText: '2 pcs',
        },
        supplierProbe: {
          candidateUrl: 'https://detail.1688.com/offer/123456789.html',
          canonicalUrl: 'https://detail.1688.com/offer/123456789.html',
          pageTitle: '1688 Probe Title',
          supplierName: 'Yiwu Supplier Co.',
          candidateRank: 1,
          artifactKey: '1688-scan-probe-image-1-rank-1',
        },
        supplierEvaluation: {
          status: 'rejected',
          sameProduct: false,
          imageMatch: null,
          titleMatch: false,
          confidence: 0.55,
          proceed: false,
          reasons: ['The heuristic score stayed below the trust threshold.'],
          mismatches: ['Heuristic score was inconclusive.'],
          modelId: 'heuristic_1688_probe_v1',
          error: null,
          evaluatedAt: '2026-04-11T04:05:00.000Z',
        },
        steps: [
          {
            key: 'supplier_evaluate',
            label: 'Evaluate supplier candidate',
            status: 'failed',
            resultCode: 'candidate_rejected',
            message: 'The strongest 1688 supplier candidate did not meet the heuristic match threshold.',
            candidateId: 'image-1',
            candidateRank: 1,
            details: [],
          },
        ],
      },
      finalUrl: 'https://detail.1688.com/offer/123456789.html',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Product 1',
      images: [],
      imageLinks: ['https://cdn.example.com/product-1.jpg'],
      description_en: 'Source product',
      supplierName: null,
      supplierLink: null,
      ean: null,
      gtin: null,
    });
    mocks.evaluate1688SupplierCandidateMatchMock.mockResolvedValue({
      status: 'approved',
      sameProduct: true,
      imageMatch: true,
      titleMatch: true,
      confidence: 0.92,
      proceed: true,
      reasons: ['AI confirmed the supplier page matches the same product.'],
      mismatches: [],
      modelId: 'gpt-4.1-mini',
      error: null,
      evaluatedAt: '2026-04-11T04:05:10.000Z',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.getProductByIdMock).toHaveBeenCalledWith('product-1');
    expect(mocks.evaluate1688SupplierCandidateMatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scan: expect.objectContaining({ id: 'scan-1' }),
        parsedResult: expect.objectContaining({ status: 'no_match' }),
        evaluatorConfig: expect.objectContaining({
          enabled: true,
          modelId: 'gpt-4.1-mini',
        }),
      })
    );
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'completed',
        supplierEvaluation: expect.objectContaining({
          status: 'approved',
          modelId: 'gpt-4.1-mini',
        }),
        asinUpdateMessage: 'AI evaluator approved the 1688 supplier candidate (92%).',
        steps: expect.arrayContaining([
          expect.objectContaining({
            key: 'supplier_ai_evaluate',
            status: 'completed',
            resultCode: 'candidate_approved',
          }),
        ]),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'completed',
        supplierEvaluation: expect.objectContaining({
          status: 'approved',
          confidence: 0.92,
        }),
      })
    );
  });

  it('returns already_running when an active scan is still running for the product', async () => {
    const activeScan = createScan({ status: 'queued' });

    mocks.findLatestActiveProductScanMock.mockResolvedValue(activeScan);
    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
    });
    mocks.updateProductScanMock.mockImplementation(
      async (id: string, updates: Partial<ProductScanRecord>) => ({
        ...activeScan,
        ...updates,
        id,
      })
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.getProductByIdMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      queued: 0,
      running: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'already_running',
          currentStatus: 'running',
          message: 'Amazon reverse image scan running.',
        },
      ],
    });
  });

  it('returns already_running with queued currentStatus when the existing scan is still queued', async () => {
    const activeScan = createScan({ status: 'queued' });

    mocks.findLatestActiveProductScanMock.mockResolvedValue(activeScan);
    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result).toEqual({
      queued: 0,
      running: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'already_running',
          currentStatus: 'queued',
          message: 'Amazon scan already in progress for this product.',
        },
      ],
    });
  });

  it('queues a new Amazon reverse-image scan with image candidates', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-1',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: [' product-1 ', 'product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'user-1',
        instance: expect.objectContaining({
          family: 'scrape',
          label: 'Amazon reverse image ASIN scan',
        }),
        request: expect.objectContaining({
          browserEngine: 'chromium',
          timeoutMs: 180000,
          preventNewPages: true,
          input: expect.objectContaining({
            productId: 'product-1',
            productName: 'Product 1',
            existingAsin: null,
            imageCandidates: [
              expect.objectContaining({
                id: 'image-1',
                filepath: '/tmp/product-1.jpg',
                url: 'https://cdn.example.com/product-1.jpg',
              }),
            ],
          }),
        }),
      })
    );
    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-1',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
    expect(mocks.upsertProductScanMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            key: 'prepare_scan',
            status: 'completed',
          }),
          expect.objectContaining({
            key: 'queue_scan',
            status: 'completed',
            message: 'Playwright Amazon reverse image scan queued.',
          }),
        ],
      })
    );
  });

  it('queues a new 1688 supplier reverse-image scan with image candidates', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: null,
      playwrightBrowser: 'auto',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 180000,
      playwrightSettingsOverrides: {
        headless: true,
      },
      amazonCandidateEvaluator: {
        mode: 'disabled',
        modelId: null,
        threshold: 0.85,
        onlyForAmbiguousCandidates: false,
        allowedContentLanguage: 'en',
        rejectNonEnglishContent: true,
        languageDetectionMode: 'deterministic_then_ai',
        systemPrompt: null,
      },
      scanner1688: {
        candidateResultLimit: 6,
        minimumCandidateScore: 5,
        maxExtractedImages: 9,
        allowUrlImageSearchFallback: false,
      },
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Supplier Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SUP-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-1688-1',
      status: 'queued',
    });

    const result = await queue1688BatchProductScans({
      productIds: [' product-1 ', 'product-1'],
      userId: 'user-1',
    });

    expect(mocks.createCustomPlaywrightInstanceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        family: 'scrape',
        label: '1688 supplier reverse image scan',
        tags: ['product', '1688', 'scan', 'supplier-reverse-image'],
      })
    );
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'user-1',
        instance: expect.objectContaining({
          family: 'scrape',
        }),
        request: expect.objectContaining({
          browserEngine: 'chromium',
          timeoutMs: 180000,
          preventNewPages: true,
          script: expect.stringContaining('1688'),
          input: expect.objectContaining({
            productId: 'product-1',
            productName: 'Supplier Product 1',
            candidateResultLimit: 6,
            minimumCandidateScore: 5,
            maxExtractedImages: 9,
            allowUrlImageSearchFallback: false,
            imageCandidates: [
              expect.objectContaining({
                id: 'image-1',
                filepath: '/tmp/product-1.jpg',
                url: 'https://cdn.example.com/product-1.jpg',
              }),
            ],
          }),
        }),
      })
    );
    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-1688-1',
          status: 'queued',
          currentStatus: 'queued',
          message: '1688 supplier reverse image scan queued.',
        },
      ],
    });
    expect(mocks.upsertProductScanMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        provider: '1688',
        scanType: 'supplier_reverse_image',
        steps: [
          expect.objectContaining({
            key: 'prepare_scan',
            status: 'completed',
          }),
          expect.objectContaining({
            key: 'queue_scan',
            status: 'completed',
            message: 'Playwright 1688 supplier reverse image scan queued.',
          }),
        ],
      })
    );
  });

  it('serializes batch scan startup and preserves product order', async () => {
    const createProduct = (id: string) => ({
      id,
      asin: null,
      name_en: `Product ${id}`,
      name_pl: null,
      name_de: null,
      sku: `SKU-${id}`,
      images: [
        {
          imageFileId: `image-${id}`,
          imageFile: {
            id: `image-${id}`,
            filepath: `/tmp/${id}.jpg`,
            publicUrl: `https://cdn.example.com/${id}.jpg`,
            filename: `${id}.jpg`,
          },
        },
      ],
      imageLinks: [],
    });
    const deferredRuns = new Map<
      string,
      {
        resolve: (value: { runId: string; status: 'queued' }) => void;
      }
    >();
    const flush = async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    };
    const waitForStartCalls = async (expectedCount: number) => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (mocks.startPlaywrightEngineTaskMock.mock.calls.length >= expectedCount) {
          break;
        }
        await flush();
      }
      expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledTimes(expectedCount);
    };

    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockImplementation(async (productId: string) => createProduct(productId));
    mocks.startPlaywrightEngineTaskMock.mockImplementation(
      ({ request }: { request: { input: { productId: string; batchIndex: number } } }) =>
        new Promise<{ runId: string; status: 'queued' }>((resolve) => {
          deferredRuns.set(request.input.productId, { resolve });
        })
    );

    const resultPromise = queueAmazonBatchProductScans({
      productIds: ['product-1', 'product-2', 'product-3', 'product-4'],
      userId: 'user-1',
    });

    await waitForStartCalls(1);

    deferredRuns.get('product-1')?.resolve({
      runId: 'run-product-1',
      status: 'queued',
    });
    await waitForStartCalls(2);

    deferredRuns.get('product-2')?.resolve({
      runId: 'run-product-2',
      status: 'queued',
    });
    await waitForStartCalls(3);
    deferredRuns.get('product-3')?.resolve({
      runId: 'run-product-3',
      status: 'queued',
    });
    await waitForStartCalls(4);
    deferredRuns.get('product-4')?.resolve({
      runId: 'run-product-4',
      status: 'queued',
    });

    const result = await resultPromise;

    expect(
      mocks.startPlaywrightEngineTaskMock.mock.calls.map(
        ([input]: [{ request: { input: { batchIndex: number } } }]) =>
          input.request.input.batchIndex
      )
    ).toEqual([0, 1, 2, 3]);

    expect(result.results.map((entry) => entry.productId)).toEqual([
      'product-1',
      'product-2',
      'product-3',
      'product-4',
    ]);
    expect(result).toEqual({
      queued: 4,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-product-1',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
        {
          productId: 'product-2',
          scanId: expect.any(String),
          runId: 'run-product-2',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
        {
          productId: 'product-3',
          scanId: expect.any(String),
          runId: 'run-product-3',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
        {
          productId: 'product-4',
          scanId: expect.any(String),
          runId: 'run-product-4',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('applies the global scanner settings when starting a new scan run', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      playwrightSettingsOverrides: {
        headless: false,
        slowMo: 25,
        timeout: 45000,
      },
    });
    mocks.resolveProductScannerHeadlessMock.mockResolvedValue(false);
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      personaId: 'persona-1',
      settingsOverrides: {
        headless: false,
        slowMo: 25,
      },
      launchOptions: {
        channel: 'chrome',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-scanner-1',
      status: 'queued',
    });

    await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.getProductScannerSettingsMock).toHaveBeenCalledTimes(1);
    expect(mocks.buildProductScannerEngineRequestOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'chrome',
      })
    );
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          browserEngine: 'chromium',
          personaId: 'persona-1',
          timeoutMs: 300000,
          settingsOverrides: {
            headless: false,
            slowMo: 25,
          },
          launchOptions: {
            channel: 'chrome',
          },
          input: expect.objectContaining({
            allowManualVerification: true,
            manualVerificationTimeoutMs: 240000,
          }),
        }),
      })
    );
  });

  it('adds scanner anti-detection defaults when no persona is configured', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: null,
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      playwrightSettingsOverrides: {},
    });
    mocks.resolveProductScannerHeadlessMock.mockResolvedValue(false);
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      settingsOverrides: {
        headless: false,
        slowMo: 0,
      },
      launchOptions: {
        channel: 'chrome',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-scanner-stealth-1',
      status: 'queued',
    });

    await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          browserEngine: 'chromium',
          timeoutMs: 300000,
          settingsOverrides: {
            headless: false,
            slowMo: 80,
            identityProfile: 'search',
            humanizeMouse: true,
          },
          launchOptions: {
            channel: 'chrome',
          },
        }),
      })
    );
  });

  it('disables manual verification reopening when scanner settings are configured to fail on captcha', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'fail',
      manualVerificationTimeoutMs: 180000,
      playwrightSettingsOverrides: {
        headless: false,
      },
    });
    mocks.resolveProductScannerHeadlessMock.mockResolvedValue(false);
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      personaId: 'persona-1',
      settingsOverrides: {
        headless: false,
      },
      launchOptions: {
        channel: 'chrome',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-scanner-2',
      status: 'queued',
    });

    await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          timeoutMs: 180000,
          input: expect.objectContaining({
            allowManualVerification: false,
            manualVerificationTimeoutMs: 180000,
          }),
        }),
      })
    );
  });

  it('returns a running batch result when the Playwright engine starts the scan immediately', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-running-1',
      status: 'running',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result).toEqual({
      queued: 0,
      running: 1,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-running-1',
          status: 'running',
          currentStatus: 'running',
          message: 'Amazon reverse image scan running.',
        },
      ],
    });
  });

  it('keeps a started scan recoverable when persisting the run link fails once', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-link-recovery',
      status: 'queued',
    });
    mocks.upsertProductScanMock
      .mockImplementationOnce(async (scan: ProductScanRecord) => scan)
      .mockRejectedValueOnce(new Error('persist link failed'))
      .mockImplementationOnce(async (scan: ProductScanRecord) => scan);

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-link-recovery',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'persist link failed' }),
      expect.objectContaining({
        service: 'product-scans.service',
        action: 'queueAmazonBatchProductScans.persistRunLink',
        productId: 'product-1',
        runId: 'run-queued-link-recovery',
      })
    );
    expect(mocks.upsertProductScanMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        engineRunId: null,
        status: 'queued',
        rawResult: expect.objectContaining({
          runId: 'run-queued-link-recovery',
          status: 'queued',
          linkError: 'persist link failed',
        }),
      })
    );
  });

  it('recovers a started scan with a direct update when both run-link upserts fail', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-direct-recovery',
      status: 'queued',
    });
    mocks.upsertProductScanMock
      .mockImplementationOnce(async (scan: ProductScanRecord) => scan)
      .mockRejectedValueOnce(new Error('persist link failed'))
      .mockRejectedValueOnce(new Error('persist fallback failed'));

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        engineRunId: 'run-queued-direct-recovery',
        status: 'queued',
        rawResult: expect.objectContaining({
          runId: 'run-queued-direct-recovery',
          status: 'queued',
          linkError: 'persist link failed',
          fallbackError: 'persist fallback failed',
        }),
      })
    );
    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-direct-recovery',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('truncates long product names before persisting and queueing scans', async () => {
    const longName = 'A'.repeat(340);

    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: longName,
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-long-name',
      status: 'queued',
    });

    await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.upsertProductScanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productName: 'A'.repeat(300),
      })
    );
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            productName: 'A'.repeat(300),
          }),
        }),
      })
    );
  });

  it('returns a failed batch result when the product has no usable images', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [],
      imageLinks: [],
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      queued: 0,
      running: 0,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: null,
          status: 'failed',
          currentStatus: 'failed',
          message: 'No product image available for Amazon reverse image scan.',
        },
      ],
    });
    expect(mocks.upsertProductScanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        steps: [
          expect.objectContaining({
            key: 'prepare_scan',
            status: 'failed',
            message: 'No product image available for Amazon reverse image scan.',
          }),
        ],
      })
    );
  });

  it('returns a failed batch result when enqueueing the Playwright run throws', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockRejectedValue(
      new Error('playwright engine unavailable')
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result).toEqual({
      queued: 0,
      running: 0,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: null,
          status: 'failed',
          currentStatus: 'failed',
          message: 'playwright engine unavailable',
        },
      ],
    });
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'playwright engine unavailable' }),
      expect.objectContaining({
        service: 'product-scans.service',
        action: 'queueAmazonBatchProductScans.startRun',
        productId: 'product-1',
      })
    );
  });

  it('marks the saved base scan failed with a direct update when start-run failure persistence upsert throws', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockRejectedValue(
      new Error('playwright engine unavailable')
    );
    mocks.upsertProductScanMock
      .mockImplementationOnce(async (scan: ProductScanRecord) => scan)
      .mockRejectedValueOnce(new Error('persist failed state failed'));

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'failed',
        error: 'playwright engine unavailable',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'playwright engine unavailable',
      })
    );
    expect(result).toEqual({
      queued: 0,
      running: 0,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: null,
          status: 'failed',
          currentStatus: 'failed',
          message: 'playwright engine unavailable',
        },
      ],
    });
  });

  it('truncates oversized enqueue failure messages for persistence and batch results', async () => {
    const longMessage = 'E'.repeat(2_500);

    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockRejectedValue(new Error(longMessage));

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.upsertProductScanMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: 'E'.repeat(2_000),
        asinUpdateMessage: 'E'.repeat(2_000),
      })
    );
    expect(result).toEqual({
      queued: 0,
      running: 0,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: null,
          status: 'failed',
          currentStatus: 'failed',
          message: 'E'.repeat(1_000),
        },
      ],
    });
  });

  it('re-enqueues a fresh scan when the previous active run record is missing', async () => {
    const activeScan = createScan({ status: 'queued' });

    mocks.findLatestActiveProductScanMock.mockResolvedValue(activeScan);
    mocks.readPlaywrightEngineRunMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-2',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Playwright engine run run-1 was not found.',
      })
    );
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-2',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('returns already_running when a concurrent active scan appears during base-record insert', async () => {
    const activeScan = createScan({
      id: 'scan-concurrent',
      status: 'queued',
      engineRunId: 'run-concurrent',
    });

    mocks.findLatestActiveProductScanMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activeScan);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.upsertProductScanMock.mockRejectedValueOnce(
      Object.assign(new Error('duplicate key'), { code: 11000 })
    );
    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-concurrent',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      queued: 0,
      running: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-concurrent',
          runId: 'run-concurrent',
          status: 'already_running',
          currentStatus: 'queued',
          message: 'Amazon scan already in progress for this product.',
        },
      ],
    });
  });

  it('queues a scan from imageLinks when no image file records exist', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [],
      imageLinks: ['https://cdn.example.com/link-only.jpg'],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-link-only',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                filepath: null,
                url: 'https://cdn.example.com/link-only.jpg',
              }),
            ],
          }),
        }),
      })
    );
    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-link-only',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('drops an invalid local filepath and falls back to the image URL candidate', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.statMock.mockRejectedValueOnce(new Error('missing file'));
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-fallback',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                id: 'image-1',
                filepath: null,
                url: 'https://cdn.example.com/product-1.jpg',
              }),
            ],
          }),
        }),
      })
    );
    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-fallback',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('drops a zero-byte local filepath and falls back to the image URL candidate', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.statMock.mockResolvedValueOnce({
      isFile: () => true,
      size: 0,
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.jpg',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.jpg',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-zero-byte-fallback',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                id: 'image-1',
                filepath: null,
                url: 'https://cdn.example.com/product-1.jpg',
              }),
            ],
          }),
        }),
      })
    );
    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-zero-byte-fallback',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('drops an unsupported local file extension and falls back to the image URL candidate', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
      name_pl: null,
      name_de: null,
      sku: 'SKU-1',
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/product-1.txt',
            publicUrl: 'https://cdn.example.com/product-1.jpg',
            filename: 'product-1.txt',
          },
        },
      ],
      imageLinks: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-extension-fallback',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.statMock).not.toHaveBeenCalled();
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                id: 'image-1',
                filepath: null,
                url: 'https://cdn.example.com/product-1.jpg',
              }),
            ],
          }),
        }),
      })
    );
    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: expect.any(String),
          runId: 'run-queued-extension-fallback',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
  });

  it('returns a per-product failure when one product lookup throws and still queues the rest', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockImplementation(async (productId: string) => {
      if (productId === 'product-1') {
        throw new Error('database temporarily unavailable');
      }

      return {
        id: productId,
        asin: null,
        name_en: 'Product 2',
        name_pl: null,
        name_de: null,
        sku: 'SKU-2',
        images: [
          {
            imageFileId: 'image-2',
            imageFile: {
              id: 'image-2',
              filepath: '/tmp/product-2.jpg',
              publicUrl: 'https://cdn.example.com/product-2.jpg',
              filename: 'product-2.jpg',
            },
          },
        ],
        imageLinks: [],
      };
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued-3',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1', 'product-2'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: null,
          runId: null,
          status: 'failed',
          currentStatus: null,
          message: 'database temporarily unavailable',
        },
        {
          productId: 'product-2',
          scanId: expect.any(String),
          runId: 'run-queued-3',
          status: 'queued',
          currentStatus: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'database temporarily unavailable' }),
      expect.objectContaining({
        service: 'product-scans.service',
        action: 'queueAmazonBatchProductScans.product',
        productId: 'product-1',
      })
    );
  });
});
