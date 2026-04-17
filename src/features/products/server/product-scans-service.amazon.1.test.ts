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
  startPlaywrightConnectionEngineTaskMock: vi.fn(),
  createCustomPlaywrightInstanceMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  get1688DefaultConnectionIdMock: vi.fn(),
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
  startPlaywrightConnectionEngineTask: (...args: unknown[]) =>
    mocks.startPlaywrightConnectionEngineTaskMock(...args),
  startPlaywrightEngineTask: (...args: unknown[]) => mocks.startPlaywrightEngineTaskMock(...args),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: (...args: unknown[]) => mocks.getIntegrationRepositoryMock(...args),
  get1688DefaultConnectionId: (...args: unknown[]) =>
    mocks.get1688DefaultConnectionIdMock(...args),
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
      'Amazon candidate search failed.',
    ]);
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({ reason: 'failed' });
    mocks.createCustomPlaywrightInstanceMock.mockReturnValue({
      family: 'scrape',
      label: 'Amazon candidate search manual verification',
    });
    mocks.startPlaywrightConnectionEngineTaskMock.mockResolvedValue({
      run: {
        runId: 'run-connection-1',
        status: 'queued',
      },
      runtime: {
        settings: {
          headless: true,
        },
        browserPreference: 'auto',
      },
      settings: {
        headless: true,
      },
      browserPreference: 'auto',
    });
    mocks.getIntegrationRepositoryMock.mockResolvedValue({
      listIntegrations: vi.fn(async () => [
        {
          id: 'integration-1688',
          slug: '1688',
          name: '1688',
        },
      ]),
      listConnections: vi.fn(async () => [
        {
          id: 'connection-1688',
          integrationId: 'integration-1688',
          name: '1688 Primary',
          scanner1688StartUrl: 'https://www.1688.com/',
          scanner1688LoginMode: 'session_required',
          scanner1688DefaultSearchMode: 'local_image',
          scanner1688CandidateResultLimit: null,
          scanner1688MinimumCandidateScore: null,
          scanner1688MaxExtractedImages: null,
          scanner1688AllowUrlImageSearchFallback: null,
          playwrightStorageState: '{"cookies":[],"origins":[]}',
        },
      ]),
    });
    mocks.get1688DefaultConnectionIdMock.mockResolvedValue('connection-1688');
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: null,
      playwrightBrowser: 'auto',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      amazonImageSearchProvider: 'google_images_upload',
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
});
