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
});
