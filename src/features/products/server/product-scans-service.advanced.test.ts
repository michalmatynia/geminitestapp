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
    mocks.collectPlaywrightEngineRunFailureMessagesMock.mockReturnValue([]);
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({});
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: null,
      playwrightBrowser: 'auto',
      captchaBehavior: 'fail',
      manualVerificationTimeoutMs: 240000,
      amazonImageSearchProvider: 'google_images_upload',
      playwrightSettingsOverrides: {},
      scanner1688: {},
    });
    mocks.resolveProductScannerHeadlessMock.mockResolvedValue(true);
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({});
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: false,
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock.mockResolvedValue({
      enabled: false,
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorExtractionConfigMock.mockResolvedValue({
      enabled: false,
    });
    mocks.resolveProductScanner1688CandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: false,
    });
    mocks.updateProductScanMock.mockImplementation(
      async (id: string, updates: Partial<ProductScanRecord>) => ({
        ...createScan({ id }),
        ...updates,
        id,
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
        message: 'Amazon candidate search did not return a usable Amazon result.',
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
          'Amazon candidate search did not return a usable Amazon result.',
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

  it('persists active runtime diagnostics for fresh running scans', async () => {
    const now = Date.now();
    const scan = createScan({
      status: 'queued',
      rawResult: {
        runId: 'run-1',
      },
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      startedAt: new Date(now - 30_000).toISOString(),
      createdAt: new Date(now - 35_000).toISOString(),
      updatedAt: new Date(now - 5_000).toISOString(),
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'running',
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
        steps: [
          {
            key: 'google_upload',
            label: 'Upload image to Google Lens',
            status: 'running',
            message: 'Uploading image to Google Lens.',
            url: 'https://images.google.com/?hl=en',
            startedAt: new Date(now - 10_000).toISOString(),
            completedAt: null,
          },
        ],
      },
      finalUrl: 'https://images.google.com/?hl=en',
    });
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({
      runId: 'run-1',
      runStatus: 'running',
      latestStage: 'google_upload',
      latestStageUrl: 'https://images.google.com/?hl=en',
      failureArtifacts: [],
      logTail: ['google lens upload pending'],
      rawResult: {
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
      },
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-1',
        status: 'running',
        asinUpdateStatus: 'pending',
        rawResult: expect.objectContaining({
          runId: 'run-1',
          runStatus: 'running',
          latestStage: 'google_upload',
          latestStageUrl: 'https://images.google.com/?hl=en',
          logTail: ['google lens upload pending'],
          manualVerificationPending: false,
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'running',
        asinUpdateStatus: 'pending',
      })
    );
  });

  it('keeps Amazon scans running while they are still within the manual-verification runtime budget', async () => {
    const now = Date.now();
    const scan = createScan({
      status: 'running',
      rawResult: {
        runId: 'run-1',
        allowManualVerification: true,
        manualVerificationTimeoutMs: 180_000,
      },
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      startedAt: new Date(now - 200_000).toISOString(),
      createdAt: new Date(now - 205_000).toISOString(),
      updatedAt: new Date(now - 190_000).toISOString(),
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'running',
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
        steps: [
          {
            key: 'google_upload',
            label: 'Upload image to Google Lens',
            status: 'running',
            message: 'Uploading image to Google Lens.',
            url: 'https://images.google.com/?hl=en',
            startedAt: new Date(now - 195_000).toISOString(),
            completedAt: null,
          },
        ],
      },
      finalUrl: 'https://images.google.com/?hl=en',
    });
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({
      runId: 'run-1',
      runStatus: 'running',
      latestStage: 'google_upload',
      latestStageUrl: 'https://images.google.com/?hl=en',
      failureArtifacts: [],
      logTail: ['google lens upload pending'],
      rawResult: {
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
      },
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-1',
        status: 'running',
        asinUpdateStatus: 'pending',
        rawResult: expect.objectContaining({
          allowManualVerification: true,
          manualVerificationTimeoutMs: 180_000,
          latestStage: 'google_upload',
          latestStageUrl: 'https://images.google.com/?hl=en',
          manualVerificationPending: false,
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'running',
        asinUpdateStatus: 'pending',
      })
    );
  });

  it('keeps Amazon scans running during the stale-sync grace window after the manual-verification runtime budget', async () => {
    const now = Date.now();
    const scan = createScan({
      status: 'running',
      rawResult: {
        runId: 'run-1',
        allowManualVerification: true,
        manualVerificationTimeoutMs: 240_000,
      },
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      startedAt: new Date(now - 320_000).toISOString(),
      createdAt: new Date(now - 325_000).toISOString(),
      updatedAt: new Date(now - 320_000).toISOString(),
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'running',
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
        steps: [
          {
            key: 'google_upload',
            label: 'Upload image to Google Lens',
            status: 'running',
            message: 'Uploading image to Google Lens.',
            url: 'https://images.google.com/?hl=en',
            startedAt: new Date(now - 319_000).toISOString(),
            completedAt: null,
          },
        ],
      },
      finalUrl: 'https://images.google.com/?hl=en',
    });
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({
      runId: 'run-1',
      runStatus: 'running',
      latestStage: 'google_upload',
      latestStageUrl: 'https://images.google.com/?hl=en',
      failureArtifacts: [],
      logTail: ['google lens upload pending'],
      rawResult: {
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
      },
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-1',
        status: 'running',
        asinUpdateStatus: 'pending',
        rawResult: expect.objectContaining({
          allowManualVerification: true,
          manualVerificationTimeoutMs: 240_000,
          latestStage: 'google_upload',
          latestStageUrl: 'https://images.google.com/?hl=en',
          manualVerificationPending: false,
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'running',
        asinUpdateStatus: 'pending',
      })
    );
  });

  it('fails stale active scans with persisted runtime diagnostics', async () => {
    const now = Date.now();
    const scan = createScan({
      status: 'running',
      rawResult: {
        runId: 'run-1',
      },
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      startedAt: new Date(now - 250_000).toISOString(),
      createdAt: new Date(now - 255_000).toISOString(),
      updatedAt: new Date(now - 245_000).toISOString(),
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'running',
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
        steps: [
          {
            key: 'google_upload',
            label: 'Upload image to Google Lens',
            status: 'running',
            message: 'Uploading image to Google Lens.',
            url: 'https://images.google.com/?hl=en',
            startedAt: new Date(now - 200_000).toISOString(),
            completedAt: null,
          },
        ],
      },
      finalUrl: 'https://images.google.com/?hl=en',
    });
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({
      runId: 'run-1',
      runStatus: 'running',
      latestStage: 'google_upload',
      latestStageUrl: 'https://images.google.com/?hl=en',
      failureArtifacts: [],
      logTail: ['google lens upload pending'],
      rawResult: {
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
      },
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-1',
        status: 'failed',
        error: 'Amazon reverse image scan stalled at Google Upload.',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'Amazon reverse image scan stalled at Google Upload.',
        rawResult: expect.objectContaining({
          latestStage: 'google_upload',
          latestStageUrl: 'https://images.google.com/?hl=en',
          logTail: ['google lens upload pending'],
          stalledReason: 'no_progress',
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
      })
    );
  });

  it('fails expired manual-verification scans with persisted runtime diagnostics', async () => {
    const now = Date.now();
    const scan = createScan({
      status: 'running',
      rawResult: {
        runId: 'run-1',
        manualVerificationPending: true,
        manualVerificationMessage: 'Waiting for Google Lens manual verification.',
        manualVerificationTimeoutMs: 300_000,
        imageSearchProvider: 'google_images_upload',
      },
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      startedAt: new Date(now - 420_000).toISOString(),
      createdAt: new Date(now - 425_000).toISOString(),
      updatedAt: new Date(now - 10_000).toISOString(),
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
        message: 'Waiting for Google Lens manual verification.',
        steps: [
          {
            key: 'google_upload',
            label: 'Upload image to Google Lens',
            status: 'running',
            message: 'Waiting for Google Lens manual verification.',
            url: 'https://images.google.com/?hl=en',
            startedAt: new Date(now - 360_000).toISOString(),
            completedAt: null,
          },
        ],
      },
      finalUrl: 'https://images.google.com/?hl=en',
    });
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({
      runId: 'run-1',
      runStatus: 'running',
      latestStage: 'google_upload',
      latestStageUrl: 'https://images.google.com/?hl=en',
      logTail: ['waiting for manual verification'],
      rawResult: {
        stage: 'google_upload',
        currentUrl: 'https://images.google.com/?hl=en',
      },
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-1',
        status: 'failed',
        error: 'Google Lens manual verification expired at Google Upload.',
        asinUpdateStatus: 'failed',
        asinUpdateMessage: 'Google Lens manual verification expired at Google Upload.',
        rawResult: expect.objectContaining({
          latestStage: 'google_upload',
          latestStageUrl: 'https://images.google.com/?hl=en',
          logTail: ['waiting for manual verification'],
          manualVerificationPending: false,
          manualVerificationExpired: true,
          stalledReason: 'manual_verification_expired',
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
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
});
